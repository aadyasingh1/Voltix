import type { TrueForge } from '@truefoundry/trueforge-sdk';
import { diffLines } from 'diff';
import type { PanelOutboundMessage } from '../../../shared/types';

export interface TurnResult {
  status: 'done' | 'cancelled' | 'error';
  message?: string;
}

interface ToolCallState {
  id?: string;
  name: string;
  arguments: string;
}

function safePreview(value: string, limit: number): string {
  return value
    .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)(?:"[^"]*"|'[^']*'|\S+)/gi, '$1[REDACTED]')
    .slice(0, limit);
}

function safeSummaryValue(value: unknown): string {
  return safePreview(String(value ?? '').replace(/\s+/g, ' ').trim(), 200);
}

export function formatToolSummary(name: string, argumentsText: string, result: string): string {
  let args: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(argumentsText);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) args = parsed as Record<string, unknown>;
  } catch {
    return `${name} → completed`;
  }
  if (name === 'read_file') {
    const file = safeSummaryValue(args.path);
    const range = result.match(/\[Showing lines (\d+)-(\d+) of (\d+)\./);
    if (range) return `read_file ${file} → lines ${range[1]}-${range[2]} of ${range[3]}`;
    const onlyLines = result.match(/\[File has only (\d+) lines\.\]/);
    if (onlyLines) return `read_file ${file} → file has ${onlyLines[1]} lines`;
    const start = Number(args.start_line) || 1;
    const end = Number(args.end_line) || result.split(/\r?\n/).length;
    return `read_file ${file} → lines ${start}-${end} of ${end}`;
  }
  if (name === 'search_workspace') {
    const query = safeSummaryValue(args.query);
    const count = result.trim() === 'No matches' ? 0 : result.split(/\r?\n/).length;
    return `search_workspace '${query}' → ${count} ${count === 1 ? 'match' : 'matches'}`;
  }
  if (name === 'edit_file') {
    const file = safeSummaryValue(args.path);
    if (!result.includes('registered for review')) return `edit_file ${file} → ${safeSummaryValue(result)}`;
    const changes = diffLines(String(args.old_string ?? ''), String(args.new_string ?? ''));
    const countLines = (text: string) => text.split(/\r?\n/).filter((line, index, lines) => line.length > 0 || index < lines.length - 1).length;
    const added = changes.filter(part => part.added).reduce((sum, part) => sum + countLines(part.value), 0);
    const removed = changes.filter(part => part.removed).reduce((sum, part) => sum + countLines(part.value), 0);
    return `edit_file ${file} → +${added} −${removed} (proposal, nothing on disk)`;
  }
  if (name === 'verify_changes') {
    const firstLine = result.split(/\r?\n/, 1)[0].replace(/^(PASSED|FAILED):\s*/, '');
    return `verify_changes → ${safeSummaryValue(firstLine)}`;
  }
  const detail = args.path ?? args.query ?? args.command;
  return `${name}${detail === undefined ? '' : ` ${safeSummaryValue(detail)}`} → completed`;
}

export async function processTurn(
  client: TrueForge,
  sessionId: string,
  input: string,
  emit: (message: PanelOutboundMessage) => void,
  onStreamStarted?: () => void,
  options: { deferErrors?: boolean } = {}
): Promise<TurnResult> {
  const stream = await client.sessions.createTurnStream(sessionId, {
    input: [{ type: 'user.message', content: input }],
  });
  onStreamStarted?.();

  let full = '';
  let sawTerminalEvent = false;
  const callsByIndex = new Map<number, ToolCallState>();
  const callsById = new Map<string, ToolCallState>();
  const startedCalls = new Set<string>();

  const rememberCall = (id: string, name: string, args: string) => {
    const call = { id, name, arguments: args };
    callsById.set(id, call);
    return call;
  };
  const emitToolRequest = (id: string, status: 'requested' | 'approval_required') => {
    const call = callsById.get(id);
    emit({
      type: 'tool_start',
      id,
      name: call?.name || 'Tool request',
      argsPreview: safePreview(call?.arguments || '', 240),
      status,
    });
    startedCalls.add(id);
  };

  for await (const event of stream) {
    if (event.type === 'model.message.delta') {
      const content = event.content ?? '';
      full += content;
      emit({ type: 'text_delta', content });
      for (const delta of event.toolCalls ?? []) {
        let call = callsByIndex.get(delta.index);
        if (!call || (delta.id && call.id && call.id !== delta.id)) {
          // A new tool call reusing this index (next model message): start fresh.
          call = { name: '', arguments: '' };
          callsByIndex.set(delta.index, call);
        }
        if (delta.id) {
          call.id = delta.id;
          callsById.set(delta.id, call);
        }
        call.name += delta.function?.name ?? '';
        call.arguments += delta.function?.arguments ?? '';
      }
    } else if (event.type === 'model.message') {
      for (const call of event.toolCalls ?? []) {
        rememberCall(call.id, call.function.name, call.function.arguments);
      }
      callsByIndex.clear();
    } else if (event.type === 'tool.approval_required') {
      for (const toolCall of event.toolCalls) {
        if (!startedCalls.has(toolCall.id)) emitToolRequest(toolCall.id, 'approval_required');
      }
    } else if (event.type === 'tool.response_required') {
      for (const toolCall of event.toolCalls) {
        emitToolRequest(toolCall.id, 'requested');
      }
    } else if (event.type === 'tool.response') {
      const call = callsById.get(event.toolCallId);
      emit({
        type: 'tool_done',
        id: event.toolCallId,
        name: call?.name,
        summary: call ? formatToolSummary(call.name, call.arguments, event.content) : undefined,
        resultPreview: safePreview(event.content, 500),
      });
    } else if (event.type === 'turn.done') {
      sawTerminalEvent = true;
      if (event.state.status === 'error' && options.deferErrors) {
        // The caller will retry with a fallback model; it reports the error itself.
        return { status: 'error', message: event.state.message };
      }
      emit({ type: 'text_done', fullContent: full });
      if (event.state.status === 'error') {
        emit({ type: 'turn_done', status: 'error', message: event.state.message });
        return { status: 'error', message: event.state.message };
      } else if (event.state.status === 'cancelled') {
        emit({
          type: 'turn_done',
          status: 'cancelled',
          message: `Cancellation confirmed: ${event.state.reason}`,
        });
        return { status: 'cancelled', message: event.state.reason };
      } else {
        emit({ type: 'turn_done', status: 'done' });
      }
      return { status: 'done' };
    }
  }

  const missingTerminal = 'The event stream ended without a terminal turn event.';
  if (!sawTerminalEvent && options.deferErrors) return { status: 'error', message: missingTerminal };
  emit({ type: 'text_done', fullContent: full });
  if (!sawTerminalEvent) {
    emit({ type: 'turn_done', status: 'error', message: missingTerminal });
    return { status: 'error', message: missingTerminal };
  }
  return { status: 'done' };
}

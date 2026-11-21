import type { TrueForge } from '@truefoundry/trueforge-sdk';
import { formatToolSummary, processTurn } from '../../src/agent/streamProcessor';
import type { PanelOutboundMessage } from '../../../shared/types';

function fakeClient(events: unknown[]) {
  const stream = (async function* () {
    for (const event of events) yield event;
  })();
  const client = {
    sessions: {
      createTurnStream: async () => stream,
    },
  } as unknown as TrueForge;
  return client;
}

test('emits observed tool requests and results without claiming an unknown error status', async () => {
  const messages: PanelOutboundMessage[] = [];
  let streamStarted = false;
  const client = fakeClient([
    {
      type: 'model.message.delta',
      id: 'delta-1',
      threadId: 'main',
      content: 'Checking the file.',
      toolCalls: [{
        id: 'tool-1',
        index: 0,
        type: 'function',
        function: { name: 'read_file', arguments: '{"path":"src/app.ts"}' },
      }],
    },
    {
      type: 'tool.response_required',
      id: 'required-1',
      createdAt: '2026-01-01T00:00:00Z',
      threadId: 'main',
      toolCalls: [{ id: 'tool-1', sourceEventId: 'model-1' }],
    },
    {
      type: 'tool.response',
      id: 'response-1',
      createdAt: '2026-01-01T00:00:01Z',
      threadId: 'main',
      toolCallId: 'tool-1',
      content: 'source contents',
    },
    {
      type: 'turn.done',
      id: 'done-1',
      createdAt: '2026-01-01T00:00:02Z',
      threadId: null,
      state: {
        status: 'done',
        completedAt: '2026-01-01T00:00:02Z',
        output: null,
        requiredActions: [],
      },
    },
  ]);

  await processTurn(client, 'session-1', 'inspect the app', message => messages.push(message), () => {
    streamStarted = true;
  });

  expect(streamStarted).toBe(true);
  expect(messages).toContainEqual({
    type: 'tool_start',
    id: 'tool-1',
    name: 'read_file',
    argsPreview: '{"path":"src/app.ts"}',
    status: 'requested',
  });
  expect(messages).toContainEqual({
    type: 'tool_done',
    id: 'tool-1',
    name: 'read_file',
    summary: 'read_file src/app.ts → lines 1-1 of 1',
    resultPreview: 'source contents',
  });
  expect(messages).toContainEqual({ type: 'turn_done', status: 'done' });
});

test('formats concise summaries for search, edits, and verification', () => {
  expect(formatToolSummary('search_workspace', '{"query":"def routes"}', 'a.py:1\nb.py:2'))
    .toBe("search_workspace 'def routes' → 2 matches");
  expect(formatToolSummary('edit_file', '{"path":"src/app.py","old_string":"old\\n","new_string":"new\\nmore\\n"}', 'Edit registered for review (not written to disk yet).'))
    .toBe('edit_file src/app.py → +2 −1 (proposal, nothing on disk)');
  expect(formatToolSummary('verify_changes', '{}', 'PASSED: 60 passed in 1.2s\nCommand: pytest'))
    .toBe('verify_changes → 60 passed in 1.2s');
});

test('reports an unexpected stream end instead of inventing a successful completion', async () => {
  const messages: PanelOutboundMessage[] = [];
  await processTurn(fakeClient([]), 'session-1', 'inspect', message => messages.push(message));
  expect(messages).toContainEqual({
    type: 'turn_done',
    status: 'error',
    message: 'The event stream ended without a terminal turn event.',
  });
});

test('reports a cancelled turn from the terminal SDK event', async () => {
  const messages: PanelOutboundMessage[] = [];
  const client = fakeClient([
    {
      type: 'turn.done',
      id: 'done-cancelled',
      createdAt: '2026-01-01T00:00:02Z',
      threadId: null,
      state: {
        status: 'cancelled',
        completedAt: '2026-01-01T00:00:02Z',
        output: null,
        requiredActions: [],
      },
    },
  ]);

  await processTurn(client, 'session-1', 'inspect', message => messages.push(message));

  expect(messages).toContainEqual({
    type: 'text_done',
    fullContent: '',
  });
  expect(messages).toContainEqual(expect.objectContaining({
    type: 'turn_done',
    status: 'cancelled',
    message: expect.stringContaining('Cancellation confirmed'),
  }));
});

test('reports the terminal SDK error message', async () => {
  const messages: PanelOutboundMessage[] = [];
  const client = fakeClient([
    {
      type: 'turn.done',
      id: 'done-error',
      createdAt: '2026-01-01T00:00:02Z',
      threadId: null,
      state: {
        status: 'error',
        completedAt: '2026-01-01T00:00:02Z',
        message: 'Model execution failed',
      },
    },
  ]);

  await processTurn(client, 'session-1', 'inspect', message => messages.push(message));

  expect(messages).toContainEqual({
    type: 'turn_done',
    status: 'error',
    message: 'Model execution failed',
  });
});

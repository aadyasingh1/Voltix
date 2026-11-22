import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

export interface ResolvedSymbol {
  name: string;
  kind: string;
  path: string;
  absPath: string;
  startLine: number;
  endLine: number;
}

export function symbolKindName(kind: vscode.SymbolKind): string {
  const names = new Map<vscode.SymbolKind, string>([
    [vscode.SymbolKind.File, 'file'],
    [vscode.SymbolKind.Module, 'module'],
    [vscode.SymbolKind.Namespace, 'namespace'],
    [vscode.SymbolKind.Package, 'package'],
    [vscode.SymbolKind.Class, 'class'],
    [vscode.SymbolKind.Method, 'method'],
    [vscode.SymbolKind.Property, 'property'],
    [vscode.SymbolKind.Field, 'field'],
    [vscode.SymbolKind.Constructor, 'constructor'],
    [vscode.SymbolKind.Enum, 'enum'],
    [vscode.SymbolKind.Interface, 'interface'],
    [vscode.SymbolKind.Function, 'function'],
    [vscode.SymbolKind.Variable, 'variable'],
    [vscode.SymbolKind.Constant, 'constant'],
  ]);
  return names.get(kind) || 'symbol';
}

function findDocumentSymbol(symbols: vscode.DocumentSymbol[] | undefined, name: string):
  vscode.DocumentSymbol | undefined {
  for (const symbol of symbols || []) {
    if (symbol.name === name) return symbol;
    const nested = findDocumentSymbol(symbol.children, name);
    if (nested) return nested;
  }
  return undefined;
}

export async function resolveSymbol(name: string, workspaceRoot: string): Promise<ResolvedSymbol | undefined> {
  const matches = await vscode.commands.executeCommand<readonly vscode.SymbolInformation[]>(
    'vscode.executeWorkspaceSymbolProvider',
    name
  ) as readonly vscode.SymbolInformation[] | undefined;
  const exact = matches?.find(item => item.name === name) || matches?.[0];
  let absPath: string | undefined;
  let range: vscode.Range | undefined;

  if (exact) {
    absPath = exact.location.uri.fsPath;
    try {
      const documentSymbols = await vscode.commands.executeCommand<readonly vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        exact.location.uri
      ) as readonly vscode.DocumentSymbol[] | undefined;
      const symbol = findDocumentSymbol(documentSymbols ? [...documentSymbols] : [], name);
      range = symbol?.range || exact.location.range;
    } catch (_) {
      range = exact.location.range;
    }
  }

  if (!absPath) {
    const candidates = fs.readdirSync(workspaceRoot, { recursive: true }) as string[];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      if (!candidate.match(/\.(py|ts|tsx|js|jsx)$/)) continue;
      const abs = path.resolve(workspaceRoot, candidate);
      let text: string;
      try { text = fs.readFileSync(abs, 'utf8'); } catch (_) { continue; }
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const lines = text.split(/\r?\n/);
      const index = lines.findIndex(line => new RegExp(`(?:def|class|function)\\s+${escaped}\\b`).test(line));
      if (index >= 0) {
        absPath = abs;
        range = new vscode.Range(index, 0, index, lines[index].length);
        break;
      }
    }
  }

  if (!absPath || !range) return undefined;
  const rel = path.relative(workspaceRoot, absPath).replace(/\\/g, '/');
  return {
    name,
    kind: exact ? symbolKindName(exact.kind) : 'symbol',
    path: rel,
    absPath,
    startLine: range.start.line,
    endLine: range.end.line,
  };
}

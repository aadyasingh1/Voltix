import * as vscode from 'vscode';

export function getSettings() {
  const config = vscode.workspace.getConfiguration('voltix');
  return {
    baseUrl: config.get<string>('baseUrl', 'http://localhost:8790'),
    model: config.get<string>('model', 'openrouter/north-mini-code'),
    fallbackModels: config.get<string[]>('fallbackModels', []),
    contextTokenBudget: config.get<number>('contextTokenBudget', 8000),
    verifyEnabled: config.get<boolean>('verify.enabled', true),
    verifyCommand: config.get<string>('verify.command', ''),
    verifyMaxFixRounds: Math.max(0, Math.min(5, config.get<number>('verify.maxFixRounds', 2))),
    futuresProbeCommand: config.get<string>('futures.probeCommand', ''),
  };
}

/** Primary model first, then each configured fallback model (duplicates removed). */
export function getModelChain(): string[] {
  const settings = getSettings();
  return [...new Set([settings.model, ...(settings.fallbackModels ?? [])].filter(Boolean))];
}

import { createTrueForgeClient } from '../../src/agent/client';
import { createSession } from '../../src/agent/session';
import { getSettings } from '../../src/config/settings';

jest.mock('../../src/agent/client', () => ({
  createTrueForgeClient: jest.fn(),
}));
jest.mock('../../src/config/settings', () => ({
  getSettings: jest.fn(),
}));

const mockCreate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getSettings).mockReturnValue({
    baseUrl: 'http://localhost:8790',
    sessionUrlTemplate: '{baseUrl}/sessions/{id}',
    model: 'test-model',
    fallbackModels: [],
    contextTokenBudget: 8000,
    verifyEnabled: true,
    verifyCommand: '',
    verifyMaxFixRounds: 2,
    futuresProbeCommand: '',
  });
  const client = {
    sessions: { create: mockCreate },
  } as unknown as ReturnType<typeof createTrueForgeClient>;
  jest.mocked(createTrueForgeClient).mockReturnValue(client);
  mockCreate.mockResolvedValue({ data: { id: 'session-1' } });
});

test('uses submit_changes approval with deferred read tools and preloaded write tools', async () => {
  await createSession();

  const request = mockCreate.mock.calls[0][0] as {
    agent: {
      spec: {
        instructions: string;
        mcpServers: Array<{
          name: string;
          enableTools: string[];
          preload: boolean;
          preloadTools: string[];
          requireApprovalForTools: string[];
        }>;
          config: { contextManagement: { compaction: { enabled: boolean; trigger: { type: 'input_tokens'; value: number } } } };
        requireApprovalForTools?: string[];
      };
    };
  };
  const spec = request.agent.spec;

  expect(spec.instructions).toContain('propose_file_change');
  expect(spec.instructions).toContain('edit_file');
  expect(spec.instructions).toContain('COMPLETE new file content');
  expect(spec.instructions).toContain('submit_changes');
  expect(spec.mcpServers[0].requireApprovalForTools).toEqual(['submit_changes']);
  expect(spec.mcpServers[0].preloadTools).not.toContain('list_workspace_files');
  expect(spec.mcpServers[0].preloadTools).not.toContain('search_workspace');
  expect(spec.mcpServers[0].preloadTools).not.toContain('read_file');
  expect(spec.mcpServers).toEqual([
    expect.objectContaining({
      name: 'vscode-workspace',
      enableTools: ['@all'],
      preload: false,
      preloadTools: ['edit_file', 'propose_file_change', 'verify_changes', 'run_command', 'submit_changes'],
      requireApprovalForTools: ['submit_changes'],
    }),
  ]);
  expect(Object.prototype.hasOwnProperty.call(spec, 'requireApprovalForTools')).toBe(false);
  expect(spec.config.contextManagement).toEqual({
    compaction: {
      enabled: true,
      trigger: { type: 'input_tokens', value: 70000 },
    },
  });
});

test('uses the model passed in (fallback) instead of the configured one', async () => {
  await createSession('backup/model');
  expect(mockCreate.mock.calls[0][0].agent.spec.model).toEqual({ name: 'backup/model' });
});

test('sets a readable session title in TrueForge session metadata', async () => {
  await createSession('test-model', 'Voltix · Add config command');
  expect(mockCreate.mock.calls[0][0].metadata).toEqual({ title: 'Voltix · Add config command' });
});

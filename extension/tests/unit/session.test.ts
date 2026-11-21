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

test('uses MCP file proposals without TrueForge approval gates (the panel review is the gate)', async () => {
  await createSession();

  const request = mockCreate.mock.calls[0][0] as {
    agent: {
      spec: {
        instructions: string;
        mcpServers: Array<{
          name: string;
          enableTools: string[];
          preload: boolean;
          requireApprovalForTools: string[];
        }>;
        requireApprovalForTools?: string[];
      };
    };
  };
  const spec = request.agent.spec;

  expect(spec.instructions).toContain('propose_file_change');
  expect(spec.instructions).toContain('edit_file');
  expect(spec.instructions).toContain('COMPLETE new file content');
  expect(spec.mcpServers).toEqual([
    expect.objectContaining({
      name: 'vscode-workspace',
      enableTools: ['@all'],
      preload: true,
      requireApprovalForTools: [],
    }),
  ]);
  expect(Object.prototype.hasOwnProperty.call(spec, 'requireApprovalForTools')).toBe(false);
});

test('uses the model passed in (fallback) instead of the configured one', async () => {
  await createSession('backup/model');
  expect(mockCreate.mock.calls[0][0].agent.spec.model).toEqual({ name: 'backup/model' });
});

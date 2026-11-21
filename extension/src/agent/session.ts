import { createTrueForgeClient } from './client';
import { getSettings } from '../config/settings';
import agentDefinition from '../../../agent-definition.json';

interface DefinitionMcpServer {
  name: string;
  enable_tools?: string[];
  preload?: boolean;
  require_approval_for_tools?: string[];
}

/**
 * Builds the TrueForge agent spec from agent-definition.json (repo root), so the
 * definition committed to the repository is exactly the one the extension uses.
 * The model comes from the `voltix.model` setting (or a fallback model) so the
 * extension works with whatever model TrueForge is configured with.
 */
export function buildAgentSpec(modelName: string) {
  const spec = agentDefinition.spec;
  return {
    model: { name: modelName },
    instructions: spec.instructions.join('\n'),
    mcpServers: (spec.mcp_servers as DefinitionMcpServer[]).map(server => ({
      name: server.name,
      enableTools: server.enable_tools ?? ['@all'],
      preload: server.preload ?? true,
      requireApprovalForTools: server.require_approval_for_tools ?? [],
    })),
    config: { iterationLimit: spec.config.iteration_limit },
  };
}

export async function createSession(modelName?: string, title?: string) {
  const client = createTrueForgeClient();
  const settings = getSettings();
  const response = await client.sessions.create({
    agent: { spec: buildAgentSpec(modelName ?? settings.model) } as any,
    ...(title ? { metadata: { title } } : {}),
  });
  return { client, sessionId: (response as any).data?.id ?? (response as any).id };
}

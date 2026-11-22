import type { PanelOutboundMessage, PendingChange } from '../../../shared/types';

/** Anything that can show Voltix messages: the sidebar view, the editor tab, or the hub itself. */
export interface AgentSurface {
  post(message: PanelOutboundMessage): void;
}

const MAX_LOG = 4000;

/**
 * Sends every message to all open surfaces and remembers the current run, so a surface opened
 * mid-run (or recreated by VS Code) can catch up to exactly what the others are showing.
 */
export class SurfaceHub implements AgentSurface {
  private readonly surfaces = new Set<AgentSurface>();
  private log: PanelOutboundMessage[] = [];

  attach(surface: AgentSurface): () => void {
    this.surfaces.add(surface);
    return () => {
      this.surfaces.delete(surface);
    };
  }

  /** Starts a fresh history. Called when a run begins or the review is discarded. */
  beginRun(): void {
    this.log = [];
  }

  post(message: PanelOutboundMessage): void {
    this.record(message);
    for (const surface of this.surfaces) surface.post(message);
  }

  /** Replays the run to one surface, then the live review state (which outlives any single run). */
  replayTo(surface: AgentSurface, pending: PendingChange[]): void {
    for (const message of this.log) surface.post(message);
    for (const change of pending) surface.post({ type: 'change_decision', change });
  }

  private record(message: PanelOutboundMessage): void {
    const last = this.log[this.log.length - 1];
    if (message.type === 'text_delta' && last?.type === 'text_delta') {
      this.log[this.log.length - 1] = { type: 'text_delta', content: last.content + message.content };
      return;
    }
    this.log.push(message);
    if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG);
  }
}

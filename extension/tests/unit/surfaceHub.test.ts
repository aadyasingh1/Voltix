import { SurfaceHub, type AgentSurface } from '../../src/ui/surfaceHub';
import type { PanelOutboundMessage, PendingChange } from '../../../shared/types';

const surface = () => {
  const received: PanelOutboundMessage[] = [];
  const item: AgentSurface = { post: message => received.push(message) };
  return { item, received };
};

test('sends messages to every attached surface and stops after detach', () => {
  const hub = new SurfaceHub();
  const a = surface();
  const b = surface();
  const detachA = hub.attach(a.item);
  hub.attach(b.item);
  hub.post({ type: 'busy', busy: true });
  detachA();
  hub.post({ type: 'busy', busy: false });
  expect(a.received).toHaveLength(1);
  expect(b.received).toHaveLength(2);
});

test('a surface opened mid-run catches up, with streamed text merged', () => {
  const hub = new SurfaceHub();
  hub.post({ type: 'run_started', mode: 'agent' });
  hub.post({ type: 'text_delta', content: 'Hel' });
  hub.post({ type: 'text_delta', content: 'lo' });
  hub.post({ type: 'tool_start', id: '1', name: 'read_file', argsPreview: '' });
  const late = surface();
  hub.replayTo(late.item, []);
  expect(late.received).toEqual([
    { type: 'run_started', mode: 'agent' },
    { type: 'text_delta', content: 'Hello' },
    { type: 'tool_start', id: '1', name: 'read_file', argsPreview: '' },
  ]);
});

test('a new run clears history but live proposals are still replayed', () => {
  const hub = new SurfaceHub();
  hub.post({ type: 'text_delta', content: 'old run' });
  hub.beginRun();
  const change = { id: 'c1' } as PendingChange;
  const late = surface();
  hub.replayTo(late.item, [change]);
  expect(late.received).toEqual([{ type: 'change_decision', change }]);
});

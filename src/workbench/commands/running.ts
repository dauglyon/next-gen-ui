import { createEmitter } from '../../plugins/sdk';

// Which commands are running, by qualified name, so the control that invoked
// one can show itself busy until the handler settles.

export interface RunStore {
  start: (name: string) => void;
  end: (name: string) => void;
  running: (name: string) => boolean;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createRunStore(): RunStore {
  const counts = new Map<string, number>();
  const { subscribe, version, notify } = createEmitter();
  return {
    subscribe,
    version,
    start(name) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
      notify();
    },
    end(name) {
      const left = (counts.get(name) ?? 1) - 1;
      if (left > 0) counts.set(name, left);
      else counts.delete(name);
      notify();
    },
    running: (name) => counts.has(name),
  };
}

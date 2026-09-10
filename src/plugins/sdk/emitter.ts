// The subscription half of a store: listeners, a version for
// useSyncExternalStore, and one call that bumps the version and wakes them.
export interface Emitter {
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  notify: () => void;
}

export function createEmitter(): Emitter {
  let version = 0;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version: () => version,
    notify() {
      version += 1;
      listeners.forEach((l) => l());
    },
  };
}

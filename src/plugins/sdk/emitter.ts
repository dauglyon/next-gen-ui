// The subscribe/notify pair every store in the workbench carries. `version`
// counts notifies, so a store whose data is a Map can hand
// useSyncExternalStore a snapshot that changes exactly when the Map does.
export interface Emitter {
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  notify: () => void;
}

export function createEmitter(): Emitter {
  const listeners = new Set<() => void>();
  let version = 0;
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

// The subscribe/notify pair every store in the workbench carries. `version`
// counts notifies, so a store whose data is a Map can hand
// useSyncExternalStore a snapshot that changes exactly when the Map does.
export interface Emitter {
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  notify: () => void;
  // How many listeners are attached, for a store that runs a timer only
  // while something is watching.
  size: () => number;
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
    size: () => listeners.size,
    notify() {
      version += 1;
      listeners.forEach((l) => l());
    },
  };
}

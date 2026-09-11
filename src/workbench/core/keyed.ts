import { createEmitter } from '../../plugins/sdk';

// A map that notifies when an entry actually changes. The facts a panel
// reports after it renders (title, trail, terms) are each one of these,
// keyed by panel, with the equality the value needs and what an unset key
// reads as.
export interface KeyedStore<K, V> {
  get: (key: K) => V;
  set: (key: K, value: V) => void;
  forget: (key: K) => void;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createKeyedStore<K, V>(options: {
  empty: V;
  equal?: (a: V, b: V) => boolean;
}): KeyedStore<K, V> {
  const { empty, equal = Object.is } = options;
  const entries = new Map<K, V>();
  const { subscribe, version, notify } = createEmitter();
  return {
    subscribe,
    version,
    get: (key) => (entries.has(key) ? (entries.get(key) as V) : empty),
    set(key, value) {
      if (entries.has(key) && equal(entries.get(key) as V, value)) return;
      entries.set(key, value);
      notify();
    },
    forget(key) {
      if (entries.delete(key)) notify();
    },
  };
}

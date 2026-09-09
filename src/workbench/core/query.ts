import type { CartItem, CommandCall } from '../../plugins/sdk';

// What every plugin's `recommend` said about each source of terms.
//
// Three sources, asked separately because they change at different rates:
// the text being typed, the front tab's terms, and the cart's. The host
// carries terms and never reads one; its jobs are to ask each question
// once per settle, to drop answers to a question no longer being asked,
// and to remember what the user turned down.

export type QuerySource = 'typing' | 'page' | 'cart';
export const QUERY_SOURCES: readonly QuerySource[] = ['typing', 'page', 'cart'];

export interface Answer {
  plugin: string;
  commands: CommandCall[];
  cartItems: CartItem[];
}

export interface SourceState {
  // What the heading says the answers were computed from.
  label: string;
  pool: string[];
  answers: Answer[];
  // A request is out. The pane keeps what it has while this is true.
  loading: boolean;
}

export const EMPTY_SOURCE: SourceState = { label: '', pool: [], answers: [], loading: false };

// A Related row's identity, for dismissal: the same item proposed for the
// same source again stays gone.
export const rowKey = (source: QuerySource, plugin: string, id: string) =>
  `${source}:${plugin}:${id}`;

export interface QueryStore {
  get: (source: QuerySource) => SourceState;
  set: (source: QuerySource, state: SourceState) => void;
  dismiss: (key: string) => void;
  dismissed: (key: string) => boolean;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createQueryStore(): QueryStore {
  const states = new Map<QuerySource, SourceState>();
  const gone = new Set<string>();
  const listeners = new Set<() => void>();
  let version = 0;
  const changed = () => {
    version += 1;
    listeners.forEach((l) => l());
  };
  return {
    get: (source) => states.get(source) ?? EMPTY_SOURCE,
    set(source, state) {
      states.set(source, state);
      changed();
    },
    dismiss(key) {
      gone.add(key);
      changed();
    },
    dismissed: (key) => gone.has(key),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}

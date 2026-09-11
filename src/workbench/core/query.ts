import type { CartItem, CommandCall, Suggestion } from '../../plugins/sdk';
import { createEmitter } from '../../plugins/sdk';

// What every plugin's `recommend` said about each source of terms.
//
// Three sources, asked separately because they change at different rates:
// the text being typed, the front tab's terms, and the cart's. The host
// carries terms and never reads one; its jobs are to ask each question
// once per settle, to drop answers to a question no longer being asked,
// and to remember what the user turned down.

export type QuerySource = 'typing' | 'page' | 'cart';

export interface Answer {
  plugin: string;
  commands: CommandCall[];
  cartItems: CartItem[];
  // Given for an earlier question; shown dimmed until this plugin answers the
  // current one.
  stale?: boolean;
}

export interface SourceState {
  // What the heading says the answers were computed from.
  label: string;
  pool: string[];
  // In the registry's plugin order, whoever answered first.
  answers: Answer[];
  // Plugins asked the current question that have not answered yet.
  pending: string[];
  // Still within the budget with answers outstanding.
  loading: boolean;
  // What the chosen intent suggested for the text; the typing source only.
  // The previous answer stays until the next lands.
  suggestions?: Suggestion[];
}

const EMPTY_SOURCE: SourceState = {
  label: '',
  pool: [],
  answers: [],
  pending: [],
  loading: false,
  suggestions: [],
};

export interface QueryStore {
  get: (source: QuerySource) => SourceState;
  set: (source: QuerySource, state: SourceState) => void;
  // A dismissal stays whoever offers the item next: the key is the item's id.
  dismiss: (key: string) => void;
  dismissed: (key: string) => boolean;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createQueryStore(): QueryStore {
  const states = new Map<QuerySource, SourceState>();
  const gone = new Set<string>();
  const { subscribe, version, notify } = createEmitter();
  return {
    subscribe,
    version,
    get: (source) => states.get(source) ?? EMPTY_SOURCE,
    set(source, state) {
      states.set(source, state);
      notify();
    },
    dismiss(key) {
      gone.add(key);
      notify();
    },
    dismissed: (key) => gone.has(key),
  };
}

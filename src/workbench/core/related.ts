import type { Proposal, RelatedContext } from '../../plugins/sdk';

// What other plugins have to say about what is on screen and what is in the
// cart.
//
// The host collects terms, asks, and holds the answers. It never reads a term:
// a term is a key one plugin minted and another may recognise, and the shell's
// only jobs are to carry it, to ask each question once, and to stop asking
// when the answer is no longer wanted.
//
// Two contexts, asked separately, because the answers differ in kind: one
// protein on screen invites its taxon; four proteins in a cart invite the
// clade they share. They are deduplicated against each other — a protein that
// is both open and in the cart is asked about once, under `view`, or the same
// proposals arrive twice from two directions.

export interface RelatedItem {
  // The proposal's own id, prefixed with its plugin so two plugins cannot
  // collide on `top-hit`.
  key: string;
  plugin: string;
  context: RelatedContext;
  proposal: Proposal;
}

// A section says what it was computed from, and the two are computed from
// different things: a view has a subject, a cart has a size. Kept as a union
// so neither carries a field that means nothing to it.
interface SectionBase {
  items: RelatedItem[];
  // Beyond the per-plugin cap, by plugin title: `{ diaspora: 2 }`.
  overflow: Record<string, number>;
}

export type RelatedSection =
  // `alsoCart` when the cart holds nothing the view does not already cover:
  // one list answers both, and the heading says so rather than the pane
  // looking inert when someone adds the page they are on.
  | (SectionBase & { context: 'view'; subject: string; alsoCart: boolean })
  | (SectionBase & { context: 'cart'; count: number });

export interface RelatedState {
  sections: RelatedSection[];
  // A request is out. The pane keeps what it has while this is true.
  loading: boolean;
}

// Three per plugin per section. Enough that a plugin with a real answer is not
// truncated into uselessness, few enough that one chatty plugin cannot own the
// pane. The rest are counted, not dropped, so the pane can say what it is not
// showing.
export const PER_PLUGIN = 3;

export const keyOf = (plugin: string, id: string) => `${plugin}:${id}`;

// Cap by plugin, preserving the order plugins answered in.
export function capped(
  items: RelatedItem[],
  titleOf: (plugin: string) => string,
): { items: RelatedItem[]; overflow: Record<string, number> } {
  const seen = new Map<string, number>();
  const kept: RelatedItem[] = [];
  const overflow: Record<string, number> = {};
  for (const item of items) {
    const n = (seen.get(item.plugin) ?? 0) + 1;
    seen.set(item.plugin, n);
    if (n <= PER_PLUGIN) kept.push(item);
    else overflow[titleOf(item.plugin)] = (overflow[titleOf(item.plugin)] ?? 0) + 1;
  }
  return { items: kept, overflow };
}

export interface RelatedStore {
  get: () => RelatedState;
  set: (state: RelatedState) => void;
  // Remembered for the session, by proposal key: a suggestion turned down
  // should not come back on the next keystroke that changes the cart.
  dismiss: (key: string) => void;
  dismissed: (key: string) => boolean;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createRelatedStore(): RelatedStore {
  let state: RelatedState = { sections: [], loading: false };
  const gone = new Set<string>();
  const listeners = new Set<() => void>();
  let version = 0;
  const changed = () => {
    version += 1;
    listeners.forEach((l) => l());
  };
  return {
    get: () => state,
    set(next) {
      state = {
        ...next,
        sections: next.sections
          .map((s) => ({ ...s, items: s.items.filter((i) => !gone.has(i.key)) }))
          .filter((s) => s.items.length > 0),
      };
      changed();
    },
    dismiss(key) {
      gone.add(key);
      state = {
        ...state,
        sections: state.sections
          .map((s) => ({ ...s, items: s.items.filter((i) => i.key !== key) }))
          .filter((s) => s.items.length > 0),
      };
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

// The cart is asked only about what the view did not already cover.
export function split(viewTerms: readonly string[], cartTerms: readonly string[]) {
  const view = [...new Set(viewTerms)];
  const seen = new Set(view);
  return { view, cart: [...new Set(cartTerms)].filter((t) => !seen.has(t)) };
}

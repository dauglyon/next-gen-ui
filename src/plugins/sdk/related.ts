// What else in the workbench is about the thing you are looking at, or the
// things you have collected.
//
// The same bargain as the matcher, over a different input: the host
// broadcasts, plugins volunteer, and the host never interprets what any of it
// means. The matcher answers about text a user typed; this answers about
// `terms` — namespaced keys the workbench collects from the front panel and
// from the cart.
//
// A proposal is a LINK, not a payload. It names a page the answering plugin
// already knows how to draw, and the parameters to draw it with. Nothing is
// fetched to make one, and nothing is fetched to show one: a plugin that had
// to load a document to say "I have something about this" would make the pane
// cost a round trip per plugin per keystroke, for suggestions most of which
// are never taken.
//
// If accepting should also put something in the cart, the plugin says so on
// the proposal — `item`, filled in from what it already knows. It is a
// pointer plus a summary, and the app it points at is where the data lives.

import type { CartAddition } from './cart';

export type RelatedContext = 'view' | 'cart';

export interface RelatedRequest {
  // Namespaced keys, deduplicated by the host. A plugin answers on the
  // prefixes it recognises and stays silent on the rest.
  terms: readonly string[];
  // Where the terms came from. Passed because the answer can differ: one
  // protein on screen invites its taxon; four proteins in a cart invite what
  // they share.
  context: RelatedContext;
  // Aborted when the terms change or the pane closes, for a plugin that does
  // consult an index. Most implementations will not need it.
  signal: AbortSignal;
}

export interface Proposal {
  // Stable for the same suggestion about the same terms: the host dedupes on
  // it and remembers a dismissal by it.
  id: string;
  // What this is, in the answering plugin's words.
  label: string;
  detail?: string;
  // The answering plugin's route to open — the same thing a matcher's
  // `Offer.path` carries. This is the whole proposal: a place to go.
  path: string;
  // Optional, for a plugin that can also hand the workbench something to
  // carry. Built from what the plugin already has; the host will not wait on
  // a fetch for it. Omit it and the row only opens the page.
  item?: Omit<CartAddition, 'id'> & { id?: string };
}

// Answers from what the plugin knows. Not a place to load a document.
export type Related = (request: RelatedRequest) => Promise<Proposal[]> | Proposal[];

export interface RelatedModule {
  related: Related;
}

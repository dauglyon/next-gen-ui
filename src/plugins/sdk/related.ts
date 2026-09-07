// What else in the workbench touches the thing you are looking at, or the
// things you have collected.
//
// The same bargain as the matcher: the host broadcasts, plugins volunteer,
// and the host never interprets what any of it means. The matcher answers
// about text a user typed; this answers about `terms` — namespaced keys the
// workbench collects from the front tab and from the cart.
//
// Two calls rather than one, because the work divides that way. A proposal is
// cheap: a label and the terms it is about, enough to list. The payload is
// built only for the proposal a user accepts, by `resolve`. Answering "what do
// I have about this?" should not cost every plugin a full fetch for something
// nobody will press.

import type { CartAddition } from './cart';

export type RelatedContext = 'view' | 'cart';

export interface RelatedRequest {
  // Namespaced keys, deduplicated by the host. A plugin answers on the
  // prefixes it recognises.
  terms: readonly string[];
  // Where the terms came from. Passed because the answer can differ: one
  // protein on screen invites its taxon; four proteins in a cart invite the
  // clade they share.
  context: RelatedContext;
  // Aborted when the terms change or the pane closes. A slow answer to a
  // question nobody is asking any more is dropped.
  signal: AbortSignal;
}

export interface Proposal {
  // Stable for the same suggestion about the same terms: the host dedupes on
  // it, and a dismissal is remembered by it.
  id: string;
  // What accepting it would add, in the plugin's words.
  label: string;
  // A second line, where the label needs one.
  detail?: string;
  // What this is about, for the host's own bookkeeping.
  terms?: string[];
}

// Fetches, and may be slow. Returning [] is the normal answer.
export type Related = (request: RelatedRequest) => Promise<Proposal[]>;

// Builds the item, once, for the proposal the user accepted. The host stamps
// `plugin` and `addedAt` as it does for any addition.
export type ResolveProposal = (
  id: string,
  signal: AbortSignal,
) => Promise<CartAddition | undefined>;

export interface RelatedModule {
  related: Related;
  resolve: ResolveProposal;
}

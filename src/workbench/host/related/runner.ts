import type { HostIndex } from '../installed';
import type { CartStore, RelatedItem, RelatedSection, RelatedStore } from '../../core';
import { capped, keyOf, split } from '../../core';

// Asking every plugin what it has about the terms on screen and in the cart.
//
// The shell carries terms and never reads one. Its contribution is asking each
// question once, asking nobody about their own view, dropping answers to
// questions no longer being asked, and holding what comes back.
//
// Nothing here fetches a document. A proposal is a link the answering plugin
// already knew how to make, so a round of questions costs no network unless a
// plugin chooses to spend it.

// Long enough that adding three items to a cart is one round of questions
// rather than three, short enough that the pane does not feel detached from
// what the user just did.
export const SETTLE_MS = 250;

export interface RelatedInput {
  view: { plugin: string; subject: string; terms: string[] } | null;
  cart: { count: number; terms: string[] };
  // Cart item ids, so something already carried is not proposed again.
  held: string[];
}

export interface RelatedRunner {
  run: (input: RelatedInput) => void;
  // Puts the item a proposal offered into the cart. No network: the plugin
  // built it from what it had when it answered.
  accept: (key: string) => void;
  stop: () => void;
}

export function createRelatedRunner(
  source: HostIndex,
  cart: CartStore,
  store: RelatedStore,
): RelatedRunner {
  let timer: number | undefined;
  let inflight: AbortController | undefined;
  // The last answers, by key, so accepting one has the item to add.
  const answers = new Map<string, RelatedItem>();

  const ask = async (input: RelatedInput) => {
    inflight?.abort();
    const controller = new AbortController();
    inflight = controller;

    const { view, cart: cartTerms } = split(input.view?.terms ?? [], input.cart.terms);
    if (view.length === 0 && cartTerms.length === 0) {
      store.set({ sections: [], loading: false });
      return;
    }
    store.set({ ...store.get(), loading: true });

    const modules = await source.relatedModules();
    if (controller.signal.aborted) return;

    const gather = async (terms: string[], context: 'view' | 'cart'): Promise<RelatedItem[]> => {
      if (terms.length === 0) return [];
      // Part of every key below. A plugin may reuse a proposal id across
      // subjects — Function Junction's demo pair answers `dossier:P0AEX9` for
      // any taxon — so without this, turning a suggestion down on one page
      // would silently turn it down on every other page it appears for.
      const about = [...terms].sort().join(',');
      const answered = await Promise.all(
        modules.map(async ({ plugin, module }) => {
          // A plugin is never handed its own view back: Function Junction has
          // no business offering an FJ page for the protein already open.
          if (context === 'view' && plugin === input.view?.plugin) return [];
          try {
            const proposals = await module.related({ terms, context, signal: controller.signal });
            return proposals.map((proposal) => ({
              // The context and the terms are part of the key: the same
              // suggestion arriving from both directions is two rows, and a
              // dismissal belongs to the question it answered.
              key: keyOf(plugin, `${context}:${about}:${proposal.id}`),
              plugin,
              context,
              proposal,
            }));
          } catch (err) {
            if (controller.signal.aborted) return [];
            console.warn(`plugin ${plugin}: its related() threw; ignoring it`, err);
            return [];
          }
        }),
      );
      return answered.flat();
    };

    const [viewItems, cartItems] = await Promise.all([
      gather(view, 'view'),
      gather(cartTerms, 'cart'),
    ]);
    if (controller.signal.aborted) return;

    for (const item of [...viewItems, ...cartItems]) answers.set(item.key, item);

    const titleOf = (id: string) => source.manifest(id)?.title ?? id;
    // What the cart already holds is not a proposal. Compared on the id the
    // item would be added under — the plugin's own, stamped the same way
    // `accept` will stamp it.
    const held = new Set(input.held);
    const fresh = (items: RelatedItem[]) =>
      items.filter(
        (i) => !store.dismissed(i.key) && !(i.proposal.item && held.has(itemIdOf(i))),
      );

    const sections: RelatedSection[] = [];
    if (input.view) {
      const { items, overflow } = capped(fresh(viewItems), titleOf);
      if (items.length)
        sections.push({ context: 'view', subject: input.view.subject, items, overflow });
    }
    {
      const { items, overflow } = capped(fresh(cartItems), titleOf);
      if (items.length)
        sections.push({ context: 'cart', count: input.cart.count, items, overflow });
    }
    // Forget only what is no longer on screen: `accept` reads this map from a
    // click handler, and a round finishing between the render and the press
    // would otherwise make the press do nothing.
    const shown = new Set(sections.flatMap((sec) => sec.items.map((i) => i.key)));
    for (const key of answers.keys()) if (!shown.has(key)) answers.delete(key);

    store.set({ sections, loading: false });
  };

  return {
    run(input) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void ask(input), SETTLE_MS);
    },
    accept(key) {
      const item = answers.get(key);
      const addition = item?.proposal.item;
      if (!item || !addition) return;
      cart.add({
        ...addition,
        id: itemIdOf(item),
        plugin: item.plugin,
        addedAt: Date.now(),
      });
      // Not dismissed: it is in the cart, and the next round filters on that,
      // so removing it from the cart brings the proposal back.
    },
    stop() {
      window.clearTimeout(timer);
      inflight?.abort();
    },
  };
}

// The id an accepted proposal lands under. The plugin may name it; otherwise
// it is derived from the proposal, and either way it is stamped with the
// plugin so two plugins cannot overwrite each other.
export function itemIdOf(item: RelatedItem): string {
  return item.proposal.item?.id ?? `${item.plugin}:${item.proposal.id}`;
}

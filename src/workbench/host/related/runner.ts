import type { HostIndex } from '../installed';
import type { CartStore, RelatedItem, RelatedSection, RelatedStore } from '../../core';
import { keyOf, split } from '../../core';

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
  view: { plugin: string; subject: string; terms: string[]; params: Record<string, string> } | null;
  cart: { count: number; terms: string[] };
  // Cart item ids, so something already carried is not proposed again.
  held: string[];
  // `plugin params` for every document open in the main area, so a page
  // already on screen is not proposed either.
  open: string[];
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
      store.set({ sections: [], loading: false, covered: 0 });
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
      // Two terms can lead a plugin to the same page — a protein's accession
      // and its taxon both reach the same dossier here — and two rows opening
      // the same thing is noise. First answer wins, since a plugin orders its
      // own proposals.
      const seen = new Set<string>();
      return answered.flat().filter((item) => {
        const target = `${item.plugin} ${JSON.stringify(item.proposal.params)}`;
        if (seen.has(target)) return false;
        seen.add(target);
        return true;
      });
    };

    const [viewItems, cartItems] = await Promise.all([
      gather(view, 'view'),
      gather(cartTerms, 'cart'),
    ]);
    if (controller.signal.aborted) return;

    for (const item of [...viewItems, ...cartItems]) answers.set(item.key, item);

    // A proposal is a thing to go and get. Something already in the cart, or
    // already open in a tab, is neither: the reader has it. Both are dropped
    // outright rather than shown as a link with the `+` removed — a pane of
    // rows for things you already have is a pane you learn to skip.
    //
    // The cart is compared on the id the item would be added under — the
    // plugin's own, stamped the same way `accept` will stamp it. Tabs are
    // compared on plugin and params, which is what a panel's identity is.
    const held = new Set(input.held);
    const open = new Set(input.open);
    let covered = 0;
    const fresh = (items: RelatedItem[]) =>
      items.filter((i) => {
        if (store.dismissed(i.key)) return false;
        const has =
          open.has(`${i.plugin} ${JSON.stringify(i.proposal.params)}`) || held.has(itemIdOf(i));
        if (has) covered += 1;
        return !has;
      });

    const sections: RelatedSection[] = [];
    if (input.view) {
      const items = fresh(viewItems);
      if (items.length)
        sections.push({
          context: 'view',
          subject: input.view.subject,
          // The cart holds this page's own subject: adding it produced no new
          // question, so there is no second section — but the pane still has
          // to show that the cart is part of what is being asked, or adding
          // something appears to do nothing at all.
          alsoCart: input.cart.count > 0 && cartTerms.length === 0,
          items,
        });
    }
    {
      const items = fresh(cartItems);
      if (items.length) sections.push({ context: 'cart', count: input.cart.count, items });
    }
    // Forget only what is no longer on screen: `accept` reads this map from a
    // click handler, and a round finishing between the render and the press
    // would otherwise make the press do nothing.
    const shown = new Set(sections.flatMap((sec) => sec.items.map((i) => i.key)));
    for (const key of answers.keys()) if (!shown.has(key)) answers.delete(key);

    store.set({ sections, loading: false, covered });
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

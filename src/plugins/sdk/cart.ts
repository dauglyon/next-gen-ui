import { useCallback, useContext, useSyncExternalStore } from 'react';
import { HostContext } from './host';

// Adding something to the cart, from inside a plugin.
//
//   const cart = useCart();
//   <Button onClick={() => cart.add({ ... })}>Add to cart</Button>
//
// What to put in an item — the part that matters, because the host cannot
// check it and an assistant cannot ask for more:
//
//   id       Derive it from what the thing *is*, so adding twice is the same
//            item: `function-junction:protein:P0AEX9`, not a counter. Re-adding
//            replaces, which is how a plugin refreshes a stale payload.
//
//   kind     Your word for the sort of thing — `protein`, `genome`, `table`.
//            Yours, deliberately: there is no registry of kinds and no
//            agreement between plugins about them. A consumer reads it as a
//            label from you, not as a member of a set it can enumerate.
//
//   name     What the user would call it, not an accession, if you have both.
//            It is what the tray's tooltip shows; the tile itself shows the
//            summary, and wears your plugin's logo rather than a mark of its
//            own.
//
//   subject  What it is about, when that differs from the item itself — the
//            protein an evidence line came from, the genome a run used. The
//            tile leads with this and the figure sits under it, so an item
//            whose summary is a bare number still says what of.
//
//   terms    Namespaced keys anything else might recognise:
//            `uniprot:P0AEX9`, `taxon:562`. They are how the workbench asks
//            other plugins what relates to this item — omit them and the item
//            is still a cart item, just an isolated one.
//
//   content  What was added, as JSON. Send the data, not a handle to it: an
//            item outlives the panel it came from, and a consumer should never
//            have to call back into your plugin to find out what it holds.
//
//   context  What a reader of `content` needs and cannot infer — units, the
//            population a number was measured over, how the evidence was
//            reached, the caveats you would print beside it. This is the field
//            that decides whether an assistant's answer is any good, and it is
//            the one most often left empty.
//
//   source   The path that reopens your route on this thing. The pointer half:
//            it is what lets a user get back to it and lets you refresh it.
//
// Send both halves. A pointer alone makes every consumer re-fetch and strands
// the item when a service is slow; a payload alone leaves the user unable to
// get back to the thing it came from.

export interface CartAddition {
  id: string;
  kind: string;
  name: string;
  subject?: string;
  summary?: string;
  // Namespaced keys other plugins may recognise — `uniprot:P0AEX9`,
  // `taxon:562`. Optional and unpoliced: a plugin answers on the prefixes it
  // knows and stays silent on the rest, the same way a matcher does. This is
  // what lets a second plugin say something about an item without knowing
  // anything about the plugin that added it.
  terms?: string[];
  source?: { path?: string; href?: string };
  content?: unknown;
  context?: Record<string, unknown>;
}

// An item as it sits in the cart. The host stamps `plugin` and `addedAt`.
export interface CartItem extends CartAddition {
  plugin: string;
  addedAt: number;
}

export interface CartHandle {
  add: (item: CartAddition) => void;
  remove: (id: string) => void;
  // Whether this id is already in the cart, so a button can say "Added" and
  // a second press can take it out again.
  has: (id: string) => boolean;
  count: number;
}

export function useCart(): CartHandle {
  const host = useContext(HostContext);
  const cart = host?.cart;

  // Subscribed, so a button that reads `has()` re-renders when the user
  // removes the item from the tray rather than from the button.
  const count = useSyncExternalStore(
    useCallback((cb: () => void) => cart?.subscribe(cb) ?? (() => {}), [cart]),
    () => cart?.count() ?? 0,
    () => 0,
  );

  const add = useCallback((item: CartAddition) => cart?.add(item), [cart]);
  const remove = useCallback((id: string) => cart?.remove(id), [cart]);
  const has = useCallback((id: string) => cart?.has(id) ?? false, [cart]);

  return { add, remove, has, count };
}

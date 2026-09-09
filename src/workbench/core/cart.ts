import { z } from 'zod';

// Things the user has set aside to work with.
//
// A cart item is a payload *and* a pointer, and generous about both. The
// payload is what was added, plus whatever an assistant needs to reason about
// it — so an assistant can act without calling back into the plugin, and the
// item still means something after the panel it came from is closed. The
// pointer is where it came from, so the user can reopen it and a plugin can
// refresh it.
//
// Carrying both is the whole design. A pointer alone makes every consumer
// re-fetch, and makes an item useless the moment a service is slow or a session
// is restored somewhere else. A payload alone strands the item: a reader cannot
// get back to the thing, and nothing can tell whether it is still current.
//
// The host owns the cart, because items come from plugins and are consumed by
// assistants and neither can hold state the other reaches. It is plain JSON for
// the same reason it is host-owned: it is written to storage now and may be
// synced to an account later, and neither is possible if an item can hold a
// function, a DOM node, or a class instance.

export const CartItemSchema = z.object({
  // Stable and content-derived, so adding the same thing twice is idempotent
  // rather than a second copy. A plugin builds it from what the item *is* —
  // `function-junction:protein:P0AEX9` — not from a counter or a timestamp.
  id: z.string().min(1),
  // The plugin that added it. Its manifest supplies the icon and colour if the
  // item names none, so items from one tool look like each other.
  plugin: z.string().min(1),
  // What sort of thing this is, in the adding plugin's own words: `protein`,
  // `genome`, `table`, `figure`. Free text by design — the host neither
  // supplies a vocabulary nor checks against one.
  kind: z.string().min(1),
  // What a person calls it.
  name: z.string().min(1),
  // What the item is *about*, if that is a different thing from the item: the
  // protein an evidence line was read off, the genome a job ran against. The
  // tile leads with it, because a figure without its subject — `2 small
  // molecules` — is not something a reader can act on.
  subject: z.string().optional(),
  // One line a person reads on the chip's tooltip and an assistant reads first.
  summary: z.string().optional(),
  // Namespaced keys another plugin may recognise (`uniprot:P0AEX9`). The
  // workbench asks with them; it never interprets them.
  terms: z.array(z.string()).optional(),

  // POINTER — how to get back to it. `params` opens the plugin's document; the
  // href is for anything outside the workbench.
  source: z
    .object({
      params: z.record(z.string(), z.string()).optional(),
      href: z.string().optional(),
    })
    .optional(),

  // PAYLOAD — the thing itself, as JSON. Whatever the Add button captured.
  content: z.unknown().optional(),

  // Everything an assistant would otherwise have to ask for: units, the
  // population a number was measured over, the route the evidence took, the
  // caveats the builder attached. Named separately from `content` because it
  // describes the content rather than being it, and because an assistant should
  // be able to read the caveats without parsing the data.
  context: z.record(z.string(), z.unknown()).optional(),

  addedAt: z.number(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

// What a plugin passes to the SDK's adder. The host fills in the rest.
export type CartAddition = Omit<CartItem, 'plugin' | 'addedAt'> & {
  plugin?: string;
  addedAt?: number;
};

export interface CartStore {
  items: () => readonly CartItem[];
  // Idempotent on `id`: adding the same thing twice replaces it, so a plugin
  // may re-add to refresh a payload without the user seeing a duplicate.
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

export const CART_STORAGE_KEY = 'kbase-workbench-cart.v2';

// A stored cart is read back item by item: one item written by an older build,
// or truncated by a full disk, costs the user that item and not the cart.
export function readCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      const item = CartItemSchema.safeParse(entry);
      return item.success ? [item.data] : [];
    });
  } catch {
    return [];
  }
}

export function createCartStore(initial: CartItem[] = []): CartStore {
  const items = new Map<string, CartItem>(initial.map((i) => [i.id, i]));
  let version = 0;
  const listeners = new Set<() => void>();
  const changed = () => {
    version += 1;
    listeners.forEach((l) => l());
  };

  return {
    items: () => [...items.values()],
    add(item) {
      items.set(item.id, item);
      changed();
    },
    remove(id) {
      if (!items.delete(id)) return;
      changed();
    },
    clear() {
      if (items.size === 0) return;
      items.clear();
      changed();
    },
    has: (id) => items.has(id),
    version: () => version,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

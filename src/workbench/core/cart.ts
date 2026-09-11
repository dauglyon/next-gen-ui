import { z } from 'zod';
import { CartAdditionSchema, createEmitter } from '../../plugins/sdk';

// Things the user has set aside to work with. What an item is, and why it
// carries no data, is documented where plugins build one: the SDK's cart.ts.
//
// The host owns the cart, because items come from plugins and are consumed by
// assistants and neither can hold state the other reaches. It is plain JSON for
// the same reason it is host-owned: it is written to storage now and may be
// synced to an account later, and neither is possible if an item can hold a
// function, a DOM node, or a class instance.
export const CartItemSchema = CartAdditionSchema.extend({
  // The plugin that added it. Its manifest supplies the icon and colour if the
  // item names none, so items from one tool look like each other.
  plugin: z.string().min(1),
  addedAt: z.number(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

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
  const { subscribe, version, notify } = createEmitter();
  return {
    subscribe,
    version,
    items: () => [...items.values()],
    add(item) {
      items.set(item.id, item);
      notify();
    },
    remove(id) {
      if (!items.delete(id)) return;
      notify();
    },
    clear() {
      if (items.size === 0) return;
      items.clear();
      notify();
    },
    has: (id) => items.has(id),
  };
}

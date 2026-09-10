import { useContext, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { CommandValuesSchema } from './contract';
import { HostContext } from './host';

// An item carries no data: what it names is fetched by whoever consumes it,
// through `terms` and `source`, from where the data lives. `id` is derived
// from what the thing is (`function-junction:protein:P0AEX9`, not a
// counter), so adding twice is one item and re-adding replaces. `subject` is
// what the item is about when that differs from the item itself; the tile
// leads with it. `context` is what an assistant reads and could not infer:
// units, population, caveats. Small: it goes into a prompt.

// A path on the adding plugin's route, or one of its commands with the
// arguments that produce the item. A bare command name is the plugin's own.
export const CartSourceSchema = z.union([
  z.object({ path: z.string() }),
  z.object({ command: z.string(), args: CommandValuesSchema.optional() }),
]);
export type CartSource = z.infer<typeof CartSourceSchema>;

// What the host validates a stored item against, extended with what it
// stamps on (the adding plugin, the time).
export const CartItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().optional(),
  summary: z.string().optional(),
  // Optional and unpoliced: a plugin answers on the prefixes it knows and
  // stays silent on the rest, the same way `terms` does. This is what lets
  // a second plugin say something about an item without knowing anything
  // about the plugin that added it.
  terms: z.array(z.string()).optional(),
  source: CartSourceSchema.optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

// The slice of the host's cart a plugin can see. It cannot read other
// plugins' items: what is in the cart is the user's business and the
// assistant's, and a plugin that could read it could fingerprint the session.
export interface Cart {
  // Same id replaces.
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  // This plugin's items only, as the host holds them, so a page can rebuild
  // its own controls after a reload.
  items: () => readonly CartItem[];
  has: (id: string) => boolean;
  count: () => number;
  subscribe: (listener: () => void) => () => void;
}

// Outside a workbench panel: nothing in, nothing added.
const NO_CART: Cart = {
  add: () => {},
  remove: () => {},
  items: () => [],
  has: () => false,
  count: () => 0,
  subscribe: () => () => {},
};

// Re-renders the caller on change, so a button that reads `has()` updates
// when the item is removed from the tray rather than from the button.
export function useCart(): Cart {
  const cart = useContext(HostContext)?.cart ?? NO_CART;
  useSyncExternalStore(cart.subscribe, cart.count, () => 0);
  return cart;
}

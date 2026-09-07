import { createContext, useContext } from 'react';
import type { PanelParams } from './panel';
import type { CartAddition } from './cart';

// What a plugin may ask the workbench to do. Deliberately small: opening the
// plugin's own document, running a registered command, and setting something
// aside in the cart.
export interface PluginHost {
  openDocument: (params: PanelParams) => void;
  runCommand: (name: string, values?: Record<string, string | number>) => Promise<void>;
  // The cart is the host's; a plugin adds to it and reads whether a thing of
  // its own is in it. Reached through `useCart()` rather than directly, so a
  // plugin does not have to hold the handle.
  cart: PluginCart;
}

// The slice of the host's cart a plugin can see. It cannot read other plugins'
// items: what is in the cart is the user's business and the assistant's, and a
// plugin that could read it could fingerprint the session.
export interface PluginCart {
  add: (item: CartAddition) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  count: () => number;
  subscribe: (listener: () => void) => () => void;
}

export const HostContext = createContext<PluginHost | null>(null);

export function useHost(): PluginHost {
  const host = useContext(HostContext);
  if (!host) throw new Error('useHost() called outside a workbench panel');
  return host;
}

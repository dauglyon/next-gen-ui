import { createContext, useContext } from 'react';
import type { Cart } from './cart';
import type { CommandValues } from './contract';

// A command is the plugin's own by bare name, another's by "plugin:name".
export interface PluginHost {
  // This plugin's page at a path. A panel already showing the same page,
  // as the route's `normalize` judges it, is focused instead of a second
  // one opening; `duplicate` asks for the second one anyway.
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;
  // Resolves when the handler resolves, with nothing: data between plugins
  // travels as terms and cart items, not as return values.
  execute: (command: string, args?: CommandValues) => Promise<void>;
  hasCommand: (command: string) => boolean;
  // A toast, for an outcome only the plugin can see: a command that changed
  // nothing visible, a neighbour that is not installed.
  notify: (text: string) => void;
  // Reached through `useCart()`, which also re-renders on change.
  cart: Cart;
}

export const HostContext = createContext<PluginHost | null>(null);

export function useHost(): PluginHost {
  const host = useContext(HostContext);
  if (!host) throw new Error('useHost() called outside a workbench panel');
  return host;
}

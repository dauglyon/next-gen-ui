import { createInstance } from '@module-federation/runtime';

import type { PluginEntry } from './registry';
import type { Plugin } from './sdk';

// Remotes are registered at runtime from the registry, not at build time.
const federation = createInstance({ name: 'spa', remotes: [] });
const registered = new Set<string>();

/** Register a plugin's remote so `loadPlugin` can reach it. Idempotent. */
export function registerPlugin(entry: PluginEntry): void {
  federation.registerRemotes([{ name: entry.id, entry: entry.manifestUrl }], {
    force: registered.has(entry.id),
  });
  registered.add(entry.id);
}

/** Load a registered plugin's `./Plugin` module. */
export async function loadPlugin(id: string): Promise<Plugin> {
  const mod = await federation.loadRemote<{ default: Plugin }>(`${id}/Plugin`);
  if (!mod?.default?.Component) {
    throw new Error(`Plugin "${id}" exposed no valid ./Plugin module.`);
  }
  return mod.default;
}

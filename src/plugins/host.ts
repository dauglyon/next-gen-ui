import { createInstance } from '@module-federation/runtime';
import type { ComponentType } from 'react';
import type { AnyRouter } from '@tanstack/react-router';

import type { PluginEntry } from './registry';

/**
 * What the host passes to a plugin. `router` is the app's router (for
 * app-level navigation); `basepath` is the plugin's mount, `/{id}`. A
 * plugin builds its own router over the app's shared history to route in
 * local paths:
 *
 *   createRouter({ routeTree, history: router.history, basepath })
 */
export interface PluginProps {
  router: AnyRouter;
  basepath: string;
}

/** A plugin's `./Plugin` module default-exports this. */
export interface Plugin {
  Component: ComponentType<PluginProps>;
}

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

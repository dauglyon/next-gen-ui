import type { PluginHost } from '../../plugins/sdk';
import type { PluginId } from '../core';
import { createWorkbenchStore, defaultLayout, deserialize, makePanel, serialize } from '../core';
import { createCommandRegistry, workbenchCommands } from '../commands';
import { createAnnouncer, createTitleStore } from '../react';
import type { WorkbenchServices } from '../react';
import { fallbackTitle } from '../react/context';
import { createPromptHandle } from '../react/services';
import type { InstalledPlugin } from './installed';
import { createHostIndex } from './installed';
import { createSettingsStore } from './settings';

export const LAYOUT_STORAGE_KEY = 'workbench.layout.v1';

export interface CreateWorkbenchOptions {
  installed: InstalledPlugin[];
  // null for tests and for a browser with storage disabled.
  storage: Storage | null;
  defaultPinned?: PluginId[];
  // The plugin whose prompt handler answers the bar until the user picks.
  defaultAssistant?: PluginId | null;
}

// Builds the store, the command registry and their companions once, before
// React mounts. The layout is read from storage here so the first render is
// already the restored one.
export function createWorkbench({
  installed,
  storage,
  defaultPinned = [],
  defaultAssistant = null,
}: CreateWorkbenchOptions): WorkbenchServices {
  const titles = createTitleStore();
  const announcer = createAnnouncer();
  const prompt = createPromptHandle();
  const focusIntentRef: WorkbenchServices['focusIntentRef'] = { current: 'command' };
  const source = createHostIndex(installed);
  const settings = createSettingsStore(storage, { assistant: defaultAssistant });

  const fallback = () => defaultLayout({ pinned: defaultPinned });
  const store = createWorkbenchStore({
    initial: deserialize(read(storage), fallback),
    title: (id, panel) => titles.get(id) ?? fallbackTitle(services, panel, id),
  });

  const registry = createCommandRegistry();
  const dispatch: WorkbenchServices['dispatch'] = (op) => {
    const result = store.dispatch(op);
    if (result.changed) announcer.announce(result.announcement);
    return result.changed;
  };
  const services: WorkbenchServices = {
    store,
    registry,
    source,
    settings,
    titles,
    announcer,
    prompt,
    focusIntentRef,
    dispatch,
  };

  workbenchCommands({
    store,
    announce: announcer.announce,
    plugins: () => source.plugins().map((p) => p.id),
    focusPrompt: () => prompt.focus(),
  }).forEach((c) => registry.register(c));
  source.registerCommands(registry, (plugin) => pluginHostFor(services, plugin));

  if (storage) {
    store.subscribe(() => {
      try {
        storage.setItem(LAYOUT_STORAGE_KEY, serialize(store.get()));
      } catch {
        // Quota or privacy mode: the session still works, it just won't persist.
      }
    });
  }
  return services;
}

// What a plugin's code may do to the workbench, scoped to that plugin.
export function pluginHostFor(services: WorkbenchServices, plugin: PluginId): PluginHost {
  return {
    openDocument: (params) =>
      void services.dispatch({ type: 'open', panel: makePanel(plugin, 'document', params) }),
    runCommand: async (name, values = {}) => {
      await services.registry.run(name, values);
    },
  };
}

function read(storage: Storage | null): string | null {
  try {
    return storage?.getItem(LAYOUT_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

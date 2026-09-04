import type { PluginId } from '../core';
import { createWorkbenchStore, defaultLayout, deserialize, serialize } from '../core';
import { createCommandRegistry, workbenchCommands } from '../commands';
import { createAnnouncer, createTitleStore } from '../react';
import { createPromptHandle } from '../react/services';
import type { WorkbenchServices } from '../react';
import { fallbackTitle } from '../react/context';
import type { PanelSource } from './types';

export const LAYOUT_STORAGE_KEY = 'workbench.layout.v1';

export interface CreateWorkbenchOptions {
  source: PanelSource;
  // null for tests and for a browser with storage disabled.
  storage: Storage | null;
  defaultPinned?: PluginId[];
}

// Builds the store, the command registry and their companions once, before
// React mounts. The layout is read from storage here so the first render is
// already the restored one.
export function createWorkbench({
  source,
  storage,
  defaultPinned = [],
}: CreateWorkbenchOptions): WorkbenchServices {
  const titles = createTitleStore();
  const announcer = createAnnouncer();
  const prompt = createPromptHandle();
  const focusIntentRef: WorkbenchServices['focusIntentRef'] = { current: 'command' };

  const fallback = () => defaultLayout({ pinned: defaultPinned });
  const store = createWorkbenchStore({
    initial: deserialize(read(storage), fallback),
    title: (id) => titles.get(id) ?? fallbackTitle(services, store.get().panels[id], id),
  });

  const registry = createCommandRegistry();
  const services: WorkbenchServices = {
    store,
    registry,
    source,
    titles,
    announcer,
    prompt,
    focusIntentRef,
  };

  workbenchCommands({
    store,
    announce: announcer.announce,
    plugins: () => source.plugins().map((p) => p.id),
    focusPrompt: () => prompt.focus(),
  }).forEach((c) => registry.register(c));

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

function read(storage: Storage | null): string | null {
  try {
    return storage?.getItem(LAYOUT_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

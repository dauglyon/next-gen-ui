import type { PluginHost } from '../../plugins/sdk';
import type { PluginId } from '../core';
import {
  CART_STORAGE_KEY,
  createCartStore,
  createRelatedStore,
  createTermStore,
  createWorkbenchStore,
  defaultLayout,
  deserialize,
  makePanel,
  readCart,
  serialize,
} from '../core';
import type { Command } from '../commands';
import { createCommandRegistry, workbenchCommands } from '../commands';
import { createAnnouncer, createCrumbStore, createTitleStore } from '../react';
import type { WorkbenchServices } from '../react';
import { fallbackTitle } from '../react/context';
import { createPreviewHandle, createPromptHandle } from '../react/services';
import type { InstalledPlugin } from './installed';
import { createHostIndex } from './installed';
import { catalog } from './catalog';
import { home } from './home';
import { shortcutsPlugin } from './shortcuts';
import { relatedPlugin } from './related';
import { routeParams } from './routes';
import { createSettingsStore } from './settings';
import { createRelatedRunner } from './related/runner';
import type { RelatedRunner } from './related/runner';

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
  const crumbs = createCrumbStore();
  const announcer = createAnnouncer();
  const prompt = createPromptHandle();
  const preview = createPreviewHandle();
  const focusIntentRef: WorkbenchServices['focusIntentRef'] = { current: 'command' };
  const source = createHostIndex([...installed, catalog, shortcutsPlugin, relatedPlugin, home]);
  const settings = createSettingsStore(storage, { assistant: defaultAssistant });
  // The cart is host state, not layout: it survives a layout reset, and it is
  // the thing most likely to move to the account later.
  const cart = createCartStore(readCart(storage?.getItem(CART_STORAGE_KEY) ?? null));

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
  const related = createRelatedStore();
  const terms = createTermStore();
  const services: WorkbenchServices = {
    store,
    cart,
    related,
    terms,
    // Set below: the runner needs `source`, which the services object holds.
    relatedRunner: undefined as unknown as RelatedRunner,
    registry,
    source,
    settings,
    titles,
    crumbs,
    announcer,
    prompt,
    preview,
    focusIntentRef,
    dispatch,
  };

  workbenchCommands({
    store,
    announce: announcer.announce,
    plugins: () => source.plugins().map((p) => p.id),
    focusPrompt: () => prompt.focus(),
  }).forEach((c) => registry.register(c));
  registry.register(openCommand(services));
  source.registerCommands(registry, (plugin) => pluginHostFor(services, plugin));

  // A saved layout may pin a plugin that has since stopped being a sidebar
  // panel — the catalog did. Installed and navigator-less means the block
  // could only ever render as a ghost, so the pin goes; an uninstalled
  // plugin keeps its place, because reinstalling should restore it.
  for (const plugin of store.get().sidebar.pinned) {
    if (source.manifest(plugin) && !source.panel(`${plugin}/navigator`)) {
      store.dispatch({ type: 'unpin', plugin });
    }
  }

  if (storage) {
    store.subscribe(() => {
      try {
        storage.setItem(LAYOUT_STORAGE_KEY, serialize(store.get()));
      } catch {
        // Quota or privacy mode: the session still works, it just won't persist.
      }
    });
    // Written separately from the layout: a cart outlives an arrangement, and
    // a corrupt layout should not take the user's collected work with it.
    cart.subscribe(() => {
      try {
        storage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.items()));
      } catch {
        // A payload can be large. Losing persistence is better than losing the
        // session, so a full quota is not an error the user has to handle.
      }
    });
  }
  services.relatedRunner = createRelatedRunner(services.source, cart, related);
  return services;
}

// `/open <plugin> [value]`: a navigator plugin's navigator, an app's single
// page, or a document whose route has one param filled by `value`. Works
// from the manifest alone, so it completes and runs before any plugin code
// has loaded.
function openCommand(services: WorkbenchServices): Command {
  const { source, dispatch, announcer } = services;
  const openable = () => source.manifests().filter((m) => m.navigator || m.document);
  return {
    name: 'open',
    title: 'Open a plugin panel',
    source: 'workbench',
    args: [
      {
        name: 'plugin',
        type: 'string',
        required: true,
        complete: (prefix) =>
          openable()
            .map((m) => m.id)
            .filter((id) => id.startsWith(prefix)),
      },
      { name: 'value', type: 'string', description: 'the document route param' },
    ],
    run: ({ plugin, value }) => {
      const manifest = source.manifest(String(plugin));
      if (!manifest || !(manifest.navigator || manifest.document)) {
        announcer.announce(`Nothing to open for ${String(plugin)}`);
        return;
      }
      const params = manifest.document ? routeParams(manifest.document.route) : [];
      if (manifest.document && (value !== undefined || !manifest.navigator)) {
        if (params.length > 1 || (params.length === 1 && value === undefined)) {
          announcer.announce(`/open ${manifest.id} needs ${params.join(', ')}`);
          return;
        }
        const filled = params.length === 1 ? { [params[0]]: String(value) } : {};
        dispatch({ type: 'open', panel: makePanel(manifest.id, 'document', filled) });
        return;
      }
      dispatch({ type: 'open', panel: makePanel(manifest.id, 'navigator') });
    },
  };
}

// What a plugin's code may do to the workbench, scoped to that plugin.
export function pluginHostFor(services: WorkbenchServices, plugin: PluginId): PluginHost {
  return {
    openDocument: (params) =>
      void services.dispatch({ type: 'open', panel: makePanel(plugin, 'document', params) }),
    runCommand: async (name, values = {}) => {
      await services.registry.run(name, values);
    },
    // Scoped to the adding plugin: it stamps its own id on what it adds, and
    // `has` and `count` answer about its own items only. What else is in the
    // cart is the user's business and the assistant's.
    cart: {
      add: (item) =>
        services.cart.add({ ...item, plugin, addedAt: Date.now() }),
      remove: (id) => {
        const own = services.cart.items().find((i) => i.id === id && i.plugin === plugin);
        if (own) services.cart.remove(id);
      },
      has: (id) => services.cart.items().some((i) => i.id === id && i.plugin === plugin),
      count: () => services.cart.items().filter((i) => i.plugin === plugin).length,
      subscribe: (listener) => services.cart.subscribe(listener),
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

import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import type {
  ArgDecl,
  Manifest,
  Matcher,
  Offer,
  PluginModule,
  PromptHandler,
  RelatedModule,
} from '../../plugins/sdk';
import type { PanelKind, PluginId } from '../core';
import type { ArgSpec, Command, CommandRegistry } from '../commands';
import type { PluginHost } from '../../plugins/sdk';
import { iconFor } from './icons';

// The host's index of installed plugins: manifests now, code on demand.
// Panels, commands and the assistant are all reached through here, and each
// one loads the plugin's module the first time it is actually needed.

export interface InstalledPlugin {
  manifest: Manifest;
  load: () => Promise<PluginModule>;
  // Eager, unlike `load`: matching runs on every keystroke, so it cannot
  // wait for the plugin's bundle. A bundled plugin sets this directly; a
  // remote exposes it as a second module and supplies `loadMatch`.
  match?: Matcher;
  // A remote's matcher, fetched once at startup rather than on first use.
  // Resolving to undefined, or rejecting, means the plugin makes no offers:
  // one plugin's missing matcher cannot break the bar.
  loadMatch?: () => Promise<Matcher | undefined>;
  // What the plugin has to say about someone else's terms. Unlike the matcher
  // this is fetched on first need, not at startup: it does I/O, and a session
  // that never opens the Related pane should never pay for it.
  loadRelated?: () => Promise<RelatedModule | undefined>;
}

// A plugin's offer, with the plugin it came from.
export interface PluginOffer {
  plugin: PluginId;
  title: string;
  offer: Offer;
}

export interface PluginInfo {
  id: PluginId;
  title: string;
  icon: ComponentType<IconProps>;
}

export interface PanelDefinition {
  kind: PanelKind;
  component: ComponentType;
}

export interface PanelSource {
  plugins: () => PluginInfo[];
  panel: (type: string) => PanelDefinition | undefined;
}

export interface HostIndex extends PanelSource {
  manifest: (id: PluginId) => Manifest | undefined;
  manifests: () => Manifest[];
  // Resolves to the loaded module, loading it once. Rejects if the id is
  // unknown or the entry fails.
  load: (id: PluginId) => Promise<PluginModule>;
  // The module if it has already loaded; never triggers a load.
  loaded: (id: PluginId) => PluginModule | undefined;
  // Every installed plugin's answer to what the user typed, in
  // registration order. A matcher that throws is dropped with a warning,
  // like an invalid manifest: one bad plugin cannot break the bar.
  offers: (text: string) => PluginOffer[];
  subscribe: (listener: () => void) => () => void;
  // Bumps when a module finishes loading; pairs with subscribe for React.
  version: () => number;
  // Registers the manifest-declared commands. `host` builds the PluginHost a
  // command runs against.
  registerCommands: (registry: CommandRegistry, host: (plugin: PluginId) => PluginHost) => void;
  promptHandler: (id: PluginId) => Promise<PromptHandler | undefined>;
  // Every plugin that answers about terms, with its module loaded on first
  // ask and cached after. A plugin whose module fails to load is dropped with
  // a warning: one bad plugin cannot empty the pane.
  relatedModules: () => Promise<{ plugin: PluginId; title: string; module: RelatedModule }[]>;
}

export function createHostIndex(installed: InstalledPlugin[]): HostIndex {
  const byId = new Map(installed.map((p) => [p.manifest.id, p]));
  const modules = new Map<PluginId, PluginModule>();
  const loading = new Map<PluginId, Promise<PluginModule>>();
  const panels = new Map<string, PanelDefinition>();
  const listeners = new Set<() => void>();
  // A remote's matcher lands after construction. Kept beside the plugin rather
  // than written into it so `installed` stays the caller's data.
  const fetched = new Map<PluginId, Matcher>();
  const relatedCache = new Map<PluginId, RelatedModule>();
  let version = 0;

  const bump = () => {
    version += 1;
    listeners.forEach((l) => l());
  };

  const load = (id: PluginId): Promise<PluginModule> => {
    const have = modules.get(id);
    if (have) return Promise.resolve(have);
    const pending = loading.get(id);
    if (pending) return pending;
    const plugin = byId.get(id);
    if (!plugin) return Promise.reject(new Error(`plugin ${id} is not installed`));
    const promise = plugin.load().then((module) => {
      modules.set(id, module);
      loading.delete(id);
      bump();
      return module;
    });
    loading.set(id, promise);
    return promise;
  };

  // A remote's matcher is fetched now, not on first use: the prompt bar calls
  // matchers synchronously on every keystroke, so one that has not arrived
  // simply makes no offers until it does, and the bar re-renders when it
  // lands. A rejection is the plugin's problem, not the bar's.
  for (const plugin of installed) {
    if (plugin.match || !plugin.loadMatch) continue;
    plugin
      .loadMatch()
      .then((match) => {
        if (!match) return;
        fetched.set(plugin.manifest.id, match);
        bump();
      })
      .catch((err: unknown) => {
        console.warn(`plugin ${plugin.manifest.id}: its matcher failed to load; ignoring it`, err);
      });
  }

  // One lazy component per declared panel. React.lazy wants a default
  // export, so the plugin module is reshaped in the loader.
  for (const { manifest } of installed) {
    for (const [kind, declared, exported] of [
      ['pane', manifest.navigator, 'navigator'],
      ['route', manifest.document, 'document'],
    ] as const) {
      if (!declared) continue;
      const component = lazy(async () => {
        const module = await load(manifest.id);
        const Component = module[exported];
        if (!Component) {
          throw new Error(`plugin ${manifest.id} declares a ${kind} but its module exports none`);
        }
        return { default: Component };
      });
      panels.set(`${manifest.id}/${kind}`, { kind, component });
    }
  }

  return {
    plugins: () =>
      installed.map(({ manifest }) => ({
        id: manifest.id,
        title: manifest.title,
        icon: iconFor(manifest.icon, manifest.color),
      })),
    panel: (type) => panels.get(type),
    offers(text) {
      const found: PluginOffer[] = [];
      for (const { manifest, match: own } of installed) {
        const match = own ?? fetched.get(manifest.id);
        if (!match) continue;
        try {
          for (const offer of match(text)) {
            found.push({ plugin: manifest.id, title: manifest.title, offer });
          }
        } catch (err) {
          console.warn(`plugin ${manifest.id}: its matcher threw; ignoring it`, err);
        }
      }
      return found;
    },
    manifest: (id) => byId.get(id)?.manifest,
    manifests: () => installed.map((p) => p.manifest),
    load,
    loaded: (id) => modules.get(id),
    version: () => version,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    registerCommands(registry, host) {
      for (const { manifest } of installed) {
        for (const decl of manifest.commands ?? []) {
          const command: Command = {
            name: decl.name,
            title: decl.title,
            description: decl.description,
            source: manifest.id,
            args: (decl.args ?? []).map(toArgSpec),
            run: async (values, caller) => {
              const module = await load(manifest.id);
              const fn = module.commands?.[decl.name];
              if (!fn)
                throw new Error(
                  `plugin ${manifest.id} declares /${decl.name} but does not implement it`,
                );
              await fn(values, { host: host(manifest.id), caller });
            },
          };
          registry.register(command);
        }
      }
    },
    async relatedModules() {
      const answering = installed.filter((p) => p.loadRelated);
      const loaded = await Promise.all(
        answering.map(async (p) => {
          const id = p.manifest.id;
          const have = relatedCache.get(id);
          if (have) return { plugin: id, title: p.manifest.title, module: have };
          try {
            const module = await p.loadRelated?.();
            if (!module) return undefined;
            relatedCache.set(id, module);
            return { plugin: id, title: p.manifest.title, module };
          } catch (err) {
            console.warn(`plugin ${id}: its related module failed to load; ignoring it`, err);
            return undefined;
          }
        }),
      );
      return loaded.filter((x) => x !== undefined);
    },
    async promptHandler(id) {
      if (!byId.get(id)?.manifest.promptHandler) return undefined;
      return (await load(id)).prompt;
    },
  };
}

// A manifest argument is typed by the handler once it runs; the bar only
// needs to know how many there are and which are required.
function toArgSpec(decl: ArgDecl): ArgSpec {
  return {
    name: decl.name,
    description: decl.description,
    required: decl.required,
    type: 'string',
  };
}

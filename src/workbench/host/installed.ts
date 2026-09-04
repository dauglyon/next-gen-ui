import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import type { Manifest, PluginModule, PromptHandler } from '../../plugins/sdk';
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
  subscribe: (listener: () => void) => () => void;
  // Registers the manifest-declared commands. `host` builds the PluginHost a
  // command runs against.
  registerCommands: (registry: CommandRegistry, host: (plugin: PluginId) => PluginHost) => void;
  promptHandler: (id: PluginId) => Promise<PromptHandler | undefined>;
}

export function createHostIndex(installed: InstalledPlugin[]): HostIndex {
  const byId = new Map(installed.map((p) => [p.manifest.id, p]));
  const modules = new Map<PluginId, PluginModule>();
  const loading = new Map<PluginId, Promise<PluginModule>>();
  const panels = new Map<string, PanelDefinition>();
  const listeners = new Set<() => void>();

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
      listeners.forEach((l) => l());
      return module;
    });
    loading.set(id, promise);
    return promise;
  };

  // One lazy component per declared panel. React.lazy wants a default
  // export, so the plugin module is reshaped in the loader.
  for (const { manifest } of installed) {
    for (const kind of ['navigator', 'document'] as const) {
      if (!manifest[kind]) continue;
      const component = lazy(async () => {
        const module = await load(manifest.id);
        const Component = module[kind];
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
        icon: iconFor(manifest.icon),
      })),
    panel: (type) => panels.get(type),
    manifest: (id) => byId.get(id)?.manifest,
    manifests: () => installed.map((p) => p.manifest),
    load,
    loaded: (id) => modules.get(id),
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
            run: async (values) => {
              const module = await load(manifest.id);
              const fn = module.commands?.[decl.name];
              if (!fn)
                throw new Error(
                  `plugin ${manifest.id} declares /${decl.name} but does not implement it`,
                );
              await fn(values, host(manifest.id));
            },
          };
          registry.register(command);
        }
      }
    },
    async promptHandler(id) {
      if (!byId.get(id)?.manifest.promptHandler) return undefined;
      return (await load(id)).prompt;
    },
  };
}

function toArgSpec(
  decl: NonNullable<Manifest['commands']>[number]['args'] extends (infer A)[] | undefined
    ? A
    : never,
): ArgSpec {
  const base = { name: decl.name, description: decl.description, required: decl.required };
  switch (decl.type) {
    case 'number':
      return { ...base, type: 'number' };
    case 'choice':
      return { ...base, type: 'choice', choices: decl.choices ?? [] };
    default:
      return { ...base, type: 'string' };
  }
}

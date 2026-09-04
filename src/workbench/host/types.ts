import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import type { PanelKind, PluginId } from '../core';

// The host's index of what is installed: which plugins exist and which
// panel component answers to a panel type. Manifests and Module Federation
// fill this in later commits; the shape stays.
export interface PluginInfo {
  id: PluginId;
  title: string;
  icon?: ComponentType<IconProps>;
}

export interface PanelDefinition {
  kind: PanelKind;
  component: ComponentType;
}

export interface PanelSource {
  plugins: () => PluginInfo[];
  panel: (type: string) => PanelDefinition | undefined;
}

export interface LocalPlugin extends PluginInfo {
  navigator?: ComponentType;
  document?: ComponentType;
}

export function createLocalSource(plugins: LocalPlugin[]): PanelSource {
  const panels = new Map<string, PanelDefinition>();
  for (const plugin of plugins) {
    if (plugin.navigator)
      panels.set(`${plugin.id}/navigator`, { kind: 'navigator', component: plugin.navigator });
    if (plugin.document)
      panels.set(`${plugin.id}/document`, { kind: 'document', component: plugin.document });
  }
  return {
    plugins: () => plugins.map(({ id, title, icon }) => ({ id, title, icon })),
    panel: (type) => panels.get(type),
  };
}

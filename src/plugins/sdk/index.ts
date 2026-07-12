// The runtime surface for plugin authors. The build-time preset
// (pluginFederation) is imported directly from ./pluginFederation, since it
// pulls in @module-federation/vite.
export { SHARED_SINGLETONS } from './shared';
export type { PluginProps, Plugin } from './contract';
export { definePlugin } from './definePlugin';

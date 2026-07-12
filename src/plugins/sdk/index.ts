// The runtime surface for plugin authors. The build-time pieces are imported
// directly from their own modules, NOT re-exported here: `pluginFederation`
// (./pluginFederation) pulls in @module-federation/vite, and SHARED_SINGLETONS
// (./shared) imports package.json — re-exporting either would drag build-only
// code (and the whole package.json) into the runtime bundle.
export { CONTRACT_VERSION } from './contract';
export type { PluginProps, Plugin } from './contract';
export { definePlugin } from './definePlugin';

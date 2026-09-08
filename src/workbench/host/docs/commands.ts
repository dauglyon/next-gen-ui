import type { PluginHost } from '../../../plugins/sdk';

// `/plugin-docs`. Its own file because a component module may only export
// components.
export const commands = {
  'plugin-docs': (_values: unknown, host: PluginHost) => host.openDocument({}),
};

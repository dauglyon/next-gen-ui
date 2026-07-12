import { federation } from '@module-federation/vite';

import { SHARED_SINGLETONS } from './shared';

// The federation config every plugin remote needs: expose `./Plugin`, emit
// a manifest, and share the host's singletons. A plugin's vite.config is
// then `plugins: [pluginFederation({ name }), react()]`.
export function pluginFederation({ name, plugin = './src/Plugin.tsx' }: PluginFederationOptions) {
  return federation({
    name,
    filename: 'remoteEntry.js',
    manifest: true,
    exposes: { './Plugin': plugin },
    shared: SHARED_SINGLETONS,
    // The host loads plugins with loadRemote, so remote type declarations
    // are never consumed — skip generating them.
    dts: false,
  });
}

export interface PluginFederationOptions {
  /** Remote name — must equal the plugin's registry id and its URL segment. */
  name: string;
  /** Path to the module exposed as `./Plugin`. Defaults to `./src/Plugin.tsx`. */
  plugin?: string;
}

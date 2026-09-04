import { federation } from '@module-federation/vite';
import { SHARED_SINGLETONS } from './shared';

export interface PluginFederationOptions {
  // The remote name. Must equal the manifest id.
  name: string;
  // The module whose default export is the definePlugin() result.
  entry?: string;
}

// A plugin's vite.config: `plugins: [pluginFederation({ name: 'jobs' }), react()]`.
// Emits remoteEntry.js exposing `./plugin`, which the manifest's `entry`
// points at.
export function pluginFederation({ name, entry = './src/plugin.tsx' }: PluginFederationOptions) {
  return federation({
    name,
    filename: 'remoteEntry.js',
    manifest: true,
    exposes: { './plugin': entry },
    shared: SHARED_SINGLETONS,
    dts: false,
  });
}

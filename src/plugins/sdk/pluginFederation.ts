import { readFileSync } from 'node:fs';
import { federation } from '@module-federation/vite';
import type { Plugin } from 'vite';
import type { Module, PluginConfig } from './contract';
import { MODULES, manifestFor } from './contract';
import { SHARED_SINGLETONS } from './shared';

// Each named file becomes a federation module under its own name, and the
// build writes manifest.json beside remoteEntry.js. A file not named here is
// not part of the plugin, whatever it exports.
export type PluginFederationOptions = { config: PluginConfig } & { [K in Module]?: string };

export function pluginFederation({ config, ...paths }: PluginFederationOptions): Plugin[] {
  const named = MODULES.filter((m) => paths[m] !== undefined);
  const declared = declaredDependencies();
  const manifest = manifestFor(config, named);
  return [
    ...federation({
      name: manifest.id,
      filename: 'remoteEntry.js',
      manifest: true,
      exposes: Object.fromEntries(named.map((m) => [`./${m}`, paths[m]!])),
      // Only the singletons the plugin depends on: listing one it does not
      // import would make the build look for a copy that is not there.
      shared: Object.fromEntries(
        Object.entries(SHARED_SINGLETONS).filter(([name]) => declared.has(name)),
      ),
      dts: false,
    }),
    {
      name: 'kbase-plugin-manifest',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: JSON.stringify(manifest, null, 2) + '\n',
        });
      },
    },
  ];
}

function declaredDependencies(): Set<string> {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Record<string, object>;
    return new Set(
      Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }),
    );
  } catch {
    return new Set();
  }
}

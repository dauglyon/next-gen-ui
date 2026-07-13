import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds @dauglyon/plugin-ui-sdk as a two-entry library:
//   .      — runtime surface (definePlugin, contract, CONTRACT_VERSION)
//   ./vite — build-time preset (pluginFederation), pulls in @module-federation/vite
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist-plugin-sdk',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/plugins/sdk/index.ts', import.meta.url)),
        vite: fileURLToPath(new URL('./src/plugins/sdk/pluginFederation.ts', import.meta.url)),
      },
      formats: ['es'],
    },
    rollupOptions: {
      // Each must also be a peerDependency in scripts/build-plugin-sdk.mjs.
      external: [
        'react',
        'react/jsx-runtime',
        /^react-dom($|\/)/,
        /^@tanstack\/react-router($|\/)/,
        /^@tanstack\/react-query($|\/)/,
        /^@module-federation\/vite($|\/)/,
      ],
    },
  },
});

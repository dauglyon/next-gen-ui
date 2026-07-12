import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { pluginFederation } from '../../src/plugins/sdk/pluginFederation';

// A Module Federation remote built with the SDK preset. It uses the repo's
// own node_modules; build from the repo root: `npm run build:example-plugin`.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [pluginFederation({ name: 'example' }), react()],
  build: { target: 'esnext' },
  server: { port: 3001, strictPort: true },
});

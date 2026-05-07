import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  build: {
    outDir: 'dist-design-system',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./src/design-system/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      // Each entry here must also appear in the generated
      // package.json's peerDependencies (scripts/build-design-system.mjs).
      external: [
        'react',
        'react/jsx-runtime',
        /^react-dom($|\/)/,
        /^@base-ui\/react($|\/)/,
        '@phosphor-icons/react',
        /^prismjs($|\/)/,
      ],
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith('.css') ? 'style.css' : 'assets/[name][extname]',
      },
    },
  },
});

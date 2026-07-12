import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { federation } from '@module-federation/vite';

// `@kbase/design-system` is the public name; the canonical source
// lives in this repo at `src/design-system/`. Keep this alias in
// sync with `tsconfig.json`'s `paths` so bundler and typecheck
// resolve the same way.
const designSystemSrc = fileURLToPath(new URL('./src/design-system', import.meta.url));

export default defineConfig(({ mode }) => {
  // .env files are loaded into import.meta.env for the client by
  // default; loadEnv brings them into the config too so allowedHosts
  // honors VITE_DEV_ALLOWED_HOSTS from .env.development.local.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      // Module Federation host. Plugin UIs (remotes) are loaded at
      // runtime from the registry — none are declared here. `shared`
      // makes plugins reuse the app's React, Query client, and Router; a
      // second copy of any would break hooks and shared context.
      //
      // @kbase/design-system is not shared: it resolves via a source
      // alias, not a package, so MF can't wire it into the share scope.
      federation({
        name: 'spa',
        remotes: {},
        shared: {
          react: { singleton: true, requiredVersion: '^19.2.5' },
          'react-dom': { singleton: true, requiredVersion: '^19.2.5' },
          '@tanstack/react-query': { singleton: true, requiredVersion: '^5.100.6' },
          '@tanstack/react-router': { singleton: true, requiredVersion: '^1.168.25' },
        },
      }),
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routeFileIgnorePattern: '\\.(test|spec)\\.[tj]sx?$',
      }),
      react(),
    ],
    // Module Federation emits top-level await; needs a modern target.
    build: { target: 'esnext' },
    resolve: {
      alias: {
        '@kbase/design-system': designSystemSrc,
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    server: {
      host: true,
      port: 3000,
      // Comma-separated. Leading dot is Vite's subdomain wildcard
      // (`.example.com`). Personal dev hostnames go in
      // .env.development.local, not source.
      allowedHosts:
        env.VITE_DEV_ALLOWED_HOSTS?.split(',')
          .map((h) => h.trim())
          .filter(Boolean) ?? [],
      // Forward auth-service paths through the dev server so requests
      // are same-origin from the browser. The Origin header rewrite
      // matters because ci.kbase.us inspects it for policy decisions
      // and rejects (403) requests with the dev-server origin.
      proxy: env.VITE_DEV_AUTH_PROXY
        ? {
            '/services/auth': {
              target: env.VITE_DEV_AUTH_PROXY,
              changeOrigin: true,
              secure: true,
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  // Strip the locally-set kbase_session cookie (it
                  // was set on the dev origin; the auth service
                  // wouldn't recognize it anyway — Authorization
                  // header carries the bearer).
                  proxyReq.removeHeader('cookie');
                  proxyReq.setHeader('Origin', env.VITE_DEV_AUTH_PROXY);
                  proxyReq.setHeader('Referer', env.VITE_DEV_AUTH_PROXY + '/');
                  // Cloudflare's bot manager challenges browser UAs
                  // without a __cf_bm cookie; that cookie can't
                  // round-trip through this proxy (Domain mismatch).
                  // A non-browser UA is on the API allowlist.
                  proxyReq.setHeader('User-Agent', 'kbase-frontend-dev-proxy');
                });
              },
            },
          }
        : undefined,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  };
});

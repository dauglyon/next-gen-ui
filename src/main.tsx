import * as HostReact from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Design system: tokens first (vars, fonts, utilities), then globals.
import './design-system/tokens/fonts.css';
import './design-system/tokens/tokens.css';
import './design-system/tokens/prism-kbase.css';
import './design-system/tokens/utilities.css';
import './design-system/global.css';

import { routeTree } from './routeTree.gen';
import {
  installAuthExpiryWatcher,
  installAuthFailureInterceptor,
  installCrossTabAuthSync,
} from './api/auth';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Each installer is idempotent (later calls overwrite the prior
// handler), so dev StrictMode's intentional double-mount is safe.
installCrossTabAuthSync(queryClient);
installAuthFailureInterceptor(queryClient);
installAuthExpiryWatcher(queryClient);

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// E2E-only: expose the host React so the browser test can prove a loaded plugin
// reuses this instance, not a second copy. Gated off in normal builds.
if (import.meta.env.VITE_EXPOSE_REACT) {
  (globalThis as unknown as { __hostReact?: unknown }).__hostReact = HostReact;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

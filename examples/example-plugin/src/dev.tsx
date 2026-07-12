import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useRouter,
} from '@tanstack/react-router';

import plugin from './Plugin';

// Minimal stand-in for next-gen-ui so the plugin runs on its own
// (`npm run dev:example-plugin`): a route mounts it at /example and hands it
// { router, basepath }, exactly as the real host does.
const rootRoute = createRootRoute({ component: () => <Outlet /> });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/example/$', params: { _splat: '' } });
  },
});

const mountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/example/$',
  component: PluginMount,
});

function PluginMount() {
  const router = useRouter();
  return <plugin.Component router={router} basepath="/example" />;
}

const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute, mountRoute]) });

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

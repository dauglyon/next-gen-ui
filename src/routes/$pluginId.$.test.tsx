import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { server } from '../test/setup';
import { routeTree } from '../routeTree.gen';
import type { PluginProps } from '../plugins/host';

// Stub the federation host so tests never fetch a real remote; the stub
// renders the basepath it's handed and drives the app router.
vi.mock('../plugins/host', () => {
  const StubPlugin = ({ router, basepath }: PluginProps) => (
    <div>
      <p>plugin at {basepath}</p>
      <button onClick={() => void router.navigate({ to: '/' })}>leave</button>
    </div>
  );
  return {
    registerPlugin: vi.fn(),
    loadPlugin: vi.fn(async () => ({ Component: StubPlugin })),
  };
});

function listPlugins(entries: unknown[]) {
  server.use(http.get('*/plugin-registry/plugins', () => HttpResponse.json(entries)));
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Seed the auth cache so the root gate lets us through without a network call.
  queryClient.setQueryData(['auth', 'me'], { user: 'tester', display: 'Tester' });
  queryClient.setQueryData(['auth', 'tokenInfo'], { id: 's', user: 'tester', mfa: 'Used' });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('plugin host route', () => {
  it('mounts a registered plugin and passes its basepath', async () => {
    listPlugins([{ id: 'hello', manifestUrl: 'x', scope: 'global' }]);
    renderAt('/hello');
    expect(await screen.findByText('plugin at /hello')).toBeInTheDocument();
  });

  it('gives the plugin the app router (app-level navigation works)', async () => {
    listPlugins([{ id: 'hello', manifestUrl: 'x', scope: 'global' }]);
    const router = renderAt('/hello');
    await userEvent.click(await screen.findByRole('button', { name: 'leave' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('shows not-found for an unregistered id', async () => {
    listPlugins([]);
    renderAt('/nope');
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
  });
});

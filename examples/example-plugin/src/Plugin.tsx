import * as PluginReact from 'react';
import { Link, Outlet, createRootRoute, createRoute } from '@tanstack/react-router';

import { definePlugin } from '../../../src/plugins/sdk';

// E2E sentinel: expose this remote's React so the browser test can assert it is
// the host's instance (shared singleton), not a second bundled copy.
(globalThis as unknown as { __pluginReact?: unknown }).__pluginReact = PluginReact;

const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home });

const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/detail/$item',
  component: Detail,
});

const routeTree = rootRoute.addChildren([indexRoute, detailRoute]);

function Layout() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2>Example plugin</h2>
      <Outlet />
    </div>
  );
}

function Home() {
  return (
    <ul>
      {['alpha', 'beta', 'gamma'].map((item) => (
        <li key={item}>
          <Link to="/detail/$item" params={{ item }}>
            {item}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Detail() {
  const { item } = detailRoute.useParams();
  return (
    <div>
      <p>Detail for {item}</p>
      <Link to="/">← back</Link>
    </div>
  );
}

// definePlugin does the rest — it mounts this route tree as a plugin.
export default definePlugin(routeTree);

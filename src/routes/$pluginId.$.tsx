import { Component, type ReactNode } from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Alert } from '@kbase/design-system';

import { pluginsOptions } from '../plugins/registry';
import { loadPlugin, registerPlugin } from '../plugins/host';

// Plugins mount at the top level: /{id} and below. Static routes match
// before this dynamic segment, so a plugin claims only ids no real route
// uses; unmatched paths land here too, making it the not-found page.
export const Route = createFileRoute('/$pluginId/$')({
  loader: async ({ context, params }) => {
    const plugins = await context.queryClient.ensureQueryData(pluginsOptions('global'));
    const entry = plugins.find((p) => p.id === params.pluginId);
    if (!entry) return { plugin: null };
    registerPlugin(entry);
    return { plugin: await loadPlugin(entry.id) };
  },
  component: PluginHost,
  errorComponent: PluginRouteError,
});

function PluginHost() {
  const { pluginId } = Route.useParams();
  const { plugin } = Route.useLoaderData();
  const router = useRouter();

  if (!plugin) return <Alert color="red">Page not found.</Alert>;

  const Mounted = plugin.Component;
  return (
    <PluginBoundary>
      <Mounted router={router} basepath={`/${pluginId}`} />
    </PluginBoundary>
  );
}

function PluginRouteError() {
  return <Alert color="red">This plugin failed to load.</Alert>;
}

// Contain a plugin's render error instead of blanking the app.
class PluginBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state: { failed: boolean } = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render(): ReactNode {
    return this.state.failed ? (
      <Alert color="red">This plugin crashed.</Alert>
    ) : (
      this.props.children
    );
  }
}

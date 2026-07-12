import { useState } from 'react';
import { RouterProvider, createRouter, type AnyRoute } from '@tanstack/react-router';

import type { Plugin, PluginProps } from './contract';

// Turn a route tree into a plugin: run its own router over the host's
// shared history, scoped to basepath. Clean local paths and native
// back/forward — the whole runtime a plugin needs.
export function definePlugin(routeTree: AnyRoute): Plugin {
  function PluginRoot({ router, basepath }: PluginProps) {
    const [pluginRouter] = useState(() =>
      createRouter({ routeTree, history: router.history, basepath }),
    );
    return <RouterProvider router={pluginRouter} />;
  }
  return { Component: PluginRoot };
}

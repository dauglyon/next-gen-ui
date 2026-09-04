import { useEffect, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';
import type { Layout, Panel } from '../core';
import { buildPath } from '../host/routes';
import { useLayout, useServices } from './context';

export const WORKBENCH_PATH = '/workbench';

// The path that names a panel, or null for one the URL does not address
// (navigators, and documents of plugins without a route).
export function pathForPanel(panel: Panel | undefined, route: string | undefined): string | null {
  if (!panel || panel.kind !== 'document' || !route) return null;
  try {
    return `/p/${panel.plugin}${buildPath(route, panel.params) === '/' ? '' : buildPath(route, panel.params)}`;
  } catch {
    return null;
  }
}

// The URL names the focused document and nothing else about the layout.
// Opening a document pushes history; moving focus between open documents
// replaces it, so Back walks through what was opened, not every click.
// A write equal to the current location is skipped, which is also what
// stops the URL→layout→URL loop: resolving a link focuses the same panel.
export function useUrlSync() {
  const layout = useLayout();
  const { source } = useServices();
  const router = useRouter();
  const previous = useRef<Layout | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = layout;
    if (!before) return;
    if (before.focus === layout.focus && before.panels === layout.panels) return;

    const panel = layout.focus ? layout.panels[layout.focus] : undefined;
    const path = pathForPanel(panel, panel && source.manifest(panel.plugin)?.document?.route);
    const current = router.state.location.pathname;
    if (path) {
      if (path === current) return;
      const justOpened = layout.focus !== null && !(layout.focus in before.panels);
      void router.navigate({ to: path, replace: !justOpened });
    } else if (current.startsWith('/p/')) {
      // Focus went to something without an address (a navigator, or nothing).
      // Navigators never touch the URL, so it keeps naming the document it
      // named, as long as that document is still open; once closed, fall
      // back to the bare workbench so a reload does not reopen it.
      const stillOpen = Object.values(layout.panels).some(
        (p) => pathForPanel(p, source.manifest(p.plugin)?.document?.route) === current,
      );
      if (!stillOpen) void router.navigate({ to: WORKBENCH_PATH, replace: true });
    }
  }, [layout, source, router]);
}

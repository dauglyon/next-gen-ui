import { createContext, useContext, useEffect } from 'react';

// Types here mirror the core's on purpose: the SDK is a leaf and imports
// nothing from the workbench.

export type PanelKind = 'route' | 'pane';

// One step of a panel's trail. A crumb that only names a level leaves the
// path out.
export interface Crumb {
  label: string;
  path?: string;
  // By name from the host's icon set; the manifest's `icon` for the plugin's
  // own root.
  icon?: string;
}

export interface PanelHandle {
  // Stable while the panel lives, whatever its path becomes.
  id: string;
  plugin: string;
  kind: PanelKind;
  // Everything under /p/<plugin>, query string included; '' for a pane.
  path: string;
  focused: boolean;
  // Pushes a history entry, or replaces the current one.
  navigate: (path: string, options?: { replace?: boolean }) => void;
  // Until set, the host shows the plugin's title and the panel's path.
  setTitle: (title: string) => void;
  // Declaring none means no row. The host also borrows from it to tell two
  // same-titled tabs apart.
  setCrumbs: (crumbs: Crumb[]) => void;
  // What this panel is about, as namespaced terms — `uniprot:P0AEX9`,
  // `taxon:562`. The host asks other plugins what they have about them.
  setTerms: (terms: string[]) => void;
  // Fires when the path or focus changes. For a mount that is not React;
  // `usePanel` re-renders on the same changes.
  subscribe: (listener: () => void) => () => void;
}

export const PanelContext = createContext<PanelHandle | null>(null);

export function usePanel(): PanelHandle {
  const handle = useContext(PanelContext);
  if (!handle) throw new Error('usePanel() called outside a workbench panel');
  return handle;
}

export function usePanelTitle(title: string): void {
  const { setTitle } = usePanel();
  useEffect(() => setTitle(title), [setTitle, title]);
}

// Declared from inside the panel, which already holds whatever it took to
// know them. The host does not pull: a hook it ran itself would run outside
// the panel, and a plugin would have to fetch its own page again to answer.
export function usePanelTerms(terms: string[]): void {
  const { setTerms } = usePanel();
  const key = terms.join(',');
  useEffect(() => setTerms(key ? key.split(',') : []), [setTerms, key]);
}

export function usePanelBreadcrumbs(crumbs: Crumb[]): void {
  const { setCrumbs } = usePanel();
  // Compared by value: a plugin builds this array during render, so its
  // identity changes on every pass while its content rarely does.
  const key = JSON.stringify(crumbs);
  useEffect(() => setCrumbs(JSON.parse(key) as Crumb[]), [setCrumbs, key]);
}

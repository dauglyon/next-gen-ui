import { createContext, useContext, useEffect } from 'react';

// What a panel component can learn about itself. The host provides this
// context; a plugin reads it with `usePanel`. Types here mirror the core's
// on purpose: the SDK is a leaf and imports nothing from the workbench.

export type PanelKind = 'navigator' | 'document';
export type PanelParams = Record<string, string>;

export interface PanelHandle {
  id: string;
  plugin: string;
  kind: PanelKind;
  params: PanelParams;
  focused: boolean;
  // The tab or block title. Until a panel sets one, the host shows a
  // placeholder built from the plugin's title and the panel's params.
  setTitle: (title: string) => void;
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

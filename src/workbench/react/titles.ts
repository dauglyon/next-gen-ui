import { createEmitter } from '../../plugins/sdk';
import type { PanelId } from '../core';

// Panel titles arrive from the panels themselves after they render, so they
// live beside the layout rather than in it.
export interface TitleStore {
  get: (id: PanelId) => string | undefined;
  set: (id: PanelId, title: string) => void;
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

export function createTitleStore(): TitleStore {
  const titles = new Map<PanelId, string>();
  const { subscribe, version, notify } = createEmitter();
  return {
    subscribe,
    version,
    get: (id) => titles.get(id),
    set(id, title) {
      if (titles.get(id) === title) return;
      titles.set(id, title);
      notify();
    },
  };
}

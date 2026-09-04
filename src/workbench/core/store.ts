import type { TitleOf } from './describe';
import { describe } from './describe';
import type { Layout } from './layout';
import type { Operation } from './operations';
import { isUndoable } from './operations';
import type { ReduceContext } from './reduce';
import { defaultContext, reduce } from './reduce';

export type Mode = 'use' | 'customize';

export interface DispatchResult {
  changed: boolean;
  announcement: string;
}

export interface WorkbenchStore {
  get(): Layout;
  mode(): Mode;
  subscribe(listener: () => void): () => void;
  dispatch(op: Operation): DispatchResult;
  // Restore from storage or a deep link; not undoable.
  replace(layout: Layout): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  enterCustomize(): void;
  commitCustomize(): void;
  cancelCustomize(): void;
}

export interface StoreOptions {
  initial: Layout;
  title?: TitleOf;
  ctx?: ReduceContext;
  limit?: number;
}

// Undo is a stack of whole layouts. In use mode each structural operation
// pushes the layout it replaced; in customize mode the layout at entry is
// held aside and pushed once on commit, so a session of rearranging undoes
// as one step.
export function createWorkbenchStore({
  initial,
  title = (id) => id,
  ctx = defaultContext,
  limit = 50,
}: StoreOptions): WorkbenchStore {
  let layout = initial;
  let mode: Mode = 'use';
  let entry: Layout | null = null;
  const past: Layout[] = [];
  const future: Layout[] = [];
  const listeners = new Set<() => void>();

  function set(next: Layout) {
    if (next === layout) return;
    layout = next;
    listeners.forEach((l) => l());
  }

  function push(snapshot: Layout) {
    past.push(snapshot);
    if (past.length > limit) past.shift();
    future.length = 0;
  }

  return {
    get: () => layout,
    mode: () => mode,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(op) {
      const before = layout;
      const after = reduce(before, op, ctx);
      if (after === before) return { changed: false, announcement: '' };
      if (mode === 'use' && isUndoable(op)) push(before);
      set(after);
      return { changed: true, announcement: describe(op, before, title) };
    },
    replace(next) {
      set(next);
    },
    undo() {
      const previous = past.pop();
      if (!previous) return false;
      future.push(layout);
      set(previous);
      return true;
    },
    redo() {
      const next = future.pop();
      if (!next) return false;
      past.push(layout);
      set(next);
      return true;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    enterCustomize() {
      if (mode === 'customize') return;
      mode = 'customize';
      entry = layout;
      listeners.forEach((l) => l());
    },
    commitCustomize() {
      if (mode !== 'customize') return;
      if (entry && entry !== layout) push(entry);
      mode = 'use';
      entry = null;
      listeners.forEach((l) => l());
    },
    cancelCustomize() {
      if (mode !== 'customize') return;
      const restore = entry;
      mode = 'use';
      entry = null;
      if (restore) set(restore);
      else listeners.forEach((l) => l());
    },
  };
}

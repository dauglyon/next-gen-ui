import type { Layout, Operation, PanelId, Side, WorkbenchStore } from '../core';
import { groupOf, groups, placementOf } from '../core';
import type { ArgSpec } from './args';
import type { Command } from './registry';

// The workbench's own commands. They speak to the store like any plugin
// command would and announce through the same live region.

// The store's dispatch, announcing what changed through the live region:
// the one dispatch every host command and every host component goes
// through, so a layout change is spoken exactly once.
export function announcingDispatch(
  store: WorkbenchStore,
  announce: (text: string) => void,
): (op: Operation) => boolean {
  return (op) => {
    const result = store.dispatch(op);
    if (result.changed) announce(result.announcement);
    return result.changed;
  };
}

export interface WorkbenchCommandDeps {
  store: WorkbenchStore;
  dispatch: ReturnType<typeof announcingDispatch>;
  announce: (text: string) => void;
  // Ids of installed plugins, for `/pin` and `/unpin` completion.
  plugins: () => string[];
  // The prompt bar is DOM; the command only asks for it.
  focusPrompt: () => void;
}

function tabNeighbour(layout: Layout, offset: 1 | -1): PanelId | null {
  const focus = layout.focus;
  if (!focus) return null;
  const group = groupOf(layout.main, focus);
  if (!group) return null;
  const at = group.tabs.indexOf(focus);
  return group.tabs[(at + offset + group.tabs.length) % group.tabs.length] ?? null;
}

function groupNeighbour(layout: Layout, offset: 1 | -1): PanelId | null {
  const all = groups(layout.main).filter((g) => g.active);
  if (all.length === 0) return null;
  const focus = layout.focus;
  const at = focus ? all.findIndex((g) => g.tabs.includes(focus)) : -1;
  const next = all[(at + offset + all.length) % all.length];
  return next.active;
}

// The one required argument of pin and unpin; only what completes it differs.
const pluginArg = (complete: (prefix: string) => string[]): ArgSpec => ({
  name: 'plugin',
  type: 'string',
  required: true,
  complete,
});

const cmd = (c: Omit<Command, 'source'>): Command => ({ source: 'workbench', ...c });

export function workbenchCommands({
  store,
  dispatch,
  announce,
  plugins,
  focusPrompt,
}: WorkbenchCommandDeps): Command[] {
  const focusTo = (target: PanelId | null) => {
    if (target) dispatch({ type: 'focus', panel: target });
  };
  const moveFocused = (side: Side) => {
    const layout = store.get();
    const focus = layout.focus;
    if (!focus) return;
    const group = groupOf(layout.main, focus);
    if (!group || group.tabs.length < 2) {
      announce('Nothing to split away from');
      return;
    }
    dispatch({ type: 'move', panel: focus, to: { group: group.id, side } });
  };

  return [
    cmd({ name: 'prompt', title: 'Focus the prompt bar', run: () => focusPrompt() }),
    cmd({
      name: 'close',
      title: 'Close the focused panel',
      run: () => {
        const focus = store.get().focus;
        if (focus) dispatch({ type: 'close', panel: focus });
      },
    }),
    cmd({
      name: 'focus-next-tab',
      title: 'Focus the next tab',
      run: () => focusTo(tabNeighbour(store.get(), 1)),
    }),
    cmd({
      name: 'focus-previous-tab',
      title: 'Focus the previous tab',
      run: () => focusTo(tabNeighbour(store.get(), -1)),
    }),
    cmd({
      name: 'focus-next-group',
      title: 'Focus the next group',
      run: () => focusTo(groupNeighbour(store.get(), 1)),
    }),
    cmd({
      name: 'focus-previous-group',
      title: 'Focus the previous group',
      run: () => focusTo(groupNeighbour(store.get(), -1)),
    }),
    cmd({
      name: 'move-left',
      title: 'Split the panel to the left',
      run: () => moveFocused('left'),
    }),
    cmd({
      name: 'move-right',
      title: 'Split the panel to the right',
      run: () => moveFocused('right'),
    }),
    cmd({ name: 'move-up', title: 'Split the panel upward', run: () => moveFocused('top') }),
    cmd({ name: 'move-down', title: 'Split the panel downward', run: () => moveFocused('bottom') }),
    cmd({
      name: 'fold',
      title: 'Fold or unfold the focused sidebar panel',
      when: (ctx) => ctx.focusKind === 'pane',
      run: () => {
        const layout = store.get();
        const focus = layout.focus;
        if (!focus) return;
        const placement = placementOf(layout, focus);
        if (placement.zone !== 'sidebar') return;
        dispatch({ type: 'fold', panel: focus, folded: !placement.folded });
      },
    }),
    cmd({
      name: 'sidebar',
      title: 'Collapse or expand the sidebar',
      run: () => {
        dispatch({ type: 'sidebar', collapsed: !store.get().sidebar.collapsed });
      },
    }),
    cmd({
      name: 'pin',
      title: 'Pin a plugin to the sidebar',
      args: [pluginArg((p) => plugins().filter((id) => id.startsWith(p)))],
      run: ({ plugin }) => {
        if (!plugins().includes(String(plugin))) {
          announce(`No plugin named ${String(plugin)}`);
          return;
        }
        dispatch({ type: 'pin', plugin: String(plugin) });
      },
    }),
    cmd({
      name: 'unpin',
      title: 'Remove a plugin from the sidebar',
      args: [pluginArg((p) => store.get().sidebar.pinned.filter((id) => id.startsWith(p)))],
      run: ({ plugin }) => {
        dispatch({ type: 'unpin', plugin: String(plugin) });
      },
    }),
    cmd({
      name: 'undo',
      title: 'Undo the last layout change',
      run: () => announce(store.undo() ? 'Undone' : 'Nothing to undo'),
    }),
    cmd({
      name: 'redo',
      title: 'Redo the last undone layout change',
      run: () => announce(store.redo() ? 'Redone' : 'Nothing to redo'),
    }),
    cmd({
      name: 'lock-layout',
      title: 'Lock or unlock the layout',
      description: 'A locked layout keeps its arrangement; opening and closing panels stays free',
      run: () => {
        dispatch({ type: 'lock', locked: !store.get().locked });
      },
    }),
  ];
}

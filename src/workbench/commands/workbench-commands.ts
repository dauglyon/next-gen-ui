import type { Layout, Operation, PanelId, Side, WorkbenchStore } from '../core';
import { groupOf, groups, placementOf } from '../core';
import type { Command } from './registry';

// The workbench's own commands. They speak to the store like any plugin
// command would and announce through the same live region.

export interface WorkbenchCommandDeps {
  store: WorkbenchStore;
  // dispatch is the store's, announcing what changed.
  dispatch: (op: Operation) => boolean;
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

const cmd = (
  name: string,
  title: string,
  run: Command['run'],
  rest: Partial<Command> = {},
): Command => ({ source: 'workbench', name, title, run, ...rest });

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
    cmd('prompt', 'Focus the prompt bar', () => focusPrompt()),
    cmd('close', 'Close the focused panel', () => {
      const focus = store.get().focus;
      if (focus) dispatch({ type: 'close', panel: focus });
    }),
    cmd('focus-next-tab', 'Focus the next tab', () => focusTo(tabNeighbour(store.get(), 1))),
    cmd('focus-previous-tab', 'Focus the previous tab', () =>
      focusTo(tabNeighbour(store.get(), -1)),
    ),
    cmd('focus-next-group', 'Focus the next group', () => focusTo(groupNeighbour(store.get(), 1))),
    cmd('focus-previous-group', 'Focus the previous group', () =>
      focusTo(groupNeighbour(store.get(), -1)),
    ),
    cmd('move-left', 'Split the panel to the left', () => moveFocused('left')),
    cmd('move-right', 'Split the panel to the right', () => moveFocused('right')),
    cmd('move-up', 'Split the panel upward', () => moveFocused('top')),
    cmd('move-down', 'Split the panel downward', () => moveFocused('bottom')),
    cmd(
      'fold',
      'Fold or unfold the focused sidebar panel',
      () => {
        const layout = store.get();
        const focus = layout.focus;
        if (!focus) return;
        const placement = placementOf(layout, focus);
        if (placement.zone !== 'sidebar') return;
        dispatch({ type: 'fold', panel: focus, folded: !placement.folded });
      },
      { when: (ctx) => ctx.focusKind === 'pane' },
    ),
    cmd('sidebar', 'Collapse or expand the sidebar', () => {
      dispatch({ type: 'sidebar', collapsed: !store.get().sidebar.collapsed });
    }),
    cmd(
      'pin',
      'Pin a plugin to the sidebar',
      ({ plugin }) => {
        if (!plugins().includes(String(plugin))) {
          announce(`No plugin named ${String(plugin)}`);
          return;
        }
        dispatch({ type: 'pin', plugin: String(plugin) });
      },
      {
        args: [
          {
            name: 'plugin',
            type: 'string',
            required: true,
            complete: (p) => plugins().filter((id) => id.startsWith(p)),
          },
        ],
      },
    ),
    cmd(
      'unpin',
      'Remove a plugin from the sidebar',
      ({ plugin }) => {
        dispatch({ type: 'unpin', plugin: String(plugin) });
      },
      {
        args: [
          {
            name: 'plugin',
            type: 'string',
            required: true,
            complete: (p) => store.get().sidebar.pinned.filter((id) => id.startsWith(p)),
          },
        ],
      },
    ),
    cmd('undo', 'Undo the last layout change', () =>
      announce(store.undo() ? 'Undone' : 'Nothing to undo'),
    ),
    cmd('redo', 'Redo the last undone layout change', () =>
      announce(store.redo() ? 'Redone' : 'Nothing to redo'),
    ),
    cmd(
      'lock-layout',
      'Lock or unlock the layout',
      () => {
        dispatch({ type: 'lock', locked: !store.get().locked });
      },
      {
        description: 'A locked layout keeps its arrangement; opening and closing panels stays free',
      },
    ),
  ];
}

import type { GroupId, Layout, Panel, PanelId } from './layout';
import { paneId } from './layout';
import { groupOf } from './tree';

// Where a panel is shown. A panel in the flat map is either a tab in the
// main tree, the pane block of a pinned plugin in the sidebar, or nowhere
// (orphaned; `repair` drops it).
export type Placement =
  | { zone: 'main'; group: GroupId; active: boolean }
  | { zone: 'sidebar'; folded: boolean }
  | { zone: 'none' };

export function placementOf(layout: Layout, id: PanelId): Placement {
  const group = groupOf(layout.main, id);
  if (group) return { zone: 'main', group: group.id, active: group.active === id };
  const panel = layout.panels[id];
  if (panel && panel.kind === 'pane' && layout.sidebar.pinned.includes(panel.plugin)) {
    return { zone: 'sidebar', folded: layout.sidebar.folded.includes(id) };
  }
  return { zone: 'none' };
}

// The panes shown in the sidebar, in pin order; a pinned plugin whose pane
// has been dragged into the main area contributes nothing here.
export function sidebarPanels(layout: Layout): Panel[] {
  return layout.sidebar.pinned.flatMap((plugin) => {
    const panel = layout.panels[paneId(plugin)];
    return panel && !groupOf(layout.main, panel.id) ? [panel] : [];
  });
}

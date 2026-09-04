import type { GroupId, Operation, PanelId, PanelKind, Side } from '../core';

// Pointer drag and drop. dnd-kit supplies the sensors; this module names what
// can be dragged and where it can land, and turns a drop into an operation.
// Every drop here has a keyboard route through commands and context menus,
// so the pointer path adds no capability, only speed.

export interface DragData {
  panel: PanelId;
  kind: PanelKind;
}

export type DropData =
  | { type: 'tab'; group: GroupId; index: number }
  | { type: 'edge'; group: GroupId; side: Side }
  | { type: 'group'; group: GroupId }
  | { type: 'sidebar' };

export const dragId = (panel: PanelId) => `drag:${panel}`;
export const dropId = (data: DropData) => {
  switch (data.type) {
    case 'tab':
      return `drop:tab:${data.group}:${data.index}`;
    case 'edge':
      return `drop:edge:${data.group}:${data.side}`;
    case 'group':
      return `drop:group:${data.group}`;
    case 'sidebar':
      return 'drop:sidebar';
  }
};

export function dropOperation(active: DragData, over: DropData): Operation | null {
  switch (over.type) {
    case 'tab':
      return { type: 'move', panel: active.panel, to: { group: over.group, index: over.index } };
    case 'group':
      return { type: 'move', panel: active.panel, to: { group: over.group } };
    case 'edge':
      return { type: 'move', panel: active.panel, to: { group: over.group, side: over.side } };
    case 'sidebar':
      if (active.kind !== 'navigator') return null;
      return { type: 'move', panel: active.panel, to: { zone: 'sidebar' } };
  }
}

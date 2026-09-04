import type { Layout, PanelId } from './layout';
import type { Operation } from './operations';
import { findNode, groupOf } from './tree';

// The sentence the live region reads after an operation. Titles come from
// the caller because the core does not know what a panel renders.
export type TitleOf = (panel: PanelId) => string;

const SIDE_WORDS = { left: 'left of', right: 'right of', top: 'above', bottom: 'below' } as const;

export function describe(op: Operation, before: Layout, title: TitleOf): string {
  switch (op.type) {
    case 'open':
      return `Opened ${title(op.panel.id)}`;
    case 'close':
      return `Closed ${title(op.panel)}`;
    case 'focus':
      return `${title(op.panel)} focused`;
    case 'move': {
      const name = title(op.panel);
      if ('zone' in op.to) return `Moved ${name} to the sidebar`;
      const group = findNode(before.main, op.to.group);
      const anchor = group?.kind === 'group' && group.active ? title(group.active) : 'the group';
      if ('side' in op.to) return `Moved ${name} ${SIDE_WORDS[op.to.side]} ${anchor}`;
      const own = groupOf(before.main, op.panel);
      if (own && own.id === op.to.group && op.to.index !== undefined) {
        return `Moved ${name} to position ${op.to.index + 1}`;
      }
      return `Moved ${name} into the group with ${anchor}`;
    }
    case 'resize':
      return 'Resized';
    case 'pin':
      return `Pinned ${op.plugin} to the sidebar`;
    case 'unpin':
      return `Unpinned ${op.plugin} from the sidebar`;
    case 'fold':
      return `${op.folded ? 'Folded' : 'Unfolded'} ${title(op.panel)}`;
    case 'sidebar':
      if (op.collapsed === true) return 'Sidebar collapsed';
      if (op.collapsed === false) return 'Sidebar expanded';
      return 'Sidebar resized';
    case 'bar':
      return `${op.bar === 'status' ? 'Status bar' : 'Prompt bar'} ${op.visible ? 'shown' : 'hidden'}`;
    case 'bind':
      return op.command ? `${op.key} now runs ${op.command}` : `${op.key} unbound`;
  }
}

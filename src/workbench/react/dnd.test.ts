import { describe, expect, it } from 'vitest';
import { dropOperation } from './dnd';

const doc = { panel: 'koros/document?slug=x', kind: 'document' as const };
const nav = { panel: 'jobs/navigator', kind: 'navigator' as const };

describe('dropOperation', () => {
  it('drops on a tab insert before it', () => {
    expect(dropOperation(doc, { type: 'tab', group: 'g', index: 2 })).toEqual({
      type: 'move',
      panel: doc.panel,
      to: { group: 'g', index: 2 },
    });
  });

  it('drops on an edge split', () => {
    expect(dropOperation(doc, { type: 'edge', group: 'g', side: 'left' })).toEqual({
      type: 'move',
      panel: doc.panel,
      to: { group: 'g', side: 'left' },
    });
  });

  it('only navigators may land in the sidebar', () => {
    expect(dropOperation(doc, { type: 'sidebar' })).toBeNull();
    expect(dropOperation(nav, { type: 'sidebar' })).toEqual({
      type: 'move',
      panel: nav.panel,
      to: { zone: 'sidebar' },
    });
  });

  it('drops on a block insert at its pin slot, navigators only', () => {
    expect(dropOperation(doc, { type: 'pin', index: 1 })).toBeNull();
    expect(dropOperation(nav, { type: 'pin', index: 1 })).toEqual({
      type: 'move',
      panel: nav.panel,
      to: { zone: 'sidebar', index: 1 },
    });
  });
});

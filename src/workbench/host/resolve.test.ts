import { describe, expect, it } from 'vitest';
import { localPlugins } from '../../plugins/local';
import { placementOf } from '../core';
import { createWorkbench } from './createWorkbench';
import { resolveDeepLink } from './resolve';

const services = () => createWorkbench({ installed: localPlugins, storage: null });

describe('resolveDeepLink', () => {
  it('opens the document the path names, then focuses it on a repeat', () => {
    const s = services();
    expect(resolveDeepLink(s, 'koros', 'arc/nitro')).toEqual({ ok: true });
    const id = 'koros/document?slug=nitro';
    expect(placementOf(s.store.get(), id).zone).toBe('main');
    s.dispatch({
      type: 'open',
      panel: { id: 'jobs/document?id=12', plugin: 'jobs', kind: 'document', params: { id: '12' } },
    });
    expect(s.store.get().focus).toBe('jobs/document?id=12');
    resolveDeepLink(s, 'koros', 'arc/nitro');
    expect(s.store.get().focus).toBe(id);
    expect(
      Object.keys(s.store.get().panels).filter((k) => k.startsWith('koros/document')),
    ).toHaveLength(1);
  });

  it('treats an app page as the empty route', () => {
    const s = services();
    expect(resolveDeepLink(s, 'genknown', '')).toEqual({ ok: true });
    expect(s.store.get().focus).toBe('genknown/document');
  });

  it.each([
    ['nope', 'x', 'unknown-plugin'],
    ['catalog', 'x', 'no-document'],
    ['jobs', 'arc/12', 'no-match'],
  ])('%s/%s fails with %s and leaves the layout alone', (plugin, rest, reason) => {
    const s = services();
    const before = s.store.get();
    const result = resolveDeepLink(s, plugin, rest);
    expect(!result.ok && result.reason).toBe(reason);
    expect(s.store.get()).toBe(before);
  });
});

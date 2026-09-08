import { describe, expect, it, vi } from 'vitest';
import { createRelatedStore, keyOf, split } from './related';
import type { RelatedItem } from './related';

const item = (plugin: string, id: string): RelatedItem => ({
  key: keyOf(plugin, id),
  plugin,
  context: 'view',
  proposal: { id, label: id, params: { q: id } },
});

describe('terms across the two contexts', () => {
  // A protein that is both open and in the cart would otherwise be asked
  // about twice, and every plugin would answer twice.
  it('asks the cart only about what the view did not cover', () => {
    const { view, cart } = split(
      ['uniprot:P0AEX9', 'taxon:562'],
      ['taxon:562', 'genome:GCF_000005845.2'],
    );
    expect(view).toEqual(['uniprot:P0AEX9', 'taxon:562']);
    expect(cart).toEqual(['genome:GCF_000005845.2']);
  });

  it('deduplicates within a context as well', () => {
    const { view } = split(['taxon:562', 'taxon:562'], []);
    expect(view).toEqual(['taxon:562']);
  });
});

describe('the store', () => {
  const section = (items: RelatedItem[]) => ({
    context: 'view' as const,
    subject: 'P0AEX9',
    alsoCart: false,
    items,
  });

  it('drops a dismissed proposal from the answers that follow', () => {
    const store = createRelatedStore();
    store.set({ sections: [section([item('a', '1'), item('a', '2')])], loading: false });
    store.dismiss('a:1');
    expect(store.get().sections[0].items.map((i) => i.key)).toEqual(['a:2']);

    // The next round of questions returns it; it stays gone.
    store.set({ sections: [section([item('a', '1'), item('a', '2')])], loading: false });
    expect(store.get().sections[0].items.map((i) => i.key)).toEqual(['a:2']);
  });

  it('hides a section whose every proposal was dismissed', () => {
    const store = createRelatedStore();
    store.set({ sections: [section([item('a', '1')])], loading: false });
    store.dismiss('a:1');
    expect(store.get().sections).toEqual([]);
  });

  it('tells subscribers when the answers change', () => {
    const store = createRelatedStore();
    const seen = vi.fn();
    store.subscribe(seen);
    store.set({ sections: [], loading: true });
    store.dismiss('nothing');
    expect(seen).toHaveBeenCalledTimes(2);
  });
});

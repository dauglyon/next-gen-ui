import { describe, expect, it, vi } from 'vitest';
import { capped, createRelatedStore, keyOf, PER_PLUGIN, split } from './related';
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

describe('the per-plugin cap', () => {
  it('keeps three from each plugin and counts the rest by title', () => {
    const many = [
      ...Array.from({ length: 5 }, (_, i) => item('diaspora', `d${i}`)),
      ...Array.from({ length: 2 }, (_, i) => item('genknown', `g${i}`)),
    ];
    const { items, overflow } = capped(many, (id) => (id === 'diaspora' ? 'Diaspora' : 'genKnown'));
    expect(items).toHaveLength(PER_PLUGIN + 2);
    expect(overflow).toEqual({ Diaspora: 2 });
  });

  it('leaves the order plugins answered in', () => {
    const { items } = capped([item('a', '1'), item('b', '1'), item('a', '2')], (id) => id);
    expect(items.map((i) => i.key)).toEqual(['a:1', 'b:1', 'a:2']);
  });
});

describe('the store', () => {
  const section = (items: RelatedItem[]) => ({
    context: 'view' as const,
    subject: 'P0AEX9',
    count: 1,
    items,
    overflow: {},
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Background, CommandCall, Query } from '../../../plugins/sdk';
import { createQueryStore } from '../../core';
import type { HostIndex } from '../installed';
import { BUDGET_MS, SETTLE_MS, createQueryRunner } from './runner';

// The runner over a stand-in index: only `backgrounds()` is consulted.
function index(backgrounds: Record<string, Background>): HostIndex {
  return {
    backgrounds: () =>
      Object.entries(backgrounds).map(([plugin, background]) => ({
        plugin,
        title: plugin,
        background,
      })),
  } as unknown as HostIndex;
}

const fj: Background = {
  terms: ({ text, terms }) => {
    if (text && /^[A-Z][0-9][A-Z0-9]{3}[0-9]$/.test(text)) return [`uniprot:${text}`];
    // Expansion: a protein implies its taxon.
    return (terms ?? []).flatMap((t) => (t === 'uniprot:P0AEX9' ? ['taxon:83333'] : []));
  },
  recommend: {
    commands: ({ terms }) =>
      (terms ?? [])
        .filter((t) => t.startsWith('uniprot:'))
        .map((t) => ({
          label: `Dossier for ${t.slice(8)}`,
          command: 'open',
          args: { q: t.slice(8) },
        })),
    cartItems: async ({ terms }) =>
      (terms ?? [])
        .filter((t) => t.startsWith('taxon:'))
        .map((t) => ({ id: `fj:${t}`, kind: 'taxon', name: t, source: { path: `/${t}` } })),
  },
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the query runner', () => {
  it('pools terms at once, expands them once, and asks recommend after the settle', async () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('typing', { text: 'P0AEX9' });
    expect(store.get('typing').pool).toEqual(['uniprot:P0AEX9', 'taxon:83333']);
    expect(store.get('typing').loading).toBe(true);
    expect(store.get('typing').answers).toEqual([]);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    const [answer] = store.get('typing').answers;
    expect(answer.plugin).toBe('fj');
    expect(answer.commands.map((c) => c.label)).toEqual(['Dossier for P0AEX9']);
    expect(answer.cartItems.map((i) => i.id)).toEqual(['fj:taxon:83333']);
    expect(store.get('typing').loading).toBe(false);
  });

  it('never sends a plugin the terms of its own front tab', async () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'], owner: 'fj', label: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('page').answers).toEqual([]);
    expect(store.get('page').label).toBe('P0AEX9');
  });

  it('a source set again before the settle asks once, about the newer text', async () => {
    const commands = vi.fn<(q: Query) => CommandCall[]>(() => []);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { recommend: { commands } } }), store);
    runner.set('typing', { text: 'a' });
    runner.set('typing', { text: 'ab' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(commands).toHaveBeenCalledTimes(1);
    expect(commands.mock.calls[0][0]).toMatchObject({ text: 'ab' });
  });

  it('clears a source that has nothing to ask about', async () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('typing', { text: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('typing').answers).toHaveLength(1);
    runner.set('typing', { text: '' });
    expect(store.get('typing')).toMatchObject({ pool: [], answers: [], loading: false });
  });

  it('shows a fast answer while a slow plugin is still working, and drops the slow one past the budget', async () => {
    let release: (() => void) | undefined;
    const slow: Background = {
      recommend: {
        commands: ({ signal }) =>
          new Promise<CommandCall[]>((resolve) => {
            release = () => resolve([{ label: 'late', command: 'x' }]);
            signal.addEventListener('abort', () => resolve([]));
          }),
      },
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ slow, fj }), store);
    runner.set('typing', { text: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('typing').answers.map((a) => a.plugin)).toEqual(['fj']);
    expect(store.get('typing').loading).toBe(true);
    await vi.advanceTimersByTimeAsync(BUDGET_MS);
    expect(store.get('typing').loading).toBe(false);
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.get('typing').answers.map((a) => a.plugin)).toEqual(['fj']);
  });

  it('a terms() or recommend() that throws costs that plugin its answer, not the round', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken: Background = {
      terms: () => {
        throw new Error('no');
      },
      recommend: { commands: () => Promise.reject(new Error('no')) },
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ broken, fj }), store);
    runner.set('typing', { text: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('typing').answers.map((a) => a.plugin)).toEqual(['fj']);
  });
});

import type { Query } from '../../../plugins/sdk';
import type { Answer, QuerySource, QueryStore } from '../../core';
import type { HostIndex } from '../installed';

// Asking every plugin about a source of terms.
//
// Each source has its own clock. Setting one runs every `terms` at once —
// they are synchronous and cheap — pools what comes back with the terms
// given, lets each plugin expand the pool once, and after the settle calls
// every `recommend` with that source's pool. A source set again before the
// settle restarts it; an answer that arrives for a question no longer being
// asked is dropped.

// Long enough that adding three items to a cart is one round of questions
// rather than three, short enough that the pane does not feel detached from
// what the user just did.
export const SETTLE_MS = 250;

export interface QueryInput {
  text?: string;
  terms?: string[];
  // The plugin whose own front tab produced these terms: never asked about
  // them, so a plugin cannot recommend the page it has open.
  owner?: string;
  // What the heading says the answers were computed from.
  label?: string;
}

export interface QueryRunner {
  set: (source: QuerySource, input: QueryInput) => void;
  stop: () => void;
}

export function createQueryRunner(index: HostIndex, store: QueryStore): QueryRunner {
  const timers = new Map<QuerySource, number>();
  const inflight = new Map<QuerySource, AbortController>();

  // Every plugin's terms for the text, then one pass in which each plugin
  // may expand a term it recognises into others. A `terms` that throws is
  // that plugin's problem: it contributes nothing this round.
  const pool = (input: QueryInput): string[] => {
    const found = new Set(input.terms ?? []);
    const signal = new AbortController().signal;
    const ask = (q: Omit<Query, 'signal'>) => {
      for (const { plugin, background } of index.backgrounds()) {
        if (!background.terms) continue;
        try {
          for (const term of background.terms({ ...q, signal })) found.add(term);
        } catch (err) {
          console.warn(`plugin ${plugin}: its terms() threw; ignoring it`, err);
        }
      }
    };
    if (input.text) ask({ text: input.text });
    const first = [...found];
    if (first.length) ask({ terms: first });
    return [...found];
  };

  const ask = async (source: QuerySource, input: QueryInput, terms: string[]) => {
    inflight.get(source)?.abort();
    const controller = new AbortController();
    inflight.set(source, controller);
    const query: Query = { text: input.text, terms, signal: controller.signal };
    const answers = await Promise.all(
      index
        .backgrounds()
        .filter(({ plugin, background }) => background.recommend && plugin !== input.owner)
        .map(async ({ plugin, background }): Promise<Answer> => {
          const recommend = background.recommend!;
          const call = async <T>(fn: ((q: Query) => T[] | Promise<T[]>) | undefined) => {
            if (!fn) return [] as T[];
            try {
              return await fn(query);
            } catch (err) {
              if (!controller.signal.aborted) {
                console.warn(`plugin ${plugin}: its recommend() threw; ignoring it`, err);
              }
              return [] as T[];
            }
          };
          const [commands, cartItems] = await Promise.all([
            call(recommend.commands),
            call(recommend.cartItems),
          ]);
          return { plugin, commands, cartItems };
        }),
    );
    if (controller.signal.aborted) return;
    store.set(source, {
      label: input.label ?? input.text ?? '',
      pool: terms,
      answers: answers.filter((a) => a.commands.length || a.cartItems.length),
      loading: false,
    });
  };

  return {
    set(source, input) {
      window.clearTimeout(timers.get(source));
      const terms = pool(input);
      const label = input.label ?? input.text ?? '';
      if (terms.length === 0 && !input.text) {
        inflight.get(source)?.abort();
        store.set(source, { label, pool: [], answers: [], loading: false });
        return;
      }
      store.set(source, { ...store.get(source), label, pool: terms, loading: true });
      timers.set(
        source,
        window.setTimeout(() => void ask(source, input, terms), SETTLE_MS),
      );
    },
    stop() {
      for (const timer of timers.values()) window.clearTimeout(timer);
      for (const controller of inflight.values()) controller.abort();
    },
  };
}

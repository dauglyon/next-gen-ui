import type { PanelId } from './layout';
import { createKeyedStore } from './keyed';
import type { KeyedStore } from './keyed';

// What each open panel says it is about.
//
// Panels push; the host does not pull. A panel already holds whatever it took
// to know its subject — the dossier it fetched, the row it selected — so
// asking it again from outside would mean fetching the page twice.
export type TermStore = KeyedStore<PanelId, string[]>;

const sameTerms = (a: string[], b: string[]) =>
  a.length === b.length && a.every((t, i) => t === b[i]);

export const createTermStore = (): TermStore =>
  createKeyedStore<PanelId, string[]>({ empty: [], equal: sameTerms });

import type { Crumb } from '../../plugins/sdk';
import type { PanelId } from './layout';
import { createKeyedStore } from './keyed';
import type { KeyedStore } from './keyed';

// A panel's title and its trail arrive from the panel itself after it
// renders, so they live beside the layout rather than in it. Two things read
// the trail: the breadcrumb row above the panel, and the tab strip, which
// borrows a crumb to tell two same-titled tabs apart.
export type TitleStore = KeyedStore<PanelId, string | undefined>;
export type CrumbStore = KeyedStore<PanelId, Crumb[]>;

export const createTitleStore = (): TitleStore =>
  createKeyedStore<PanelId, string | undefined>({ empty: undefined });

const sameTrail = (a: Crumb[], b: Crumb[]) =>
  a.length === b.length &&
  a.every((c, i) => c.label === b[i].label && c.path === b[i].path && c.icon === b[i].icon);

export const createCrumbStore = (): CrumbStore =>
  createKeyedStore<PanelId, Crumb[]>({ empty: [], equal: sameTrail });

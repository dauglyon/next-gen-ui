import { CONTRACT_VERSION } from '../../../plugins/sdk';
import type { InstalledPlugin } from '../installed';

// Installed by the host itself, over the same index as everything else.
// A document, not a navigator: the launcher is a page, reached like any
// other page, rather than a piece of chrome.
export const home: InstalledPlugin = {
  manifest: {
    id: 'home',
    title: 'Home',
    description: 'Everything installed: apps to open, panels to show.',
    contractVersion: CONTRACT_VERSION,
    icon: 'House',
    document: { route: '/' },
  },
  load: () => import('./Home').then((m) => ({ document: m.HomeDocument })),
};

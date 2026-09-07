import { CONTRACT_VERSION } from '../../../plugins/sdk';
import type { InstalledPlugin } from '../installed';

// Installed by the host itself, over the same index as everything else, so it
// is a block like any other: it folds, it resizes, it reorders, it shows in
// the rail when the sidebar is collapsed, and Settings can unpin it. A pane
// hung above the stack had none of that.
export const relatedPlugin: InstalledPlugin = {
  manifest: {
    id: 'related',
    title: 'Related',
    description: 'What other plugins have about the open panel and the cart.',
    contractVersion: CONTRACT_VERSION,
    icon: 'LinkSimple',
    color: 'blue',
    // Declared with no `fit`, which is not the same as declaring nothing:
    // the manifest key is what says this plugin has a navigator at all.
    //
    // Deliberately not `fit: 'content'`. Shortcuts is a fixed row of buttons
    // and can take its natural height; this list is as long as the answers
    // are, and a block at natural height takes that length out of the blocks
    // under it — Data and Jobs became clipped strips. It takes a share of the
    // stack and scrolls inside it.
    navigator: {},
  },
  load: () => import('./RelatedNavigator').then((m) => ({ navigator: m.RelatedNavigator })),
};

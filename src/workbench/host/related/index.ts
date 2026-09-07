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
    navigator: { fit: 'content' },
  },
  load: () => import('./RelatedNavigator').then((m) => ({ navigator: m.RelatedNavigator })),
};

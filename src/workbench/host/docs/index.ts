import { CONTRACT_VERSION } from '../../../plugins/sdk';
import type { InstalledPlugin } from '../installed';

// Installed by the host itself, over the same index as everything else.
//
// A document, and unlisted in the launcher for the reason Settings is: it is
// the shell's own page rather than something installed, and it is reached by
// the link that sits beside Settings on the Browse page.
export const docs: InstalledPlugin = {
  manifest: {
    id: 'docs',
    title: 'Plugin developer documentation',
    description: 'The manifest, the exposed modules, and the hooks a panel runs against.',
    contractVersion: CONTRACT_VERSION,
    icon: 'Code',
    document: { route: '/' },
    commands: [
      {
        name: 'plugin-docs',
        title: 'Open the plugin developer documentation',
        icon: 'Code',
      },
    ],
  },
  load: async () => ({
    document: (await import('./Docs')).DocsDocument,
    commands: (await import('./commands')).commands,
  }),
};

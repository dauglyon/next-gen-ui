import { CONTRACT_VERSION } from '../../../plugins/sdk';
import type { InstalledPlugin } from '../installed';

// Installed by the host itself, over the same index as everything else.
// A document rather than a navigator: settings are read now and then, so a
// permanent block in the sidebar would cost a column for nothing.
//
// The plugin id stays `catalog`: it is in saved layouts and in the URL of any
// panel a user has open, and renaming it would strand both. The title, icon and
// command label are what a reader sees, and those say Settings.
export const catalog: InstalledPlugin = {
  manifest: {
    id: 'catalog',
    title: 'Settings',
    description: 'Installed plugins, what is pinned, and the assistant setting.',
    contractVersion: CONTRACT_VERSION,
    icon: 'Gear',
    document: { route: '/' },
    commands: [
      {
        name: 'catalog',
        title: 'Open settings',
        icon: 'Gear',
        shortcut: 'Settings',
      },
    ],
  },
  load: async () => ({
    document: (await import('./Catalog')).CatalogDocument,
    commands: (await import('./commands')).commands,
  }),
};

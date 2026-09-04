import { CONTRACT_VERSION } from '../../../plugins/sdk';
import type { InstalledPlugin } from '../installed';

// Installed by the host itself, over the same index as everything else.
export const catalog: InstalledPlugin = {
  manifest: {
    id: 'catalog',
    title: 'Catalog',
    description: 'Installed plugins, what is pinned, and the assistant setting.',
    contractVersion: CONTRACT_VERSION,
    icon: 'SquaresFour',
    navigator: {},
  },
  load: () => import('./Catalog').then((m) => ({ navigator: m.CatalogNavigator })),
};

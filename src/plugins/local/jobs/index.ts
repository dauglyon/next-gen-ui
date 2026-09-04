import type { InstalledPlugin } from '../../../workbench/host/installed';
import { manifest } from './manifest';

export const jobs: InstalledPlugin = {
  manifest,
  load: () => import('./plugin').then((m) => m.default),
};

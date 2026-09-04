import type { InstalledPlugin } from '../../../workbench/host/installed';
import { manifest } from './manifest';

// The manifest is static; the code is a dynamic import, so the shell treats
// this plugin the way it will treat one loaded over Module Federation.
export const hello: InstalledPlugin = {
  manifest,
  load: () => import('./plugin').then((m) => m.default),
};

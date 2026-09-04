import type { InstalledPlugin } from '../../workbench/host/installed';
import { hello } from './hello';

// Plugins bundled with the host. The registry commit adds remote ones.
export const localPlugins: InstalledPlugin[] = [hello];

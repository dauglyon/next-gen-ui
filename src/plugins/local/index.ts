import type { InstalledPlugin } from '../../workbench/host/installed';
import { data } from './data';
import { jobs } from './jobs';
import { koros } from './koros';

// Plugins bundled with the host. The registry commit adds remote ones.
export const localPlugins: InstalledPlugin[] = [koros, data, jobs];

// From the module, not the barrel: vite.config imports this file, so
// anything reachable from here has to load in Node — and the barrel now
// reaches React components that import the design system.
import type { Manifest } from '../sdk/contract';
import { manifest as data } from './data/manifest';
import { manifest as jobs } from './jobs/manifest';
import { manifest as koros } from './koros/manifest';

// Manifests alone, with no React behind them: the dev registry middleware in
// vite.config serves this list so the fetch path runs against real data.
export const localManifests: Manifest[] = [koros, data, jobs];

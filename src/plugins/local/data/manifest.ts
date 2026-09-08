// From the module, not the barrel: vite.config reads these manifests, so this
// file has to load in Node, and the barrel reaches React components that
// import the design system.
import type { Manifest } from '../../sdk/contract';
import { CONTRACT_VERSION } from '../../sdk/contract';

export const manifest: Manifest = {
  id: 'data',
  title: 'Data',
  description: 'The Data home: datasets by provenance, including the KBase 1.0 bridge.',
  contractVersion: CONTRACT_VERSION,
  icon: 'Database',
  color: 'teal',
  navigator: {},
  document: { route: '/data/$ref' },
};

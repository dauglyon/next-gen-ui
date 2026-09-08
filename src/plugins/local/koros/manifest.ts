// From the module, not the barrel: vite.config reads these manifests, so this
// file has to load in Node, and the barrel reaches React components that
// import the design system.
import type { Manifest } from '../../sdk/contract';
import { CONTRACT_VERSION } from '../../sdk/contract';

export const manifest: Manifest = {
  id: 'koros',
  title: 'KOROS',
  description: 'The assistant: projects, arcs and the questions asked in them.',
  contractVersion: CONTRACT_VERSION,
  icon: 'ChatCircleDots',
  color: 'blue',
  navigator: {},
  document: { route: '/arc/$slug' },
  promptHandler: true,
  commands: [
    { name: 'new-question', title: 'Start a new arc for a question', shortcut: 'New arc' },
  ],
};

// From the module, not the barrel: vite.config reads these manifests, so this
// file has to load in Node, and the barrel reaches React components that
// import the design system.
import type { Manifest } from '../../sdk/contract';
import { CONTRACT_VERSION } from '../../sdk/contract';

export const manifest: Manifest = {
  id: 'jobs',
  title: 'Jobs',
  description: 'Background work: queued, running and finished jobs.',
  contractVersion: CONTRACT_VERSION,
  icon: 'ListChecks',
  color: 'orange',
  navigator: {},
  document: { route: '/job/$id' },
  commands: [
    {
      name: 'cancel',
      title: 'Cancel a job',
      args: [{ name: 'id', type: 'string', required: true, description: 'job id' }],
    },
  ],
};

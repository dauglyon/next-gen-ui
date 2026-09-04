import type { Manifest } from '../../sdk';
import { CONTRACT_VERSION } from '../../sdk';

export const manifest: Manifest = {
  id: 'hello',
  title: 'Hello',
  contractVersion: CONTRACT_VERSION,
  icon: 'HandWaving',
  navigator: {},
  document: { route: '/hi/$name' },
  commands: [
    {
      name: 'hello',
      title: 'Say hello',
      args: [{ name: 'name', type: 'string', required: true }],
    },
  ],
};

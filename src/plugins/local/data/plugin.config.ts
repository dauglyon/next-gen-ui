import { definePluginManifest } from '@kbase/plugin-sdk';

export default definePluginManifest({
  id: 'data',
  title: 'Data',
  description: 'The Data home: datasets by provenance, including the KBase 1.0 bridge.',
  icon: 'Database',
  color: 'teal',
  commands: [
    {
      name: 'open',
      title: 'Open a dataset',
      args: [{ name: 'ref', required: true, description: 'dataset ref or workspace UPA' }],
    },
  ],
});

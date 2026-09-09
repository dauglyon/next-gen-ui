import { definePluginManifest } from '@kbase/plugin-sdk';

export default definePluginManifest({
  id: 'jobs',
  title: 'Jobs',
  description: 'Background work: queued, running and finished jobs.',
  icon: 'ListChecks',
  color: 'orange',
  commands: [
    {
      name: 'open',
      title: 'Open a job',
      args: [{ name: 'id', required: true, description: 'job id' }],
    },
    {
      name: 'cancel',
      title: 'Cancel a job',
      args: [{ name: 'id', required: true, description: 'job id' }],
    },
  ],
});

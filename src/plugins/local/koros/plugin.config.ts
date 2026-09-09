import { definePluginManifest } from '@kbase/plugin-sdk/config';

export default definePluginManifest({
  id: 'koros',
  title: 'KOROS',
  description: 'The assistant: projects, arcs and the questions asked in them.',
  icon: 'ChatCircleDots',
  color: 'blue',
  commands: [{ name: 'new-question', title: 'Start a new arc for a question' }],
  shortcuts: [{ label: 'New arc', command: 'new-question' }],
});

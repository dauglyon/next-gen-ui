import { defineCommands } from '@kbase/plugin-sdk';
import { koros } from './store';

export default defineCommands({
  'new-question': (_args, { host }) => {
    const arc = koros.newArc();
    host.openRoute(`/${arc.slug}`);
  },
});

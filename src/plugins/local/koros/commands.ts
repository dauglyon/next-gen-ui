import { defineCommands } from '@kbase/plugin-sdk';
import { koros } from './store';

export default defineCommands({
  // KIND*AI's + New question, done with the workbench's own composer: the
  // prompt bar's destination becomes a new question, and Send starts the arc.
  'new-question': async (_args, { host }) => {
    koros.setCurrent(null);
    if (host.hasCommand('workbench:prompt')) await host.execute('workbench:prompt');
  },
});

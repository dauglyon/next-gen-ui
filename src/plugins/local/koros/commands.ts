import { defineCommands } from '@kbase/plugin-sdk';
import { koros } from './store';

export default defineCommands({
  // KIND*AI's + New question: a page to ask on, not an arc made on the spot.
  'new-question': (_args, { host }) => {
    koros.propose({});
    host.openRoute('/new');
  },
});

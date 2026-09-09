import { defineBackground } from '@kbase/plugin-sdk';
import { koros } from './store';

export default defineBackground({
  status: () => {
    const n = koros.answering();
    return n > 0 ? [{ text: `${n} answering` }] : [];
  },
});

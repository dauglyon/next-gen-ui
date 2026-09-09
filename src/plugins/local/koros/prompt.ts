import { definePrompt } from '@kbase/plugin-sdk';
import { koros } from './store';

// Free text steers the current arc's session, as KIND*AI's composer does;
// with the destination set to a new question it starts an arc, which is
// KIND*AI's Start research. The cart travels with a turn: an attachment is
// part of what was sent, so it is recorded on the turn rather than read from
// the cart later, which by then may hold something else.
export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const attached = attachments.map((item) => ({
      id: item.id,
      name: item.name,
      subject: item.subject,
      path: item.source && 'path' in item.source ? item.source.path : undefined,
    }));
    const current = koros.current();
    if (current) koros.steer(current, text ?? '', attached);
    const slug = current ?? koros.start(text ?? '', undefined, attached).slug;
    host.openRoute(`/${slug}`);
  },
  destination: { current: () => koros.destination(), subscribe: koros.subscribe },
});

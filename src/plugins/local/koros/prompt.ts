import { definePrompt } from '@kbase/plugin-sdk';
import { koros } from './store';

// Free text steers the current arc's session, as KIND*AI's composer does.
// With no arc current it is a new question, and starting an arc is a
// commitment the user makes on the New question page, so the text goes there
// prefilled. The cart travels with a turn: an attachment is part of what was
// sent, so it is recorded on the turn rather than read from the cart later,
// which by then may hold something else.
export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const slug = koros.current();
    if (!slug) {
      koros.propose({ question: text });
      host.openRoute('/new');
      return;
    }
    koros.steer(
      slug,
      text ?? '',
      attachments.map((item) => ({
        id: item.id,
        name: item.name,
        subject: item.subject,
        path: item.source && 'path' in item.source ? item.source.path : undefined,
      })),
    );
    host.openRoute(`/${slug}`);
  },
  destination: { current: () => koros.destination(), subscribe: koros.subscribe },
});

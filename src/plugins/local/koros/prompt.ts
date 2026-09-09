import { definePrompt } from '@kbase/plugin-sdk';
import { koros } from './store';

// Free text lands in the current arc; with none, a new arc is started. The
// cart travels with it: an attachment is part of what was asked, so it is
// recorded on the question rather than read from the cart later, which by
// then may hold something else.
export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const slug = koros.current() ?? koros.newArc().slug;
    koros.ask(
      slug,
      text ?? '',
      attachments.map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        subject: item.subject,
        path: item.source?.path,
      })),
    );
    host.openRoute(`/${slug}`);
  },
  destination: { current: () => koros.destination(), subscribe: koros.subscribe },
});

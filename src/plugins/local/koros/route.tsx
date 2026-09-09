import { useEffect, useSyncExternalStore } from 'react';
import { Chip } from '@kbase/design-system';
import { defineRoute, fromReact, usePanel, usePanelTitle } from '@kbase/plugin-sdk';
import { koros, slugOf } from './store';

function ArcPage() {
  const { path, focused } = usePanel();
  useSyncExternalStore(koros.subscribe, koros.version, koros.version);
  const slugAsked = slugOf(path);
  const arc = koros.arc(slugAsked);
  const slug = arc?.slug;
  usePanelTitle(arc ? `Arc: ${arc.title}` : `Arc: ${slugAsked}`);
  // An effect, not a render-time call: setCurrent notifies subscribers in
  // other components (the prompt bar's destination row), which React
  // forbids during render.
  useEffect(() => {
    if (focused && slug) koros.setCurrent(slug);
  }, [focused, slug]);
  if (!arc) {
    return (
      <div style={{ padding: 'var(--s-5)' }}>
        <p className="body">No arc is called “{slugAsked}”.</p>
      </div>
    );
  }
  return (
    <div style={{ padding: 'var(--s-5)', display: 'grid', gap: 'var(--s-4)' }}>
      <div>
        <p className="caption">{arc.project}</p>
        <h1 className="h2">{arc.title}</h1>
      </div>
      {arc.questions.length === 0 && (
        <p className="body">Nothing asked yet. Type a question in the prompt bar.</p>
      )}
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 'var(--s-4)' }}>
        {arc.questions.map((q) => (
          <li key={q.id} style={{ display: 'grid', gap: 'var(--s-2)' }}>
            <p className="body" style={{ fontWeight: 'var(--fw-bold)' }}>
              {q.text}
            </p>
            {/* What was in the cart when this was asked, on the question it
                was asked with. Labels rather than links: an item's pointer
                names another plugin's page, and the SDK's `openRoute`
                opens only the calling plugin's own. */}
            {q.attached.length > 0 && (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--s-2)',
                }}
              >
                {q.attached.map((a) => (
                  <li key={a.id}>
                    <Chip color="neutral" label={`${a.subject ?? a.name} · ${a.kind}`} />
                  </li>
                ))}
              </ul>
            )}
            <p className="body" aria-busy={!q.answer}>
              {q.answer ?? 'Answering…'}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default defineRoute({ ...fromReact(ArcPage), normalize: slugOf });

import { useEffect, useSyncExternalStore } from 'react';
import { Chip, Tree } from '@kbase/design-system';
import { definePlugin, useHost, usePanel, usePanelTitle } from '@kbase/plugin-sdk';
import type { PromptContext, StatusItem } from '@kbase/plugin-sdk';
import { koros } from './store';

// The arc named by a path: `/nitro`, with any query or fragment dropped.
// Slugs are lowercase, so case never splits one arc into two panels.
const slugOf = (path: string) => path.split(/[?#]/)[0].slice(1).toLowerCase();

function useKoros() {
  return useSyncExternalStore(koros.subscribe, koros.version, koros.version);
}

function ProjectsNavigator() {
  usePanelTitle('Projects');
  useKoros();
  const host = useHost();
  const items = koros.projects().map((p) => ({
    id: `project:${p.id}`,
    label: p.title,
    children: koros.arcsOf(p.id).map((a) => ({
      id: `arc:${a.slug}`,
      label: a.title,
      suffix: a.questions.some((q) => !q.answer) ? (
        <Chip color="purple" label="answering" />
      ) : undefined,
    })),
  }));
  return (
    <Tree.Root
      aria-label="Projects and arcs"
      items={items}
      selected={koros.current() ? `arc:${koros.current()}` : undefined}
      defaultExpanded={items.map((i) => i.id)}
      onSelect={(id) => {
        if (id.startsWith('arc:')) host.openRoute(`/${id.slice(4)}`);
      }}
    />
  );
}

function ArcDocument() {
  const { path, focused } = usePanel();
  useKoros();
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
                opens only the calling plugin's own. Reopening the source needs
                a cross-plugin open the host does not offer yet. */}
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

function useStatus(): StatusItem[] {
  useKoros();
  const n = koros.answering();
  return n > 0 ? [{ text: `${n} answering` }] : [];
}

// Mirrors the prompt handler below: free text lands in the current arc,
// else starts a new one. Any arc is offered as a switch target.
function usePromptContext(): PromptContext | null {
  useKoros();
  const slug = koros.current();
  const arc = slug ? koros.arc(slug) : undefined;
  return {
    label: arc ? arc.title : 'A new arc',
    path: arc ? `/${arc.slug}` : undefined,
    options: koros
      .projects()
      .flatMap((p) => koros.arcsOf(p.id))
      .map((a) => ({ key: a.slug, label: a.title })),
    select: (key) => koros.setCurrent(key),
  };
}

export default definePlugin({
  navigator: ProjectsNavigator,
  document: ArcDocument,
  normalize: (path) => slugOf(path),
  useStatus,
  usePromptContext,
  commands: {
    'new-question': (_args, { host }) => {
      const arc = koros.newArc();
      host.openRoute(`/${arc.slug}`);
    },
  },
  // Free text lands in the current arc; with none, a new arc is started. The
  // cart travels with it: an attachment is part of what was asked, so it is
  // recorded on the question rather than read from the cart later, which by
  // then may hold something else.
  prompt: async ({ text, attachments }, host) => {
    const slug = koros.current() ?? koros.newArc().slug;
    koros.ask(
      slug,
      text,
      attachments.map((item) => ({
        id: item.id,
        plugin: item.plugin,
        kind: item.kind,
        name: item.name,
        subject: item.subject,
        path: item.source?.path,
      })),
    );
    host.openRoute(`/${slug}`);
  },
});

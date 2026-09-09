import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button, Chip, Field, Select, Textarea } from '@kbase/design-system';
import { defineRoute, fromReact, useHost, usePanel, usePanelTitle } from '@kbase/plugin-sdk';
import { STAGES, koros, slugOf } from './store';
import styles from './koros.module.css';

// Two pages: `/new` asks a question, as KIND*AI's New question panel does;
// anything else is an arc, shown as its session view is — the question, where
// it stands in the stages, what needs you, and the turns so far. Gates, drift
// and deliverables are not in the mock.
function KorosPage() {
  const { path } = usePanel();
  return slugOf(path) === 'new' ? <NewQuestion /> : <ArcPage />;
}

// A sentinel rather than an empty value: the select needs an option to show.
const STANDALONE = '\u0000standalone';

function NewQuestion() {
  usePanelTitle('New question');
  const host = useHost();
  useSyncExternalStore(koros.subscribe, koros.version, koros.version);
  // One page is reused for every open, so each open proposes a draft and the
  // form takes it as it arrives. (The previous-render pattern: state set
  // during render for a value derived from the last one.)
  const draft = koros.draft();
  const [seen, setSeen] = useState(draft.id);
  const [text, setText] = useState(draft.question ?? '');
  const [project, setProject] = useState(draft.project ?? STANDALONE);
  if (seen !== draft.id) {
    setSeen(draft.id);
    setProject(draft.project ?? STANDALONE);
    if (draft.question) setText(draft.question);
  }
  const start = () => {
    if (!text.trim()) return;
    const arc = koros.start(text.trim(), project === STANDALONE ? undefined : project);
    host.openRoute(`/${arc.slug}`);
  };
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className="h2">New question</h1>
        <p className="body">
          Ask KOROS a research question to start an arc. It frames the question first: what the
          commons already knows, then a plan for you to approve. Filed under a project, or standing
          alone as a project of its own.
        </p>
      </div>
      <form
        className={styles.ask}
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <Field.Root>
          <Field.Label>Question</Field.Label>
          <Textarea
            value={text}
            onValueChange={setText}
            onSubmit={start}
            rows={3}
            autoGrow
            autoFocus
            placeholder="e.g. Which ENIGMA soil isolates fix nitrogen fastest, and what carbon sources drive it?"
          />
        </Field.Root>
        <div className={styles.askRow}>
          <Field.Root>
            <Field.Label>File under</Field.Label>
            <Select.Root value={project} onValueChange={(v) => setProject(String(v))}>
              <Select.Trigger />
              <Select.Popup>
                <Select.Item value={STANDALONE}>New standalone arc</Select.Item>
                {koros.projects().map((p) => (
                  <Select.Item key={p.id} value={p.id}>
                    {p.title}
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Root>
          </Field.Root>
          <Button variant="primary" type="submit" disabled={!text.trim()}>
            Start research
          </Button>
        </div>
      </form>
    </div>
  );
}

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
      <div className={styles.page}>
        <p className="body">No arc is called “{slugAsked}”.</p>
      </div>
    );
  }
  const project = koros.projects().find((p) => p.id === arc.project)?.title ?? arc.project;
  return (
    <div className={styles.page}>
      {/* A standalone arc is a project of its own with the same name, so the
          caption would repeat the title. The question is the first turn. */}
      <div className={styles.head}>
        {project !== arc.title && <p className="caption">{project}</p>}
        <h1 className="h2">{arc.title}</h1>
      </div>

      <ol className={styles.stages} aria-label="Stages">
        {STAGES.map((stage) => (
          <li key={stage}>
            <Chip color={stage === arc.stage ? 'primary' : 'neutral'} label={stage} />
          </li>
        ))}
        {arc.needsYou ? (
          <li>
            <Chip color="purple" label={`needs you: ${arc.next}`} />
          </li>
        ) : (
          arc.next !== 'none' && <li className="caption">{`next: ${arc.next}`}</li>
        )}
      </ol>

      <ol className={styles.turns} aria-label="Session">
        {arc.turns.map((turn) => (
          <li key={turn.id} className={styles.turn} data-by={turn.by}>
            <p className={styles.by}>{turn.by === 'you' ? 'You' : 'KOROS'}</p>
            <p className="body">{turn.text}</p>
            {/* What was in the cart when this was sent, on the turn it was
                sent with. Labels rather than links: an item's pointer names
                another plugin's page, and the SDK's `openRoute` opens only
                the calling plugin's own. */}
            {turn.attached.length > 0 && (
              <ul className={styles.attached}>
                {turn.attached.map((a) => (
                  <li key={a.id}>
                    <Chip color="neutral" label={a.subject ?? a.name} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {arc.working && (
          <li className={styles.turn} data-by="koros" aria-busy="true">
            <p className={styles.by}>KOROS</p>
            <p className="body">Working…</p>
          </li>
        )}
      </ol>
      {arc.needsYou && (
        <div className={styles.askRow}>
          <Button variant="primary" size="sm" onClick={() => koros.approve(arc.slug)}>
            Approve plan
          </Button>
          <p className="caption">Or just tell the session: type in the prompt bar.</p>
        </div>
      )}
    </div>
  );
}

export default defineRoute({ ...fromReact(KorosPage), normalize: slugOf });

import { useState, useSyncExternalStore } from 'react';
import { Button, Chip, SearchBar } from '@kbase/design-system';
import { Code, Gear } from '@phosphor-icons/react';
import type { Manifest } from '../../../plugins/sdk';
import { qualifyCommand, usePanelTitle } from '../../../plugins/sdk';
import { useLayout, useRun, useServices } from '../../react/context';
import { iconFor } from '../icons';
import { openPane, openRoute } from '../open';
import { isApp } from './apps';
import styles from './Home.module.css';

// The launcher as a page: everything installed, searchable. The prompt
// bar completes the same names inline; this is that search given room,
// and the only path to a page-like plugin that does not need its name
// known in advance.
export function HomeDocument() {
  usePanelTitle('Home');
  const services = useServices();
  const { source, preview, prompt: promptBar } = services;
  const layout = useLayout();
  const run = useRun();
  const [query, setQuery] = useState('');
  useSyncExternalStore(source.subscribe, source.version, source.version);

  const q = query.trim().toLowerCase();
  const matches = (m: Manifest) =>
    !q ||
    m.title.toLowerCase().includes(q) ||
    m.id.includes(q) ||
    (m.description?.toLowerCase().includes(q) ?? false);
  const listed = source
    .manifests()
    .filter((m) => m.id !== 'home' && m.id !== 'catalog' && m.id !== 'docs' && matches(m));
  const apps = listed.filter(isApp);
  const panels = listed.filter((m) => source.has(m.id, 'pane'));

  const openApp = (m: Manifest) =>
    void run(qualifyCommand(m.launcher!.command, m.id), m.launcher!.args);
  // Settings is installed like anything else, but it is not listed here: it is
  // the host's own page rather than something a user chose to install, and a
  // reader looking for it is looking for a link, not a search result.
  const openSettings = () => void openRoute(services, 'catalog', '/');
  // Beside Settings for the same reason: the host's own pages, reached by a
  // link rather than found in a search over what is installed.
  const openDocs = () => void openRoute(services, 'docs', '/');
  // Show where it lives, never pin: a pinned plugin's pane is focused in
  // its sidebar block, an unpinned one is previewed the way the sidebar's
  // More menu previews it. Pinning is the catalog's job.
  const showPanel = (m: Manifest) => {
    if (layout.sidebar.pinned.includes(m.id)) openPane(services, m.id);
    else preview.set(m.id);
  };

  return (
    <div className={styles.root}>
      <div className={styles.find}>
        <SearchBar
          className={styles.search}
          value={query}
          onValueChange={setQuery}
          placeholder="Search apps and panels"
          aria-label="Search installed plugins"
        />
        <Button variant="ghost" size="sm" quiet onClick={openSettings}>
          <Gear size={14} aria-hidden="true" />
          Settings
        </Button>
        <Button variant="ghost" size="sm" quiet onClick={openDocs}>
          <Code size={14} aria-hidden="true" />
          Plugin developer documentation
        </Button>
      </div>

      <Section title="Apps" empty="No app matches." items={apps} onPick={openApp} />
      <Section
        title="Panels"
        empty="No panel matches."
        items={panels}
        onPick={showPanel}
        // Beside the description, not instead of it: where a panel
        // already is does not describe what it is.
        note={(m) => (layout.sidebar.pinned.includes(m.id) ? 'In the sidebar' : undefined)}
      />

      <Tour onFocusPrompt={() => promptBar.focus()} />
    </div>
  );
}

// The prototype's own instructions, for someone who has never seen it and does
// not know the vocabulary. A tour, not an explainer: every line is a thing to
// do and what appears; no mechanism, nothing named after the code. It follows
// the lists, which are what the page is for.
function Tour({ onFocusPrompt }: { onFocusPrompt: () => void }) {
  return (
    <section className={styles.tour} aria-labelledby="home-tour">
      <header className={styles.tourHead}>
        <h2 id="home-tour" className="h4">
          What to try
        </h2>
        <Chip color="primary" label="Prototype" />
      </header>

      <ol className={styles.journey}>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            1
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Ask for a protein</h3>
            <p className={styles.stepText}>
              Type <Key>dossier for p0aex9</Key> in the box at the bottom. Press the Function
              Junction row. A dossier on the protein opens in the middle.{' '}
              <button type="button" className={styles.tourLink} onClick={onFocusPrompt}>
                Put the cursor there
              </button>
            </p>
          </div>
        </li>

        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            2
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Look left</h3>
            <p className={styles.stepText}>
              The Related panel has filled in: other tools offering what they know about this
              protein. Press one to open it beside the first.
            </p>
          </div>
        </li>

        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            3
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Keep something</h3>
            <p className={styles.stepText}>
              Press Add to cart on the report, or on any line in it. It shows up in the cart under
              the box. Related now offers things for what you kept, too.
            </p>
          </div>
        </li>

        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            4
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Ask KOROS</h3>
            <p className={styles.stepText}>
              Press New question in Shortcuts. Type{' '}
              <Key>which soil isolates fix nitrogen fastest?</Key> and press Enter. KOROS reads what
              you kept, frames the question, and hands you a plan. Press Approve plan.
            </p>
          </div>
        </li>

        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            5
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Come back to it</h3>
            <p className={styles.stepText}>
              Reload the page. Your tabs, your cart and your arc are where you left them. The KOROS
              panel on the left shows which arcs are waiting on you.
            </p>
          </div>
        </li>
      </ol>

      <div className={styles.tourMore}>
        <h3 className={styles.tourMoreTitle}>Also try</h3>
        <ul className={styles.tourMoreList}>
          <li>
            <Key>cancel job 12</Key> · <Key>browse</Key> · <Key>/</Key> and a command name, Tab to
            complete it
          </li>
          <li>Dragging a panel from the left into the middle</li>
          <li>More, at the foot of the left column, to peek at a panel you have not pinned</li>
          <li>Settings, for which panels you keep and which assistant answers you</li>
        </ul>
      </div>

      <p className={`caption ${styles.tourNote}`}>
        KOROS, Jobs and Data are mock-ups. Function Junction and genKnown are the real apps, reading
        the KBase lakehouse.
      </p>
    </section>
  );
}

// Something to type, set off from the sentence. Control names are left in
// plain prose: capitalised, they already read as labels, and a keycap on
// every one of them turns the paragraph into a rash.
function Key({ children }: { children: string }) {
  return <code className={styles.key}>{children}</code>;
}

function Section({
  title,
  empty,
  items,
  onPick,
  note,
}: {
  title: string;
  empty: string;
  items: Manifest[];
  onPick: (m: Manifest) => void;
  note?: (m: Manifest) => string | undefined;
}) {
  return (
    <section className={styles.section} aria-labelledby={`home-${title}`}>
      <h2 id={`home-${title}`} className="h4">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="caption">{empty}</p>
      ) : (
        <ul className={styles.grid}>
          {items.map((m) => {
            const Icon = iconFor(m.icon, m.color);
            const hint = note?.(m);
            return (
              <li key={m.id}>
                <button type="button" className={styles.card} onClick={() => onPick(m)}>
                  <span className={styles.cardIcon} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className={styles.cardTitle}>
                    {m.title}
                    {hint && <Chip color="neutral" label={hint} />}
                  </span>
                  <p className={`caption ${styles.cardDesc}`}>{m.description}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

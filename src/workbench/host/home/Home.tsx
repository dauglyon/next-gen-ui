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
// not know the vocabulary: no manifests, navigators or documents, and nothing
// named after the code. It follows the lists, which are what the page is for.
//
// A walkthrough, not an explanation: each step says what to do and what will
// happen, and the reason is one clause at most. The four steps are the path a
// first visit takes — ask, open, collect, send. What the workbench can also
// do sits after them, in the same voice.
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
            <h3 className={styles.stepTitle}>Type what you are after</h3>
            <p className={styles.stepText}>
              Type <Key>P0AEX9</Key> into the box at the bottom. A short list appears above it:
              Function Junction is offering you a dossier on that protein. Every installed plugin
              saw what you typed, and the ones that recognised it answered.{' '}
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
            <h3 className={styles.stepTitle}>Take the offer</h3>
            <p className={styles.stepText}>
              Press it. The dossier opens as a tab in the middle. Function Junction was not here a
              moment ago: its code was fetched from its own server when you asked for it.
            </p>
          </div>
        </li>

        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            3
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Add what matters to the cart</h3>
            <p className={styles.stepText}>
              On the dossier, press Add on the report, or on any single line of it. It lands in the
              cart at the bottom. The cart is the workbench&apos;s own, so anything you open can put
              things in it and anything you send to can read them.
            </p>
          </div>
        </li>

        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            4
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Send it with a question</h3>
            <p className={styles.stepText}>
              Type a question and press Enter. What you typed goes to the assistant, KOROS, with the
              cart attached, and its answer opens as a tab.
            </p>
          </div>
        </li>
      </ol>

      <div className={styles.tourMore}>
        <h3 className={styles.tourMoreTitle}>Then, whenever</h3>
        <ul className={styles.tourMoreList}>
          <li>
            <b>Rearrange.</b> Drag a panel from the left column into the middle to give it a tab, or
            drop a tab beside another one for the two side by side.
          </li>
          <li>
            <b>Peek.</b> Press More at the foot of the left column to look at a panel you have not
            pinned. Drag its dashed frame in to keep it; leave it and it is gone on reload.
          </li>
          <li>
            <b>Settings.</b> Choose which panels sit in the left column, and which assistant gets
            your text when you press Enter.
          </li>
          <li>
            <b>Reload.</b> Everything comes back where you left it, down to what you were reading.
            Workbench → Lock layout keeps things from moving by accident.
          </li>
        </ul>
      </div>

      <p className={`caption ${styles.tourNote}`}>
        The data is made up and none of it leaves this browser — a working sketch of how the pieces
        fit together, not the pieces themselves.
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

import { useState, useSyncExternalStore } from 'react';
import { Button, Chip, SearchBar } from '@kbase/design-system';
import { Gear } from '@phosphor-icons/react';
import type { Manifest } from '../../../plugins/sdk';
import { usePanelTitle } from '../../../plugins/sdk';
import { makePanel } from '../../core';
import { useDispatch, useLayout, useServices } from '../../react/context';
import { iconFor } from '../icons';
import { routeParams } from '../routes';
import styles from './Home.module.css';

// An app is a document that can be opened with nothing: either its route takes
// no params, or it declares that it renders a landing state when they are
// absent. Function Junction is the second kind — its route names a protein so a
// dossier has a readable URL, and it asks for one when none is given.
export const isApp = (m: Manifest) =>
  Boolean(m.document && (m.document.opensEmpty || routeParams(m.document.route).length === 0));

// The launcher as a page: everything installed, searchable. The prompt
// bar completes the same names inline; this is that search given room,
// and the only path to a page-like plugin that does not need its name
// known in advance.
export function HomeDocument() {
  usePanelTitle('Home');
  const { source, preview, prompt: promptBar } = useServices();
  const layout = useLayout();
  const dispatch = useDispatch();
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
    .filter((m) => m.id !== 'home' && m.id !== 'catalog' && matches(m));
  const apps = listed.filter(isApp);
  const panels = listed.filter((m) => m.navigator);

  const openApp = (m: Manifest) =>
    dispatch({ type: 'open', panel: makePanel(m.id, 'document', {}) });
  // Settings is installed like anything else, but it is not listed here: it is
  // the host's own page rather than something a user chose to install, and a
  // reader looking for it is looking for a link, not a search result.
  const openSettings = () =>
    dispatch({ type: 'open', panel: makePanel('catalog', 'document', {}) });
  // Show where it lives, never pin: a pinned plugin's navigator is
  // focused in its sidebar block, an unpinned one is previewed the way
  // the sidebar's More menu previews it. Pinning is the catalog's job.
  const showPanel = (m: Manifest) => {
    if (layout.sidebar.pinned.includes(m.id)) {
      dispatch({ type: 'open', panel: makePanel(m.id, 'navigator') });
    } else {
      preview.set(m.id);
    }
  };

  return (
    <div className={styles.root}>
      <Tour onFocusPrompt={() => promptBar.focus()} />

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
    </div>
  );
}

// The prototype's own instructions, for someone who has never seen it and does
// not know the vocabulary: no manifests, navigators or documents, and nothing
// named after the code.
//
// One journey rather than a list of features. The four steps are the path a
// first visit takes — ask, open, collect, send — and each is a headline a
// reader can skim with a sentence under it they can skip. What used to be
// steps four to seven were not part of that path; they are things the
// workbench can do, and they sit after it as such.
//
// The subject is the shell's architecture, not the platform it serves and not
// the plugins it hosts. Four mechanisms, one per step: text offered to every
// plugin rather than routed by the host, code fetched at runtime from a
// manifest, a cart the host owns so plugins need not know each other, and an
// assistant that is itself a plugin the prompt is routed to. Function Junction
// is the thing to press, never the thing being described.
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
              Put <Key>nifH</Key> in the box at the bottom. The workbench does not know what nifH
              is. It hands the text to every installed plugin and shows you the ones that answered,
              so recognising an identifier is the plugin's job and routing you to it is the shell's.{' '}
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
            <h3 className={styles.stepTitle}>Open Function Junction</h3>
            <p className={styles.stepText}>
              Until you press it, the workbench holds only a manifest: a name, an icon, a route, and
              an address to fetch the code from. Opening it loads that code at runtime and gives it
              a tab. Nothing about it was compiled in, so it ships on its own and the shell needs no
              release to carry a new one.
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
              The cart belongs to the shell, so anything can fill it and anything can read it. An
              item carries the data itself rather than a handle to it, which is what lets it outlive
              the panel it came from and be read by a plugin that knows nothing about the one that
              added it. Press a tile to see everything an item holds.
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
              Press Enter and the shell routes the text, and the cart with it, to whichever plugin
              is set as the assistant. It is a plugin like the rest — it declares that it handles
              prompts, and the workbench hands it what you typed and what you collected.
            </p>
          </div>
        </li>
      </ol>

      <div className={styles.tourMore}>
        <h3 className={styles.tourMoreTitle}>Then, whenever</h3>
        <ul className={styles.tourMoreList}>
          <li>
            <b>Rearrange.</b> Drag a panel from the left column into the middle for a tab of its
            own, or drop a tab near another panel&apos;s edge for two things side by side.
          </li>
          <li>
            <b>Peek.</b> More, at the foot of the left column, shows a tool in a dashed frame. Drag
            the frame in to keep it; leave it and it goes on reload.
          </li>
          <li>
            <b>Settings.</b> Which tools sit in the left column, and which assistant gets your text
            when you press Enter without choosing a row.
          </li>
          <li>
            <b>Reload.</b> Everything returns where you left it, down to what you were reading.
            Workbench → Lock layout stops things moving by accident.
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

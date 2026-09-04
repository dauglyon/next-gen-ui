import { useState, useSyncExternalStore } from 'react';
import { Chip, SearchBar } from '@kbase/design-system';
import type { Manifest } from '../../../plugins/sdk';
import { usePanelTitle } from '../../../plugins/sdk';
import { makePanel } from '../../core';
import { useDispatch, useLayout, useServices } from '../../react/context';
import { iconFor } from '../icons';
import { routeParams } from '../routes';
import styles from './Home.module.css';

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
  const listed = source.manifests().filter((m) => m.id !== 'home' && matches(m));
  // An app is a document that names itself completely: no route params to
  // fill, so it can be opened from a list.
  const apps = listed.filter((m) => m.document && routeParams(m.document.route).length === 0);
  const panels = listed.filter((m) => m.navigator);

  const openApp = (m: Manifest) =>
    dispatch({ type: 'open', panel: makePanel(m.id, 'document', {}) });
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

      <SearchBar
        className={styles.search}
        value={query}
        onValueChange={setQuery}
        placeholder="Search apps and panels"
        aria-label="Search installed plugins"
      />

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

// The prototype's own instructions. Each item names what to do and what
// the code then does, in terms a reader can check against the screen.
function Tour({ onFocusPrompt }: { onFocusPrompt: () => void }) {
  return (
    <section className={styles.tour} aria-labelledby="home-tour">
      <h2 id="home-tour" className="h4">
        What to try
        <Chip color="primary" label="Prototype" />
      </h2>
      <ol className={styles.tourList}>
        <li>
          <b>Type into the prompt bar.</b> Every installed plugin reads each keystroke and answers
          with the pages it would open. <Key>P0A7B8</Key> gets two answers from Function Junction, a
          dossier and a structure; <Key>nifH</Key> gets one each from Data, Jobs and Function
          Junction; <Key>E. coli</Key> reaches GenKnown. The row nearest the field is the one Enter
          runs, and it goes to the assistant. A leading <Key>/</Key> replaces the list with
          commands.{' '}
          <button type="button" className={styles.tourLink} onClick={onFocusPrompt}>
            Put the cursor there
          </button>
        </li>
        <li>
          <b>Pick one of those rows.</b> It opens Function Junction or GenKnown as a document and
          passes it the row&apos;s action; each page prints the action it received. Those two
          plugins have no sidebar panel, so the prompt bar and this page are the ways in.
        </li>
        <li>
          <b>Rearrange the sidebar.</b> A block header folds on click and reorders on drag.
          Collapsing the sidebar leaves a 48-pixel icon rail in the same order, each icon opening
          its panel in a flyout. More shows an unpinned plugin as a dashed block at the bottom of
          the stack; that block is dropped on reload, and dragging it onto another block pins it at
          that position.
        </li>
        <li>
          <b>Move a panel between the sidebar and the tabs.</b> Dragging a sidebar block into a tab
          group moves it there; dropping a tab on a group&apos;s edge splits the group in that
          direction. Right-clicking a tab or a block header reaches the same operations without a
          drag.
        </li>
        <li>
          <b>Reload.</b> The arrangement, the fold states, the focused panel and the focused
          document&apos;s URL are stored in the browser and restored. Lock layout, in the Workbench
          menu, then refuses moving, resizing, pinning and unpinning; opening, closing, focusing and
          folding go on working.
        </li>
      </ol>
      <p className={`caption ${styles.tourNote}`}>
        The datasets, jobs and arcs are fixtures compiled into the page, and Function Junction and
        GenKnown are iframes over static HTML. Nothing here reaches a server. The plugin contract,
        the loading of a plugin on first use, the layout reducer and the URL round-trip are the
        parts under test.
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
            const Icon = iconFor(m.icon);
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

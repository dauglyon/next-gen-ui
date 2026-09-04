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

// The prototype's own instructions: one action per line, and what it
// does. A row in the prompt bar is a plugin's guess at the text, not a
// search result, which is the one thing the screen cannot say for itself.
function Tour({ onFocusPrompt }: { onFocusPrompt: () => void }) {
  return (
    <section className={styles.tour} aria-labelledby="home-tour">
      <h2 id="home-tour" className="h4">
        What to try
        <Chip color="primary" label="Prototype" />
      </h2>
      <ol className={styles.tourList}>
        <li>
          Type <Key>nifH</Key> in the prompt bar. Data, Jobs and Function Junction each offer a
          place to land, all three guessing from the shape of the text; none of them looked anything
          up. Picking one opens that plugin, which prints the action it was handed.{' '}
          <button type="button" className={styles.tourLink} onClick={onFocusPrompt}>
            Put the cursor there
          </button>
        </li>
        <li>
          Open Function Junction below. A plugin can be a whole page instead of a sidebar panel, and
          both kinds come from the same manifest.
        </li>
        <li>
          Drag a sidebar block into a tab group, or drop a tab on a group&apos;s edge to split it.
          Right-clicking a tab or a block header reaches the same operations.
        </li>
        <li>
          Open More and drag the dashed block onto the stack. It pins where it lands; left alone, it
          is gone on reload.
        </li>
        <li>
          Open Catalog. Pinning, unpinning and choosing which plugin answers free text are settings
          there, not fixed in the shell.
        </li>
        <li>
          Reload. Arrangement, folds, focus and the document&apos;s URL come back. Lock layout, in
          the Workbench menu, then refuses moves, resizes, pins and unpins.
        </li>
      </ol>
      <p className={`caption ${styles.tourNote}`}>
        Datasets, jobs and arcs are fixtures. Function Junction and GenKnown are static HTML in
        iframes. Nothing reaches a server.
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

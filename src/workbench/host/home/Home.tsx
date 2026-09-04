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

// The prototype's own instructions. This is a mockup shown to people who
// did not build it, and the parts worth looking at are the interactions,
// which nothing on screen announces. It stays at the top because a first
// visit is the only time it is read.
function Tour({ onFocusPrompt }: { onFocusPrompt: () => void }) {
  return (
    <section className={styles.tour} aria-labelledby="home-tour">
      <h2 id="home-tour" className="h4">
        What to try
        <Chip color="primary" label="Prototype" />
      </h2>
      <ol className={styles.tourList}>
        <li>
          <b>Type into the prompt bar.</b> <Key>P0A7B8</Key>, <Key>E. coli</Key>, <Key>nifH</Key>,{' '}
          <Key>reads</Key>. Each plugin decides for itself whether it recognises what you typed and
          says where it could take you; the row nearest the field is what Enter does. <Key>/</Key>{' '}
          lists commands instead.{' '}
          <button type="button" className={styles.tourLink} onClick={onFocusPrompt}>
            Put the cursor there
          </button>
        </li>
        <li>
          <b>Open an app.</b> Function Junction and GenKnown are whole pages rather than sidebar
          panels. Whichever row you pick hands them what to show; the page prints the action it
          received.
        </li>
        <li>
          <b>Rearrange the sidebar.</b> Drag a block by its header to reorder it, click a header to
          fold it, and collapse the whole sidebar to the icon rail. <Key>More</Key> previews a
          plugin without pinning it — drag that preview onto the stack to pin it where you drop it.
        </li>
        <li>
          <b>Move panels around.</b> Drag a navigator out of the sidebar into a tab group, or drag a
          tab to the edge of a group to split it. Every drag also has a menu route: right-click a
          tab or a block header.
        </li>
        <li>
          <b>Reload the page.</b> The arrangement, the focused panel and the open document&apos;s
          URL all come back. <Key>Workbench → Lock layout</Key> freezes the arrangement while
          leaving opening, closing and folding free.
        </li>
      </ol>
      <p className={`caption ${styles.tourNote}`}>
        Every plugin here is a stand-in: the datasets, jobs and arcs are fixtures, and the two apps
        are iframes standing where the real ones would be. What is real is the shell around them —
        how a plugin declares itself, gets loaded, and shares the window.
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

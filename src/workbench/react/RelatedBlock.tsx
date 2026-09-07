import { useEffect, useState, useSyncExternalStore } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { Tooltip } from '@kbase/design-system';
import { groupOf } from '../core';
import type { RelatedSection } from '../core';
import { iconFor } from '../host/icons';
import { useLayout, useServices } from './context';
import styles from './Workbench.module.css';

// What the rest of the workbench has to say about what is in front of you and
// what you have collected.
//
// Two sections, in that order. The first changes as you navigate and is the
// one that usually has something in it; the second is rarer and more
// considered, and reads better as the thing you scroll to than as the thing
// that pushes the live one down. Both are hidden when empty, and the block
// with them — a pane that says "Related · 0" is furniture.
//
// The headings say only what each list was computed from, because the block
// already says what the relation is: an accession, and the cart's own mark.

export function RelatedBlock() {
  const { related, relatedRunner, cart, source } = useServices();
  const layout = useLayout();
  useSyncExternalStore(related.subscribe, related.version, related.version);
  useSyncExternalStore(cart.subscribe, cart.version, cart.version);
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const [view, setView] = useState<ViewContext | null>(null);

  // The front tab of the main area, not whatever has focus: the pane should
  // not change because a click landed in the sidebar.
  const front = frontPanel(layout);
  const module = front ? source.loaded(front.plugin) : undefined;
  const items = cart.items();

  useEffect(() => {
    relatedRunner.run({
      view,
      cart: {
        subject: `${items.length} item${items.length === 1 ? '' : 's'}`,
        terms: items.flatMap((i) => i.terms ?? []),
      },
    });
    // The term strings are the input; the arrays holding them are not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.plugin, view?.terms.join(','), items.map((i) => (i.terms ?? []).join(',')).join('|')]);

  const { sections } = related.get();

  // The reader is its own component, keyed by the panel and by whether the
  // module has arrived: `useViewTerms` is the plugin's hook, and calling it
  // through a variable that goes from undefined to a function would change
  // this component's hook count mid-life.
  const reader =
    front && module?.useViewTerms ? (
      <ViewTerms
        key={`${front.id}:loaded`}
        useTerms={module.useViewTerms}
        params={front.params ?? {}}
        subject={subjectOf(front, source.manifest(front.plugin)?.title)}
        plugin={front.plugin}
        onTerms={setView}
      />
    ) : null;

  if (sections.length === 0) return reader;

  return (
    <section className={styles.relatedBlock} aria-labelledby="related-h">
      {reader}
      <header className={styles.relatedHead}>
        <h2 id="related-h" className={styles.relatedTitle}>
          Related
        </h2>
        <span className={styles.relatedCount}>
          {sections.reduce((n, s) => n + s.items.length, 0)}
        </span>
      </header>
      {sections.map((section) => (
        <Section
          key={section.context}
          section={section}
          onAccept={(key) => void relatedRunner.accept(key)}
          onDismiss={(key) => related.dismiss(key)}
          markOf={(plugin) => {
            const manifest = source.manifest(plugin);
            return iconFor(manifest?.icon, manifest?.color);
          }}
        />
      ))}
    </section>
  );
}

function Section({
  section,
  onAccept,
  onDismiss,
  markOf,
}: {
  section: RelatedSection;
  onAccept: (key: string) => void;
  onDismiss: (key: string) => void;
  markOf: (plugin: string) => ReturnType<typeof iconFor>;
}) {
  return (
    <div className={styles.relatedSection}>
      <p className={styles.relatedFrom}>
        {section.context === 'cart' && <span aria-hidden="true">🛒</span>}
        {section.subject}
      </p>
      <ul className={styles.relatedList}>
        {section.items.map((item) => {
          const Mark = markOf(item.plugin);
          return (
            <li key={item.key} className={styles.relatedRow}>
              <Mark size={14} className={styles.relatedMark} aria-hidden="true" />
              <span className={styles.relatedLabel}>
                {item.proposal.label}
                {item.proposal.detail && (
                  <span className={styles.relatedDetail}>{item.proposal.detail}</span>
                )}
              </span>
              <Tooltip.Root>
                <Tooltip.Trigger
                  render={
                    <button
                      type="button"
                      className={styles.relatedAdd}
                      aria-label={`Add ${item.proposal.label} to the cart`}
                      onClick={() => onAccept(item.key)}
                    />
                  }
                >
                  <Plus size={12} weight="bold" aria-hidden="true" />
                </Tooltip.Trigger>
                <Tooltip.Popup>Add to the cart</Tooltip.Popup>
              </Tooltip.Root>
              <button
                type="button"
                className={styles.relatedDismiss}
                aria-label={`Dismiss ${item.proposal.label}`}
                onClick={() => onDismiss(item.key)}
              >
                <X size={11} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {Object.entries(section.overflow).map(([title, n]) => (
        <p key={title} className={styles.relatedMore}>{`${n} more from ${title}`}</p>
      ))}
    </div>
  );
}

// The plugin whose panel is at the front of the main area, if any.
function frontPanel(layout: ReturnType<typeof useLayout>) {
  const group = layout.focus ? groupOf(layout.main, layout.focus) : undefined;
  const id = group?.active ?? layout.focus;
  const panel = id ? layout.panels[id] : undefined;
  return panel ? { ...panel, id: id as string } : null;
}

export interface ViewContext {
  plugin: string;
  subject: string;
  terms: string[];
}

// Runs the front panel's own `useViewTerms` and reports upward. Renders
// nothing: it exists so the plugin's hook has a component of its own, whose
// life begins when its module arrives.
function ViewTerms({
  useTerms,
  params,
  plugin,
  subject,
  onTerms,
}: {
  useTerms: (params: Record<string, string>) => string[];
  params: Record<string, string>;
  plugin: string;
  subject: string;
  onTerms: (view: ViewContext | null) => void;
}) {
  const terms = useTerms(params);
  const key = terms.join(',');
  useEffect(() => {
    onTerms(terms.length ? { plugin, subject, terms } : null);
    // `key` is the value; `terms` is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, plugin, subject]);
  return null;
}

// What the section heading says the list was computed from: the panel's own
// first parameter, which for both apps is the thing it is open on.
function subjectOf(
  panel: { plugin: string; params?: Record<string, string> },
  title: string | undefined,
) {
  return Object.values(panel.params ?? {})[0] ?? title ?? panel.plugin;
}

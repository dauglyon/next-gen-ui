import { useEffect, useSyncExternalStore } from 'react';
import { ArrowUpRight, Plus, X } from '@phosphor-icons/react';
import { Tooltip } from '@kbase/design-system';
import { groupOf, makePanel } from '../../core';
import type { RelatedItem, RelatedSection } from '../../core';
import { PluginMark } from '../PluginMark';
import { useDispatch, useLayout, useServices } from '../../react/context';
import styles from '../../react/Workbench.module.css';

// What the rest of the workbench is about, given what is on screen and what is
// in the cart.
//
// A navigator like any other, so the sidebar's own machinery applies: it
// folds, it resizes, it reorders, it appears in the rail when the sidebar is
// collapsed, and Settings can unpin it.
//
// Two sections, in that order. The first changes as you navigate and is the
// one that usually has something in it; the second is rarer and more
// considered. Each is hidden when empty. The headings say only what the list
// was computed from — the block already says what the relation is.
//
// A row is a link. Pressing it opens the page the answering plugin named; the
// `+` puts the item that plugin offered into the cart. Nothing is fetched to
// show a row, because a proposal carries no payload.

export function RelatedNavigator() {
  const { related, relatedRunner, cart, terms: termStore } = useServices();
  const layout = useLayout();
  useSyncExternalStore(related.subscribe, related.version, related.version);
  useSyncExternalStore(cart.subscribe, cart.version, cart.version);
  useSyncExternalStore(termStore.subscribe, termStore.version, termStore.version);

  // The front tab of the main area, not whatever has focus: the pane should
  // not change because a click landed in the sidebar.
  const front = frontPanel(layout);
  const viewTerms = front ? termStore.get(front.id) : [];
  const items = cart.items();
  const cartTerms = items.flatMap((i) => i.terms ?? []);

  const viewKey = viewTerms.join(',');
  const cartKey = cartTerms.join(',');
  useEffect(() => {
    relatedRunner.run({
      view: front && viewKey ? { plugin: front.plugin, subject: subjectOf(front), terms: viewTerms } : null,
      cart: { count: items.length, terms: cartTerms },
      held: items.map((i) => i.id),
    });
    // Values, not the arrays holding them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front?.plugin, front?.id, viewKey, cartKey, items.length]);

  const { sections, loading } = related.get();
  if (sections.length === 0) {
    return loading ? <p className={`caption ${styles.relatedEmpty}`}>Asking…</p> : null;
  }

  return (
    <div className={styles.related}>
      {sections.map((section) => (
        <Section key={section.context} section={section} />
      ))}
    </div>
  );
}

function Section({ section }: { section: RelatedSection }) {
  const { source } = useServices();
  return (
    <div className={styles.relatedSection}>
      <p className={styles.relatedFrom}>
        {section.context === 'cart' ? (
          <>
            <span aria-hidden="true">🛒</span>
            {`${section.count} item${section.count === 1 ? '' : 's'}`}
          </>
        ) : (
          section.subject
        )}
      </p>
      <ul className={styles.relatedList}>
        {section.items.map((item) => (
          <Row key={item.key} item={item} title={source.manifest(item.plugin)?.title ?? item.plugin} />
        ))}
      </ul>
      {Object.entries(section.overflow).map(([title, n]) => (
        <p key={title} className={styles.relatedMore}>{`${n} more from ${title}`}</p>
      ))}
    </div>
  );
}

function Row({ item, title }: { item: RelatedItem; title: string }) {
  const { related, relatedRunner, source } = useServices();
  const dispatch = useDispatch();
  const manifest = source.manifest(item.plugin);
  const open = () =>
    dispatch({ type: 'open', panel: makePanel(item.plugin, 'document', item.proposal.params) });

  return (
    <li className={styles.relatedRow}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <button type="button" className={styles.relatedOpen} onClick={open}>
              <PluginMark
                icon={manifest?.icon}
                color={manifest?.color}
                size={14}
                className={styles.relatedMark}
                aria-hidden="true"
              />
              <span className={styles.relatedLabel}>
                {item.proposal.label}
                {item.proposal.detail && (
                  <span className={styles.relatedDetail}>{item.proposal.detail}</span>
                )}
              </span>
              <ArrowUpRight size={11} className={styles.relatedGo} aria-hidden="true" />
            </button>
          }
        />
        <Tooltip.Popup side="right">{`Open in ${title}`}</Tooltip.Popup>
      </Tooltip.Root>

      {item.proposal.item && (
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <button
                type="button"
                className={styles.relatedAdd}
                aria-label={`Add ${item.proposal.label} to the cart`}
                onClick={() => relatedRunner.accept(item.key)}
              />
            }
          >
            <Plus size={12} weight="bold" aria-hidden="true" />
          </Tooltip.Trigger>
          <Tooltip.Popup side="right">Add to the cart</Tooltip.Popup>
        </Tooltip.Root>
      )}

      <button
        type="button"
        className={styles.relatedDismiss}
        aria-label={`Dismiss ${item.proposal.label}`}
        onClick={() => related.dismiss(item.key)}
      >
        <X size={11} aria-hidden="true" />
      </button>
    </li>
  );
}

// The panel at the front of the main area, if any.
function frontPanel(layout: ReturnType<typeof useLayout>) {
  const group = layout.focus ? groupOf(layout.main, layout.focus) : undefined;
  const id = group?.active ?? layout.focus;
  const panel = id ? layout.panels[id] : undefined;
  return panel && id ? { ...panel, id } : null;
}

// What the heading says the view section was computed from: the panel's first
// parameter, which for a document is the thing it is open on.
function subjectOf(panel: { params?: Record<string, string>; plugin: string }) {
  return Object.values(panel.params ?? {})[0] ?? panel.plugin;
}

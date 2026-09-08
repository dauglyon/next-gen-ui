import { useEffect, useSyncExternalStore } from 'react';
import { ArrowUpRight, Plus, X } from '@phosphor-icons/react';
import { EmptyState, Loader, Tooltip } from '@kbase/design-system';
import { groupOf, groups, makePanel } from '../../core';
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
  // Newest first. Each plugin answers in the order it is asked and the pane
  // shows three rows per plugin, so this is what makes an add visible: the
  // thing just put in the cart leads, and what it displaces is counted in the
  // "N more" line rather than silently keeping its seat.
  const cartTerms = [...items].reverse().flatMap((i) => i.terms ?? []);

  const viewKey = viewTerms.join(',');
  const openKey = openTargets(layout).join('|');
  // The cart's identity, not its size: swapping one item for another leaves
  // the count alone, and a count is what this used to watch.
  const cartKey = items.map((i) => `${i.id}#${(i.terms ?? []).join('+')}`).join('|');
  useEffect(() => {
    relatedRunner.run({
      view:
        front && viewKey
          ? {
              plugin: front.plugin,
              subject: subjectOf(front),
              terms: viewTerms,
              params: front.params ?? {},
            }
          : null,
      cart: { count: items.length, terms: cartTerms },
      held: items.map((i) => i.id),
      open: openTargets(layout),
    });
    // Values, not the arrays holding them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front?.plugin, front?.id, viewKey, cartKey, openKey]);

  useEffect(() => () => relatedRunner.stop(), [relatedRunner]);

  const { sections, loading } = related.get();
  // The sidebar draws this block's header whether or not there is anything in
  // it, so the body has to account for itself. The house form is EmptyState —
  // a title, a line saying what would fill it, and the loading case wearing
  // the Loader as its icon, exactly as a panel does.
  if (sections.length === 0) {
    return (
      <div className={styles.relatedEmpty}>
        {loading ? (
          <EmptyState
            icon={<Loader size={28} label="Asking the other plugins" />}
            title="Asking…"
          />
        ) : (
          <EmptyState
            title="Nothing related"
            description="Open a page or add to the cart, and anything else that knows about it appears here."
          />
        )}
      </div>
    );
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
          <>
            {section.subject}
            {section.alsoCart && (
              <span className={styles.relatedAlso} aria-label="and the cart">
                <span aria-hidden="true">· 🛒</span>
              </span>
            )}
          </>
        )}
      </p>
      <ul className={styles.relatedList}>
        {section.items.map((item) => (
          <Row
            key={item.key}
            item={item}
            title={source.manifest(item.plugin)?.title ?? item.plugin}
          />
        ))}
      </ul>
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
                <span className={styles.relatedName}>{item.proposal.label}</span>
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

// Every document open in the main area, as `plugin params` — a panel's
// identity, which is what a proposal has to be compared against. Not only the
// front tab: a page open in the tab behind is still a page the reader has.
function openTargets(layout: ReturnType<typeof useLayout>): string[] {
  return groups(layout.main)
    .flatMap((g) => g.tabs)
    .map((id) => layout.panels[id])
    .filter(Boolean)
    .map((p) => `${p.plugin} ${JSON.stringify(p.params ?? {})}`);
}

// The panel at the front of the main area.
//
// Never `layout.focus` on its own: focus follows the pointer into the sidebar,
// and clicking a row in this very pane would then make the pane about the
// pane. The main area's focused group if focus is in it, otherwise the first
// group's active tab — what a reader would call "the page I am on".
function frontPanel(layout: ReturnType<typeof useLayout>) {
  const focused = layout.focus ? groupOf(layout.main, layout.focus) : undefined;
  const group = focused ?? groups(layout.main).find((g) => g.tabs.length > 0);
  const id = group?.active ?? group?.tabs[0];
  const panel = id ? layout.panels[id] : undefined;
  return panel && id ? { ...panel, id } : null;
}

// What the heading says the view section was computed from: the panel's first
// parameter, which for a document is the thing it is open on.
function subjectOf(panel: { params?: Record<string, string>; plugin: string }) {
  return Object.values(panel.params ?? {})[0] ?? panel.plugin;
}

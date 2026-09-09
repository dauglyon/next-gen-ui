import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { EmptyState, Loader, Tooltip } from '@kbase/design-system';
import { CartButton, qualifyCommand, usePanelTitle } from '../../../plugins/sdk';
import type { QuerySource, Recommendation } from '../../core';
import { QUERY_SOURCES, mergeRecommendations } from '../../core';
import { openRoute } from '../open';
import { PluginMark } from '../PluginMark';
import { useRun, useServices } from '../../react/context';
import styles from '../../react/Workbench.module.css';

// What the rest of the workbench has about what is being typed, what is on
// screen, and what is in the cart: every plugin's `recommend.cartItems`, with
// the recommendation as the unit.
//
// Three groups in a fixed order, one per source, each headed by what it was
// answered for: the open page's label, the typed text, the cart. A group
// exists while it has rows or an answer on the way, and never moves. Inside
// a group the rows hold still: a row keeps its place from the moment it
// appears until nothing offers it any more; a new answer adds rows at the
// end and takes rows away, and never re-sorts. The plugin is the mark on the
// row. What is still being asked is one line under the group's rows, never
// a row.
//
// A row is a link and an offer. Pressing it opens the item's `source` in the
// answering plugin; the `+` puts the item in the cart. An item already in the
// cart is not shown: the reader has it.

const FROM: Record<QuerySource, (label: string) => string> = {
  typing: (label) => `what you typed (${label})`,
  page: (label) => `the open page (${label})`,
  cart: (label) => `the cart (${label})`,
};

// The group heading: what the rows under it were answered for.
const HEADING: Record<QuerySource, (label: string) => string> = {
  typing: (label) => `Typing: ${label}`,
  page: (label) => label || 'Open page',
  cart: () => 'Cart',
};

// A view transition carries rows that enter and leave; names must be CSS
// identifiers, and item ids are not.
const transitionName = (id: string) => `related-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

export function RelatedNavigator() {
  usePanelTitle('Related');
  const { query, cart } = useServices();
  useSyncExternalStore(cart.subscribe, cart.version, cart.version);

  // The list is state of this pane rather than a derivation, because its
  // order is history: what appeared first stays first.
  const [rows, setRows] = useState<Recommendation[]>([]);
  const current = useRef(rows);
  useEffect(() => {
    const update = (animate: boolean) => {
      const next = mergeRecommendations(
        current.current,
        QUERY_SOURCES.map((source) => ({ source, state: query.get(source) })),
      );
      current.current = next;
      if (animate && typeof document.startViewTransition === 'function') {
        const t = document.startViewTransition(() => flushSync(() => setRows(next)));
        // A transition overtaken by the next one rejects; that is not an error here.
        t.ready.catch(() => {});
        t.finished.catch(() => {});
      } else {
        setRows(next);
      }
    };
    update(false);
    return query.subscribe(() => update(true));
  }, [query]);

  const shown = rows.filter((r) => !cart.has(r.id) && !query.dismissed(r.id));
  // A row sits in the group of its first offer; the count on the row says
  // when others offer it too.
  const groups = QUERY_SOURCES.map((source) => ({
    source,
    label: HEADING[source](query.get(source).label),
    rows: shown.filter((r) => r.offeredBy[0].source === source),
    pending: query.get(source).pending,
  })).filter((g) => g.rows.length > 0 || g.pending.length > 0);
  const asking = new Set(groups.flatMap((g) => g.pending));

  // The sidebar draws this block's header whether or not there is anything in
  // it, so the body has to account for itself.
  if (shown.length === 0) {
    return (
      <div className={styles.relatedEmpty}>
        {asking.size > 0 ? (
          <div
            className={styles.relatedSkeleton}
            aria-label="Asking the other plugins"
            role="status"
          >
            <span />
            <span />
            <span />
          </div>
        ) : (
          <EmptyState
            title="Nothing related"
            description="Open a page, type into the prompt bar, or add to the cart, and anything else that knows about it appears here."
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.related}>
      {groups.map((g) => (
        <div key={g.source} className={styles.relatedSection}>
          <p className={styles.relatedFrom}>{g.label}</p>
          <ul className={styles.relatedList}>
            {g.rows.map((row) => (
              <RelatedRow key={row.id} row={row} />
            ))}
          </ul>
          {g.pending.length > 0 && <Activity plugins={g.pending} />}
        </div>
      ))}
    </div>
  );
}

function Activity({ plugins }: { plugins: string[] }) {
  const { source: index } = useServices();
  const names = plugins.map((p) => index.manifest(p)?.title ?? p).join(', ');
  return (
    <p className={styles.relatedActivity} role="status">
      <Loader size={14} label={`Asking ${names}`} />
      <span>{`Asking ${names}…`}</span>
    </p>
  );
}

function RelatedRow({ row }: { row: Recommendation }) {
  const services = useServices();
  const { query, cart, source: index } = services;
  const { item } = row;
  const first = row.offeredBy[0];
  const manifest = index.manifest(first.plugin);
  const title = manifest?.title ?? first.plugin;
  const run = useRun();
  const from = item.source;
  // Pressing the row goes to the thing: its path, or the command that makes it.
  const open =
    from && 'path' in from
      ? () => void openRoute(services, first.plugin, from.path)
      : from && 'command' in from
        ? () => void run(qualifyCommand(from.command, first.plugin), from.args)
        : undefined;
  const provenance = row.offeredBy
    .map(
      (o) =>
        `${index.manifest(o.plugin)?.title ?? o.plugin} from ${FROM[o.source](query.get(o.source).label)}`,
    )
    .join('; ');
  const label = (
    <span className={styles.relatedLabel}>
      <span className={styles.relatedName}>{item.subject ?? item.name}</span>
      {item.summary && <span className={styles.relatedDetail}>{item.summary}</span>}
    </span>
  );
  const mark = (
    <PluginMark
      icon={manifest?.icon}
      color={manifest?.color}
      size={14}
      className={styles.relatedMark}
      aria-hidden="true"
    />
  );

  return (
    <li className={styles.relatedRow} style={{ viewTransitionName: transitionName(row.id) }}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            open ? (
              <button type="button" className={styles.relatedOpen} onClick={open}>
                {mark}
                {label}
              </button>
            ) : (
              <span className={styles.relatedOpen}>
                {mark}
                {label}
              </span>
            )
          }
        />
        <Tooltip.Popup side="right">
          {open
            ? `Open in ${title}. Offered by ${provenance}.`
            : `${item.name}. Offered by ${provenance}.`}
        </Tooltip.Popup>
      </Tooltip.Root>

      {row.offeredBy.length > 1 && (
        <span className={styles.relatedOffers} aria-label={`Offered ${row.offeredBy.length} times`}>
          {`×${row.offeredBy.length}`}
        </span>
      )}

      {/* The same control the plugins draw on their own pages. The item is
          stamped with the first answering plugin, the same way that plugin's
          own `cart.add` would stamp it. */}
      <CartButton
        id={item.id}
        subject={item.subject ?? item.name}
        onAdd={() => cart.add({ ...item, plugin: first.plugin, addedAt: Date.now() })}
      />

      <button
        type="button"
        className={styles.relatedDismiss}
        aria-label={`Dismiss ${item.name}`}
        onClick={() => query.dismiss(item.id)}
      >
        <X size={11} aria-hidden="true" />
      </button>
    </li>
  );
}

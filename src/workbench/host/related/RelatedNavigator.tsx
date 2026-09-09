import { useSyncExternalStore } from 'react';
import { X } from '@phosphor-icons/react';
import { EmptyState, Loader, Tooltip } from '@kbase/design-system';
import { CartButton, qualifyCommand, usePanelTitle } from '../../../plugins/sdk';
import type { CartItem } from '../../../plugins/sdk';
import type { QuerySource, SourceState } from '../../core';
import { QUERY_SOURCES, rowKey } from '../../core';
import { openRoute } from '../open';
import { PluginMark } from '../PluginMark';
import { useRun, useServices } from '../../react/context';
import styles from '../../react/Workbench.module.css';

// What the rest of the workbench has about what is being typed, what is on
// screen, and what is in the cart: every plugin's `recommend.cartItems`,
// one section per source, each headed by what it was computed from.
//
// A pane like any other, so the sidebar's own machinery applies: it folds,
// it resizes, it reorders, it appears in the rail when the sidebar is
// collapsed, and Settings can unpin it.
//
// A row is a link and an offer. Pressing it opens the item's `source.path`
// in the answering plugin; the `+` puts the item in the cart. An item
// already in the cart is not shown: the reader has it.

const HEADINGS: Record<QuerySource, (label: string) => string> = {
  typing: (label) => `Typing: ${label}`,
  page: (label) => label,
  cart: (label) => `Cart: ${label}`,
};

export function RelatedNavigator() {
  usePanelTitle('Related');
  const { query, cart } = useServices();
  useSyncExternalStore(query.subscribe, query.version, query.version);
  useSyncExternalStore(cart.subscribe, cart.version, cart.version);

  const sections = QUERY_SOURCES.map((source) => ({ source, state: query.get(source) }))
    .map(({ source, state }) => ({
      source,
      state,
      rows: state.answers.flatMap((answer) =>
        answer.cartItems
          .filter(
            (item) =>
              !cart.has(item.id) && !query.dismissed(rowKey(source, answer.plugin, item.id)),
          )
          .map((item) => ({
            key: rowKey(source, answer.plugin, item.id),
            plugin: answer.plugin,
            item,
          })),
      ),
    }))
    .filter((s) => s.rows.length > 0);
  const loading = QUERY_SOURCES.some((source) => query.get(source).loading);

  // The sidebar draws this block's header whether or not there is anything in
  // it, so the body has to account for itself.
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
            description="Open a page, type into the prompt bar, or add to the cart, and anything else that knows about it appears here."
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.related}>
      {sections.map(({ source, state, rows }) => (
        <Section key={source} source={source} state={state} rows={rows} />
      ))}
    </div>
  );
}

interface Row {
  key: string;
  plugin: string;
  item: CartItem;
}

function Section({
  source,
  state,
  rows,
}: {
  source: QuerySource;
  state: SourceState;
  rows: Row[];
}) {
  const { source: index } = useServices();
  return (
    <div className={styles.relatedSection}>
      <p className={styles.relatedFrom}>{HEADINGS[source](state.label)}</p>
      <ul className={styles.relatedList}>
        {rows.map((row) => (
          <RelatedRow
            key={row.key}
            row={row}
            title={index.manifest(row.plugin)?.title ?? row.plugin}
          />
        ))}
      </ul>
    </div>
  );
}

function RelatedRow({ row, title }: { row: Row; title: string }) {
  const services = useServices();
  const { query, cart, source } = services;
  const manifest = source.manifest(row.plugin);
  const { item } = row;
  const run = useRun();
  const from = item.source;
  // Pressing the row goes to the thing: its path, or the command that makes it.
  const open =
    from && 'path' in from
      ? () => void openRoute(services, row.plugin, from.path)
      : from && 'command' in from
        ? () => void run(qualifyCommand(from.command, row.plugin), from.args)
        : undefined;
  const label = (
    <span className={styles.relatedLabel}>
      <span className={styles.relatedName}>{item.subject ?? item.name}</span>
      {item.summary && <span className={styles.relatedDetail}>{item.summary}</span>}
    </span>
  );

  return (
    <li className={styles.relatedRow}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            open ? (
              <button type="button" className={styles.relatedOpen} onClick={open}>
                <PluginMark
                  icon={manifest?.icon}
                  color={manifest?.color}
                  size={14}
                  className={styles.relatedMark}
                  aria-hidden="true"
                />
                {label}
              </button>
            ) : (
              <span className={styles.relatedOpen}>
                <PluginMark
                  icon={manifest?.icon}
                  color={manifest?.color}
                  size={14}
                  className={styles.relatedMark}
                  aria-hidden="true"
                />
                {label}
              </span>
            )
          }
        />
        <Tooltip.Popup side="right">
          {open ? `Open in ${title}` : `${item.name} — ${title}`}
        </Tooltip.Popup>
      </Tooltip.Root>

      {/* The same control the plugins draw on their own pages. The item is
          stamped with the answering plugin, the same way that plugin's own
          `cart.add` would stamp it. */}
      <CartButton
        id={item.id}
        subject={item.subject ?? item.name}
        onAdd={() => cart.add({ ...item, plugin: row.plugin, addedAt: Date.now() })}
      />

      <button
        type="button"
        className={styles.relatedDismiss}
        aria-label={`Dismiss ${item.name}`}
        onClick={() => query.dismiss(row.key)}
      >
        <X size={11} aria-hidden="true" />
      </button>
    </li>
  );
}

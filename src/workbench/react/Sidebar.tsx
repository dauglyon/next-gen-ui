import { useRef } from 'react';
import type { RefObject } from 'react';
// Chrome glyphs come straight from Phosphor, never from the host's icon
// table — the table is the plugins' namespace (host/icons.ts).
import { CaretDown, DotsThree, Nut, PushPin, X } from '@phosphor-icons/react';
import { Button, ContextMenu, Menu, NavIcon, Popover, Toolbar } from '@kbase/design-system';
import type { Panel, PluginId } from '../core';
import { groups, makePanel, sidebarPanels } from '../core';
import type { PluginInfo } from '../host/installed';
import { iconFor } from '../host/icons';
import { useDispatch, useLayout, useRun, useServices, useTitle } from './context';
import { PanelHost } from './PanelHost';
import { SplitView } from './SplitView';
import { useDragPanel, useDragging, useDropTarget } from './useDnd';
import styles from './Workbench.module.css';

// The sidebar: the pinned plugins' navigators stacked as blocks, each
// carrying its own icon in its header. Collapsed, the same list becomes an
// icon column — the rail is the folded form of the sidebar, not a separate
// control strip. A block folds to its header and never hides; leaving the
// sidebar means unpinning. Unpinned plugins sit under "More" and pop out
// without touching the layout.
export function Sidebar({
  preview,
  onPreview,
  onDismissPreview,
}: {
  preview: PluginId | null;
  onPreview: (plugin: PluginId) => void;
  onDismissPreview: () => void;
}) {
  const layout = useLayout();
  const dispatch = useDispatch();
  const { source } = useServices();
  const { sidebar } = layout;
  const plugins = source.plugins();
  const infoOf = (id: PluginId) => plugins.find((p) => p.id === id);
  const withNavigator = plugins.filter((p) => source.panel(`${p.id}/navigator`));
  const unpinned = withNavigator.filter((p) => !sidebar.pinned.includes(p.id));
  const blocks = sidebarPanels(layout);
  const dragging = useDragging();
  const { dropRef, isOver } = useDropTarget({ type: 'sidebar' }, dragging?.kind !== 'navigator');
  const previewing = preview && !sidebar.pinned.includes(preview) ? preview : null;
  // Anchors the collapsed preview flyout to the ⋯ icon that opened it.
  const moreAnchorRef = useRef<HTMLSpanElement>(null);
  // Every installed plugin's manifest commands flagged as shortcuts, from
  // the manifests alone — a shortcut runs before its plugin's code loads.
  const shortcuts = source.manifests().flatMap((m) =>
    (m.commands ?? [])
      .filter((c) => c.shortcut)
      .map((c) => ({
        key: `${m.id}/${c.name}`,
        name: c.name,
        label: typeof c.shortcut === 'string' ? c.shortcut : c.title,
        // A command without its own icon wears its plugin's: provenance,
        // and no collision with the toolbar trigger.
        icon: c.icon ?? m.icon,
      })),
  );

  // Both states stay mounted. One width animates — the container's — and
  // the two layers crossfade: the rail is a fixed-width overlay (its icons
  // are never clipped mid-animation) and the blocks keep their full width,
  // cropped by the container, so nothing inside re-lays-out.
  return (
    <div
      className={styles.sidebar}
      data-collapsed={sidebar.collapsed || undefined}
      style={{ width: sidebar.collapsed ? 48 : sidebar.width }}
    >
      <Toolbar.Root
        orientation="vertical"
        className={styles.iconColumn}
        aria-label="Pinned plugins"
      >
        {shortcuts.length > 0 && (
          <Popover.Root>
            <Popover.Trigger
              render={
                <Toolbar.Button
                  render={
                    <NavIcon aria-label="Shortcuts">
                      <Nut size={18} aria-hidden="true" />
                    </NavIcon>
                  }
                />
              }
            />
            <Popover.Popup
              side="right"
              sideOffset={4}
              className={styles.shortcutFlyout}
              aria-label="Shortcuts"
            >
              {/* The toolbar itself, unfolding rightwards from its trigger —
                  not a menu card. */}
              <Toolbar.Root aria-label="Shortcuts">
                <ShortcutButtons shortcuts={shortcuts} />
              </Toolbar.Root>
            </Popover.Popup>
          </Popover.Root>
        )}
        {sidebar.pinned.map((plugin) => {
          const info = infoOf(plugin);
          const label = info?.title ?? plugin;
          const Icon = info?.icon ?? PushPin;
          return (
            <PopoutIcon key={plugin} plugin={plugin} label={label}>
              <Icon size={18} aria-hidden="true" />
            </PopoutIcon>
          );
        })}
        {unpinned.length > 0 && (
          <span ref={moreAnchorRef} style={{ display: 'inline-flex' }}>
            <MoreMenu plugins={unpinned} onPreview={onPreview} />
          </span>
        )}
      </Toolbar.Root>

      {/* Collapsed, a preview flies out beside the ⋯ icon like the pinned
          popouts; the layout — and the collapsed state — are untouched. */}
      {sidebar.collapsed && previewing && (
        <PreviewPopout
          plugin={previewing}
          info={infoOf(previewing)}
          anchor={moreAnchorRef}
          onDismiss={onDismissPreview}
        />
      )}

      <div
        ref={dropRef}
        className={styles.blocks}
        style={{ width: sidebar.width }}
        role="region"
        aria-label="Sidebar"
        data-over={isOver || undefined}
      >
        {shortcuts.length > 0 && (
          // Buttons only: an expanded toolbar's identity is its position
          // and contents (Photoshop, ribbon, macOS all agree); the nut
          // represents it only in the collapsed rail.
          <Toolbar.Root className={styles.shortcutBar} aria-label="Shortcuts">
            <ShortcutButtons shortcuts={shortcuts} />
          </Toolbar.Root>
        )}
        <div className={styles.accordion}>
          {blocks.length === 0 ? (
            <p className={`caption ${styles.panelMessage}`}>
              Nothing pinned. Open More to add a plugin.
            </p>
          ) : (
            <SplitView
              dir="col"
              className={styles.blockStack}
              sizes={blocks.map((b) => sidebar.sizes[b.plugin] ?? 1)}
              fixed={blocks.map((b) => sidebar.folded.includes(b.id))}
              onSizes={(sizes) =>
                dispatch({
                  type: 'sidebar',
                  sizes: Object.fromEntries(blocks.map((b, i) => [b.plugin, sizes[i]])),
                })
              }
              label="sidebar blocks"
            >
              {blocks.map((panel) => (
                <Block key={panel.id} panel={panel} info={infoOf(panel.plugin)} />
              ))}
            </SplitView>
          )}
          {unpinned.length > 0 && (
            <MoreMenu plugins={unpinned} variant="row" onPreview={onPreview} />
          )}
        </div>

        {previewing && (
          <PreviewBlock
            plugin={previewing}
            info={infoOf(previewing)}
            onDismiss={onDismissPreview}
          />
        )}
      </div>
    </div>
  );
}

function Block({ panel, info }: { panel: Panel; info: PluginInfo | undefined }) {
  const layout = useLayout();
  const dispatch = useDispatch();
  const { focusIntentRef } = useServices();
  const title = useTitle(panel);
  const Icon = info?.icon ?? PushPin;
  const folded = layout.sidebar.folded.includes(panel.id);
  const focused = layout.focus === panel.id;
  const headerId = `wb-block-${panel.plugin}`;
  const at = layout.sidebar.pinned.indexOf(panel.plugin);
  const { dragRef, dragHandlers, isDragging } = useDragPanel({
    panel: panel.id,
    kind: 'navigator',
  });

  return (
    <section
      className={styles.block}
      aria-labelledby={headerId}
      data-focused={focused || undefined}
      data-folded={folded || undefined}
    >
      <ContextMenu.Root>
        <ContextMenu.Trigger className={styles.blockHeader}>
          <button
            type="button"
            id={headerId}
            className={styles.blockToggle}
            aria-expanded={!folded}
            data-panel-tab={panel.id}
            data-dragging={isDragging || undefined}
            ref={dragRef}
            {...dragHandlers}
            onClick={() => {
              focusIntentRef.current = 'user';
              // One operation per click: `focus` on a folded sidebar panel
              // already unfolds it, and dispatching it after `fold` would
              // undo the fold.
              if (folded) dispatch({ type: 'focus', panel: panel.id });
              else dispatch({ type: 'fold', panel: panel.id, folded: true });
            }}
          >
            {/* The accordion header pattern: icon, title, chevron on the
                right. The icon repeats the rail's glyph, tying the block
                to its icon-column entry. */}
            <span className={styles.blockIcon} aria-hidden="true">
              <Icon size={14} />
            </span>
            <span className={styles.blockLabel}>{info?.title ?? title}</span>
            <CaretDown size={12} className={styles.blockChevron} aria-hidden="true" />
          </button>
        </ContextMenu.Trigger>
        <ContextMenu.Popup aria-label={`${title} actions`}>
          <ContextMenu.Item
            onClick={() => dispatch({ type: 'fold', panel: panel.id, folded: !folded })}
          >
            {folded ? 'Unfold' : 'Fold'}
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={() =>
              dispatch({ type: 'move', panel: panel.id, to: { group: groups(layout.main)[0].id } })
            }
          >
            Move to main area
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item
            disabled={at <= 0}
            onClick={() => dispatch({ type: 'pin', plugin: panel.plugin, index: at - 1 })}
          >
            Move up
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={at >= layout.sidebar.pinned.length - 1}
            onClick={() => dispatch({ type: 'pin', plugin: panel.plugin, index: at + 1 })}
          >
            Move down
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item onClick={() => dispatch({ type: 'unpin', plugin: panel.plugin })}>
            Unpin
          </ContextMenu.Item>
        </ContextMenu.Popup>
      </ContextMenu.Root>
      {!folded && (
        <div
          className={styles.blockBody}
          data-panel={panel.id}
          // Pointer as well as focus: clicking plain text fires no focus
          // event, so the workbench focus would stay where it last was.
          onPointerDownCapture={() => {
            if (layout.focus !== panel.id) {
              focusIntentRef.current = 'user';
              dispatch({ type: 'focus', panel: panel.id });
            }
          }}
          onFocusCapture={() => {
            if (layout.focus !== panel.id) {
              focusIntentRef.current = 'user';
              dispatch({ type: 'focus', panel: panel.id });
            }
          }}
        >
          <PanelHost panel={panel} focused={focused} />
        </div>
      )}
    </section>
  );
}

// The shortcut buttons, shared by the expanded toolbar and the collapsed
// popover. Each runs its command through the registry, which loads the
// plugin's module on first use.
function ShortcutButtons({
  shortcuts,
}: {
  shortcuts: Array<{ key: string; name: string; label: string; icon?: string }>;
}) {
  const run = useRun();
  return (
    <>
      {shortcuts.map((s) => {
        const Icon = iconFor(s.icon);
        return (
          <Toolbar.Button
            key={s.key}
            render={<Button size="xs" variant="ghost" />}
            onClick={() => void run(s.name)}
          >
            <Icon size={14} aria-hidden="true" />
            {s.label}
          </Toolbar.Button>
        );
      })}
    </>
  );
}

// "More": a plain menu of unpinned plugins. Choosing one previews its
// navigator as an ephemeral block at the bottom of the sidebar stack —
// two clicks to look at a plugin without pinning it. The `row` variant is
// the accordion's footer row; the icon variant sits in the collapsed
// column.
export function MoreMenu({
  plugins,
  variant = 'icon',
  onPreview,
}: {
  plugins: PluginInfo[];
  variant?: 'icon' | 'row';
  onPreview: (plugin: PluginId) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          variant === 'row' ? (
            // The header grammar, footer-flavoured: glyph, word, and where
            // a header shows its chevron, the icons of what is inside.
            <button
              type="button"
              className={styles.moreRow}
              aria-label={`More plugins (${plugins.length})`}
            >
              <span className={styles.blockIcon} aria-hidden="true">
                <DotsThree size={14} weight="bold" />
              </span>
              More
              <span className={styles.moreIcons} aria-hidden="true">
                {plugins.slice(0, 5).map((p) => {
                  const Icon = p.icon;
                  return <Icon key={p.id} size={14} />;
                })}
                {plugins.length > 5 && <span>+{plugins.length - 5}</span>}
              </span>
            </button>
          ) : (
            // In the rail: a Toolbar.Button so arrow keys reach it.
            <Toolbar.Button
              render={
                <NavIcon aria-label="More plugins">
                  <DotsThree size={18} weight="bold" aria-hidden="true" />
                </NavIcon>
              }
            />
          )
        }
      />
      <Menu.Popup>
        {plugins.map((p) => {
          const Icon = p.icon;
          return (
            <Menu.Item key={p.id} onClick={() => onPreview(p.id)}>
              <Icon size={14} aria-hidden="true" />
              {p.title}
            </Menu.Item>
          );
        })}
      </Menu.Popup>
    </Menu.Root>
  );
}

// An unpinned plugin's navigator, shown until pinned or dismissed. Not part
// of the layout: a reload forgets it, and the dashed border says so.
function PreviewBlock({
  plugin,
  info,
  onDismiss,
}: {
  plugin: PluginId;
  info: PluginInfo | undefined;
  onDismiss: () => void;
}) {
  const dispatch = useDispatch();
  const title = info?.title ?? plugin;
  const Icon = info?.icon ?? PushPin;
  return (
    <section className={`${styles.block} ${styles.previewBlock}`} aria-label={`${title} preview`}>
      <div className={`${styles.blockHeader} ${styles.previewHeader}`}>
        <span className={styles.blockIcon} aria-hidden="true">
          <Icon size={14} />
        </span>
        <span className={styles.previewTitle}>{title}</span>
        <div className={styles.spacer} />
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            dispatch({ type: 'pin', plugin });
            onDismiss();
          }}
        >
          Pin
        </Button>
        <Button size="xs" variant="ghost" aria-label={`Dismiss ${title} preview`} onClick={onDismiss}>
          <X size={13} aria-hidden="true" />
        </Button>
      </div>
      <div className={styles.blockBody}>
        <PanelHost panel={makePanel(plugin, 'navigator')} focused={false} />
      </div>
    </section>
  );
}

// The collapsed form of the preview: the chosen navigator in a flyout
// beside the rail, with the same Pin offer the preview block makes.
function PreviewPopout({
  plugin,
  info,
  anchor,
  onDismiss,
}: {
  plugin: PluginId;
  info: PluginInfo | undefined;
  anchor: RefObject<HTMLElement | null>;
  onDismiss: () => void;
}) {
  const dispatch = useDispatch();
  const width = useLayout().sidebar.width;
  const title = info?.title ?? plugin;
  const Icon = info?.icon ?? PushPin;
  return (
    <Popover.Root open onOpenChange={(open) => !open && onDismiss()}>
      <Popover.Popup
        anchor={anchor}
        side="right"
        sideOffset={8}
        align="start"
        alignOffset={6}
        className={styles.popout}
        style={{ width }}
        aria-label={`${title} preview`}
      >
        <div className={styles.popoutBody}>
          <div className={styles.popoutHeader}>
            <span className={styles.blockIcon} aria-hidden="true">
              <Icon size={14} />
            </span>
            <span className={styles.popoutTitle}>{title}</span>
            <div className={styles.spacer} />
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                dispatch({ type: 'pin', plugin });
                onDismiss();
              }}
            >
              Pin
            </Button>
          </div>
          <div className={styles.blockBody}>
            <PanelHost panel={makePanel(plugin, 'navigator')} focused={false} />
          </div>
        </div>
      </Popover.Popup>
    </Popover.Root>
  );
}

// A pinned plugin's icon while the sidebar is collapsed: its navigator pops
// out beside the icon, and the layout is untouched.
function PopoutIcon({
  plugin,
  label,
  children,
}: {
  plugin: PluginId;
  label: string;
  children: React.ReactNode;
}) {
  const panel = makePanel(plugin, 'navigator');
  const width = useLayout().sidebar.width;
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Toolbar.Button render={<NavIcon aria-label={label}>{children}</NavIcon>} />
        }
      />
      {/* Beside the rail with its top at the icon: the default bottom-
          centered placement would cover the icons under the clicked one. */}
      <Popover.Popup
        side="right"
        sideOffset={8}
        align="start"
        alignOffset={6}
        className={styles.popout}
        style={{ width }}
        aria-label={label}
      >
        <div className={styles.popoutBody}>
          {/* No leading glyph: the rail icon this flew out from is right
              beside the header and already is one. */}
          <div className={styles.popoutHeader}>
            <span className={styles.popoutTitle}>{label}</span>
          </div>
          <div className={styles.blockBody}>
            <PanelHost panel={panel} focused={false} />
          </div>
        </div>
      </Popover.Popup>
    </Popover.Root>
  );
}

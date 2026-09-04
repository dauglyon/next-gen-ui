import { useState } from 'react';
import { CaretDown, CaretRight, DotsThree, SidebarSimple, PushPin } from '@phosphor-icons/react';
import { Button, ContextMenu, NavIcon, Popover, Tooltip } from '@kbase/design-system';
import type { Panel, PluginId } from '../core';
import { groups, makePanel, navigatorId, sidebarPanels } from '../core';
import type { PluginInfo } from '../host/types';
import { useDispatch, useLayout, useServices, useTitle } from './context';
import { PanelHost } from './PanelHost';
import { SplitView } from './SplitView';
import { useDragPanel, useDragging, useDropTarget } from './useDnd';
import styles from './Workbench.module.css';

// The sidebar: an icon column that is the pinned list, one icon per plugin,
// beside the pinned plugins' navigators stacked with dividers. A block
// folds to its header and never hides; leaving the sidebar means unpinning.
// Unpinned plugins sit under "More" and pop out without touching the layout.
export function Sidebar() {
  const layout = useLayout();
  const dispatch = useDispatch();
  const { source, focusIntentRef } = useServices();
  const { sidebar } = layout;
  const plugins = source.plugins();
  const infoOf = (id: PluginId) => plugins.find((p) => p.id === id);
  const withNavigator = plugins.filter((p) => source.panel(`${p.id}/navigator`));
  const unpinned = withNavigator.filter((p) => !sidebar.pinned.includes(p.id));
  const blocks = sidebarPanels(layout);
  const dragging = useDragging();
  const { dropRef, isOver } = useDropTarget({ type: 'sidebar' }, dragging?.kind !== 'navigator');

  const focusPlugin = (plugin: PluginId) => {
    focusIntentRef.current = 'command';
    dispatch({ type: 'focus', panel: navigatorId(plugin) });
  };

  return (
    <div className={styles.sidebar} data-collapsed={sidebar.collapsed || undefined}>
      <div
        className={styles.iconColumn}
        role="toolbar"
        aria-orientation="vertical"
        aria-label="Pinned plugins"
      >
        {sidebar.pinned.map((plugin) => {
          const info = infoOf(plugin);
          const label = info?.title ?? plugin;
          const Icon = info?.icon ?? PushPin;
          const icon = <Icon size={18} aria-hidden="true" />;
          if (sidebar.collapsed) {
            return (
              <PopoutIcon key={plugin} plugin={plugin} label={label}>
                {icon}
              </PopoutIcon>
            );
          }
          return (
            <Tooltip.Root key={plugin}>
              <Tooltip.Trigger
                render={
                  <NavIcon
                    aria-label={label}
                    active={layout.focus === navigatorId(plugin)}
                    onClick={() => focusPlugin(plugin)}
                  >
                    {icon}
                  </NavIcon>
                }
              />
              <Tooltip.Popup side="right" sideOffset={8}>
                {label}
              </Tooltip.Popup>
            </Tooltip.Root>
          );
        })}
        {unpinned.length > 0 && <MorePlugins plugins={unpinned} />}
        <div className={styles.spacer} />
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <NavIcon
                aria-label={sidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!sidebar.collapsed}
                onClick={() => dispatch({ type: 'sidebar', collapsed: !sidebar.collapsed })}
              >
                <SidebarSimple size={18} aria-hidden="true" />
              </NavIcon>
            }
          />
          <Tooltip.Popup side="right" sideOffset={8}>
            {sidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </Tooltip.Popup>
        </Tooltip.Root>
      </div>

      {!sidebar.collapsed && (
        <div
          ref={dropRef}
          className={styles.blocks}
          style={{ width: sidebar.width }}
          role="region"
          aria-label="Sidebar"
          data-over={isOver || undefined}
        >
          {blocks.length === 0 ? (
            <p className={`caption ${styles.panelMessage}`}>
              Nothing pinned. Open More to add a plugin.
            </p>
          ) : (
            <SplitView
              dir="col"
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
        </div>
      )}
    </div>
  );
}

function Block({ panel, info }: { panel: Panel; info: PluginInfo | undefined }) {
  const layout = useLayout();
  const dispatch = useDispatch();
  const { focusIntentRef } = useServices();
  const title = useTitle(panel);
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
              dispatch({ type: 'fold', panel: panel.id, folded: !folded });
              dispatch({ type: 'focus', panel: panel.id });
            }}
          >
            {folded ? (
              <CaretRight size={12} weight="bold" aria-hidden="true" />
            ) : (
              <CaretDown size={12} weight="bold" aria-hidden="true" />
            )}
            <span className={styles.blockTitle}>{info?.title ?? title}</span>
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

// "More": unpinned plugins. Choosing one shows its navigator in a popover
// beside the icons; Pin moves it into the stack for good.
function MorePlugins({ plugins }: { plugins: PluginInfo[] }) {
  const [chosen, setChosen] = useState<PluginId | null>(null);
  const dispatch = useDispatch();
  const current = plugins.find((p) => p.id === chosen) ?? plugins[0];

  return (
    <Popover.Root onOpenChange={(open) => !open && setChosen(null)}>
      <Popover.Trigger
        render={
          <NavIcon aria-label="More plugins">
            <DotsThree size={18} weight="bold" aria-hidden="true" />
          </NavIcon>
        }
      />
      <Popover.Popup className={styles.popout} aria-label="More plugins">
        <div
          className={styles.popoutList}
          role="tablist"
          aria-label="Unpinned plugins"
          aria-orientation="vertical"
        >
          {plugins.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === current.id}
              className={styles.popoutTab}
              onClick={() => setChosen(p.id)}
            >
              {p.title}
            </button>
          ))}
        </div>
        <div className={styles.popoutBody} role="tabpanel">
          <div className={styles.popoutHeader}>
            <span className={styles.blockTitle}>{current.title}</span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => dispatch({ type: 'pin', plugin: current.id })}
            >
              Pin
            </Button>
          </div>
          <div className={styles.blockBody}>
            <PanelHost
              key={current.id}
              panel={makePanel(current.id, 'navigator')}
              focused={false}
            />
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
  return (
    <Popover.Root>
      <Popover.Trigger render={<NavIcon aria-label={label}>{children}</NavIcon>} />
      <Popover.Popup className={styles.popout} aria-label={label}>
        <div className={styles.popoutBody}>
          <div className={styles.popoutHeader}>
            <span className={styles.blockTitle}>{label}</span>
          </div>
          <div className={styles.blockBody}>
            <PanelHost panel={panel} focused={false} />
          </div>
        </div>
      </Popover.Popup>
    </Popover.Root>
  );
}

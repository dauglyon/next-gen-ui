import { useSyncExternalStore } from 'react';
import { Button, Chip } from '@kbase/design-system';
import type { StatusItem } from '../../plugins/sdk';
import { useLayout, useMode, useRun, useServices, useTitle } from './context';
import styles from './Workbench.module.css';

export function StatusBar() {
  const layout = useLayout();
  const mode = useMode();
  const { source, store, announcer } = useServices();
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const focused = layout.focus ? layout.panels[layout.focus] : undefined;
  const title = useTitle(focused, layout.focus ?? '');
  // Status hooks exist only on loaded modules; a plugin that has not run yet
  // has nothing to say.
  const withStatus = source
    .manifests()
    .map((m) => ({ id: m.id, hook: source.loaded(m.id)?.useStatus }))
    .filter((entry): entry is { id: string; hook: () => StatusItem[] } => !!entry.hook);

  return (
    <div className={styles.statusBar} aria-label="Status bar">
      {mode === 'customize' && (
        <div className={styles.customizeControls} role="group" aria-label="Customize mode">
          <Chip color="purple" label="Customizing" />
          <span className="caption">Arrange panels, then keep or discard the result.</span>
          <Button
            size="xs"
            variant="primary"
            onClick={() => {
              store.commitCustomize();
              announcer.announce('Layout kept');
            }}
          >
            Keep
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              store.cancelCustomize();
              announcer.announce('Layout changes discarded');
            }}
          >
            Discard
          </Button>
        </div>
      )}
      {withStatus.map(({ id, hook }) => (
        <PluginStatus key={id} useStatus={hook} />
      ))}
      <span className={styles.spacer} />
      {focused && <span className="caption">{title}</span>}
    </div>
  );
}

function PluginStatus({ useStatus }: { useStatus: () => StatusItem[] }) {
  const items = useStatus();
  const run = useRun();
  return (
    <>
      {items.map((item, i) =>
        item.command ? (
          <button
            key={i}
            type="button"
            className={styles.statusItem}
            onClick={() => void run(item.command!)}
          >
            {item.text}
          </button>
        ) : (
          <span key={i} className={`caption ${styles.statusItem}`}>
            {item.text}
          </span>
        ),
      )}
    </>
  );
}

import { useSyncExternalStore } from 'react';
import { Chip, Radio, Switch } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import { useDispatch, useLayout, useServices } from '../../react/context';
import { iconFor } from '../icons';
import styles from './Catalog.module.css';

export function CatalogDocument() {
  usePanelTitle('Settings');
  const { source, settings } = useServices();
  const layout = useLayout();
  const dispatch = useDispatch();
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const current = useSyncExternalStore(settings.subscribe, settings.get, settings.get);
  const manifests = source.manifests().filter((m) => m.id !== 'catalog');
  const assistants = manifests.filter((m) => m.modules.includes('prompt'));
  const intents = manifests.filter((m) => m.modules.includes('intent'));

  return (
    <div className={styles.root}>
      <section aria-labelledby="catalog-installed" className={styles.section}>
        <h2 id="catalog-installed" className="h4">
          Installed
        </h2>
        <ul className={styles.list}>
          {manifests.map((m) => {
            const Icon = iconFor(m.icon, m.color);
            const pinned = layout.sidebar.pinned.includes(m.id);
            const loaded = source.anyLoaded(m.id);
            return (
              <li key={m.id} className={styles.row}>
                <span className={styles.rowIcon} aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span className={styles.rowTitle}>
                  <span className="body">{m.title}</span>
                  {loaded && <Chip color="green" label="loaded" />}
                </span>
                {source.has(m.id, 'pane') && (
                  <span className={styles.rowControls}>
                    <span className="caption">Pinned</span>
                    <Switch
                      checked={pinned}
                      onCheckedChange={(v) =>
                        dispatch(
                          v ? { type: 'pin', plugin: m.id } : { type: 'unpin', plugin: m.id },
                        )
                      }
                      aria-label={`Pin ${m.title} to the sidebar`}
                    />
                  </span>
                )}
                {m.description && <p className={`caption ${styles.rowDesc}`}>{m.description}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <PluginChoice
        id="catalog-assistant"
        title="Assistant"
        caption="Which plugin answers free text typed in the prompt bar."
        options={assistants}
        value={current.assistant}
        onChange={(assistant) => settings.set({ assistant })}
      />

      <PluginChoice
        id="catalog-intent"
        title="Suggestions"
        caption="Which plugin suggests commands for text typed in the prompt bar."
        options={intents}
        value={current.intent}
        onChange={(intent) => settings.set({ intent })}
      />
    </div>
  );
}

// One plugin chosen for a host role, or none.
function PluginChoice({
  id,
  title,
  caption,
  options,
  value,
  onChange,
}: {
  id: string;
  title: string;
  caption: string;
  options: { id: string; title: string }[];
  value: string | null | undefined;
  onChange: (plugin: string | null) => void;
}) {
  return (
    <section aria-labelledby={id} className={styles.section}>
      <h2 id={id} className="h4">
        {title}
      </h2>
      <p className="caption">{caption}</p>
      <Radio.Group
        aria-labelledby={id}
        value={value ?? 'none'}
        onValueChange={(v) => onChange(v === 'none' ? null : String(v))}
        style={{ display: 'grid', gap: 'var(--s-2)' }}
      >
        {[...options, { id: 'none', title: 'None' }].map((m) => (
          <label key={m.id} className={styles.assistantRow}>
            <Radio.Radio value={m.id} />
            <span className="body">{m.title}</span>
          </label>
        ))}
      </Radio.Group>
    </section>
  );
}

import { useSyncExternalStore } from 'react';
import { Chip, Radio, Switch } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import { useDispatch, useLayout, useServices } from '../../react/context';

// The host's own navigator: what is installed, what is pinned, and which
// plugin answers the prompt bar. Reaches host services directly, which no
// plugin over the SDK can.
export function CatalogNavigator() {
  usePanelTitle('Catalog');
  const { source, settings } = useServices();
  const layout = useLayout();
  const dispatch = useDispatch();
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const current = useSyncExternalStore(settings.subscribe, settings.get, settings.get);
  const manifests = source.manifests().filter((m) => m.id !== 'catalog');
  const assistants = manifests.filter((m) => m.promptHandler);

  return (
    <div style={{ padding: 'var(--s-3)', display: 'grid', gap: 'var(--s-5)' }}>
      <section aria-labelledby="catalog-installed" style={{ display: 'grid', gap: 'var(--s-2)' }}>
        <h2 id="catalog-installed" className="h4">
          Installed
        </h2>
        <ul
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--s-3)' }}
        >
          {manifests.map((m) => {
            const pinned = layout.sidebar.pinned.includes(m.id);
            const loaded = !!source.loaded(m.id);
            return (
              <li key={m.id} style={{ display: 'grid', gap: 'var(--s-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
                  <span className="body" style={{ flex: 1 }}>
                    {m.title}
                  </span>
                  {loaded && <Chip color="green" label="loaded" />}
                  {m.navigator && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
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
                    </label>
                  )}
                </div>
                {m.description && <p className="caption">{m.description}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="catalog-assistant" style={{ display: 'grid', gap: 'var(--s-2)' }}>
        <h2 id="catalog-assistant" className="h4">
          Assistant
        </h2>
        <p className="caption">Which plugin answers free text typed in the prompt bar.</p>
        <Radio.Group
          aria-labelledby="catalog-assistant"
          value={current.assistant ?? 'none'}
          onValueChange={(value) =>
            settings.set({ assistant: value === 'none' ? null : String(value) })
          }
          style={{ display: 'grid', gap: 'var(--s-2)' }}
        >
          {assistants.map((m) => (
            <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
              <Radio.Radio value={m.id} />
              <span className="body">{m.title}</span>
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
            <Radio.Radio value="none" />
            <span className="body">None</span>
          </label>
        </Radio.Group>
      </section>
    </div>
  );
}

import { Component, Suspense, useCallback, useMemo } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button, Loader } from '@kbase/design-system';
import { HostContext, PanelContext } from '../../plugins/sdk';
import type { PanelHandle, PluginHost } from '../../plugins/sdk';
import type { Panel } from '../core';
import { makePanel, panelType } from '../core';
import { useDispatch, useRun, useServices } from './context';
import styles from './Workbench.module.css';

// Renders one panel: looks its component up in the host's index, gives it
// the SDK contexts, and fences it. A crash or a missing plugin stays inside
// this box; the tab, its neighbours and the chrome keep working.
export function PanelHost({ panel, focused }: { panel: Panel; focused: boolean }) {
  const services = useServices();
  const dispatch = useDispatch();
  const run = useRun();
  const definition = services.source.panel(panelType(panel.plugin, panel.kind));

  const setTitle = useCallback(
    (title: string) => services.titles.set(panel.id, title),
    [services.titles, panel.id],
  );
  const handle = useMemo<PanelHandle>(
    () => ({
      id: panel.id,
      plugin: panel.plugin,
      kind: panel.kind,
      params: panel.params,
      focused,
      setTitle,
    }),
    [panel, focused, setTitle],
  );
  const host = useMemo<PluginHost>(
    () => ({
      openDocument: (params) =>
        dispatch({ type: 'open', panel: makePanel(panel.plugin, 'document', params) }),
      runCommand: (name, values) => run(name, values),
    }),
    [dispatch, run, panel.plugin],
  );

  if (!definition) return <GhostPanel panel={panel} />;
  const Component = definition.component;
  return (
    <PanelContext value={handle}>
      <HostContext value={host}>
        <PanelBoundary key={panel.id}>
          <Suspense fallback={<Loading />}>
            <Component />
          </Suspense>
        </PanelBoundary>
      </HostContext>
    </PanelContext>
  );
}

function Loading() {
  return (
    <div className={styles.panelMessage}>
      <Loader label="Loading panel" />
    </div>
  );
}

// A panel whose plugin is no longer installed. The layout keeps the slot so
// reinstalling brings it back where it was.
function GhostPanel({ panel }: { panel: Panel }) {
  const dispatch = useDispatch();
  return (
    <div className={styles.panelMessage} role="group" aria-label="Unavailable panel">
      <p className="body">
        The plugin <strong>{panel.plugin}</strong> is not installed, so this panel cannot be shown.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => dispatch({ type: 'close', panel: panel.id })}
      >
        Close
      </Button>
    </div>
  );
}

interface BoundaryState {
  error: Error | null;
}

export class PanelBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('panel crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={styles.panelMessage} role="alert">
        <p className="body">This panel crashed.</p>
        <p className={`caption ${styles.errorText}`}>{this.state.error.message}</p>
        <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    );
  }
}

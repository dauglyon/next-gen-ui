import { Chip } from '@kbase/design-system';
import { useLayout, useMode, useTitle } from './context';
import styles from './Workbench.module.css';

export function StatusBar() {
  const layout = useLayout();
  const mode = useMode();
  const focused = layout.focus ? layout.panels[layout.focus] : undefined;
  const title = useTitle(focused, layout.focus ?? '');
  return (
    <div className={styles.statusBar} aria-label="Status bar">
      {mode === 'customize' && <Chip color="purple" label="Customize mode" />}
      <span className={styles.spacer} />
      {focused && <span className="caption">{title}</span>}
    </div>
  );
}

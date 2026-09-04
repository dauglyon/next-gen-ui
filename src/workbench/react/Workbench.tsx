import { useLayout } from './context';
import { LiveRegion } from './LiveRegion';
import { MainArea } from './MainArea';
import { PromptBar } from './PromptBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { WorkbenchDnd } from './WorkbenchDnd';
import { WorkbenchMenubar } from './WorkbenchMenubar';
import { useFocusSync } from './useFocusSync';
import { useKeybindings } from './useKeybindings';
import styles from './Workbench.module.css';

export function Workbench() {
  const layout = useLayout();
  useKeybindings();
  useFocusSync();
  return (
    <div className={styles.root}>
      <WorkbenchMenubar />
      <WorkbenchDnd>
        <div className={styles.body}>
          <Sidebar />
          <MainArea />
        </div>
      </WorkbenchDnd>
      {layout.bars.prompt && <PromptBar />}
      {layout.bars.status && <StatusBar />}
      <LiveRegion />
    </div>
  );
}

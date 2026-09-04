import { useState } from 'react';
import type { PluginId } from '../core';
import { useLayout } from './context';
import { FrameLayerProvider } from './FrameLayer';
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
  // Ephemeral: which unpinned plugin's navigator the sidebar previews —
  // a block in the stack expanded, a flyout beside the rail collapsed.
  const [preview, setPreview] = useState<PluginId | null>(null);
  return (
    <div className={styles.root} data-locked={layout.locked || undefined}>
      <WorkbenchMenubar />
      <WorkbenchDnd>
        <FrameLayerProvider>
          <div className={styles.body}>
            <Sidebar
              preview={preview}
              onPreview={setPreview}
              onDismissPreview={() => setPreview(null)}
            />
            <div className={styles.mainColumn}>
              <MainArea />
              {layout.bars.prompt && <PromptBar />}
            </div>
          </div>
        </FrameLayerProvider>
      </WorkbenchDnd>
      {layout.bars.status && <StatusBar />}
      <LiveRegion />
    </div>
  );
}

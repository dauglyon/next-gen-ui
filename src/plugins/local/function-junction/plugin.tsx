import { AppFrame, definePlugin, usePanelTitle } from '@kbase/plugin-sdk';

// An app is a page of its own; the plugin is the frame around it.
function AppDocument() {
  usePanelTitle('Function Junction');
  return <AppFrame src="/mock-apps/function-junction.html" title="Function Junction" />;
}

export default definePlugin({ document: AppDocument });

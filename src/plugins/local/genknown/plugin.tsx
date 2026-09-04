import { AppFrame, definePlugin, usePanelTitle } from '@kbase/plugin-sdk';

// An app is a page of its own; the plugin is the frame around it.
function AppDocument() {
  usePanelTitle('GenKnown');
  return <AppFrame src="/mock-apps/genknown.html" title="GenKnown" />;
}

export default definePlugin({ document: AppDocument });

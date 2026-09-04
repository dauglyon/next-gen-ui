import { AppFrame, definePlugin, usePanel, usePanelTitle } from '@kbase/plugin-sdk';

// An app is a page of its own; the plugin is the frame around it. The
// panel's params are the action an offer asked for, so they ride into
// the page as its query — the app, not the host, decides what they mean.
function AppDocument() {
  const { params } = usePanel();
  const query = new URLSearchParams(params).toString();
  const subject = params.q ?? params.accession ?? params.gene ?? params.organism ?? params.assembly;
  usePanelTitle(subject ? `GenKnown: ${subject}` : 'GenKnown');
  return <AppFrame src={`/mock-apps/genknown.html${query ? `?${query}` : ''}`} title="GenKnown" />;
}

export default definePlugin({ document: AppDocument });

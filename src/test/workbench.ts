import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { localPlugins } from '../plugins/local';
import { createWorkbench } from '../workbench/host';
import type { CreateWorkbenchOptions } from '../workbench/host';
import type { WorkbenchServices } from '../workbench/react';

// A workbench for tests: the bundled plugins and no persistence unless a
// test supplies storage.
export function testWorkbench(overrides: Partial<CreateWorkbenchOptions> = {}): WorkbenchServices {
  return createWorkbench({
    installed: localPlugins,
    storage: null,
    defaultPinned: ['koros', 'data', 'jobs'],
    defaultAssistant: 'koros',
    defaultIntent: 'intent',
    ...overrides,
  });
}

// Opens a job's page from the Jobs pane. The pane is a Tree, whose click
// handler sits on the row inside the treeitem; clicking the name bubbles to it.
export async function openJob(user: UserEvent, name: RegExp): Promise<void> {
  const sidebar = screen.getByRole('region', { name: 'Sidebar' });
  const item = await within(sidebar).findByRole('treeitem', { name });
  await user.click(within(item).getByText(name));
}

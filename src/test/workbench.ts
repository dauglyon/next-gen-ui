import { createLocalSource, createWorkbench, helloPlugin } from '../workbench/host';
import type { WorkbenchServices } from '../workbench/react';

// Router context for tests: a workbench with the throwaway plugin and no
// persistence.
export function testWorkbench(): WorkbenchServices {
  return createWorkbench({
    source: createLocalSource([helloPlugin]),
    storage: null,
    defaultPinned: ['hello'],
  });
}

import { createFileRoute } from '@tanstack/react-router';
import { Workbench, WorkbenchProvider } from '../../workbench/react';

export const Route = createFileRoute('/_workbench/workbench')({
  component: WorkbenchPage,
  staticData: { title: 'Workbench' },
});

function WorkbenchPage() {
  const { workbench } = Route.useRouteContext();
  return (
    <WorkbenchProvider services={workbench}>
      <Workbench />
    </WorkbenchProvider>
  );
}

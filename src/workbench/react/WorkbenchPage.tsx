import type { ReactNode } from 'react';
import { ServicesContext } from './context';
import type { WorkbenchServices } from './services';
import { useUrlSync } from './useUrlSync';
import { Workbench } from './Workbench';

// Both /workbench and /p/… render this; the URL differs, the shell does not.
export function WorkbenchPage({
  services,
  children,
}: {
  services: WorkbenchServices;
  children?: ReactNode;
}) {
  return (
    <ServicesContext value={services}>
      <UrlSync />
      <Workbench />
      {children}
    </ServicesContext>
  );
}

function UrlSync() {
  useUrlSync();
  return null;
}

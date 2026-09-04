import { Outlet, createFileRoute } from '@tanstack/react-router';

// Routes under here draw their own chrome; the root layout steps aside.
export const Route = createFileRoute('/_workbench')({
  component: Outlet,
  staticData: { chrome: 'workbench' },
});

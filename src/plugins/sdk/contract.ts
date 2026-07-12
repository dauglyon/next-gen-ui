import type { ComponentType } from 'react';
import type { AnyRouter } from '@tanstack/react-router';

// The mount contract this SDK version speaks. The host refuses to mount a
// plugin built against a different version. (This is about *our* contract —
// the props below and how a plugin is mounted. React-router compatibility is
// handled separately by the shared-singleton version pins in shared.ts.)
export const CONTRACT_VERSION = '1';

// What the host passes to a plugin: the app's router (for app-level
// navigation) and the plugin's mount path, `/{id}`. `definePlugin` turns a
// route tree into a plugin that consumes these.
export interface PluginProps {
  router: AnyRouter;
  basepath: string;
}

/** A plugin's `./Plugin` module default-exports this. */
export interface Plugin {
  contractVersion: string;
  Component: ComponentType<PluginProps>;
}

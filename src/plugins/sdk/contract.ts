import type { ComponentType } from 'react';
import type { AnyRouter } from '@tanstack/react-router';

// What the host passes to a plugin: the app's router (for app-level
// navigation) and the plugin's mount path, `/{id}`. `definePlugin` turns a
// route tree into a plugin that consumes these.
export interface PluginProps {
  router: AnyRouter;
  basepath: string;
}

/** A plugin's `./Plugin` module default-exports this. */
export interface Plugin {
  Component: ComponentType<PluginProps>;
}

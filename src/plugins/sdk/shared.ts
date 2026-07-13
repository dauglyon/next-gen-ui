import { dependencies, version } from '../../../package.json';

// Deps that must resolve to ONE shared instance across host + plugins (a second
// React/Router breaks hooks and context). Ranges come from package.json so they
// can't drift from what's installed. Build-time only (vite.config, the preset).
const deps: Record<string, string> = dependencies;

function shared(name: string) {
  const requiredVersion = deps[name];
  if (!requiredVersion) {
    throw new Error(
      `SHARED_SINGLETONS names "${name}", but it is not in package.json ` +
        `dependencies — add it there or remove it from the shared list.`,
    );
  }
  return { singleton: true, requiredVersion };
}

export const SHARED_SINGLETONS = {
  react: shared('react'),
  'react-dom': shared('react-dom'),
  '@tanstack/react-query': shared('@tanstack/react-query'),
  '@tanstack/react-router': shared('@tanstack/react-router'),
  // Ships from THIS repo (source alias in the host, published package for
  // plugins), so it isn't in `dependencies`; pin its shared version to the repo
  // version it builds as, so host and plugins agree on one instance.
  '@kbase/design-system': { singleton: true, requiredVersion: version },
};

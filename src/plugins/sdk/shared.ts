import pkg from '../../../package.json';

// WHICH dependencies must resolve to a single shared instance across the host
// and every plugin — a second React or Router would break hooks and shared
// context. This file owns only that membership list; the version RANGE for
// each is read straight from the host's package.json, so the shared config can
// never drift from what the app actually installs. (Build-time only: this is
// consumed by vite.config and the plugin federation preset, never at runtime.)
const deps: Record<string, string> = pkg.dependencies;

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
};

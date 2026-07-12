// The one shared copy of each dependency the host and every plugin agree
// on — a second React or Router would break hooks and shared context.
// Single source of truth: the host's vite config and every plugin's import
// this, so their versions can't drift apart.
export const SHARED_SINGLETONS = {
  react: { singleton: true, requiredVersion: '^19.2.5' },
  'react-dom': { singleton: true, requiredVersion: '^19.2.5' },
  '@tanstack/react-query': { singleton: true, requiredVersion: '^5.100.6' },
  '@tanstack/react-router': { singleton: true, requiredVersion: '^1.168.25' },
};

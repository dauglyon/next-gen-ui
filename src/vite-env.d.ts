/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_ORIGIN?: string;
  readonly VITE_DEV_AUTH_PROXY?: string;
  readonly VITE_COOKIE_DOMAIN?: string;
  readonly VITE_DEV_ALLOWED_HOSTS?: string;
  readonly VITE_PLUGIN_REGISTRY_URL?: string;
  // E2E-only: when set, main.tsx exposes the host React on window for the
  // shared-singleton browser test. Unset in normal builds.
  readonly VITE_EXPOSE_REACT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

# plugins

Runtime plugin host. The app loads plugin UIs as [Module
Federation](https://module-federation.io) remotes listed by a registry —
no rebuild, no per-plugin server.

- `registry.ts` — `pluginsOptions()`: the plugins the registry lists
  (`GET {VITE_PLUGIN_REGISTRY_URL}/plugins`), Zod-validated.
- `host.ts` — the `spa` Module Federation instance: `registerPlugin`
  (point it at a remote) and `loadPlugin` (load a remote's `./Plugin`).
- `sdk/` — the plugin authoring surface and the single source of truth for
  the shared contract, consumed by the host and every plugin:
  - `SHARED_SINGLETONS` — the MF singletons; imported by the app's
    `vite.config` and by each plugin's, so their versions can't drift apart.
  - `PluginProps` / `Plugin` — the contract types.
  - `definePlugin(routeTree)` — the whole plugin runtime: mounts a plugin's
    own router over the host's shared history.
  - `pluginFederation({ name })` — a plugin's vite preset.
  - (to be published as `@kbase/plugin-ui-sdk` — follow-up).
- `src/routes/$pluginId.$.tsx` — plugins mount at the top level (`/{id}`
  and below). Static routes match first, so a plugin claims only an id no
  real route uses; this route is also the top-level not-found page. The
  loader registers and loads the remote before render; the plugin renders
  under `/{id}`.

The host hands each plugin the app's TanStack Router (whole API) plus its
`basepath` (`/{id}`). The plugin runs its own basepath-scoped router over
the app's shared history, so it routes in clean local paths
(`<Link to="/detail">` → `/{id}/detail`) with native back/forward.

`examples/example-plugin/` is a working plugin built with the SDK —
`npm run build:example-plugin`, or `npm run dev:example-plugin` to run it
standalone.

The registry endpoint is stubbed via MSW; `@kbase/design-system` sharing,
remote-asset CSP, and publishing the SDK are follow-ups.

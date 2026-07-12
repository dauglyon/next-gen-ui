# plugins

Runtime plugin host. The app loads plugin UIs as [Module
Federation](https://module-federation.io) remotes listed by a registry —
no rebuild, no per-plugin server.

- `registry.ts` — `pluginsOptions(scope)`: the plugins the registry
  lists (`GET {VITE_PLUGIN_REGISTRY_URL}/plugins?scope=`), Zod-validated.
- `host.ts` — the `spa` Module Federation instance: `registerPlugin`
  (point it at a remote), `loadPlugin` (load a remote's `./Plugin`), and
  the `PluginProps` / `Plugin` contract. The host hands each plugin the
  app's TanStack Router (whole API) plus its `basepath` (`/{id}`). A
  plugin builds its own router —
  `createRouter({ routeTree, history: router.history, basepath })` — and
  routes in clean local paths (`<Link to="/detail">` → `/{id}/detail`)
  with native back/forward over the one shared history.
- `src/routes/$pluginId.$.tsx` — plugins mount at the top level
  (`/{id}` and below). Static routes match first, so a plugin only
  claims an id no real route uses; this route is also the top-level
  not-found page. Its loader registers and loads the remote before
  render; the plugin then renders under `/{id}`, running its own
  basepath-scoped router over the app's shared history.

`vite.config.ts` shares `react`, `react-dom`, `@tanstack/react-query`,
and `@tanstack/react-router` as singletons so plugins reuse the app's
copies.

**Scope: global plugins only.** Per-pod plugins (project/pod state) wait
on a project concept. The registry service is stubbed via MSW;
`@kbase/design-system` sharing and remote-asset CSP are follow-ups.

Design: [SPA](https://gist.github.com/dauglyon/1ec485f25203801d170a7b7d25dfb6c6),
[plugin system](https://gist.github.com/dauglyon/5c4be858e64626a155887142c8d356ac).

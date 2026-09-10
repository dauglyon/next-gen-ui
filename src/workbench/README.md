# Workbench

The workbench is the shell: sidebar, dockable tab groups, menubar, prompt bar, status bar.
A **layout** is the saved arrangement. Plugins supply panels; the workbench decides where they
go and remembers it. (`workspace` is the KBase data service and is not used here.)

## Directories

| path                | contents                                                                                                                                                              | may import                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `core/`             | `Layout` schema, operations, `reduce`, `describe`, snapshot undo store, serialization                                                                                 | zod only (ESLint fences React and the design system out)  |
| `commands/`         | command registry, slash parser and completion, keybinding chords, the workbench's own commands                                                                        | `core`                                                    |
| `host/`             | index of installed plugins, module loading, `openRoute`, the query runner, status polling, icons, settings, registry fetch, the host's own pages, `createWorkbench()` | everything                                                |
| `react/`            | the components, DnD, URL sync, frame layer, live region                                                                                                               | everything                                                |
| `../plugins/sdk/`   | what a plugin imports: the manifest contract, the five `define*` helpers, `fromReact`, the hooks, the federation preset                                               | React, zod, the design system; nothing from the workbench |
| `../plugins/local/` | the bundled plugins: koros, data, jobs                                                                                                                                | the SDK                                                   |

Routes: `src/routes/_workbench.tsx` draws the shell once; `_workbench/workbench.tsx` is the bare
workbench and `_workbench/p.$pluginId.$.tsx` resolves a deep link through `openRoute`. Both
children render nothing.

## Layout model

```ts
Layout = {
  version: 1,
  panels: Record<PanelId, Panel>,        // flat; every panel anywhere
  main: Node,                            // split{dir,sizes,children} | group{id,tabs,active}
  sidebar: { pinned: PluginId[], folded: PanelId[], sizes, collapsed, width },
  bars: { status, prompt },
  focus: PanelId | null,
  keybindings: Record<chord, commandName>,
  locked: boolean,                       // arrangement fixed; usage stays free
}
```

A panel's id is opaque and stable while the panel lives; its `path` is what it is showing. Two
kinds: a **pane** (one per plugin, id `plugin/pane`; sidebar or main area) and a **route** (main
area only; the plugin's page at a path, id minted on open). The host never parses a path: whether
two paths are one page is the route module's `normalize` to say, and `host/open.ts` asks it when
opening — a match is focused, otherwise a new panel opens. The sidebar holds no panel list of its
own: a pinned plugin's pane is in the sidebar whenever it is not a tab in the main tree. A panel
whose plugin is not installed is a ghost: the slot is kept, the body says why.

`normalize` runs after every tree edit: empty groups go, single-child splits unwrap, same-direction
splits merge, the root is always at least one (possibly empty) group.

## Operations, announcements, undo

`Operation` is the dispatch vocabulary (`open`, `close`, `focus`, `setPath`, `move`, `resize`,
`pin`, `unpin`, `fold`, `sidebar`, `bar`, `bind`, `lock`). `reduce` is pure and returns the same object
for a no-op; with `locked` set it refuses the structural operations (`move`, `resize`, `pin`,
`unpin`) while usage (open, close, focus, fold, bars, collapse) stays free. `describe` words an
operation for the one live region (`role="status"`, sr-only); titles come from the panels, so
the store receives a title lookup. Undo restores whole snapshots: one push per structural
operation. Focus, resizing, bindings and the lock toggle are not undo steps.

Persistence: `workbench.layout.v2` in localStorage, written on every change, read before first
render. A layout that fails schema or invariant validation is replaced by the default rather
than repaired; keys from earlier contracts are removed on boot, never read. Settings that are
not layout (`assistant`) live under `workbench.settings.v1`; the cart under
`kbase-workbench-cart.v2`.

## Sidebar (provisional)

Pinned plugins' panes stack as blocks that split the height; a block folds to its header and
leaves only by unpinning. Collapsing the sidebar _is_ the icon column: the same pinned list, each
icon popping its pane out beside it without changing the layout. Unpinned plugins live under
**More**; choosing one shows its pane as an ephemeral dashed _preview block_ at the bottom of the
stack, forgotten on reload. Pin drops it at the end; dragging the preview by its header onto a
block pins it at that slot. Home offers the same preview through `services.preview`, which holds
the one ephemeral preview the sidebar shows. Any pane can be dragged into the main area as a
tab; closing it there returns it to the sidebar if its plugin is still pinned.

## Breadcrumbs and tab labels

A panel may declare a trail with `usePanelBreadcrumbs([{ label, action? }])`; the host draws it in
a row between a group's tabs and its panel, for that group's active panel only. A panel that
declares none gets no row and no gap, so a split can carry a trail on one side and nothing on the
other. A crumb with an `action` opens it the way a prompt-bar offer does — same shape, same
dispatch; the last crumb is where you are and links nowhere.

A tab and a trail are different content. The tab names the thing you would switch to; the trail
says where you are inside it, and the two are written separately. They meet in one place: when
two tabs **in one group** carry the same title, `negotiateLabels` borrows the deepest crumb at
which their trails differ (`Structure · P0A7B8` beside `Evidence · P0A7B8`), and numbers only what
no trail can separate. A borrowed crumb equal to the title is not borrowed. Labels are settled per
group, so opening or closing a tab can rename its neighbour.

## Commands and the prompt bar

Every command is registered as `<source>:<name>` — a plugin's from its manifest, the workbench's
own (`workbench:close`, `workbench:undo`, `workbench:open`, …) from `commands/workbench-commands.ts`
— before any plugin code loads, so the bar completes and validates cold; running a plugin's
command fetches its `commands` module. The bar accepts a bare name when exactly one command
carries it and offers the qualified forms when two do; `/plugin:name` always works. A plugin runs
another's through `host.execute('plugin:name', args)` and checks with `host.hasCommand`; a handler
receives `{ host, caller }`, where `caller` is the calling plugin's id or `'user'`. A rejection
becomes a toast naming the command and the invoking control shows busy until the handler
settles; `host.notify` raises a toast for an outcome only the plugin can see. Menus, keybindings
and the bar are three surfaces over one registry.

Free text goes to the plugin the settings name as **assistant** — one whose manifest lists a
`prompt` module. The bar fetches that module when Settings names the plugin, calls its `handle`
with the text, the term pool and the cart as attachments (and then empties the cart), and shows
its `destination` above the field: the label, a menu over `options` calling `select`, and a jump
to `path`.

What the bar suggests comes from the **background** modules, fetched from every plugin at
startup. Each keystroke goes to every `terms(q)`; the strings that come back are pooled, expanded
once, and after a 250 ms settle handed to every `recommend`. Each plugin's answer replaces its
own section as it arrives, the previous one staying dimmed until then; after 2 s the pane stops
saying it is asking, and a later answer still lands. A pool that only grew is asked about the
new terms alone and the answers merge. The `commands` it returns are the
rows under the field — each a `CommandCall` the plugin filled in — and the `cartItems` are rows
in the Related pane, one list with the recommendation as the unit: a row keeps its place until
nothing offers it, provenance sits on the row, and what is still being asked is a line under the
rows. Three sources are asked on their own clocks (`host/query/runner.ts`): the
typed text, the front tab's terms (never sent to the plugin that owns the tab), and the cart's.
Under the recommendations the host adds what it can see for itself: shortcut buttons by name,
apps with a `launcher` by name or description, and panes — a pinned one focused where it lives,
an unpinned one previewed. Row zero is what Enter will do.

Home (`host/home/`) is that same search as a page: the apps (manifests with a `launcher`) and
panes installed, searched over the same names and descriptions.

`status()` on each background module is called once its module arrives and after every command;
the status bar shows the last answer. Default keybindings live in `commands/keys.ts` and avoid
chords browsers own; `/` focuses the bar; `Escape` returns to the panel.

## Deep links

`/p/<pluginId><path>` names one page: the plugin's route at its own path, query string included,
which the host carries and never parses. The route loader hands it to `openRoute`, which fetches
the route module, runs its `normalize` on the requested path and on each open panel's, and
focuses a match or opens a new panel. The other way, the focused route panel's path becomes the
URL: pushed when just opened or when the panel `navigate`s, replaced when focus moves between
open panels. Each entry the sync writes carries the panel it was written for in history state,
so Back returns that panel to that path instead of opening another; the entry a session starts on
is claimed for the panel it resolved to. Panes never touch the URL. Closing the addressed panel
replaces the URL with the next focused panel's path, else `/workbench`. A link to nothing is
announced and lands on `/workbench` with the layout untouched.

## Accessibility

Every pointer drag has a keyboard or context-menu route (split by direction, move to sidebar,
reorder pins) and the pointer path dispatches the same operation. One live region; dnd-kit's own
is silenced. Focus is part of the layout and restored with it; when a command moves focus, DOM
focus follows to the tab or block header, while pointer-driven focus is left alone. Tabs are a
`tablist` with roving tabindex; blocks are labelled `section`s with `aria-expanded` headers;
splitters are focusable `separator`s with `aria-valuenow`. App iframes are hidden from pointer
events during a drag.

## Registry API — host side

The endpoint, the service mount, the manifest fields and the id rules are in the plugin developer
documentation (`host/docs/`, the Deploying section); the failures and what the host does on each
are its Troubleshooting section. What an error boundary does **not** contain: a hang in a
synchronous render, memory leaks, mutation of globals (window, document, prototypes), CSS that
escapes the panel, and network activity. Those need isolation the contract does not yet provide.

### Deferred

Signing / subresource integrity of remote entries; per-plugin settings schemas; peer version
ranges beyond the shared-singleton list; per-plugin permissions; presets and org/portal layout
overrides; layout migrations past `version: 2`; anything in the image about where plugins live.

## Verification

`npm run typecheck && npm run lint && npm test && npm run build && npm run build:plugin-sdk`.
Manual: `npm run dev` → `/workbench`; pin/unpin from Settings (its Shortcuts button); fold a block;
drag a pane into the main area; move a tab by menu and by keyboard; reload; paste
`/p/koros/nitro`; type `/op`, `/workbench:open catalog` and `/cancel 12`; type a question; open
Data → Fixtures → Crash test panel; switch the assistant to None in Settings.

Settings and Home are pages, not sidebar panels: what is installed and what to open are read
now and then, and a permanent block for each crowds the sidebar. A saved layout that pins a
plugin whose manifest no longer lists a `pane` is unpinned once at startup, because that block
could only render as a ghost; an uninstalled plugin keeps its slot, since reinstalling restores it.

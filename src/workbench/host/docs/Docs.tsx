import type { ReactNode } from 'react';
import { CodeBlock } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import styles from './Docs.module.css';

// The plugin contract as it is meant to be: the page is the specification and
// the implementation is measured against it.
//
// Shaped like Vite's and Rollup's plugin pages: the smallest complete plugin
// first, then every module in the order the host reaches it, each with its
// signature, when it is called, and one example. A type appears once, in the
// entry that consumes it.

export function DocsDocument() {
  usePanelTitle('Plugin developer documentation');
  return (
    <div className={styles.layout}>
      <Rail />
      <article className={styles.root}>
        <header className={styles.head} id="top">
          <h1 className="h2">Plugin developer documentation</h1>
          <p className={styles.lede}>
            A plugin is a service that serves a manifest and a bundle. The workbench reads every
            manifest once, at startup; everything it can offer before running plugin code — a Browse
            entry, slash completion, shortcut buttons, an assistant option — comes from there. The
            bundle's modules load later, each on its own trigger.
          </p>
        </header>

        <Part id="plugin" title="A plugin">
          <File
            name=""
            language="text"
          >{`GET /plugin-registry/plugins               the workbench, once, at startup
  → [ { "id": "hello", "title": "Hello", … }, … ]

GET /services/hello/manifest.json          the entry above, as the plugin's service serves it
GET /services/hello/plugin/remoteEntry.js  the bundle; modules load from here as needed`}</File>
          <p className={styles.para}>
            The manifest is the host's whole knowledge of a plugin until a module loads: what to
            call it, which slash commands to complete, which buttons to draw, and which modules
            exist to be fetched. The bundle is Module Federation output; <Code>vite.config.ts</Code>{' '}
            names the source files and the build exposes each as one module. In development the
            plugin's own Vite server answers both URLs, and the workbench proxies the prefix to it.
          </p>

          <h3 className={styles.subhead}>The smallest plugin</h3>
          <File
            name="plugin.config.ts"
            language="typescript"
          >{`import { definePluginManifest } from '@kbase/plugin-sdk';

export default definePluginManifest({
  id: 'hello',
  title: 'Hello',
  icon: 'HandWaving',
  commands: [{ name: 'hello', title: 'Say hello', args: [{ name: 'who' }] }],
  launcher: { label: 'Hello', command: 'hello' },
});`}</File>
          <File name="vite.config.ts" language="typescript">{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginFederation } from '@kbase/plugin-sdk/vite';
import config from './plugin.config';

export default defineConfig({
  plugins: [
    pluginFederation({
      config,
      route: './src/route.tsx',
      commands: './src/commands.ts',
    }),
    react(),
  ],
});`}</File>
          <File
            name="src/route.tsx"
            language="tsx"
          >{`import { defineRoute, fromReact, usePanel, usePanelTitle } from '@kbase/plugin-sdk';

function Hello() {
  const { path } = usePanel();
  const who = path.slice(1) || 'nobody';
  usePanelTitle(who);
  return <p>Hello, {who}.</p>;
}

export default defineRoute({ ...fromReact(Hello), normalize: (path) => path.toLowerCase() });`}</File>
          <File
            name="src/commands.ts"
            language="typescript"
          >{`import { defineCommands } from '@kbase/plugin-sdk';

export default defineCommands({ hello: ({ who }, { host }) => host.openRoute(\`/\${who ?? ''}\`) });`}</File>
          <File name="" language="bash">{`npm create vite@latest hello -- --template react-ts
cd hello && npm i @kbase/plugin-sdk
npm run dev -- --port 8770`}</File>
          <p className={styles.para}>
            With <Code>VITE_DEV_SERVICE_PROXY=/services/hello=http://127.0.0.1:8770</Code> in the
            workbench's <Code>.env.local</Code>, its dev server proxies that prefix and asks{' '}
            <Code>/services/hello/manifest.json</Code> each time the registry is fetched. The
            workbench restarts once, to read the variable; after that the plugin appears while its
            server is up and disappears when it is down. Browse lists <em>Hello</em> because the
            manifest has a <Code>launcher</Code>; <Code>/hello</Code> completes because the manifest
            declares the command; <Code>/hello Alice</Code> loads <Code>commands.ts</Code>, whose
            handler calls <Code>openRoute('/Alice')</Code>, and the route module renders a tab
            titled <em>Alice</em> at <Code>/p/hello/Alice</Code>.
          </p>
        </Part>

        <Part id="runs" title="How it runs">
          <File
            name=""
            language="text"
          >{`startup    GET /plugin-registry/plugins     →  Browse, tabs, panes, slash commands, launchers
           fetch ./background from every plugin that has one

keystroke  text        → every terms()      →  terms
settle     terms       → every recommend()  →  suggestions in the prompt bar, rows in Related
open       a tab of one plugin              → fetch ./route
pin        a pane                           → fetch ./pane
run        a command                        → fetch ./commands
enter      free text → the plugin Settings names   → fetch ./prompt`}</File>
          <p className={styles.para}>
            Typed text never reaches logic of the host's own. Three sources of terms are watched
            separately, because they change at different rates: the typed text, through every
            plugin's <Code>terms</Code> on each keystroke; the front tab, through what it set with{' '}
            <Code>setTerms</Code>; and the cart, through its items' <Code>terms</Code>. When one of
            them settles the host calls every plugin's <Code>recommend</Code> with that source's
            pool. <Code>terms</Code> is synchronous and runs everywhere on every keystroke, so it
            recognises shapes — an accession, a job number — and nothing more;{' '}
            <Code>recommend</Code> runs once per settled source and may fetch. The split is what
            lets one plugin recognise an identifier and another say what to do with it: neither
            knows the other exists, only the term.
          </p>
          <p className={styles.para}>
            <Code>background</Code> is fetched at startup because the host calls it on its own
            schedule — every keystroke, every settle, after every command — and cannot wait for the
            user to open the plugin. The other four modules each load on the first action that needs
            them and stay loaded. <Code>manifest.modules</Code> says which of the five exist, and
            the host offers only what it can fetch: a plugin without <Code>pane</Code> cannot be
            pinned, and one without <Code>prompt</Code> is not offered as the assistant.
          </p>
          <p className={styles.para}>
            The cart is the host's: one list across plugins, kept with the session. A page adds
            items with <Code>useCart</Code> or <Code>CartButton</Code>; <Code>recommend</Code>{' '}
            proposes items that a Related row's <Code>+</Code> adds; the assistant receives the
            whole cart as <Code>attachments</Code> when Enter is pressed, and the cart empties,
            because the attachments belong to that message. A plugin's <Code>cart.has</Code> and{' '}
            <Code>cart.remove</Code> answer only for its own items; other plugins' items reach it
            only as their <Code>terms</Code>, through <Code>recommend</Code>.
          </p>
        </Part>

        <Part id="reference" title="Reference">
          <Entry
            id="r-config"
            name="plugin.config.ts"
            when="Read by the build; becomes manifest.json."
          >
            <Sig>{`interface Manifest {
  id: string;                    // /^[a-z][a-z0-9-]{1,40}$/; permanent: in every URL and saved layout
  title: string;
  description?: string;          // under the title on Browse
  icon?: string;                 // a name from the host's icon table
  color?: string;                // blue | green | teal | purple | orange | red
  commands?: SlashCommand[];     // commands.ts must handle each
  shortcuts?: CommandCall[];     // buttons in the sidebar toolbar
  launcher?: CommandCall;        // the button on Browse; without one the plugin is not listed there

  // written by the build, not the author
  contractVersion: number;
  modules: ('background' | 'route' | 'pane' | 'commands' | 'prompt')[];   // what vite.config.ts named
}

interface SlashCommand {
  name: string;                  // /^[a-z][a-z0-9-]*$/; registered as "<id>:<name>"
  title: string;
  description?: string;
  args?: { name: string; description?: string; required?: boolean }[];   // typed in this order
  icon?: string;
}

interface CommandCall {
  label: string;
  command: string;               // "plugin:name"; bare "name" is this plugin's own
  args?: Record<string, string | number>;
}

function definePluginManifest(m: Manifest): Manifest;`}</Sig>
            <p className={styles.para}>
              A <Code>CommandCall</Code> is a slash command with its arguments filled in. Wherever
              one appears — <Code>launcher</Code>, <Code>shortcuts</Code>, a <Code>recommend</Code>{' '}
              result, a <Code>status</Code> line — the host draws a button, and pressing it does
              what typing the command would. Any plugin may <Code>execute('hello:hello')</Code>; the
              handler that runs is Hello's, so Hello opens Hello's page, and no plugin ever draws
              inside another's UI. A command returns nothing: <Code>execute</Code> resolves when the
              handler resolves, and data between plugins travels as terms and cart items instead.
              Callers name a command by string, so renaming one breaks them. The prompt bar and{' '}
              <Code>hasCommand</Code> consult the manifest, not the module: a command declared here
              without a handler in <Code>commands.ts</Code> fails with a console error the first
              time that module loads, and a handler with no declaration is never reachable. The
              build writes <Code>contractVersion</Code> from the installed SDK, and the host accepts
              every version it has ever shipped, so a plugin built last year keeps working under
              this year's host.
            </p>
          </Entry>

          <Entry id="r-vite" name="vite.config.ts" when="Read by the build.">
            <Sig>{`function pluginFederation(paths: {
  config: Manifest;              // plugin.config.ts's default export, imported above
  background?: string;           // terms, recommend, status
  route?: string;                // the page under /p/<id>/
  pane?: string;                 // the sidebar block
  commands?: string;             // handlers for the manifest's commands
  prompt?: string;               // offers the plugin in Settings as the assistant
}): VitePlugin;`}</Sig>
            <p className={styles.para}>
              The build reads <Code>config</Code> for the manifest and exposes each other named file
              as a federation module under that name; <Code>manifest.modules</Code> is the list of
              names given here, so a file left out of this call is not part of the plugin whatever
              it exports. The output is <Code>manifest.json</Code>, <Code>remoteEntry.js</Code>,{' '}
              <Code>mf-manifest.json</Code> and the assets. The host shares seven packages, for two
              reasons: <Code>react</Code>, <Code>react-dom</Code>, <Code>@kbase/plugin-sdk</Code>,{' '}
              <Code>@kbase/design-system</Code> and <Code>zod</Code> because a second copy breaks
              something — hooks, the panel context, schema identity — and{' '}
              <Code>@phosphor-icons/react</Code> and <Code>@tanstack/react-router</Code> because the
              host already ships them and a copy is pure weight. No versions are written here: the
              build reads them from the plugin's <Code>dependencies</Code>, and{' '}
              <Code>singleton</Code> is what makes the host's copy win at runtime.
            </p>
          </Entry>

          <Entry
            id="r-background"
            name="background.ts"
            when="Fetched at startup from every plugin that names it. One default export with three optional members."
          >
            <Sig>{`function defineBackground(b: {
  terms?: (q: Query) => string[];
  recommend?: {
    commands?: (q: Query) => CommandCall[] | Promise<CommandCall[]>;
    cartItems?: (q: Query) => CartItem[] | Promise<CartItem[]>;
  };
  status?: () => StatusItem[];
}): Background;`}</Sig>
            <Export
              id="r-terms"
              name="terms"
              when="Called on every keystroke and whenever a panel changes its terms. Synchronous; no I/O."
            >
              <Sig>{`interface Query {
  text?: string;                 // what was typed, when the query came from the prompt bar
  terms?: string[];              // the pool, when it came from panels or an earlier answer
  signal: AbortSignal;
}`}</Sig>
              <p className={styles.para}>
                A term is <Code>prefix:value</Code>. There is no registry of prefixes: a prefix
                means whatever the <Code>recommend</Code> functions that match it do with it, so
                choosing one starts with reading the plugin that should react. The function runs in
                every plugin on every keystroke, so it answers from the shape of the text — a
                pattern over an accession, an inventory already in memory — and never fetches; the
                page a term opens is where the lookup happens. A query carrying <Code>terms</Code>{' '}
                and no <Code>text</Code> is the pool from panels or another plugin's answer, and the
                function may expand a term it recognises into others it can derive without I/O.
              </p>
            </Export>

            <Export
              id="r-recommend"
              name="recommend"
              when="Called when a query settles; may fetch; the signal aborts when the query changes."
            >
              <Sig>{`interface CartItem {
  id: string;                    // unique across plugins; prefix with the plugin id
  kind: string;                  // protein | taxon | job | …
  name: string;
  subject?: string;              // the identifier the item is about
  summary?: string;              // one line, shown in Related and the cart
  terms?: string[];              // what other plugins' recommend() can do with it
  source?: { path?: string; href?: string };   // where to open it: this plugin's route, or a URL
  content?: unknown;             // the payload; must survive JSON
  context?: Record<string, unknown>;           // what content cannot say: units, population, caveats
}`}</Sig>
              <p className={styles.para}>
                <Code>commands</Code> become rows in the prompt bar's list and{' '}
                <Code>cartItems</Code> become rows in Related, each row a button, under a heading
                for the source that produced them. The host drops an item already in the cart, and
                it never asks a plugin about terms that came from that plugin's own front tab, so a
                plugin cannot recommend the page it has open. A <Code>CartItem</Code> serves three
                readers through three fields: the Related row opens <Code>source</Code>; other
                plugins' <Code>recommend</Code> see <Code>terms</Code> once the item is in the cart;
                the assistant reads <Code>content</Code> and <Code>context</Code>. A field left out
                makes the item invisible to that reader and to no other.
              </p>
            </Export>

            <Export
              id="r-status"
              name="status"
              when="Called at startup and after every command the workbench runs; the result shows until the next call."
            >
              <Sig>{`interface StatusItem {
  text: string;
  action?: CommandCall;          // run when the line is pressed
}`}</Sig>
            </Export>

            <File
              name="src/background.ts"
              language="typescript"
            >{`import { defineBackground } from '@kbase/plugin-sdk';

const ACCESSION = /^[A-NR-Z][0-9][A-Z0-9]{3}[0-9]$/i;
const idsIn = (terms) => (terms ?? []).flatMap((t) => t.match(/^uniprot:(.+)$/)?.[1] ?? []);

export default defineBackground({
  terms: ({ text }) => {
    const q = text?.trim().toUpperCase() ?? '';
    return ACCESSION.test(q) ? [\`uniprot:\${q}\`] : [];
  },

  recommend: {
    commands: ({ terms }) =>
      idsIn(terms).map((id) => ({ label: \`Evidence dossier for \${id}\`, command: 'open', args: { id } })),

    cartItems: async ({ terms, signal }) => {
      const rows = await Promise.all(idsIn(terms).map((id) => fetchSummary(id, signal)));
      return rows.map((row) => ({
        id: \`function-junction:protein:\${row.id}\`,
        kind: 'protein',
        name: row.name,
        subject: row.id,
        summary: row.verdict,
        terms: [\`uniprot:\${row.id}\`, \`taxon:\${row.taxon}\`],
        source: { path: \`/\${row.id}\` },
        content: row,
        context: { measuredOver: row.population },
      }));
    },
  },

  status: () =>
    pending() > 0 ? [{ text: \`\${pending()} lookups running\`, action: { label: 'Show', command: 'open' } }] : [],
});`}</File>
          </Entry>

          <Entry
            id="r-route"
            name="route.tsx"
            when="Fetched when the user first opens this plugin's tab."
          >
            <Sig>{`type Mount = (el: HTMLElement, ctx: { panel: PanelHandle; host: PluginHost }) => Cleanup | void;
type Cleanup = () => void;

function defineRoute(r: { mount: Mount; normalize: (path: string) => string }): Route;
function fromReact(Component: ComponentType): { mount: Mount };   // the hooks under Handles read ctx`}</Sig>
            <File name="src/route.tsx" language="tsx">{`function Dossier() {
  const { path, navigate } = usePanel();
  const id = path.slice(1);
  usePanelTitle(id || 'Function Junction');
  usePanelTerms(id ? [\`uniprot:\${id}\`] : []);
  if (!id) return <SearchBox onPick={(picked) => navigate(\`/\${picked}\`)} />;
  return <Report id={id} />;
}

export default defineRoute({
  ...fromReact(Dossier),
  normalize: (path) => path.split('?')[0].split('#')[0].toUpperCase(),
});`}</File>
            <p className={styles.para}>
              The host strips <Code>/p/&lt;id&gt;</Code> and hands the rest to the route unparsed,
              query string included; a plugin may run its own router on it. <Code>openRoute</Code>{' '}
              runs <Code>normalize</Code> on the requested path and on the path of each panel this
              plugin has open, and focuses a match instead of opening a second panel — so which
              paths count as one page is entirely this function's decision, and{' '}
              <Code>{'{ duplicate: true }'}</Code> is the only way to get two. <Code>navigate</Code>{' '}
              changes the panel's path in place and pushes a history entry: a route that renders a
              search at <Code>/</Code> and a result at <Code>/&lt;id&gt;</Code> keeps both in one
              tab, and Back returns to the search. The focused panel's path is the browser URL.
            </p>
          </Entry>

          <Entry
            id="r-pane"
            name="pane.tsx"
            when="Fetched when the user first pins this plugin's pane."
          >
            <Sig>{`function definePane(p: {
  mount: Mount;
  fit?: 'content';               // the block hugs its content instead of sharing the sidebar's height
}): Pane;`}</Sig>
            <File
              name="src/pane.tsx"
              language="tsx"
            >{`import { definePane, fromReact } from '@kbase/plugin-sdk';

export default definePane({ ...fromReact(RecentProteins), fit: 'content' });`}</File>
            <p className={styles.para}>
              A pane mounts when pinned and stays mounted — across tab changes and sidebar folds —
              until unpinned. It has no path; <Code>usePanel().path</Code> is <Code>''</Code>.
              Without <Code>fit</Code> the block takes a share of the sidebar's height beside the
              other pinned panes.
            </p>
          </Entry>

          <Entry
            id="r-commands"
            name="commands.ts"
            when="Fetched when the user first runs one of this plugin's commands, from the prompt bar or from any CommandCall."
          >
            <Sig>{`interface CommandContext { host: PluginHost; caller: string }   // a plugin id, or 'user'

function defineCommands(
  handlers: Record<string, (args: Record<string, string | number>, ctx: CommandContext) => void | Promise<void>>,
): Commands;`}</Sig>
            <File
              name="src/commands.ts"
              language="typescript"
            >{`import { defineCommands } from '@kbase/plugin-sdk';

export default defineCommands({
  open: ({ id }, { host }) => host.openRoute(\`/\${id}\`),
  compare: async ({ taxid }, { host }) => {
    if (!host.hasCommand('genknown:taxon')) return host.notify('genKnown is not installed.');
    await host.execute('genknown:taxon', { q: taxid });
  },
});`}</File>
            <p className={styles.para}>
              Args typed in the prompt bar arrive as strings, in the order the manifest declares
              them; args from a <Code>CommandCall</Code> arrive as given. <Code>caller</Code> is the
              id of the plugin that called <Code>execute</Code>, or <Code>'user'</Code> for the
              prompt bar and every button. There is no panel in the context: a command that acts on
              a page takes the path as an argument. While the handler runs the host marks the
              control that invoked it busy; a rejected promise becomes a toast naming the command; a
              handler that resolves without changing what is on screen says so itself with{' '}
              <Code>notify</Code>, because only the plugin knows. A handler that opens a page calls{' '}
              <Code>openRoute</Code> before its first <Code>await</Code>, so the page is on screen
              with its own loading state while the work runs.
            </p>
          </Entry>

          <Entry
            id="r-prompt"
            name="prompt.ts"
            when="Fetched when Settings names this plugin as the assistant. Called with free text the prompt bar did not resolve to a command or a suggestion."
          >
            <Sig>{`interface Destination {
  label: string;                 // where the next message lands, shown above the prompt bar
  path?: string;                 // this plugin's route for it; the bar offers a jump there
  options?: { key: string; label: string }[];   // other places it could land
  select?: (key: string) => void;               // the user picked one of them
}

function definePrompt(p: {
  handle: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>;
  destination?: { get: () => Destination | null; subscribe: (listener: () => void) => Cleanup };
}): Prompt;`}</Sig>
            <File
              name="src/prompt.ts"
              language="typescript"
            >{`import { definePrompt } from '@kbase/plugin-sdk';

export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const slug = current() ?? newArc().slug;
    host.openRoute(\`/\${slug}\`);
    await ask(slug, text, attachments);
  },
  destination: {
    get: () => {
      const arc = currentArc();
      return {
        label: arc ? arc.title : 'A new arc',
        path: arc && \`/\${arc.slug}\`,
        options: arcs().map((a) => ({ key: a.slug, label: a.title })),
        select: setCurrent,
      };
    },
    subscribe,
  },
});`}</File>
            <p className={styles.para}>
              Settings offers a plugin as the assistant iff its manifest lists <Code>prompt</Code>.
              The host calls <Code>handle</Code> once per Enter with a <Code>Query</Code> carrying
              the text and the pooled terms, and with <Code>attachments</Code>, the cart as it stood
              when Enter was pressed — every plugin's items. The cart is then emptied, because the
              attachments belong to that message. The host draws nothing for the answer; the handler
              opens a page and streams there. <Code>destination</Code> is read with <Code>get</Code>{' '}
              and re-read on every <Code>subscribe</Code> notification: the bar shows{' '}
              <Code>label</Code> above the field, lists <Code>options</Code> in a menu that calls{' '}
              <Code>select</Code>, and opens <Code>path</Code> with <Code>openRoute</Code> when the
              jump beside the label is pressed. Without it the row names only the plugin.
            </p>
          </Entry>

          <Entry
            id="r-handles"
            name="Handles"
            when="Given to every mount, command handler and prompt handler. In React, the hooks read them."
          >
            <Sig>{`interface PluginHost {
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;   // this plugin's route
  execute: (command: string, args?: Record<string, string | number>) => Promise<void>;
  hasCommand: (command: string) => boolean;
  notify: (text: string) => void;
  cart: Cart;
}

interface PanelHandle {
  id: string;                    // opaque; stable while the panel lives
  plugin: string;
  kind: 'route' | 'pane';
  path: string;                  // '' for a pane
  focused: boolean;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setTitle: (title: string) => void;
  setCrumbs: (crumbs: { label: string; path?: string }[]) => void;
  setTerms: (terms: string[]) => void;   // what this panel puts in the pool
  subscribe: (listener: () => void) => Cleanup;   // path, focus
}

interface Cart {
  add: (item: CartItem) => void; // same id replaces
  remove: (id: string) => void;
  has: (id: string) => boolean;  // this plugin's ids only
  count: () => number;
  subscribe: (listener: () => void) => Cleanup;
}

// React
function useHost(): PluginHost;
function usePanel(): PanelHandle;         // re-renders on path and focus
function useCart(): Cart;                 // re-renders on change
function usePanelTitle(title: string): void;
function usePanelBreadcrumbs(crumbs: { label: string; path?: string }[]): void;
function usePanelTerms(terms: string[]): void;
function CartButton(props: { item: CartItem; tooltip?: string }): JSX.Element;   // "+ Add" / "✓ Added"`}</Sig>
          </Entry>
        </Part>

        <Part id="deploying" title="Deploying">
          <File name="" language="text">{`/services/<id>/manifest.json     the description
/services/<id>/plugin/…          everything in dist/`}</File>
          <p className={styles.para}>
            The plugin's service serves those two paths, and the registry answers{' '}
            <Code>GET /plugin-registry/plugins</Code> with an array of every manifest it knows. Both
            are same-origin from the workbench, which is what lets <Code>script-src 'self'</Code>{' '}
            cover the remote entry: in a container nginx proxies <Code>/plugin-registry/</Code> to{' '}
            <Code>REGISTRY_UPSTREAM</Code> and <Code>/services/&lt;id&gt;/</Code> to the service,
            and with <Code>REGISTRY_UPSTREAM</Code> unset the shell runs with its bundled plugins
            only. In development <Code>VITE_DEV_SERVICE_PROXY=&lt;prefix&gt;=&lt;origin&gt;</Code>{' '}
            does both jobs: the dev server forwards the prefix and, on each registry fetch, adds{' '}
            <Code>&lt;prefix&gt;/manifest.json</Code> to the list, so a plugin is listed while its
            server answers.
          </p>
        </Part>

        <Part id="errors" title="Errors">
          <div className={styles.trouble}>
            <Symptom name="The plugin is not on Browse">
              <Code>GET /plugin-registry/plugins</Code> from the workbench's origin either lacks the
              manifest — the registry or the dev proxy does not reach the service — or contains it
              and the console names the field that failed to parse, in which case the host skipped
              it. A manifest that parses but has no <Code>launcher</Code> is not listed by design.
            </Symptom>
            <Symptom name="Invalid hook call, or a context that is always null">
              Two copies of React or of the SDK are running: the bundle carried its own.{' '}
              <Code>mf-manifest.json</Code> in the build output lists what was shared; a package
              missing from that list was missing from <Code>dependencies</Code> when the build ran.
            </Symptom>
            <Symptom name="usePanel() called outside a workbench panel">
              The component rendered outside the subtree the host mounted for the panel — a portal,
              a toolbar, a test — where the context the hook reads is absent. Read the handle inside
              the panel and pass it down.
            </Symptom>
            <Symptom name="/hello completes, then nothing happens">
              Completion reads the manifest, so the declaration is fine. Either{' '}
              <Code>vite.config.ts</Code> does not name <Code>commands</Code>, so the host has
              nothing to fetch, or it loaded the module and found no <Code>hello</Code> in it; the
              console names the missing handler on load.
            </Symptom>
            <Symptom name="A recommendation never appears">
              In order along the chain: <Code>background</Code> is not named in{' '}
              <Code>vite.config.ts</Code>; the module has no <Code>recommend</Code>; no plugin's{' '}
              <Code>terms</Code> produced a term this <Code>recommend</Code> matches — the console
              prints the pool on each settle; or the host filtered it, because the page is already
              open or the item is already in the cart.
            </Symptom>
          </div>
        </Part>
      </article>
    </div>
  );
}

const SECTIONS: { id: string; label: string; children?: { id: string; label: string }[] }[] = [
  { id: 'plugin', label: 'A plugin' },
  { id: 'runs', label: 'How it runs' },
  {
    id: 'reference',
    label: 'Reference',
    children: [
      { id: 'r-config', label: 'plugin.config.ts' },
      { id: 'r-vite', label: 'vite.config.ts' },
      { id: 'r-background', label: 'background.ts' },
      { id: 'r-route', label: 'route.tsx' },
      { id: 'r-pane', label: 'pane.tsx' },
      { id: 'r-commands', label: 'commands.ts' },
      { id: 'r-prompt', label: 'prompt.ts' },
      { id: 'r-handles', label: 'Handles' },
    ],
  },
  { id: 'deploying', label: 'Deploying' },
  { id: 'errors', label: 'Errors' },
];

// The panel scrolls, not the window, so the rail moves the panel's own
// scroller rather than setting a hash the router would treat as navigation.
function Rail() {
  const go = (id: string) => () =>
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  return (
    <nav className={styles.rail} aria-label="On this page">
      <ul className={styles.railList}>
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button type="button" className={styles.railTop} onClick={go(s.id)}>
              {s.label}
            </button>
            {s.children && (
              <ul className={styles.railList}>
                {s.children.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={styles.railItem} onClick={go(c.id)}>
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.part} id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="h4">
        {title}
      </h2>
      {children}
    </section>
  );
}

// One module of the contract: its name, when the host reaches it, the types it
// consumes, one example, and the constraints as prose.
function Entry({
  id,
  name,
  when,
  children,
}: {
  id: string;
  name: string;
  when: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.entry} id={id} aria-labelledby={`${id}-h`}>
      <div className={styles.entryHead}>
        <h3 id={`${id}-h`} className={styles.entryName}>
          {name}
        </h3>
        <p className={styles.when}>{when}</p>
      </div>
      {children}
    </section>
  );
}

// One member of a module whose default export holds several, each with its own schedule.
function Export({
  id,
  name,
  when,
  children,
}: {
  id: string;
  name: string;
  when: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.export} id={id} aria-labelledby={`${id}-h`}>
      <div className={styles.entryHead}>
        <h4 id={`${id}-h`} className={styles.exportName}>
          {name}
        </h4>
        <p className={styles.when}>{when}</p>
      </div>
      {children}
    </section>
  );
}

function Sig({ children }: { children: string }) {
  return <CodeBlock collapsible={false} language="typescript" code={children} />;
}

function File({ name, language, children }: { name: string; language: string; children: string }) {
  return (
    <figure className={styles.file}>
      {name && <figcaption className={styles.fileName}>{name}</figcaption>}
      <CodeBlock collapsible={false} language={language} code={children} />
    </figure>
  );
}

function Symptom({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className={styles.symptom}>
      <h4 className={styles.symptomName}>{name}</h4>
      <p className={styles.para}>{children}</p>
    </section>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className={styles.inline}>{children}</code>;
}

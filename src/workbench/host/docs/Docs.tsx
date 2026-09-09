import type { ReactNode } from 'react';
import { CodeBlock } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import styles from './Docs.module.css';

// The plugin contract as it is meant to be: the page is the specification and
// the implementation is measured against it.
//
// Shaped like Vite's and Rollup's plugin pages: a working plugin first, then
// one section per module with its example and the few rules that are not
// visible in the code, then the reference with each module's signature and
// schedule. A type appears once, in the reference entry that consumes it.

export function DocsDocument() {
  usePanelTitle('Plugin developer documentation');
  return (
    <div className={styles.layout}>
      <Rail />
      <article className={styles.root}>
        <header className={styles.head} id="top">
          <h1 className="h2">Plugin developer documentation</h1>
          <p className={styles.lede}>
            A plugin is a package the workbench loads at runtime. It describes itself in a manifest
            and provides up to five modules: a page, a sidebar pane, slash commands, a background
            module that reacts to what the user is doing, and a prompt handler that makes it an
            assistant. The workbench reads the manifest at startup and loads each module the first
            time it is needed.
          </p>
        </header>

        <Part id="start" title="Getting started">
          <File
            name="plugin.config.ts"
            language="typescript"
          >{`import { definePluginManifest } from '@kbase/plugin-sdk/config';

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
            Add <Code>VITE_DEV_SERVICE_PROXY=/services/hello=http://127.0.0.1:8770</Code> to the
            workbench's <Code>.env.local</Code> and restart it. Hello now appears on Browse, and
            typing <Code>/hello Alice</Code> opens a tab that says "Hello, Alice."
          </p>
        </Part>

        <Part id="model" title="How it works">
          <p className={styles.para}>
            The manifest describes the plugin: its name and icon, its commands, and which modules it
            has. The workbench builds Browse, slash completion and the shortcut buttons from
            manifests alone. It loads a module when the user opens a tab, runs a command, or sends a
            prompt. The background module is the exception; it loads at startup.
          </p>
          <p className={styles.para}>
            Plugins do not call each other. They communicate through terms. A term is a namespaced
            identifier such as <Code>uniprot:P0AEX9</Code>. When the user types, opens a page, or
            adds to the cart, plugins turn that into terms, and every plugin is asked what it can
            offer for them. The offers appear in the prompt bar and in the Related pane.
          </p>
          <p className={styles.para}>
            The cart collects items to send to the assistant. An item carries its data, so the
            assistant and other plugins can read it without calling the plugin that made it.
          </p>
        </Part>

        <Part id="manifest" title="The manifest">
          <p className={styles.para}>
            <Code>plugin.config.ts</Code> is everything the workbench knows about a plugin before
            loading its code.
          </p>
          <File
            name="plugin.config.ts"
            language="typescript"
          >{`export default definePluginManifest({
  id: 'function-junction',
  title: 'Function Junction',
  description: 'Per-protein evidence report card.',
  icon: 'Flask',
  color: 'purple',
  commands: [
    { name: 'open', title: 'Open the evidence dossier', args: [{ name: 'id', required: true }] },
    { name: 'compare', title: 'Compare with a taxon', args: [{ name: 'taxid' }] },
  ],
  shortcuts: [{ label: 'Dossier', command: 'open', args: { id: 'P0AEX9' } }],
  launcher: { label: 'Function Junction', command: 'open' },
});`}</File>
          <p className={styles.para}>
            <Code>launcher</Code> puts a card on Browse. <Code>commands</Code> declares the slash
            commands; the prompt bar completes them and checks their arguments, and{' '}
            <Code>commands.ts</Code> must provide a handler for each. <Code>shortcuts</Code> are
            buttons in the sidebar that run a command with fixed arguments.
          </p>
          <p className={styles.para}>
            The <Code>id</Code> is part of every URL and every saved layout, so it cannot change.
            Commands are registered as <Code>function-junction:open</Code>. The short form{' '}
            <Code>/open</Code> works until another plugin declares a command named <Code>open</Code>
            ; after that only the full name does.
          </p>
        </Part>

        <Part id="pages" title="Pages">
          <p className={styles.para}>
            The <Code>route</Code> module is the plugin's page. The workbench shows it in a tab at{' '}
            <Code>/p/&lt;id&gt;/&lt;path&gt;</Code> and gives the component the path.
          </p>
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
  normalize: (path) => path.split('?')[0].toUpperCase(),
});`}</File>
          <p className={styles.para}>
            <Code>normalize</Code> decides when two paths are the same page. <Code>openRoute</Code>{' '}
            uses it to focus the existing tab instead of opening a duplicate. <Code>navigate</Code>{' '}
            changes the tab's path and adds a history entry. <Code>usePanelTitle</Code> sets the tab
            title. <Code>usePanelTerms</Code> tells the workbench what the page is about, so other
            plugins can offer related things while it is open.
          </p>
        </Part>

        <Part id="pane" title="Sidebar pane">
          <p className={styles.para}>
            The <Code>pane</Code> module is the plugin's block in the sidebar. Users pin it from
            Settings.
          </p>
          <File
            name="src/pane.tsx"
            language="tsx"
          >{`export default definePane({ ...fromReact(RecentProteins), fit: 'content' });`}</File>
          <p className={styles.para}>
            <Code>fit: 'content'</Code> makes the block as tall as its content; otherwise it shares
            the sidebar's height. A pane has no path. It unmounts when folded and can be mounted
            twice while the sidebar is collapsed, so keep state outside the component.
          </p>
        </Part>

        <Part id="background" title="Background">
          <p className={styles.para}>
            The <Code>background</Code> module runs while the plugin is not open. It loads at
            startup.
          </p>
          <File
            name="src/background.ts"
            language="typescript"
          >{`const ACCESSION = /^[A-NR-Z][0-9][A-Z0-9]{3}[0-9]$/i;
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
          <p className={styles.para}>
            <Code>terms</Code> runs on every keystroke and returns the terms it recognises in the
            text. It must be synchronous and must not fetch. <Code>recommend</Code> runs when typing
            pauses, and again when the open page's terms or the cart change. It may fetch, and its{' '}
            <Code>signal</Code> aborts when the input changes. Recommended <Code>commands</Code>{' '}
            become rows in the prompt bar. Recommended <Code>cartItems</Code> become rows in the
            Related pane, where the user can open them or add them to the cart. <Code>status</Code>{' '}
            returns lines for the status bar; it is read at startup and after every command.
          </p>
          <p className={styles.para}>
            A cart item is JSON. <Code>content</Code> is the data. <Code>context</Code> is what a
            reader needs to interpret it: units, caveats, the population a number was measured over.{' '}
            <Code>terms</Code> let other plugins react to the item. <Code>source.path</Code> is
            where it opens. Build <Code>id</Code> from the item's identity, so adding it twice
            replaces it.
          </p>
        </Part>

        <Part id="assistant" title="Assistant">
          <p className={styles.para}>
            The <Code>prompt</Code> module makes the plugin an assistant. The user picks one in
            Settings.
          </p>
          <File name="src/prompt.ts" language="typescript">{`export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const slug = koros.current() ?? koros.newArc().slug;
    host.openRoute(\`/\${slug}\`);
    await koros.ask(slug, text, attachments);
  },
  destination: { current: () => koros.destination(), subscribe: koros.subscribe },
});`}</File>
          <p className={styles.para}>
            <Code>handle</Code> receives the text the user typed and the cart as{' '}
            <Code>attachments</Code>. The cart is emptied when the message is sent. The handler
            opens its own page and writes the answer there; the workbench draws nothing itself.{' '}
            <Code>destination</Code> tells the prompt bar where the next message will go.
          </p>
        </Part>

        <Part id="commands" title="Commands and the host">
          <p className={styles.para}>
            The <Code>commands</Code> module provides a handler for each command in the manifest.
          </p>
          <File name="src/commands.ts" language="typescript">{`export default defineCommands({
  open: ({ id }, { host }) => host.openRoute(\`/\${id}\`),
  compare: async ({ taxid }, { host }) => {
    if (!host.hasCommand('genknown:taxon')) return host.notify('genKnown is not installed.');
    await host.execute('genknown:taxon', { q: taxid });
  },
});`}</File>
          <p className={styles.para}>
            A handler receives the arguments and a <Code>host</Code>. <Code>host.openRoute</Code>{' '}
            opens this plugin's page. <Code>host.execute</Code> runs a command; a bare name is this
            plugin's own, <Code>plugin:name</Code> is another plugin's. <Code>host.hasCommand</Code>{' '}
            checks whether a command exists. <Code>host.notify</Code> shows a toast.{' '}
            <Code>host.cart</Code> adds and removes this plugin's cart items. Pages get the same
            host from <Code>useHost()</Code>, and <Code>CartButton</Code> is the standard Add
            control.
          </p>
        </Part>

        <Part id="reference" title="Reference">
          <Entry
            id="r-config"
            name="plugin.config.ts"
            when="Read by the build and served as manifest.json. Read by the workbench at startup."
          >
            <Sig>{`interface Manifest {
  id: string;                    // /^[a-z][a-z0-9-]{1,40}$/
  title: string;
  description?: string;
  icon?: string;                 // a name from the workbench's icon table
  color?: string;                // blue | green | teal | purple | orange | red
  commands?: SlashCommand[];
  shortcuts?: CommandCall[];
  launcher?: CommandCall;

  // written by the build
  contractVersion: number;
  modules: ('background' | 'route' | 'pane' | 'commands' | 'prompt')[];
}

interface SlashCommand {
  name: string;                  // /^[a-z][a-z0-9-]*$/
  title: string;
  description?: string;
  args?: { name: string; description?: string; required?: boolean }[];   // positional, in this order
  icon?: string;
}

interface CommandCall {
  label: string;
  command: string;               // "plugin:name", or "name" for this plugin's own
  args?: Record<string, string | number>;
}

function definePluginManifest(m: Manifest): Manifest;`}</Sig>
            <p className={styles.para}>
              A <Code>CommandCall</Code> is shown as a button wherever it appears. The workbench
              skips a manifest whose <Code>contractVersion</Code> it does not accept and says so in
              the console.
            </p>
          </Entry>

          <Entry id="r-vite" name="vite.config.ts" when="Read by the build.">
            <Sig>{`function pluginFederation(options: {
  config: Manifest;              // plugin.config.ts's default export
  background?: string;           // entry point for each module
  route?: string;
  pane?: string;
  commands?: string;
  prompt?: string;
}): VitePlugin[];`}</Sig>
            <p className={styles.para}>
              The build exposes each named entry point as a module and writes the list into{' '}
              <Code>manifest.modules</Code>. It shares the workbench's copies of <Code>react</Code>,{' '}
              <Code>react-dom</Code>, <Code>zod</Code>, <Code>@kbase/plugin-sdk</Code>,{' '}
              <Code>@kbase/design-system</Code>, <Code>@phosphor-icons/react</Code> and{' '}
              <Code>@tanstack/react-router</Code> for each one listed in the plugin's{' '}
              <Code>package.json</Code>. A second copy of React or the SDK breaks hooks and
              contexts.
            </p>
          </Entry>

          <Entry
            id="r-background"
            name="background.ts"
            when="Loaded at startup. Each member has its own schedule."
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
              when="Called on every keystroke with the text, then once more with all terms found so far. Also called with the open page's terms and the cart's terms when they change. Synchronous."
            >
              <Sig>{`interface Query {
  text?: string;                 // the typed text, on the first call
  terms?: string[];              // the terms found so far, on the second
  signal: AbortSignal;
}`}</Sig>
            </Export>

            <Export
              id="r-recommend"
              name="recommend"
              when="Called 250 ms after the text, the open page's terms, or the cart last changed, with the terms for that source. The signal aborts when the source changes again."
            >
              <Sig>{`interface CartItem {
  id: string;                    // unique across plugins; prefix with the plugin id
  kind: string;                  // protein | taxon | job | …
  name: string;
  subject?: string;              // the identifier the item is about
  summary?: string;              // one line
  terms?: string[];              // what other plugins are asked about once the item is in the cart
  source?: { path?: string; href?: string };   // this plugin's path, or an outside link
  content?: unknown;             // the data; must survive JSON
  context?: Record<string, unknown>;           // what content cannot say: units, population, caveats
}`}</Sig>
              <p className={styles.para}>
                Recommended <Code>commands</Code> are shown for the typed text only, at most four.
                Items already in the cart, or dismissed from Related, are not shown. A plugin is not
                asked about terms from its own open page.
              </p>
            </Export>

            <Export
              id="r-status"
              name="status"
              when="Called at startup, after any module loads, and after every command. The result is shown until the next call."
            >
              <Sig>{`interface StatusItem {
  text: string;
  action?: CommandCall;          // run when the line is pressed
}`}</Sig>
            </Export>
          </Entry>

          <Entry
            id="r-route"
            name="route.tsx"
            when="Loaded when a tab of this plugin first opens. mount is called once per tab."
          >
            <Sig>{`type Mount = (el: HTMLElement, ctx: { panel: PanelHandle; host: PluginHost }) => Cleanup | void;
type Cleanup = () => void;

function defineRoute(r: { mount: Mount; normalize: (path: string) => string }): Route;
function fromReact(Component: ComponentType): { mount: Mount };`}</Sig>
            <p className={styles.para}>
              The path is everything after <Code>/p/&lt;id&gt;</Code>, including the query string.{' '}
              <Code>{'openRoute(path, { duplicate: true })'}</Code> opens a second tab for the same
              page. <Code>{'navigate(path, { replace: true })'}</Code> replaces the history entry
              instead of adding one.
            </p>
          </Entry>

          <Entry
            id="r-pane"
            name="pane.tsx"
            when="Loaded when the pane is first shown. mount is called each time it is shown."
          >
            <Sig>{`function definePane(p: {
  mount: Mount;
  fit?: 'content';
}): Pane;`}</Sig>
          </Entry>

          <Entry
            id="r-commands"
            name="commands.ts"
            when="Loaded the first time one of this plugin's commands runs."
          >
            <Sig>{`interface CommandContext { host: PluginHost; caller: string }   // the calling plugin's id, or 'user'

function defineCommands(
  handlers: Record<string, (args: Record<string, string | number>, ctx: CommandContext) => void | Promise<void>>,
): Commands;`}</Sig>
            <p className={styles.para}>
              Arguments typed in the prompt bar arrive as strings. A handler that throws produces a
              toast naming the command. A handler that opens a page should call{' '}
              <Code>openRoute</Code> before its first <Code>await</Code>, so the tab appears at
              once.
            </p>
          </Entry>

          <Entry
            id="r-prompt"
            name="prompt.ts"
            when="Loaded when Settings names this plugin as the assistant. handle is called when the user sends text that is not a slash command."
          >
            <Sig>{`interface Destination {
  label: string;                 // where the next message lands
  path?: string;                 // this plugin's page for it; the bar offers a jump there
  options?: { key: string; label: string }[];   // other places it could land
  select?: (key: string) => void;               // the user picked one
}

function definePrompt(p: {
  handle: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>;
  destination?: {
    current: () => Destination | null;
    subscribe: (onChange: () => void) => () => void;   // call onChange when current() changes; returns an unsubscribe
  };
}): Prompt;`}</Sig>
            <p className={styles.para}>
              <Code>q.terms</Code> holds the terms found in the text. <Code>q.signal</Code> aborts
              when the user presses Stop or sends another message.
            </p>
          </Entry>

          <Entry
            id="r-handles"
            name="Handles"
            when="Given to every mount, command handler and prompt handler. In React, read them with the hooks."
          >
            <Sig>{`interface PluginHost {
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;   // this plugin's page
  execute: (command: string, args?: Record<string, string | number>) => Promise<void>;
  hasCommand: (command: string) => boolean;
  notify: (text: string) => void;
  cart: Cart;
}

interface PanelHandle {
  id: string;
  plugin: string;
  kind: 'route' | 'pane';
  path: string;                  // '' for a pane
  focused: boolean;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setTitle: (title: string) => void;
  setCrumbs: (crumbs: { label: string; path?: string; icon?: string }[]) => void;
  setTerms: (terms: string[]) => void;
  subscribe: (listener: () => void) => Cleanup;   // path or focus changed
}

interface Cart {
  add: (item: CartItem) => void; // same id replaces
  remove: (id: string) => void;  // this plugin's items only
  has: (id: string) => boolean;  // this plugin's items only
  count: () => number;           // this plugin's items only
  subscribe: (listener: () => void) => Cleanup;
}

// React
function useHost(): PluginHost;
function usePanel(): PanelHandle;         // re-renders on path and focus
function useCart(): Cart;                 // re-renders on change
function usePanelTitle(title: string): void;
function usePanelBreadcrumbs(crumbs: { label: string; path?: string; icon?: string }[]): void;
function usePanelTerms(terms: string[]): void;
function CartButton(props: { item: CartItem; tooltip?: string }): JSX.Element;`}</Sig>
            <p className={styles.para}>
              A component that throws is replaced inside its panel by the error and a Try again
              button. The rest of the workbench keeps working.
            </p>
          </Entry>
        </Part>

        <Part id="deploying" title="Deploying">
          <File name="" language="text">{`/services/<id>/manifest.json     the manifest
/services/<id>/plugin/…          everything in dist/
/plugin-registry/plugins         the list of manifests`}</File>
          <p className={styles.para}>
            The plugin's service serves the first two paths. A registry answers the third with an
            array of manifests. The workbench fetches all three from its own origin, so a deployment
            must route them to the plugin services and the registry; the workbench image does not do
            this itself. Without a registry the workbench runs its bundled plugins only. In
            development, <Code>VITE_DEV_SERVICE_PROXY</Code> proxies each{' '}
            <Code>&lt;prefix&gt;=&lt;origin&gt;</Code> pair and serves as the registry for them.
          </p>
        </Part>

        <Part id="errors" title="Troubleshooting">
          <div className={styles.trouble}>
            <Symptom name="The plugin does not appear">
              Settings lists every installed plugin. If it is missing there, open{' '}
              <Code>/plugin-registry/plugins</Code> from the workbench's origin: the manifest is
              either absent, because the registry or dev proxy cannot reach the service, or present
              but invalid, in which case the console names the field. If it is in Settings but not
              on Browse, it has no <Code>launcher</Code>.
            </Symptom>
            <Symptom name="Invalid hook call, or a context that is always null">
              The bundle carried its own copy of React or the SDK. <Code>mf-manifest.json</Code> in
              the build output lists what was shared; add the missing package to{' '}
              <Code>package.json</Code>.
            </Symptom>
            <Symptom name="usePanel() called outside a workbench panel">
              The component rendered outside the panel's tree, for example in a portal. Read the
              handle inside the panel and pass it down.
            </Symptom>
            <Symptom name="A command completes, then fails">
              The toast says why: <Code>vite.config.ts</Code> does not name <Code>commands</Code>,
              the module has no handler for that name, or the handler threw.
            </Symptom>
            <Symptom name="A recommendation never appears">
              Check in order: <Code>background</Code> is named in <Code>vite.config.ts</Code>; the
              console does not report it failing to load; <Code>terms</Code> returns a term that{' '}
              <Code>recommend</Code> handles; the item is not already in the cart. Commands are
              shown only for typed text, and a plugin is not asked about its own page's terms.
            </Symptom>
            <Symptom name="This panel crashed">
              Either the module failed to load, or the component threw while rendering. "exposed
              nothing at ./route" means the file has no default export. Close and reopen the tab
              after fixing a load failure.
            </Symptom>
          </div>
        </Part>
      </article>
    </div>
  );
}

const SECTIONS: { id: string; label: string; children?: { id: string; label: string }[] }[] = [
  { id: 'start', label: 'Getting started' },
  { id: 'model', label: 'How it works' },
  { id: 'manifest', label: 'The manifest' },
  { id: 'pages', label: 'Pages' },
  { id: 'pane', label: 'Sidebar pane' },
  { id: 'background', label: 'Background' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'commands', label: 'Commands and the host' },
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
  { id: 'errors', label: 'Troubleshooting' },
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
// consumes, and the constraints as prose.
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

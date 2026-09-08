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
            A plugin is a service that serves a manifest and a bundle. The workbench reads the
            manifest at startup and loads the bundle's modules as it needs them.
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
            The manifest is what the workbench knows before it has any of the plugin's code: the
            title and icon, the slash commands and launcher, and which modules the bundle holds. The
            bundle is what the build emits from the files <Code>vite.config.ts</Code> names. In
            development a Vite server stands in for the service at the same prefix.
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

export default defineConfig({
  plugins: [
    pluginFederation({
      config: './plugin.config.ts',
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
            workbench's <Code>.env.local</Code> and restart its dev server. That is the only
            restart: the plugin is present while its own server is up and absent when it stops.
            Browse now lists <em>Hello</em> with a launcher, <Code>/hello</Code> completes in the
            prompt bar, and <Code>/hello Alice</Code> opens a tab titled <em>Alice</em> at{' '}
            <Code>/p/hello/Alice</Code>.
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
            The workbench does not read what a user types. It puts the text to every plugin's{' '}
            <Code>terms</Code>, pools what comes back with the terms open panels declare, and hands
            the pool to every plugin's <Code>recommend</Code>. One plugin can recognise an
            identifier and another can know what to do with it.
          </p>
          <p className={styles.para}>
            <Code>background</Code> is asked of every plugin on the workbench's own schedule, so it
            is fetched at startup. The other four are reached when the user addresses the plugin —
            opens its tab, pins its pane, runs its command, or has named it in Settings — and each
            is fetched at that moment. The manifest lists which of them exist, so the host knows
            what there is to fetch before it fetches.
          </p>
          <p className={styles.para}>
            The cart belongs to the workbench. A page adds items to it; <Code>recommend</Code>{' '}
            offers items for it; the assistant receives it as attachments. A plugin can test for its
            own items and cannot read another plugin's.
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
              A command is a user action. The four places a <Code>CommandCall</Code> appears —
              launcher, shortcuts, <Code>recommend</Code>, <Code>status</Code> — are four ways of
              typing it, and a plugin that calls another plugin's command is opening that plugin's
              UI for the user. It is not a way to request data: a command returns nothing, and data
              crosses plugins as terms and cart items. Because any plugin may call{' '}
              <Code>hello:hello</Code>, renaming a command breaks its callers. A command declared
              here with no handler in <Code>commands.ts</Code> fails when that module loads; a
              handler with no declaration cannot be reached, since <Code>hasCommand</Code> and the
              prompt bar read the manifest. The host accepts every <Code>contractVersion</Code> it
              has shipped.
            </p>
          </Entry>

          <Entry id="r-vite" name="vite.config.ts" when="Read by the build.">
            <Sig>{`function pluginFederation(paths: {
  config: string;                // plugin.config.ts
  background?: string;           // terms, recommend, status
  route?: string;                // the page under /p/<id>/
  pane?: string;                 // the sidebar block
  commands?: string;             // handlers for the manifest's commands
  prompt?: string;               // offers the plugin in Settings as the assistant
}): VitePlugin;`}</Sig>
            <p className={styles.para}>
              A module the paths do not name is not part of the plugin, whatever the source tree
              holds; the named ones become <Code>modules</Code> in the manifest. The output is{' '}
              <Code>manifest.json</Code>, <Code>remoteEntry.js</Code>, <Code>mf-manifest.json</Code>{' '}
              and the assets. <Code>react</Code>, <Code>react-dom</Code>,{' '}
              <Code>@kbase/plugin-sdk</Code>, <Code>@kbase/design-system</Code>, <Code>zod</Code>,{' '}
              <Code>@phosphor-icons/react</Code> and <Code>@tanstack/react-router</Code> come from
              the host at runtime: keep them in <Code>dependencies</Code>, where the build reads the
              versions it declares, and none of them ends up in the bundle.
            </p>
          </Entry>

          <Entry
            id="r-background"
            name="background.ts"
            when="Fetched at startup from every plugin that names it. Three named exports, each optional."
          >
            <Export
              id="r-terms"
              name="terms"
              when="Called on every keystroke and whenever a panel declares terms. Synchronous; no I/O."
            >
              <Sig>{`interface Query {
  text?: string;                 // what was typed, when the query came from the prompt bar
  terms?: string[];              // the pool, when it came from panels or an earlier answer
  signal: AbortSignal;
}

export const terms: (q: Query) => string[];`}</Sig>
              <p className={styles.para}>
                A term is <Code>prefix:value</Code>. Nothing registers prefixes: a term means
                whatever the <Code>recommend</Code> functions that match it take it to mean, so
                before choosing one, read the plugin expected to react. Return only what the text's
                shape establishes — the function runs for every plugin on every keystroke, and a
                lookup belongs in the page a term opens. Called with <Code>terms</Code> rather than{' '}
                <Code>text</Code>, it may expand one term into others.
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
}

export const recommend: {
  commands?: (q: Query) => CommandCall[] | Promise<CommandCall[]>;
  cartItems?: (q: Query) => CartItem[] | Promise<CartItem[]>;
};`}</Sig>
              <p className={styles.para}>
                The host filters what comes back: a command whose page is already open and an item
                already in the cart are dropped, and a plugin is not asked about a page it has open.
                An item is read by three consumers with different needs — the Related pane opens{' '}
                <Code>source</Code>, another plugin's <Code>recommend</Code> reads{' '}
                <Code>terms</Code>, and the assistant reads <Code>content</Code> and{' '}
                <Code>context</Code> — so an item missing one of them is invisible to that consumer.
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
}

export const status: () => StatusItem[];`}</Sig>
            </Export>

            <File
              name="src/background.ts"
              language="typescript"
            >{`import { defineTerms, defineRecommend, defineStatus } from '@kbase/plugin-sdk';

const ACCESSION = /^[A-NR-Z][0-9][A-Z0-9]{3}[0-9]$/i;
const idsIn = (terms) => (terms ?? []).flatMap((t) => t.match(/^uniprot:(.+)$/)?.[1] ?? []);

export const terms = defineTerms(({ text }) => {
  const q = text?.trim().toUpperCase() ?? '';
  return ACCESSION.test(q) ? [\`uniprot:\${q}\`] : [];
});

export const recommend = defineRecommend({
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
});

export const status = defineStatus(() =>
  pending() > 0 ? [{ text: \`\${pending()} lookups running\`, action: { label: 'Show', command: 'open' } }] : [],
);`}</File>
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
              The route receives every path under <Code>/p/&lt;id&gt;</Code>, query string included,
              and the workbench never parses it. Two paths are the same page when{' '}
              <Code>normalize</Code> maps them to one string; <Code>openRoute</Code> focuses a panel
              already showing that page instead of opening a second, and the tab strip is only as
              tidy as this function. Inside the panel, <Code>navigate</Code> changes its path and
              pushes history; a route that serves both the empty path and the identified one gives a
              search and its result one tab and a working Back. The focused panel's path is the
              browser URL.
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
              The pane mounts once, when pinned, and stays mounted while it is pinned. It has no
              path; <Code>usePanel().path</Code> is <Code>''</Code> there.
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
              Handlers receive args as strings when typed and as given when called from a{' '}
              <Code>CommandCall</Code>, and receive no panel: a command that acts on a page takes
              the path as an argument. To land the user somewhere, call <Code>openRoute</Code> first
              and await the work after, so the page shows its own loading state. While the handler
              runs the host shows the control that invoked it busy; a rejection becomes a toast; any
              other result the handler reports with <Code>notify</Code>.
            </p>
          </Entry>

          <Entry
            id="r-prompt"
            name="prompt.ts"
            when="Fetched when Settings names this plugin as the assistant. Called with free text the prompt bar did not resolve to a command or a suggestion."
          >
            <Sig>{`function definePrompt(
  fn: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>,
): Prompt;`}</Sig>
            <File
              name="src/prompt.ts"
              language="typescript"
            >{`import { definePrompt } from '@kbase/plugin-sdk';

export default definePrompt(async ({ text, terms }, { host, attachments }) => {
  const slug = current() ?? newArc().slug;
  host.openRoute(\`/\${slug}\`);
  await ask(slug, text, attachments);
});`}</File>
            <p className={styles.para}>
              <Code>attachments</Code> is a copy of the cart taken when enter was pressed, every
              plugin's items included. Where the answer goes is the handler's decision: the example
              opens the plugin's own page and streams into it.
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
            The plugin's service serves those two paths; the registry answers{' '}
            <Code>GET /plugin-registry/plugins</Code> with the manifests of every plugin it knows.
            In a container <Code>REGISTRY_UPSTREAM</Code> is the registry's address; unset, the
            shell runs with its own plugins only. In development{' '}
            <Code>VITE_DEV_SERVICE_PROXY=&lt;prefix&gt;=&lt;origin&gt;</Code> maps a prefix to a
            Vite server, and that plugin is in the list while the server answers.
          </p>
        </Part>

        <Part id="errors" title="Errors">
          <div className={styles.trouble}>
            <Symptom name="The plugin is not on Browse">
              <Code>GET /plugin-registry/plugins</Code> from the workbench's origin either lacks it
              — the registry or the dev proxy is not pointed at it — or has it and the console names
              the manifest field that failed to parse.
            </Symptom>
            <Symptom name="Invalid hook call, or a context that is always null">
              The bundle carries its own React or its own SDK. <Code>mf-manifest.json</Code> in the
              build output lists what was shared; a package missing from it is missing from{' '}
              <Code>dependencies</Code>.
            </Symptom>
            <Symptom name="usePanel() called outside a workbench panel">
              The component rendered somewhere the host did not mount it — a portal, a toolbar, a
              test. Pass it the handle instead.
            </Symptom>
            <Symptom name="/hello completes, then nothing happens">
              The command is declared in <Code>plugin.config.ts</Code> but either{' '}
              <Code>commands</Code> is not named in <Code>vite.config.ts</Code> or the module has no
              handler under that name; the console names the missing handler when the module loads.
            </Symptom>
            <Symptom name="A recommendation never appears">
              <Code>background</Code> is not named in <Code>vite.config.ts</Code>, it exports no{' '}
              <Code>recommend</Code>, or no plugin produced the term it matches; the console prints
              the pooled terms on each settle.
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

// One named export of a module that holds several, each with its own schedule.
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

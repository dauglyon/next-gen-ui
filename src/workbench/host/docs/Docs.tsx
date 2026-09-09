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
            A plugin is a service that serves a manifest and a bundle. The workbench fetches every
            manifest once, at startup, and draws from the manifests alone until a module is needed:
            the card on Browse, slash completion, the shortcut buttons, the assistant choice in
            Settings. The bundle holds up to five modules; each is fetched on its own trigger and
            kept for the session.
          </p>
        </header>

        <Part id="plugin" title="A plugin">
          <File
            name=""
            language="text"
          >{`GET /plugin-registry/plugins               the workbench, once, at startup
  → [ { "id": "hello", "title": "Hello", … }, … ]

GET /services/hello/manifest.json          the entry above, as the plugin's service serves it
GET /services/hello/plugin/remoteEntry.js  the bundle; a module is fetched from here when first needed`}</File>
          <p className={styles.para}>
            The manifest is <Code>plugin.config.ts</Code> plus two fields the build writes,{' '}
            <Code>contractVersion</Code> and <Code>modules</Code>. It is everything the host knows
            about a plugin until a module loads: the title and icon, the slash commands to complete,
            the buttons to draw, and which of the five modules exist to be fetched. The bundle is
            Module Federation output: <Code>vite.config.ts</Code> names one source file per module,
            and the build exposes each under the module's name.
          </p>

          <h3 className={styles.subhead}>The smallest plugin</h3>
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
            With <Code>VITE_DEV_SERVICE_PROXY=/services/hello=http://127.0.0.1:8770</Code> in the
            workbench's <Code>.env.local</Code>, its dev server proxies that prefix to the plugin's
            server. Vite reads the variable when it starts, so the workbench restarts once. Each
            registry fetch after that requests <Code>/services/hello/manifest.json</Code> and lists
            the plugin when the request succeeds; a reload with the plugin's server down is a
            workbench without it. Browse shows a Hello card because the manifest has a{' '}
            <Code>launcher</Code>. <Code>/hel</Code> completes to <Code>/hello</Code> because the
            manifest declares the command. <Code>/hello Alice</Code> fetches{' '}
            <Code>commands.ts</Code> and runs <Code>hello</Code> with{' '}
            <Code>{"{ who: 'Alice' }"}</Code>; <Code>openRoute('/Alice')</Code> fetches{' '}
            <Code>route.tsx</Code>, finds no open Hello tab whose <Code>normalize</Code> matches,
            and opens one at <Code>/p/hello/Alice</Code>; <Code>usePanelTitle</Code> names the tab{' '}
            <em>Alice</em>.
          </p>
        </Part>

        <Part id="runs" title="How it runs">
          <File
            name=""
            language="text"
          >{`startup    GET /plugin-registry/plugins     →  Browse cards, slash completion, shortcut buttons, assistant choices
           fetch ./background from every plugin that lists it

change     the typed text         → every terms()  →  the typing pool
           the front tab's setTerms                →  the page pool
           the cart's items' terms                 →  the cart pool
settle     a pool, 250 ms after its last change    →  every recommend()
                                                   →  rows in the prompt bar (typing) and in Related (all three)

open       a tab of one plugin                     →  fetch ./route
show       a pane                                  →  fetch ./pane
run        a command                               →  fetch ./commands
enter      free text → the plugin Settings names   →  fetch ./prompt`}</File>
          <p className={styles.para}>
            At startup the host fetches the registry, parses each manifest, and registers every
            declared command as <Code>&lt;id&gt;:&lt;name&gt;</Code>. It then fetches{' '}
            <Code>background</Code> from every plugin whose manifest lists it, because{' '}
            <Code>terms</Code> and <Code>status</Code> are called on the host's schedule rather than
            the user's; a background that has not arrived contributes nothing until it does, and one
            that fails to load is logged and skipped. The other four modules are fetched the first
            time something needs them — a tab opening, a pane being shown, a command running, Enter
            on free text — and kept for the session. <Code>manifest.modules</Code> is what the host
            consults before offering anything: a plugin whose manifest lacks <Code>pane</Code>{' '}
            cannot be pinned, and one without <Code>prompt</Code> is not offered as the assistant.
          </p>
          <p className={styles.para}>
            The host reads no term itself; it collects them and hands them on. Three sources of
            terms are kept apart, each with its own timer: the text in the prompt bar, the terms the
            front tab declared with <Code>setTerms</Code>, and the terms on the cart's items, less
            any the front tab already declared. When a source changes, the host builds that source's
            pool synchronously: for the typing source every plugin's <Code>terms</Code> is called
            with the text; then, for every source, every plugin's <Code>terms</Code> is called once
            with the pool so far, when it is not empty, and what comes back is added. There is no
            third pass. A source that changes again within 250 ms restarts its timer. When the timer
            fires, every plugin's <Code>recommend.commands</Code> and{' '}
            <Code>recommend.cartItems</Code> are called with{' '}
            <Code>{'{ text, terms, signal }'}</Code> for that source — except the plugin whose own
            front tab produced the page pool, which is not asked about it. A source that changes
            while answers are pending aborts the signal and drops what arrives. A <Code>terms</Code>{' '}
            or <Code>recommend</Code> that throws is logged and contributes nothing that round; the
            others still answer.
          </p>
          <p className={styles.para}>
            Where an answer shows depends on the source. <Code>commands</Code> answered for the
            typing source become rows in the prompt bar's list, at most four across all plugins,
            each a button that runs the call; <Code>commands</Code> answered for the page or cart
            source are shown nowhere. <Code>cartItems</Code> from all three sources become rows in
            the Related pane, one section per source, headed by the text, the front tab's title, or
            the cart's item count. A row opens the item's <Code>source.path</Code> in the answering
            plugin and carries a <Code>+</Code> that puts the item in the cart. An item already in
            the cart is not shown, and one the user has dismissed stays hidden for that source.
          </p>
          <p className={styles.para}>
            The cart is one list the host keeps, written to local storage on every change and read
            back at startup, so it outlives the page it was filled from and the session. A page adds
            to it with <Code>useCart</Code> or <Code>CartButton</Code>; a Related row's{' '}
            <Code>+</Code> adds a recommended item; an item added again under the same id replaces
            the first. On Enter the assistant receives every item as <Code>attachments</Code> and
            the cart is emptied. A plugin's <Code>cart.has</Code>, <Code>count</Code> and{' '}
            <Code>remove</Code> answer for the items it added; another plugin's items reach it only
            as their <Code>terms</Code>, through <Code>recommend</Code>.
          </p>
        </Part>

        <Part id="reference" title="Reference">
          <Entry
            id="r-config"
            name="plugin.config.ts"
            when="Read by the build; served as manifest.json."
          >
            <Sig>{`interface Manifest {
  id: string;                    // /^[a-z][a-z0-9-]{1,40}$/; in every URL and saved layout, so never changed
  title: string;
  description?: string;          // under the title on Browse and in Settings
  icon?: string;                 // a name from the host's icon table; an unknown name draws a pin
  color?: string;                // blue | green | teal | purple | orange | red; tints the icon
  commands?: SlashCommand[];     // commands.ts must handle each
  shortcuts?: CommandCall[];     // buttons in the sidebar's Shortcuts block
  launcher?: CommandCall;        // the card on Browse; without one the plugin has no card

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
  command: string;               // "plugin:name"; a bare "name" is this plugin's own
  args?: Record<string, string | number>;
}

function definePluginManifest(m: Manifest): Manifest;`}</Sig>
            <p className={styles.para}>
              The build checks the config against this schema; an <Code>id</Code> or a command name
              outside its pattern fails the build. A <Code>CommandCall</Code> is a command with its
              arguments filled in. <Code>launcher</Code>, each of <Code>shortcuts</Code>, each
              result of <Code>recommend.commands</Code> and each <Code>status</Code> line with an{' '}
              <Code>action</Code> is drawn as a button labelled with the call's <Code>label</Code>;
              pressing it does what typing the command would, and the button is disabled while the
              command runs. Commands are registered at startup, from the manifest, before any module
              loads. A bare <Code>/name</Code> resolves when exactly one installed plugin declares
              that name; where two do, completion offers each as <Code>/plugin:name</Code>, and a
              bare <Code>/name</Code> is refused with both candidates. The handler is looked up in{' '}
              <Code>commands.ts</Code> when the command first runs: a name declared here with no
              handler there fails at that run, and a handler with no declaration here cannot be
              reached. <Code>contractVersion</Code> is written from the SDK the build ran with. The
              host reads a manifest whose version is one it accepts — today, 2 — and skips any other
              with a console warning naming the field.
            </p>
          </Entry>

          <Entry id="r-vite" name="vite.config.ts" when="Read by the build.">
            <Sig>{`function pluginFederation(options: {
  config: Manifest;              // plugin.config.ts's default export
  background?: string;           // one source file per module, exposed under the module's name
  route?: string;
  pane?: string;
  commands?: string;
  prompt?: string;
}): VitePlugin[];`}</Sig>
            <p className={styles.para}>
              <Code>manifest.modules</Code> is the list of module names given here; a source file
              not named is not part of the plugin, whatever it exports. The output is{' '}
              <Code>manifest.json</Code>, <Code>remoteEntry.js</Code>, <Code>mf-manifest.json</Code>{' '}
              and the chunks. The host holds seven packages as singletons — <Code>react</Code>,{' '}
              <Code>react-dom</Code>, <Code>zod</Code>, <Code>@kbase/plugin-sdk</Code>,{' '}
              <Code>@kbase/design-system</Code>, <Code>@phosphor-icons/react</Code> and{' '}
              <Code>@tanstack/react-router</Code> — and the preset shares each of them that the
              plugin's <Code>package.json</Code> declares, under <Code>dependencies</Code>,{' '}
              <Code>devDependencies</Code> or <Code>peerDependencies</Code>. A shared package is
              left out of the bundle and the host's copy is the one that runs; a package the plugin
              does not declare is not shared, so a plugin that never imports the router shares six.
              The version ranges are the host's, fixed when the SDK was built. The first five must
              be shared: a second React breaks hooks, a second SDK gives <Code>usePanel</Code> a
              context the host never fills, a second design system splits the tooltip context, a
              second zod fails schema identity. The last two are shared so the plugin does not carry
              them.
            </p>
          </Entry>

          <Entry
            id="r-background"
            name="background.ts"
            when="Fetched at startup from every plugin that lists it. One default export with three optional members, each on its own schedule."
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
              when="Called synchronously each time a source changes: with the text, for the typing source; then once with the pool, for every source. No I/O."
            >
              <Sig>{`interface Query {
  text?: string;                 // the prompt bar's text; absent for the page and cart sources and on the pool pass
  terms?: string[];              // the pool so far; absent on the pass over the text
  signal: AbortSignal;
}`}</Sig>
              <p className={styles.para}>
                A term is <Code>prefix:value</Code>. There is no registry of prefixes: a prefix
                means whatever the <Code>recommend</Code> functions that match it do with it, so
                choosing one begins with reading the plugin that should react. The host compares
                nothing inside a term. A query with <Code>text</Code> is the prompt bar's text on a
                keystroke; this function runs in every plugin on every keystroke, so it decides from
                the shape of the text — a pattern over an accession, an inventory already in memory
                — and the lookup belongs to the page the term opens. A query with <Code>terms</Code>{' '}
                and no <Code>text</Code> is a pool the host has already built; what the function
                returns is added to that pool, and no plugin is asked about the additions.
              </p>
            </Export>

            <Export
              id="r-recommend"
              name="recommend"
              when="Called 250 ms after a source last changed, with that source's pool. May fetch; the signal aborts when the source changes again."
            >
              <Sig>{`interface CartItem {
  id: string;                    // unique across plugins: prefix with the plugin id; the same id added again replaces
  kind: string;                  // protein | taxon | job | …, in this plugin's own words
  name: string;
  subject?: string;              // the identifier the item is about; leads the row and the tile
  summary?: string;              // one line, shown in Related and the cart
  terms?: string[];              // what other plugins' recommend are asked with once the item is in the cart
  source?: { path?: string; href?: string };   // path: where a Related row opens, in this plugin; href: a link outside
  content?: unknown;             // the payload; must survive JSON
  context?: Record<string, unknown>;           // what content cannot say: units, population, caveats
}`}</Sig>
              <p className={styles.para}>
                <Code>commands</Code> answered for the typing source are drawn in the prompt bar
                under the Send row, four at most across all plugins, and only while the text is not
                a slash command; answered for the page or cart source they are drawn nowhere.{' '}
                <Code>cartItems</Code> are drawn as rows in Related under a heading for the source;
                a row opens <Code>source.path</Code> in this plugin, and its <Code>+</Code> puts the
                item in the cart stamped with this plugin's id, as this plugin's own{' '}
                <Code>cart.add</Code> would. An item already in the cart, or one the user dismissed,
                is not drawn. Three readers take three fields: Related opens <Code>source</Code>;
                other plugins' <Code>recommend</Code> receive <Code>terms</Code> once the item is in
                the cart; the assistant reads <Code>content</Code> and <Code>context</Code>. An item
                without <Code>source</Code> is a row that cannot be opened; without{' '}
                <Code>terms</Code>, one no plugin is asked about; without <Code>content</Code>, one
                the assistant knows only by name and summary.
              </p>
            </Export>

            <Export
              id="r-status"
              name="status"
              when="Called at startup as each background module arrives, after any module loads, and after every command the workbench runs. The answer shows in the status bar until the next call."
            >
              <Sig>{`interface StatusItem {
  text: string;
  action?: CommandCall;          // run when the line is pressed
}`}</Sig>
              <p className={styles.para}>
                A line with an <Code>action</Code> is a button, disabled while its command runs; a
                line without one is text. A <Code>status</Code> that throws shows nothing for this
                plugin until it next returns.
              </p>
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
            when="Fetched the first time a tab of this plugin opens, or the first time openRoute needs normalize."
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
              A tab's path is everything after <Code>/p/&lt;id&gt;</Code>, query string included,
              unparsed; the plugin routes on it. <Code>openRoute</Code> fetches this module, runs{' '}
              <Code>normalize</Code> on the requested path and on the path of every open tab of this
              plugin, and focuses a tab whose result matches instead of opening another;{' '}
              <Code>{'{ duplicate: true }'}</Code> skips the comparison. Which paths are one page is
              this function's decision and nobody else's. <Code>mount</Code> is called once per tab
              with an element and the tab's handle. <Code>navigate</Code> changes the tab's path in
              place and pushes a history entry — <Code>{'{ replace: true }'}</Code> replaces the
              current one — and the handle reports the change, so a route that draws a search at{' '}
              <Code>/</Code> and a result at <Code>/&lt;id&gt;</Code> keeps both in one tab, and
              Back returns to the search. The focused tab's path is the browser URL,{' '}
              <Code>/p/&lt;id&gt;&lt;path&gt;</Code>, and a URL entered by hand resolves the way{' '}
              <Code>openRoute</Code> does. Until <Code>setTitle</Code> is called the tab is titled
              with the plugin's title and, when the path is not <Code>/</Code>, the path.
            </p>
          </Entry>

          <Entry
            id="r-pane"
            name="pane.tsx"
            when="Fetched the first time this plugin's pane is shown: pinned in the sidebar, previewed from More, or opened from the collapsed rail."
          >
            <Sig>{`function definePane(p: {
  mount: Mount;
  fit?: 'content';               // the block takes its content's height instead of a share of the sidebar's
}): Pane;`}</Sig>
            <File
              name="src/pane.tsx"
              language="tsx"
            >{`import { definePane, fromReact } from '@kbase/plugin-sdk';

export default definePane({ ...fromReact(RecentProteins), fit: 'content' });`}</File>
            <p className={styles.para}>
              A pane has no path; <Code>usePanel().path</Code> is <Code>''</Code>. A manifest that
              lists <Code>pane</Code> makes the plugin pinnable from Settings and puts it under the
              sidebar's More menu; the plugin does not pin itself. The block's body mounts when the
              block is shown and unmounts when the block is folded. The preview More opens and the
              flyout the collapsed rail opens are separate mounts of the same pane, and a flyout can
              be open while the block is mounted, so state that must survive between mounts lives
              outside the component. Without <Code>fit</Code> the block takes a share of the
              sidebar's height beside the other blocks and scrolls inside it.
            </p>
          </Entry>

          <Entry
            id="r-commands"
            name="commands.ts"
            when="Fetched the first time one of this plugin's commands runs: from the prompt bar, from a button, or from another plugin's execute."
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
              Args typed in the prompt bar arrive as strings, in the manifest's order, with double
              quotes grouping one that contains spaces; args from a <Code>CommandCall</Code> or{' '}
              <Code>execute</Code> arrive as given. <Code>caller</Code> is the id of the plugin that
              called <Code>execute</Code>, or <Code>'user'</Code> for the prompt bar and every
              button. The context carries no panel: a command that acts on a page takes what it
              needs as arguments. A handler that throws or rejects ends, for the user, in a toast
              titled <Code>/&lt;name&gt; failed</Code> with the message, and for an{' '}
              <Code>execute</Code> caller in the rejection itself. A handler that resolves having
              changed nothing on screen has <Code>notify</Code> for saying so. A handler that opens
              a page calls <Code>openRoute</Code> before its first <Code>await</Code>: the tab is on
              screen with its own loading state while the rest of the work runs.
            </p>
          </Entry>

          <Entry
            id="r-prompt"
            name="prompt.ts"
            when="Fetched when Settings names this plugin as the assistant. handle is called on Enter with text that is not a slash command, when no other row of the list is chosen."
          >
            <Sig>{`interface Destination {
  label: string;                 // where the next message lands, shown above the prompt bar
  path?: string;                 // this plugin's route for it; the bar offers a jump there
  options?: { key: string; label: string }[];   // other places it could land
  select?: (key: string) => void;               // the user picked one of them
}

function definePrompt(p: {
  handle: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>;
  destination?: {
    current: () => Destination | null;                  // what the bar shows; read whenever it redraws
    subscribe: (onChange: () => void) => () => void;    // call onChange when current() would differ; the function returned stops the calls
  };
}): Prompt;`}</Sig>
            <File
              name="src/prompt.ts"
              language="typescript"
            >{`import { definePrompt } from '@kbase/plugin-sdk';
import { koros } from './store';

export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const slug = koros.current() ?? koros.newArc().slug;
    host.openRoute(\`/\${slug}\`);
    await koros.ask(slug, text, attachments);
  },
  destination: { current: () => koros.destination(), subscribe: koros.subscribe },
});`}</File>
            <p className={styles.para}>
              Settings offers a plugin as the assistant when its manifest lists <Code>prompt</Code>.
              On Enter the host takes the cart's items as <Code>attachments</Code>, empties the
              cart, and calls <Code>handle</Code> with the text, the typing source's pool as{' '}
              <Code>terms</Code>, and a signal that aborts when the bar's Stop is pressed or another
              Enter arrives first. The bar is busy until the promise settles; a rejection's message
              is shown under the field. The host draws nothing for the answer: the handler opens one
              of this plugin's pages and writes there.
            </p>
            <p className={styles.para}>
              <Code>destination</Code> is what the bar shows beside the plugin's name above the
              field. The bar reads <Code>current()</Code> once, then again each time the plugin
              calls the <Code>onChange</Code> it was handed through <Code>subscribe</Code>; the
              function <Code>subscribe</Code> returned is called when Settings names another
              assistant or the bar unmounts. The bar shows <Code>label</Code>; with{' '}
              <Code>options</Code> and <Code>select</Code> the label is a menu whose choice calls{' '}
              <Code>select(key)</Code>; with <Code>path</Code> a jump beside the label opens that
              path in this plugin. Without <Code>destination</Code>, or while <Code>current()</Code>{' '}
              returns <Code>null</Code>, the row shows the plugin's name alone.
            </p>
          </Entry>

          <Entry
            id="r-handles"
            name="Handles"
            when="Given to every mount, command handler and prompt handler. In React, the hooks read them."
          >
            <Sig>{`interface PluginHost {
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;   // this plugin's pages only
  execute: (command: string, args?: Record<string, string | number>) => Promise<void>;   // bare name: this plugin's own
  hasCommand: (command: string) => boolean;
  notify: (text: string) => void;   // a toast
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
  setCrumbs: (crumbs: { label: string; path?: string; icon?: string }[]) => void;
  setTerms: (terms: string[]) => void;   // what this panel puts in the page pool
  subscribe: (listener: () => void) => Cleanup;   // path, focus
}

interface Cart {
  add: (item: CartItem) => void; // same id replaces
  remove: (id: string) => void;  // this plugin's ids only
  has: (id: string) => boolean;  // this plugin's ids only
  count: () => number;           // this plugin's items
  subscribe: (listener: () => void) => Cleanup;
}

// React
function useHost(): PluginHost;
function usePanel(): PanelHandle;         // re-renders on path and focus
function useCart(): Cart;                 // re-renders on change
function usePanelTitle(title: string): void;
function usePanelBreadcrumbs(crumbs: { label: string; path?: string; icon?: string }[]): void;
function usePanelTerms(terms: string[]): void;
function CartButton(props: { item: CartItem; tooltip?: string }): JSX.Element;   // "+ Add" / "✓ Added"`}</Sig>
            <p className={styles.para}>
              <Code>openRoute</Code> opens this plugin's pages; another plugin's page is reached by
              running that plugin's command through <Code>execute</Code>. <Code>path</Code> and{' '}
              <Code>focused</Code> read the layout when accessed, and <Code>subscribe</Code> fires
              when either changes; <Code>fromReact</Code> redraws the tree on each, which is what
              makes <Code>usePanel()</Code> current on every render. <Code>setTerms</Code> compares
              by value, so the same list set again changes nothing. Crumbs are drawn above the
              panel; one with a <Code>path</Code> is a button that moves this panel there, and when
              two tabs in a group share a title the host tells them apart with the deepest crumb
              that differs. A component that throws while rendering is replaced, inside the panel,
              by the error and a Try again; the tab, the sidebar and the bars keep working.
            </p>
          </Entry>
        </Part>

        <Part id="deploying" title="Deploying">
          <File name="" language="text">{`/services/<id>/manifest.json     the description
/services/<id>/plugin/…          everything in dist/`}</File>
          <p className={styles.para}>
            The plugin's service serves those two paths under its id, and{' '}
            <Code>GET /plugin-registry/plugins</Code> answers an array of manifests. The host
            fetches both from its own origin and loads{' '}
            <Code>/services/&lt;id&gt;/plugin/remoteEntry.js</Code> as an ES module, which is what
            lets <Code>script-src 'self'</Code> cover it. The workbench's built image answers
            neither path; a deployment puts in front of it something that answers both. Where
            nothing does, the registry fetch receives the shell's HTML, the host logs that nothing
            answered as a registry, and the bundled plugins run alone. In development the Vite
            server does both from <Code>VITE_DEV_SERVICE_PROXY=&lt;prefix&gt;=&lt;origin&gt;</Code>,
            comma-separated: it proxies each prefix to its origin, and answers the registry with
            each <Code>&lt;prefix&gt;/manifest.json</Code> that responds at the moment of the fetch.
          </p>
        </Part>

        <Part id="errors" title="Errors">
          <div className={styles.trouble}>
            <Symptom name="The plugin is not on Browse">
              In order along the chain. <Code>GET /plugin-registry/plugins</Code> from the
              workbench's origin answers HTML or another non-JSON type: the console says nothing
              answered as a registry, and only the bundled plugins are installed. It answers JSON
              without this manifest: the registry, or the dev proxy, does not reach the service. It
              contains the manifest and the console says it was skipped, naming the field that
              failed — <Code>contractVersion</Code> among them. It parsed and Settings lists the
              plugin: Browse shows a card under Apps only for a manifest with a{' '}
              <Code>launcher</Code>, and under Panels only for one that lists <Code>pane</Code>.
            </Symptom>
            <Symptom name="Invalid hook call, or a context that is always null">
              Two copies of React or of the SDK are running: the bundle carried its own.{' '}
              <Code>mf-manifest.json</Code> in the build output lists what was shared; a package
              missing from that list was missing from <Code>package.json</Code> when the build ran.
            </Symptom>
            <Symptom name="usePanel() called outside a workbench panel">
              The component rendered outside the tree the host mounted for the panel — a portal, a
              test — where the context the hook reads is absent. Read the handle inside the panel
              and pass it down.
            </Symptom>
            <Symptom name="/hello completes, then a toast says /hello failed">
              Completion reads the manifest, so the declaration is fine; the toast's message says
              which of three things happened. <Code>vite.config.ts</Code> does not name{' '}
              <Code>commands</Code>, so the plugin has no commands module to fetch; the module
              loaded and has no <Code>hello</Code> in it; or the handler threw, and the message is
              its own.
            </Symptom>
            <Symptom name="A recommendation never appears">
              In order along the chain: <Code>background</Code> is not named in{' '}
              <Code>vite.config.ts</Code>; it is named and the console says it failed to load; the
              module has no <Code>recommend</Code>; no plugin's <Code>terms</Code> put a term this{' '}
              <Code>recommend</Code> matches into the pool; the source changed before the answer
              arrived, and the answer was dropped; the pool came from this plugin's own front tab;
              the item is already in the cart or was dismissed; the answer was a command for the
              page or cart source, which the host shows nowhere, or a fifth command for the typing
              source; or the text began with a slash, which is a command and never a query.
            </Symptom>
            <Symptom name="This panel crashed">
              Either the module failed to load — <Code>exposed nothing at ./route</Code> means the
              file has no default export; any other message is the loader's, with the URL it fetched
              — or the component threw while rendering, and the message is its own. Try again
              re-renders the component; a module that failed to load fails again until the tab is
              closed and reopened.
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

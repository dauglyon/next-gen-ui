import type { ReactNode } from 'react';
import { CodeBlock } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import styles from './Docs.module.css';

// The plugin contract as it is meant to be: the page is the specification and
// the implementation is measured against it.
//
// Shaped like Vite's and Rollup's plugin pages: the smallest complete plugin
// first, then what a plugin can do, one capability at a time — what to write,
// what appears, the rule that bites — then the handles, a short model of how
// the pieces meet, and the reference with each module's signature and
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
            A plugin is one config file and up to five entry points, built by one Vite preset into a
            bundle that the plugin's own service serves. The workbench lists the plugin from the
            config alone and fetches each entry point the first time it is needed.
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
            To see it in the workbench, add{' '}
            <Code>VITE_DEV_SERVICE_PROXY=/services/hello=http://127.0.0.1:8770</Code> to the
            workbench's <Code>.env.local</Code> and restart it. Hello now has a card on Browse, from{' '}
            <Code>launcher</Code>. Typing <Code>/hello</Code> completes it, from{' '}
            <Code>commands</Code>. Running <Code>/hello Alice</Code> loads <Code>commands.ts</Code>,
            and its handler opens the page in <Code>route.tsx</Code> at <Code>/Alice</Code>.
          </p>
        </Part>

        <Part id="model" title="How it works">
          <p className={styles.para}>
            The workbench learns about a plugin from its manifest, and fetches code only when the
            user does something that needs it: opening a tab fetches <Code>route</Code>, running a
            command fetches <Code>commands</Code>. <Code>background</Code> is the exception, fetched
            at startup because it runs on every keystroke.
          </p>
          <p className={styles.para}>
            Plugins never call each other. They communicate through terms — namespaced identifiers
            such as <Code>uniprot:P0AEX9</Code> — which plugins make from what the user types, opens
            and collects, and which every plugin is then asked about. One plugin recognises an
            accession; another offers its page for it.
          </p>
          <p className={styles.para}>
            The cart is the hand-off between plugins and the assistant. An item carries its data,
            not a reference, so it outlives its page and can be read by a plugin that never saw that
            page. Enter sends the whole cart with the text.
          </p>
        </Part>

        <Part id="can" title="What a plugin can do">
          <Section id="can-found" title="Be found">
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
              All of this works before any code loads. <Code>launcher</Code> is the card on Browse.
              Each of <Code>commands</Code> completes in the prompt bar as <Code>/open</Code> and{' '}
              <Code>/compare</Code>, with its arguments checked; the handlers come from{' '}
              <Code>commands.ts</Code> the first time one runs, so each declared name needs one
              there. <Code>shortcuts</Code> are buttons in the sidebar, each a command with its
              arguments filled in. <Code>id</Code> is in every URL and every saved layout, so it
              never changes. A command is registered as <Code>function-junction:open</Code>;{' '}
              <Code>/open</Code> alone works until another plugin declares <Code>open</Code>, and
              then only the full name does.
            </p>
          </Section>

          <Section id="can-pages" title="Have pages">
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
              A tab at <Code>/p/function-junction/P0AEX9</Code> renders this with <Code>path</Code>{' '}
              set to <Code>/P0AEX9</Code>; the query string, if any, comes with it. Picking a result
              in the search calls <Code>navigate</Code>, which moves the same tab to{' '}
              <Code>/P0AEX9</Code> and pushes a history entry, so Back returns to the search.{' '}
              <Code>usePanelTitle</Code> names the tab. <Code>usePanelTerms</Code> puts{' '}
              <Code>uniprot:P0AEX9</Code> in play, which is what fills the Related pane with other
              plugins' offers while this tab is in front. <Code>normalize</Code> makes{' '}
              <Code>/p0aex9?tab=go</Code> and <Code>/P0AEX9</Code> the same page: opening either
              while the other is open focuses the existing tab.
            </p>
          </Section>

          <Section id="can-pane" title="Have a sidebar pane">
            <File
              name="src/pane.tsx"
              language="tsx"
            >{`export default definePane({ ...fromReact(RecentProteins), fit: 'content' });`}</File>
            <p className={styles.para}>
              Providing a pane makes the plugin pinnable from Settings. <Code>fit: 'content'</Code>{' '}
              sizes the block to what it draws; without it the block shares the sidebar's height
              with the others. A pane has no path. It unmounts when its block is folded, and the
              flyout from the collapsed rail is a second mount of it, so anything that must survive
              belongs in a store outside the component.
            </p>
          </Section>

          <Section id="can-react" title="React to what the user types, opens and collects">
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
              Typing <Code>P0AEX9</Code> runs <Code>terms</Code> in every plugin on every keystroke,
              and this one returns <Code>uniprot:P0AEX9</Code>. It is synchronous and does not
              fetch: it recognises the shape and leaves the lookup to the page. The prefix is not
              registered anywhere; it means what the plugins reacting to it do with it.
            </p>
            <p className={styles.para}>
              When typing pauses, <Code>recommend</Code> runs in every plugin with the terms found.
              Here <Code>commands</Code> puts a row under the prompt bar, "Evidence dossier for
              P0AEX9", that runs <Code>/open P0AEX9</Code> when pressed. <Code>cartItems</Code>{' '}
              fetches — this is where fetching belongs, and <Code>signal</Code> aborts if the user
              keeps typing — and each item becomes a row in the Related pane that opens{' '}
              <Code>source.path</Code> or adds the item to the cart. The same question is asked
              about the open page's terms and the cart's, so offers follow what the user is looking
              at as well as what they type; a plugin is never asked about its own page's terms.
            </p>
            <p className={styles.para}>
              In the item, <Code>content</Code> is the data and <Code>context</Code> is what the
              data cannot say for itself — here, the population the verdict was measured over — and
              both are what the assistant reads. <Code>terms</Code> lets other plugins react to the
              item once it is in the cart: a taxonomy plugin sees <Code>taxon:562</Code> and offers
              its page. <Code>id</Code> is built from what the item is, so adding it twice replaces
              rather than duplicates. <Code>status</Code> puts "2 lookups running" in the status
              bar, read at startup and after every command.
            </p>
          </Section>

          <Section id="can-answer" title="Answer free text">
            <File name="src/prompt.ts" language="typescript">{`export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const slug = koros.current() ?? koros.newArc().slug;
    host.openRoute(\`/\${slug}\`);
    await koros.ask(slug, text, attachments);
  },
  destination: { current: () => koros.destination(), subscribe: koros.subscribe },
});`}</File>
            <p className={styles.para}>
              A prompt module lets Settings name the plugin as the assistant. Enter on text that is
              not a slash command calls <Code>handle</Code> with the text and the cart as{' '}
              <Code>attachments</Code>; the cart is emptied at that moment, because the attachments
              belong to that message. The workbench draws nothing for the answer: here{' '}
              <Code>openRoute</Code> opens the conversation's page and <Code>koros.ask</Code> writes
              into it. <Code>destination</Code> is the row above the prompt field, showing where the
              next message will land; the bar reads <Code>current()</Code> and reads it again each
              time the store reports a change.
            </p>
          </Section>
        </Part>

        <Part id="host" title="Talking to the host">
          <File name="src/commands.ts" language="typescript">{`export default defineCommands({
  open: ({ id }, { host }) => host.openRoute(\`/\${id}\`),
  compare: async ({ taxid }, { host }) => {
    if (!host.hasCommand('genknown:taxon')) return host.notify('genKnown is not installed.');
    await host.execute('genknown:taxon', { q: taxid });
  },
});`}</File>
          <p className={styles.para}>
            <Code>host</Code> reaches every handler and every panel; in React,{' '}
            <Code>useHost()</Code>. <Code>openRoute</Code> opens one of this plugin's pages, or
            focuses the tab already showing it. <Code>execute</Code> runs a command — a bare name
            for this plugin's own, <Code>plugin:name</Code> for another's — and{' '}
            <Code>hasCommand</Code> checks that the neighbour is installed first.{' '}
            <Code>notify</Code> shows a toast, for an outcome nothing on screen would show. A
            handler that throws ends in a toast naming the command.
          </p>
          <File
            name="src/Report.tsx"
            language="tsx"
          >{`const item = { id: \`function-junction:protein:\${row.id}\`, kind: 'protein', name: row.name, content: row };
return <CartButton item={item} />;   // or useCart().add(item)`}</File>
          <p className={styles.para}>
            <Code>host.cart</Code>, or <Code>useCart()</Code>, adds items under this plugin's name;{' '}
            <Code>has</Code>, <Code>remove</Code> and <Code>count</Code> see only this plugin's
            items. <Code>CartButton</Code> is the standard Add control, which shows Added once the
            item is in the cart and removes it when pressed again.
          </p>
          <p className={styles.para}>
            <Code>usePanel()</Code> is the tab or block itself: <Code>path</Code>,{' '}
            <Code>focused</Code>, <Code>navigate</Code>, and the setters behind{' '}
            <Code>usePanelTitle</Code>, <Code>usePanelBreadcrumbs</Code> and{' '}
            <Code>usePanelTerms</Code>. A component that throws is replaced within its panel by the
            error and a Try again button; the rest of the workbench keeps working.
          </p>
        </Part>

        <Part id="reference" title="Reference">
          <Entry
            id="r-config"
            name="plugin.config.ts"
            when="Read by the build; served as manifest.json. Parsed by the workbench at startup."
          >
            <Sig>{`interface Manifest {
  id: string;                    // /^[a-z][a-z0-9-]{1,40}$/; in every URL and saved layout
  title: string;
  description?: string;          // under the title on Browse and in Settings
  icon?: string;                 // a name from the host's icon table; an unknown name draws a pin
  color?: string;                // blue | green | teal | purple | orange | red; tints the icon
  commands?: SlashCommand[];     // commands.ts must handle each
  shortcuts?: CommandCall[];     // buttons in the sidebar's Shortcuts block
  launcher?: CommandCall;        // the card on Browse

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
              A <Code>CommandCall</Code> is drawn as a button wherever it appears, disabled while
              its command runs. <Code>contractVersion</Code> is the SDK's; the workbench skips, with
              a console warning, a manifest whose version it does not accept.
            </p>
          </Entry>

          <Entry id="r-vite" name="vite.config.ts" when="Read by the build.">
            <Sig>{`function pluginFederation(options: {
  config: Manifest;              // plugin.config.ts's default export
  background?: string;           // the entry point for each module, exposed under the module's name
  route?: string;
  pane?: string;
  commands?: string;
  prompt?: string;
}): VitePlugin[];`}</Sig>
            <p className={styles.para}>
              <Code>manifest.modules</Code> is the list of names given here; a file not named here
              is not a module, whatever it exports. The output is <Code>manifest.json</Code>,{' '}
              <Code>remoteEntry.js</Code>, <Code>mf-manifest.json</Code> and the chunks. Of the
              workbench's singletons — <Code>react</Code>, <Code>react-dom</Code>, <Code>zod</Code>,{' '}
              <Code>@kbase/plugin-sdk</Code>, <Code>@kbase/design-system</Code>,{' '}
              <Code>@phosphor-icons/react</Code>, <Code>@tanstack/react-router</Code> — the preset
              shares each one the plugin's <Code>package.json</Code> declares: it is left out of the
              bundle and the workbench's copy runs. A second copy of the first five breaks hooks,
              the panel and tooltip contexts, or schema identity.
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
              when="Called synchronously on every keystroke with the text, then once with the pool; and once with the pool whenever the front tab's or the cart's terms change. No I/O."
            >
              <Sig>{`interface Query {
  text?: string;                 // the prompt bar's text; absent on the pool pass and for the tab and cart
  terms?: string[];              // the pool so far; absent on the pass over the text
  signal: AbortSignal;
}`}</Sig>
              <p className={styles.para}>
                What the pool pass returns is added to the pool; nothing is asked about the
                additions. A <Code>terms</Code> that throws contributes nothing that round.
              </p>
            </Export>

            <Export
              id="r-recommend"
              name="recommend"
              when="Called 250 ms after a source last changed, with that source's pool. May fetch; the signal aborts when the source changes again, and a late answer is dropped."
            >
              <Sig>{`interface CartItem {
  id: string;                    // unique across plugins: prefix with the plugin id; the same id added again replaces
  kind: string;                  // protein | taxon | job | …, in this plugin's own words
  name: string;
  subject?: string;              // the identifier the item is about; leads the row and the tile
  summary?: string;              // one line, shown in Related and the cart
  terms?: string[];              // what other plugins' recommend are asked with once the item is in the cart
  source?: { path?: string; href?: string };   // path: where a row opens, in this plugin; href: a link outside
  content?: unknown;             // the payload; must survive JSON
  context?: Record<string, unknown>;           // what content cannot say: units, population, caveats
}`}</Sig>
              <p className={styles.para}>
                <Code>commands</Code> are drawn for the typed text only, four at most across all
                plugins, under the Send row; for the tab and cart pools they are dropped.{' '}
                <Code>cartItems</Code> already in the cart, or dismissed from Related, are not
                drawn. A <Code>recommend</Code> that throws contributes nothing that round.
              </p>
            </Export>

            <Export
              id="r-status"
              name="status"
              when="Called at startup as each background arrives, after any module loads, and after every command; the answer shows until the next call."
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
            when="Fetched the first time a tab of this plugin opens, or openRoute needs normalize. mount is called once per tab."
          >
            <Sig>{`type Mount = (el: HTMLElement, ctx: { panel: PanelHandle; host: PluginHost }) => Cleanup | void;
type Cleanup = () => void;

function defineRoute(r: { mount: Mount; normalize: (path: string) => string }): Route;
function fromReact(Component: ComponentType): { mount: Mount };`}</Sig>
            <p className={styles.para}>
              <Code>navigate</Code> pushes a history entry; <Code>{'{ replace: true }'}</Code>{' '}
              replaces the current one. Moving focus between open tabs replaces, so Back walks
              through what was opened and where it went.
            </p>
          </Entry>

          <Entry
            id="r-pane"
            name="pane.tsx"
            when="Fetched the first time this plugin's pane is shown: pinned, previewed from More, or opened from the collapsed rail. mount is called once per showing."
          >
            <Sig>{`function definePane(p: {
  mount: Mount;
  fit?: 'content';               // the block takes its content's height instead of a share of the sidebar's
}): Pane;`}</Sig>
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
            <p className={styles.para}>
              Args typed in the bar arrive as strings in the declared order, double quotes grouping
              one with spaces; args from a <Code>CommandCall</Code> or <Code>execute</Code> arrive
              as given. A handler that throws ends in a toast titled <Code>/name failed</Code>, or
              in the rejection for an <Code>execute</Code> caller. A handler that opens a page calls{' '}
              <Code>openRoute</Code> before its first <Code>await</Code>, so the tab is on screen
              while the rest runs.
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
            <p className={styles.para}>
              <Code>q.terms</Code> is the pool for the typed text. <Code>q.signal</Code> aborts when
              the bar's Stop is pressed or another Enter arrives first. The function{' '}
              <Code>subscribe</Code> returns is called when Settings names another assistant or the
              bar unmounts; while <Code>current()</Code> returns <Code>null</Code> the row shows the
              plugin's name alone.
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
  setTerms: (terms: string[]) => void;   // what this panel puts in the pool; compared by value
  subscribe: (listener: () => void) => Cleanup;   // path, focus
}

interface Cart {
  add: (item: CartItem) => void; // same id replaces; stamped with this plugin's id
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
              When two tabs in one group share a title, the host tells them apart with the deepest
              crumb that differs, and numbers them only when no crumb does.
            </p>
          </Entry>
        </Part>

        <Part id="deploying" title="Deploying">
          <File name="" language="text">{`/services/<id>/manifest.json     the description
/services/<id>/plugin/…          everything in dist/`}</File>
          <p className={styles.para}>
            The plugin's service serves those two paths under its id, and{' '}
            <Code>GET /plugin-registry/plugins</Code> answers an array of manifests. The workbench
            fetches both from its own origin and loads{' '}
            <Code>/services/&lt;id&gt;/plugin/remoteEntry.js</Code> as an ES module, which is what
            lets <Code>script-src 'self'</Code> cover it. The workbench's own image answers neither
            path; a deployment fronts it with something that answers both, and where nothing does,
            the bundled plugins run alone. In development the Vite server does both from{' '}
            <Code>VITE_DEV_SERVICE_PROXY=&lt;prefix&gt;=&lt;origin&gt;</Code>, comma-separated: it
            proxies each prefix, and answers the registry with each{' '}
            <Code>&lt;prefix&gt;/manifest.json</Code> that responds when asked.
          </p>
        </Part>

        <Part id="errors" title="Troubleshooting">
          <div className={styles.trouble}>
            <Symptom name="The plugin is not on Browse">
              Settings lists every installed plugin, so start there. Not in Settings either:{' '}
              <Code>GET /plugin-registry/plugins</Code> from the workbench's origin either is not
              JSON — the console says nothing answered as a registry — or lacks the manifest, so the
              registry or the dev proxy does not reach the service, or contains it and the console
              says it was skipped, naming the field. In Settings but not on Browse: a card needs a{' '}
              <Code>launcher</Code>, and the Panels list needs a <Code>pane</Code>.
            </Symptom>
            <Symptom name="Invalid hook call, or a context that is always null">
              Two copies of React or of the SDK are running: the bundle carried its own.{' '}
              <Code>mf-manifest.json</Code> in the build output lists what was shared; a package
              missing there was missing from <Code>package.json</Code> when the build ran.
            </Symptom>
            <Symptom name="usePanel() called outside a workbench panel">
              The component rendered outside the tree mounted for the panel — a portal, a test —
              where the context is absent. Read the handle inside the panel and pass it down.
            </Symptom>
            <Symptom name="/hello completes, then a toast says /hello failed">
              Completion reads the manifest, so the declaration is fine; the toast's message says
              which: <Code>vite.config.ts</Code> does not name <Code>commands</Code>; the module has
              no <Code>hello</Code> in it; or the handler threw, and the message is its own.
            </Symptom>
            <Symptom name="A recommendation never appears">
              In order: <Code>background</Code> is not named in <Code>vite.config.ts</Code>; the
              console says it failed to load; the module has no <Code>recommend</Code>; no plugin's{' '}
              <Code>terms</Code> put a matching term in the pool; the answer came after the text
              changed and was dropped; the pool came from this plugin's own front tab; the item is
              already in the cart or was dismissed; it was a command for the tab or cart pool, or
              the fifth for the text; the text began with a slash.
            </Symptom>
            <Symptom name="This panel crashed">
              Either the module failed to load — <Code>exposed nothing at ./route</Code> means the
              file has no default export; another message is the loader's, with the URL — or the
              component threw while rendering. Try again re-renders the component; a module that
              failed to load fails again until the tab is closed and reopened.
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
  {
    id: 'can',
    label: 'What a plugin can do',
    children: [
      { id: 'can-found', label: 'Be found' },
      { id: 'can-pages', label: 'Have pages' },
      { id: 'can-pane', label: 'Have a sidebar pane' },
      { id: 'can-react', label: 'React to the user' },
      { id: 'can-answer', label: 'Answer free text' },
    ],
  },
  { id: 'host', label: 'Talking to the host' },
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

// One capability inside a Part: a heading and its prose.
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className={styles.subhead}>
        {title}
      </h3>
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

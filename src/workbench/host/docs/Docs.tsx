import type { ReactNode } from 'react';
import { CodeBlock } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import styles from './Docs.module.css';

// The plugin contract as it is meant to be: the page is the specification and
// the implementation is measured against it.
//
// Organised by what a plugin can add, the way JupyterLab's common extension
// points and VS Code's capabilities are, because that is the first question a
// plugin author has. Each of those sections stands alone — a paragraph, one
// complete file, the rules the host applies, and the failure that belongs to
// it — so nothing has to be assembled out of three places. The types are
// collected once at the end, without prose, for lookup.

export function DocsDocument() {
  usePanelTitle('Plugin developer documentation');
  return (
    <div className={styles.layout}>
      <Rail />
      <article className={styles.root}>
        <header className={styles.head} id="top">
          <h1 className="h2">Plugin developer documentation</h1>
          <p className={styles.lede}>
            A plugin is a description the workbench reads at startup and a bundle it fetches when
            something needs to render or answer. Everything under <Code>/p/&lt;id&gt;</Code> belongs
            to the plugin, including its query string, and nothing in the contract requires React.
          </p>
        </header>

        <Part id="anatomy" title="Anatomy">
          <File name="" language="text">{`a service you run                        the workbench
──────────────────                       ─────────────
manifest.json  ──────── registry ──────▶  tabs, panes, slash commands, launcher
plugin/remoteEntry.js                     ./terms      at startup, every keystroke
                       ─── fetched ────▶  ./recommend  when a query settles
                                          ./status     at startup
                                          ./plugin     on first render or command
                                          ./prompt     when named the assistant`}</File>

          <p className={styles.para}>
            One capability, one file, one default export of one <Code>define</Code> call, one moment
            it is fetched. <Code>plugin.config.ts</Code> is everything the workbench must know
            before it has any code, and the build turns it into the manifest;{' '}
            <Code>vite.config.ts</Code> names every other file. Nothing but{' '}
            <Code>plugin.config.ts</Code> and <Code>vite.config.ts</Code> is required — a plugin
            that only recognises identifiers ships <Code>terms.ts</Code> and no surfaces at all.
          </p>

          <File
            name="plugin.config.ts"
            language="typescript"
          >{`import { definePluginManifest } from '@kbase/plugin-sdk';

export default definePluginManifest({
  id: 'hello',
  title: 'Hello',
  description: 'The smallest plugin that draws something.',
  icon: 'HandWaving',
  color: 'teal',
  route: true,
  commands: [{ name: 'hello', title: 'Say hello to someone', args: [{ name: 'who' }] }],
  launcher: { label: 'Hello', command: 'hello' },
});`}</File>

          <File name="vite.config.ts" language="typescript">{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginFederation } from '@kbase/plugin-sdk/vite';

export default defineConfig({
  plugins: [
    pluginFederation({
      config: './plugin.config.ts',      // → manifest.json
      plugin: './src/plugin.tsx',        // pages, panes, command handlers
      terms: './src/terms.ts',           // what text and terms mean here
      recommend: './src/recommend.ts',   // commands and cart items worth offering
      status: './src/status.ts',         // a line in the strip at the bottom
      prompt: './src/prompt.ts',         // free text, when Settings names this plugin
    }),
    react(),
  ],
});`}</File>
        </Part>

        <Part id="running" title="Get it running">
          <ol className={styles.steps}>
            <li>
              <code>npm create vite@latest hello -- --template react-ts</code> and{' '}
              <code>npm i @kbase/plugin-sdk</code>.
            </li>
            <li>Write the two config files above and the two sources below.</li>
            <li>
              <code>npm run dev -- --port 8770</code>.
            </li>
            <li>
              Add <code>VITE_DEV_SERVICE_PROXY=/services/hello=http://127.0.0.1:8770</code> to the
              workbench's <code>.env.local</code> and restart its dev server. That is the only
              restart: from then on the plugin appears when its own server is up and disappears when
              it stops.
            </li>
            <li>
              Open the workbench. <em>Hello</em> is on the Browse page, <code>/hello</code> is in
              the prompt bar, and a capitalised word offers to greet it.
            </li>
          </ol>

          <File
            name="src/plugin.tsx"
            language="tsx"
          >{`import { definePlugin, fromReact, usePanel, usePanelTitle } from '@kbase/plugin-sdk';

function Hello() {
  const { path } = usePanel();
  const who = path.slice(1) || 'nobody';
  usePanelTitle(who);
  return <p>Hello, {who}.</p>;
}

export default definePlugin({
  route: { ...fromReact(Hello), normalize: (path) => path.toLowerCase() },
  commands: { hello: ({ who }, { host }) => host.openRoute(\`/\${who ?? ''}\`) },
});`}</File>

          <File
            name="src/terms.ts"
            language="typescript"
          >{`import { defineTerms } from '@kbase/plugin-sdk';

const NAME = /^[A-Z][a-z]+$/;

export default defineTerms(({ text }) => {
  const q = text?.trim() ?? '';
  return NAME.test(q) ? [\`name:\${q}\`] : [];
});`}</File>

          <File
            name="src/recommend.ts"
            language="typescript"
          >{`import { defineRecommend } from '@kbase/plugin-sdk';

export default defineRecommend({
  commands: ({ terms }) =>
    (terms ?? [])
      .flatMap((t) => t.match(/^name:(.+)$/)?.[1] ?? [])
      .map((who) => ({ label: \`Say hello to \${who}\`, command: 'hello', args: { who } })),
});`}</File>
        </Part>

        <Part id="points" title="What a plugin can add">
          <Point id="p-page" name="A page">
            <p className={styles.para}>
              <Code>route: true</Code> claims everything under <Code>/p/&lt;id&gt;</Code>. The
              workbench stores the path and never reads it, so its shape, its query string and any
              router inside the panel are the plugin's.
            </p>
            <File name="src/plugin.tsx" language="tsx">{`function Dossier() {
  const { path, navigate } = usePanel();
  const id = path.slice(1);

  usePanelTitle(id || 'Function Junction');
  usePanelTerms(id ? [\`uniprot:\${id}\`] : []);

  if (!id) return <SearchBox onPick={(picked) => navigate(\`/\${picked}\`)} />;
  return <Report id={id} />;
}

export default definePlugin({
  route: {
    ...fromReact(Dossier),
    // Two spellings of one page. Required beside a route, because without it
    // the workbench compares raw strings and opens both.
    normalize: (path) => path.split('?')[0].split('#')[0].toUpperCase(),
  },
});`}</File>
            <Rules
              items={[
                'One surface serves the empty path and the identified one. navigate() moves this panel rather than opening another, so a search and its result are one tab with a working Back.',
                'A panel keeps its identity while it navigates: the path is what it shows, not which panel it is.',
                'openRoute focuses a panel already showing that path, so a link followed ten times leaves one tab. What "already showing" means is normalize’s answer, not the raw string: /P0AEX9 and /P0AEX9?from=related are one page if the plugin says so.',
                'normalize is required with a route and the type enforces it. It runs whenever a panel of this plugin is open, which is the only time deduplication has anything to compare against, so the module is loaded by then.',
                'The focused panel’s path is the browser URL. The rest of the layout is not addressable.',
              ]}
            />
          </Point>

          <Point id="p-pane" name="A sidebar pane">
            <p className={styles.para}>
              <Code>pane</Code> in the config declares one. It takes a share of the sidebar's
              height; <Code>fit: 'content'</Code> holds it at its natural height instead, which
              suits a row of buttons and starves whatever sits under a long list.
            </p>
            <File name="src/plugin.tsx" language="tsx">{`export default definePlugin({
  route: fromReact(Dossier),
  pane: fromReact(RecentProteins),
});`}</File>
            <Rules
              items={[
                'A pane has no path and no address; it is the same PanelHandle otherwise, and setTitle names its block.',
                'Panes render for as long as they are pinned, so anything expensive belongs behind an interaction.',
              ]}
            />
          </Point>

          <Point id="p-commands" name="Slash commands">
            <p className={styles.para}>
              A command declared in the config is what a user can type, what a toolbar button runs,
              and what any other plugin can call. The handlers live in the module and receive the
              parsed values.
            </p>
            <File name="src/plugin.tsx" language="tsx">{`commands: {
  open: ({ id }, { host }) => host.openRoute(\`/\${id}\`),

  compare: async ({ taxid }, { host }) => {
    if (!host.hasCommand('genknown:taxon')) return host.notify('genKnown is not installed.');
    await host.execute('genknown:taxon', { q: taxid });
  },
}`}</File>
            <Rules
              items={[
                'Commands live in one registry under plugin:name and any plugin may run any of them, so a name is public: renaming one breaks whoever calls it.',
                'hasCommand is the compatibility story — a plugin whose neighbour is absent degrades to a sentence rather than an exception.',
                'Running a command changes no focus. A handler that should land the reader somewhere calls openRoute, and calls it before awaiting, so the page shows its own loading state while the work runs.',
                'A handler is given no panel, so a command that acts on a page takes the path as an argument. That is what lets any caller run it without it meaning something different depending on what they were looking at.',
                'A command either changes what is on screen or says something. The host shows the invoking control busy until the handler settles and raises a toast if it rejects; anything else is host.notify.',
                'Commands answer nothing. What one plugin knows reaches another as terms and answers.',
              ]}
            />
          </Point>

          <Point id="p-terms" name="Recognising text">
            <p className={styles.para}>
              The workbench does not read what a user types. It puts the text to every plugin's{' '}
              <Code>terms</Code>, pools what comes back with the terms already in play, and hands
              the result to every plugin's <Code>recommend</Code> — so recognising something and
              knowing what to do with it need not be the same plugin.
            </p>
            <File
              name="src/terms.ts"
              language="typescript"
            >{`import { defineTerms } from '@kbase/plugin-sdk';

const ACCESSION = /^[A-NR-Z][0-9][A-Z0-9]{3}[0-9]$/i;

export default defineTerms(({ text, terms }) => {
  const q = text?.trim().toUpperCase() ?? '';
  return ACCESSION.test(q) ? [\`uniprot:\${q}\`] : [];
});`}</File>
            <Rules
              items={[
                'Fetched at startup and called on every keystroke, so it is synchronous and does no I/O. Recognising a shape is all it may do; a lookup belongs in the page it opens.',
                'It answers about terms as well as text, which is how a taxon expands into its genomes without anything being typed.',
                'An empty array is the normal answer, and an expression narrow enough to be wrong rarely is the whole trick: a plugin that answers for any text appears for every keystroke in the workbench.',
                'If nothing ever comes of a term, it is probably spelled differently from the plugin that reads it — ncbi:562 against taxon:562 is silence and no error, which is the price of terms having no registry.',
              ]}
            />
          </Point>

          <Point id="p-recommend" name="Recommendations">
            <p className={styles.para}>
              Given terms, what is worth doing and what is worth keeping. This is where the prompt
              bar's suggestions and the Related pane's rows come from, and unlike <Code>terms</Code>{' '}
              it runs once a query settles, so it may fetch.
            </p>
            <File
              name="src/recommend.ts"
              language="typescript"
            >{`import { defineRecommend } from '@kbase/plugin-sdk';

const idsIn = (terms) => (terms ?? []).flatMap((t) => t.match(/^uniprot:(.+)$/)?.[1] ?? []);

export default defineRecommend({
  commands: ({ terms }) =>
    idsIn(terms).map((id) => ({
      label: \`Evidence dossier for \${id}\`,
      command: 'open',
      args: { id },
    })),

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
      context: { measuredOver: row.population, crosswalk: row.reach },
    }));
  },
});`}</File>
            <Rules
              items={[
                'Both may be asynchronous, and the signal is aborted as soon as the reader moves on.',
                'A recommended command is a call to a slash command, so a suggestion names something the user could have typed and a toolbar button is the same object.',
                'An item carrying only source makes every consumer re-fetch and is worthless while that service is down; one carrying only content leaves no route back to where it came from.',
                'context is what a reader of content cannot infer: units, the population a number was measured over, the caveats printed beside it. An assistant without it can quote a number and cannot qualify it.',
                'The terms on an item are what make it worth collecting; an item without them is inert.',
                'A plugin is not asked about the page it is already showing, and the host drops a recommendation whose path is open or whose item is already in the cart.',
                'If a recommendation never appears: the module is not named in the build config, or nobody produced the term it reads.',
              ]}
            />
          </Point>

          <Point id="p-cart" name="Putting things in the cart">
            <p className={styles.para}>
              The cart is the workbench's, which is what lets an item from one plugin be read by
              another and by an assistant. A page adds to it directly; a recommendation offers an
              item for something the reader has not opened.
            </p>
            <File name="src/plugin.tsx" language="tsx">{`const { cart } = useHost();

<CartButton item={{ id, kind: 'protein', name, subject: id, terms, source: { path } }} />;

// or, without React
host.cart.add(item);
host.cart.has(id);
host.cart.subscribe(redraw);`}</File>
            <Rules
              items={[
                'A plugin can test its own ids with has(); other plugins’ items are unreadable, except in the assistant’s attachments.',
                'Adding the same id twice replaces rather than duplicates, so re-adding refreshes a payload.',
                'The host persists the cart, so content must survive JSON.',
              ]}
            />
          </Point>

          <Point id="p-assistant" name="The assistant">
            <p className={styles.para}>
              A <Code>prompt</Code> module offers the plugin in Settings as the receiver of free
              text — what was neither a slash command nor a suggestion taken. The workbench reads
              the bundle's own manifest to see the module exists, so nothing declares the capability
              twice.
            </p>
            <File
              name="src/plugin.tsx"
              language="tsx"
            >{`prompt: async ({ text, terms }, { host, attachments }) => {
  const slug = current() ?? newArc().slug;
  host.openRoute(\`/\${slug}\`);          // before awaiting: the page shows the work
  await ask(slug, text, attachments);
},`}</File>
            <Rules
              items={[
                'It takes the same Query as the answer functions, so an assistant sees the terms in play as well as the words.',
                'attachments is the cart as it stood when enter was pressed, not as it is when the promise resolves. It is the one place a plugin sees another plugin’s items, and the user put them there deliberately.',
                'The handler owns what happens next: opening its own page, streaming into it, or answering without a panel.',
              ]}
            />
          </Point>

          <Point id="p-status" name="The status strip">
            <p className={styles.para}>
              The strip along the bottom of the window. Every loaded plugin may contribute a line.
            </p>
            <File
              name="src/plugin.tsx"
              language="tsx"
            >{`status: () => (running() > 0 ? [{ text: \`\${running()} running\` }] : []),`}</File>
            <Rules
              items={[
                'Called on the loaded module only: a plugin nobody has opened contributes nothing.',
                'An item may carry a CommandCall, which the strip runs when the line is pressed.',
              ]}
            />
          </Point>
        </Part>

        <Part id="types" title="Types">
          <Sig>{`// plugin.config.ts
interface Manifest {
  id: string;                       // /^[a-z][a-z0-9-]{1,40}$/ — in URLs and saved layouts
  title: string;
  description?: string;
  contractVersion: number;          // written by the build
  icon?: string;                    // a name from the host's icon table
  color?: string;                   // blue | green | teal | purple | orange | red
  route?: true;
  pane?: { fit?: 'content' };
  commands?: SlashCommand[];
  shortcuts?: CommandCall[];        // buttons in the sidebar toolbar
  launcher?: CommandCall;           // listed on the Browse page
}

interface SlashCommand {
  name: string;                     // /^[a-z][a-z0-9-]*$/
  title: string;
  description?: string;
  args?: { name: string; description?: string; required?: boolean }[];
  icon?: string;
}

interface CommandCall {
  label: string;
  command: string;                  // "plugin:name"; bare means this plugin's own
  args?: Record<string, string | number>;
}`}</Sig>

          <Sig>{`// src/plugin.tsx
interface PluginModule {
  route?: { mount: Mount; normalize: (path: string) => string };
  pane?: { mount: Mount };
  commands?: Record<string, (values: CommandValues, ctx: CommandContext) => void | Promise<void>>;
}

type Cleanup = () => void;
type Mount = (el: HTMLElement, ctx: { panel: PanelHandle; host: PluginHost }) => Cleanup | void;

interface CommandContext { host: PluginHost; caller: string }   // a plugin id, or 'user'

function definePlugin(module: PluginModule): PluginModule;
function fromReact(Component: ComponentType): { mount: Mount };`}</Sig>

          <Sig>{`// one query, asked of the two modules that answer it
interface Query {
  text?: string;
  terms?: string[];
  signal: AbortSignal;
}

// src/terms.ts — synchronous, every keystroke
function defineTerms(fn: (q: Query) => string[]): Terms;

// src/recommend.ts — on settle, may fetch
function defineRecommend(r: {
  commands?: (q: Query) => CommandCall[] | Promise<CommandCall[]>;
  cartItems?: (q: Query) => CartItem[] | Promise<CartItem[]>;
}): Recommend;

// src/status.ts — at startup
function defineStatus(fn: () => StatusItem[]): Status;

// src/prompt.ts — when Settings names this plugin
function definePrompt(
  fn: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>,
): Prompt;`}</Sig>

          <Sig>{`// handed to a surface, a command and the assistant
interface PluginHost {
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;
  execute: (command: string, args?: Record<string, string | number>) => Promise<void>;
  hasCommand: (command: string) => boolean;
  notify: (text: string) => void;
  cart: Cart;
}

interface PanelHandle {
  id: string;
  plugin: string;
  kind: 'pane' | 'route';
  path: string;
  focused: boolean;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setTitle: (title: string) => void;
  setCrumbs: (crumbs: Crumb[]) => void;
  setTerms: (terms: string[]) => void;
  subscribe: (listener: () => void) => Cleanup;
}

interface CartItem {
  id: string;
  kind: string;
  name: string;
  subject?: string;
  summary?: string;
  terms?: string[];
  source?: { path?: string; href?: string };
  content?: unknown;
  context?: Record<string, unknown>;
}

interface Cart {
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  count: () => number;
  subscribe: (listener: () => void) => Cleanup;
}

// React wrappers over the same handles: usePanel, usePanelTitle,
// usePanelBreadcrumbs, usePanelTerms, useHost, useCart, CartButton.`}</Sig>
        </Part>

        <Part id="deploying" title="Deploying">
          <p className={styles.para}>
            The build emits <Code>manifest.json</Code>, <Code>remoteEntry.js</Code>, a Module
            Federation manifest listing what the bundle exposes, and the assets. The plugin's
            service serves them at two paths, and those two paths are the whole deployment contract.
          </p>
          <File
            name="served by the plugin"
            language="text"
          >{`/services/hello/manifest.json      the description, at the prefix root
/services/hello/plugin/…           everything the build emitted`}</File>
          <p className={styles.para}>
            The workbench asks its registry for <Code>GET /plugin-registry/plugins</Code> and
            expects an array of manifests, then fetches each bundle from that plugin's own prefix.
            In a container <Code>REGISTRY_UPSTREAM</Code> points <Code>/plugin-registry/</Code> at a
            registry service; without it the shell runs with only its own plugins.
          </p>

          <h3 className={styles.subhead}>Shared code</h3>
          <p className={styles.para}>
            The preset declares what the workbench already ships, so a plugin bundles none of it and
            names no versions — Module Federation reads those from the plugin's own dependencies,
            and <Code>singleton</Code> is what makes the host's copy win.
          </p>
          <File
            name="declared by pluginFederation()"
            language="text"
          >{`react, react-dom            two copies break hooks
@kbase/plugin-sdk           a second copy is a second panel context
@kbase/design-system        its components carry React context
zod                         schema identity
@phosphor-icons/react       shipped by the host; every plugin draws from it
@tanstack/react-router      shipped by the host; a plugin may run one in its panel`}</File>

          <h3 className={styles.subhead}>Failures that belong to no one extension point</h3>
          <div className={styles.trouble}>
            <Symptom name="The plugin is missing entirely">
              Its manifest failed to parse — the console names the field — or the registry never
              returned it. Fetch <Code>/plugin-registry/plugins</Code> from the workbench's own
              origin and look for the id.
            </Symptom>
            <Symptom name="Invalid hook call, or a context that is always null">
              Two copies of React, or of the SDK. The Module Federation manifest in the plugin's
              output lists what it actually shared.
            </Symptom>
            <Symptom name="usePanel() called outside a workbench panel">
              Something other than a mounted surface is rendering the component — a portal, a
              toolbar, a test. The handle comes from the surface the host mounted, so anything drawn
              outside it has to be passed what it needs.
            </Symptom>
          </div>
        </Part>

        <Part id="notes" title="Design notes">
          <Note title="Why a surface is a mount function">
            A contract typed <Code>ComponentType</Code> makes React a property of the platform
            rather than a choice of the plugin. A mount function is the smallest thing every UI
            framework can produce, and the React wrapper sits in a few dozen lines above it.
          </Note>
          <Note title="Why three answers over one query">
            A plugin is asked three separable things, and one query answers all of them whether it
            arrived as typed text or as terms from a panel. Splitting by answer rather than by
            surface is what lets one plugin recognise something and another know what to do with it.
          </Note>
          <Note title="Why a suggestion is a call">
            A call is something a user could have typed, so a suggestion teaches the command behind
            it, a toolbar button is the same object as a suggestion, and either survives being
            written into history or into a message to an assistant. A closure survives none of that.
          </Note>
          <Note title="Why terms have no registry">
            A registry of prefixes would make the host the arbiter of what plugins may discuss, and
            every new vocabulary a host release. The cost is that two plugins spelling one idea
            differently produce an empty pane and no error.
          </Note>
          <Note title="Why the build writes the manifest">
            By hand it is a third copy of the plugin id, a version number someone bumps, and a list
            of module names the bundler already knows. Generated from a typed config it is checked
            by the schema the host parses with, and the failure lands on the person who can fix it.
          </Note>
        </Part>
      </article>
    </div>
  );
}

const SECTIONS: { id: string; label: string; children?: { id: string; label: string }[] }[] = [
  { id: 'anatomy', label: 'Anatomy' },
  { id: 'running', label: 'Get it running' },
  {
    id: 'points',
    label: 'What a plugin can add',
    children: [
      { id: 'p-page', label: 'A page' },
      { id: 'p-pane', label: 'A sidebar pane' },
      { id: 'p-commands', label: 'Slash commands' },
      { id: 'p-terms', label: 'Recognising text' },
      { id: 'p-recommend', label: 'Recommendations' },
      { id: 'p-cart', label: 'The cart' },
      { id: 'p-assistant', label: 'The assistant' },
      { id: 'p-status', label: 'The status strip' },
    ],
  },
  { id: 'types', label: 'Types' },
  { id: 'deploying', label: 'Deploying' },
  { id: 'notes', label: 'Design notes' },
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

// One thing a plugin can add: what it is, the smallest complete example, the
// rules the host applies, and the failure that belongs here rather than in a
// list of every failure at the end.
function Point({ id, name, children }: { id: string; name: string; children: ReactNode }) {
  return (
    <section className={styles.entry} id={id} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className={styles.entryName}>
        {name}
      </h3>
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

function Rules({ items }: { items: string[] }) {
  return (
    <ul className={styles.behaviour}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
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

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.noteBlock}>
      <h3 className={styles.noteTitle}>{title}</h3>
      <p className={styles.para}>{children}</p>
    </section>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className={styles.inline}>{children}</code>;
}

import type { ReactNode } from 'react';
import { CodeBlock } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import styles from './Docs.module.css';

// The plugin contract as it is meant to be. The page is the specification and
// the implementation is measured against it, so it describes surfaces that are
// mount functions, panes and routes rather than navigators and documents, one
// `./answers` module in place of the matcher and the related module, commands
// in one registry under `plugin:name`, and a manifest the build writes.
//
// Three parts, in the order the work happens: build one, ship it, look things
// up. Types carry what types carry; the prose beside a signature says only
// when the host calls it, what it does with the answer, and how it fails.

export function DocsDocument() {
  usePanelTitle('Plugin developer documentation');
  return (
    <div className={styles.layout}>
      <Rail />
      <article className={styles.root}>
        <header className={styles.head} id="top">
          <h1 className="h2">Plugin developer documentation</h1>
          <p className={styles.lede}>
            A plugin is a description and a bundle. The workbench reads descriptions at startup and
            draws tabs, sidebar panes, slash commands and launcher entries from them; it fetches a
            bundle the first time something needs to render or answer. Everything under{' '}
            <Code>/p/&lt;id&gt;</Code> belongs to the plugin, and nothing in the contract requires
            React.
          </p>
        </header>

        <Part id="build" title="Build one">
          <p className={styles.para}>
            Four files, producing a page under <Code>/p/hello/</Code>, a slash command{' '}
            <Code>/hello</Code>, and a suggestion in the prompt bar whenever the text looks like a
            name.
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
  route: { opensEmpty: true },
  commands: [
    { name: 'hello', title: 'Say hello to someone', args: [{ name: 'who', required: true }] },
  ],
});`}</File>
          <p className={styles.para}>
            Everything the workbench needs before it has any of the plugin's code: what to call it,
            what to draw, what a user can type.
          </p>

          <File name="vite.config.ts" language="typescript">{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginFederation } from '@kbase/plugin-sdk/vite';

export default defineConfig({
  plugins: [
    pluginFederation({
      config: './plugin.config.ts',
      plugin: './src/plugin.tsx',
      answers: './src/answers.ts',
    }),
    react(),
  ],
});`}</File>

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
  route: fromReact(Hello),
  commands: { hello: ({ who }, { host }) => host.openRoute(\`/\${who}\`) },
});`}</File>
          <p className={styles.para}>
            A surface is a function that draws into an element, and <Code>fromReact()</Code> wraps a
            component as one. The command is how the page gets opened — typed, suggested, or run by
            another plugin.
          </p>

          <File
            name="src/answers.ts"
            language="typescript"
          >{`import type { CommandCall, Query } from '@kbase/plugin-sdk';

const NAME = /^[A-Z][a-z]+$/;

export function terms({ text }: Query): string[] {
  const q = text?.trim() ?? '';
  return NAME.test(q) ? [\`name:\${q}\`] : [];
}

export function commands({ text, terms }: Query): CommandCall[] {
  const typed = text?.trim() ?? '';
  const names = [
    ...(NAME.test(typed) ? [typed] : []),
    ...(terms ?? []).flatMap((t) => t.match(/^name:(.+)$/)?.[1] ?? []),
  ];
  return names.map((who) => ({ label: \`Say hello to \${who}\`, command: 'hello', args: { who } }));
}`}</File>
          <p className={styles.para}>
            Answers are how a plugin volunteers. This one greets a capitalised word — including one
            some other plugin recognised, because terms from every plugin come back round in the
            same query.
          </p>
        </Part>

        <Part id="ship" title="Ship it">
          <p className={styles.para}>
            The build emits <Code>manifest.json</Code> from the config, <Code>remoteEntry.js</Code>,
            a Module Federation manifest listing what the bundle exposes, and the assets. Each
            source file is named in the config rather than found at a fixed location; the exposed
            names are the host's to know. The plugin's own service serves the output at two paths,
            and those two paths are the whole deployment contract.
          </p>

          <File
            name="served by the plugin"
            language="text"
          >{`/services/hello/manifest.json      the description, at the prefix root
/services/hello/plugin/…           everything the build emitted`}</File>

          <p className={styles.para}>
            The workbench asks its registry for <Code>GET /plugin-registry/plugins</Code> and
            expects an array of manifests, then fetches each bundle from that plugin's own prefix.
            The prefix locates both, so no path is configured twice.
          </p>

          <h3 className={styles.subhead}>Shared code</h3>
          <p className={styles.para}>
            The preset declares what the host already ships, so a plugin bundles none of it and
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
          <p className={styles.para}>
            The first four break at runtime when duplicated. The last two are correctness-neutral
            and shared because the alternative is every plugin shipping a second copy of an icon set
            the host already sent.
          </p>

          <h3 className={styles.subhead}>In development</h3>
          <p className={styles.para}>
            The workbench's dev server stands in for the registry. Each entry in{' '}
            <Code>VITE_DEV_SERVICE_PROXY</Code> is a prefix and an origin; the middleware proxies
            the prefix and asks it for its manifest on every registry request, so a plugin appears
            by starting its backend and disappears by stopping it, with no dev-server restart in the
            loop.
          </p>
          <File
            name=".env.local"
            language="text"
          >{`VITE_DEV_SERVICE_PROXY=/services/hello=http://127.0.0.1:8770`}</File>

          <h3 className={styles.subhead}>In a deployment</h3>
          <p className={styles.para}>
            nginx renders the workbench's registry route when the container starts:{' '}
            <Code>REGISTRY_UPSTREAM</Code> makes <Code>/plugin-registry/</Code> proxy to a service
            publishing the manifest array, and without it the shell runs with only its own plugins.
            Installing a plugin is making its service reachable at a prefix and having that registry
            list it.
          </p>
        </Part>

        <Part id="reference" title="Reference">
          <Entry id="manifest" name="Manifest" source="plugins/sdk/contract.ts">
            <Sig>{`interface Manifest {
  id: string;                       // /^[a-z][a-z0-9-]{1,40}$/
  title: string;
  description?: string;
  contractVersion: number;          // written by the build
  icon?: string;                    // a name from the host's icon table
  color?: string;                   // blue | green | teal | purple | orange | red
  pane?: { fit?: 'content' };
  route?: { opensEmpty?: boolean };
  commands?: SlashCommand[];
  shortcuts?: CommandCall[];
  promptHandler?: boolean;
}

function definePluginManifest(m: Omit<Manifest, 'contractVersion'>): Manifest;`}</Sig>
            <Behaviour
              items={[
                'The id appears in panel URLs and in every saved layout; changing it strands both.',
                'A manifest that fails to parse is dropped with a console error naming the field. The other plugins load.',
                'The pane key declares a sidebar surface. fit: "content" holds it at its natural height instead of giving it a share of the stack — right for a toolbar, starvation for the blocks beneath a long list.',
                'opensEmpty marks a plugin whose root path renders something, which is the condition for the launcher offering it: without it, nothing can be opened until a link supplies a path.',
                'shortcuts are the buttons in the sidebar toolbar. promptHandler offers the plugin in Settings as the receiver of free text.',
                'The host reads every contract version it has published and upgrades an older manifest as it loads it, so a plugin written once keeps working and the compatibility code lives in one repository.',
              ]}
            />
          </Entry>

          <Entry id="commands" name="SlashCommand, CommandCall" source="plugins/sdk/contract.ts">
            <Sig>{`interface SlashCommand {
  name: string;                     // /^[a-z][a-z0-9-]*$/ — typed as "/hello"
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
            <Behaviour
              items={[
                'Every command lives in one host-wide registry under plugin:name, and any plugin may run any of them. A command name is public: renaming one breaks whoever calls it, exactly as renaming a plugin id would.',
                'There is no catalogue to enumerate. A caller names the id it wants and asks hasCommand() first, so a plugin whose neighbour is absent degrades rather than fails.',
                'Arguments are declared because the prompt bar parses a typed line before the plugin exists, and required is what tells "press enter" from "still needs a value". They carry no type and no list of choices: the command validates its own values, and it is loaded by the time it runs.',
                'A call is what commands() returns, what a shortcut is, and what a menu item will be — one object for every placement, and a user can see the command behind any of them.',
              ]}
            />
          </Entry>

          <Entry id="surface" name="Mount, fromReact()" source="plugins/sdk/plugin.ts">
            <Sig>{`type Cleanup = () => void;
type Mount = (el: HTMLElement, ctx: { panel: PanelHandle; host: PluginHost }) => Cleanup | void;

function fromReact(Component: ComponentType): { mount: Mount };`}</Sig>
            <Behaviour
              items={[
                'Called once with an empty element the plugin owns; the function it returns runs when the panel closes.',
                'Once per panel, not once per navigation — a new path arrives through ctx.panel and its subscription.',
                'fromReact(Component) renders the component with the panel and host contexts provided, so the hooks work inside it. A plugin in any other framework writes { mount } itself and imports nothing but types.',
                'A surface that throws while mounting is fenced: the panel shows the error and the rest of the workbench keeps working.',
              ]}
            />
          </Entry>

          <Entry id="module" name="PluginModule" source="plugins/sdk/plugin.ts">
            <Sig>{`interface PluginModule {
  route?: { mount: Mount };
  pane?: { mount: Mount };
  commands?: Record<string, (values: CommandValues, ctx: CommandContext) => void | Promise<void>>;
  prompt?: (q: Query, ctx: PromptContext) => Promise<void>;
  status?: () => StatusItem[];
}

interface CommandContext { host: PluginHost; caller: string }   // a plugin id, or 'user'
interface PromptContext { host: PluginHost; attachments: readonly CartItem[] }

function definePlugin(module: PluginModule): PluginModule;`}</Sig>
            <Behaviour
              items={[
                'definePlugin() types the export and returns it unchanged.',
                'The host compares the module against the manifest and logs a mismatch rather than throwing: one wrong declaration costs that surface, not the session.',
                'caller lets a command tell a keystroke from another plugin acting for the user. Commands answer nothing; what one plugin knows reaches another through terms and answers.',
                'prompt receives free text — neither a slash command nor a suggestion taken — and only in the plugin Settings names. attachments is the cart as it stood when enter was pressed: the one place a plugin sees another plugin’s items, and the user put them there deliberately.',
                'status contributes to the strip along the bottom of the window. "1 running" is a plugin saying so.',
              ]}
            />
          </Entry>

          <Entry id="panel" name="PanelHandle" source="plugins/sdk/panel.ts">
            <Sig>{`interface PanelHandle {
  id: string;
  plugin: string;
  kind: 'pane' | 'route';
  path: string;                     // below /p/<id>; the plugin's own shape
  focused: boolean;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setTitle: (title: string) => void;
  setCrumbs: (crumbs: Crumb[]) => void;
  setTerms: (terms: string[]) => void;
  subscribe: (listener: () => void) => Cleanup;
}

// React wrappers over the same handle.
function usePanel(): PanelHandle;
function usePanelTitle(title: string): void;
function usePanelBreadcrumbs(crumbs: Crumb[]): void;
function usePanelTerms(terms: string[]): void;`}</Sig>
            <Behaviour
              items={[
                'A panel keeps its identity while it navigates, the way a browser tab does: the path is what it shows, not which panel it is.',
                'A plugin may run its own router inside its panel — TanStack, or anything — reading path and writing navigate(). The host stores the string and parses none of it, including its query, so typed and validated params are the plugin’s to have and not the host’s to define.',
                'The focused panel’s path is the browser URL, /p/<plugin><path>. The rest of the layout is not addressable.',
                'Until setTitle is called the host shows the plugin title and the path; setCrumbs also tells two same-titled tabs apart.',
                'setTerms is how a panel says what it is about, and the host puts those terms to every other plugin’s answers.',
                'usePanel() throws outside a panel. The setters never throw and never no-op in silence.',
              ]}
            />
          </Entry>

          <Entry id="answers" name="Query, answers" source="plugins/sdk/answers.ts">
            <Sig>{`interface Query {
  text?: string;                    // the prompt bar, as typed
  terms?: string[];                 // from the focused panel, the cart, or another plugin
  signal: AbortSignal;
}

// ./answers exports any of these by name.
function terms(q: Query): string[] | Promise<string[]>;
function commands(q: Query): CommandCall[] | Promise<CommandCall[]>;
function cartItems(q: Query): CartItem[] | Promise<CartItem[]>;
function normalize(path: string): string;`}</Sig>
            <Behaviour
              items={[
                'Three separable questions over one query: what is this, what can be done with it, what is worth keeping.',
                'The host calls terms() first, pools every plugin’s answer with the terms it already had, and passes the result to commands() and cartItems() — so recognising something is not the same plugin’s job as knowing what to do with it.',
                'Every call carries a signal and may be asynchronous; the prompt bar debounces and aborts.',
                'An empty array is the normal answer, and a plugin is not asked about the page it is already showing.',
                'Cart terms arrive newest first and answers are shown in the order returned, so a plugin that truncates its own list discards the answer to what was just added.',
                'A call that throws or rejects is logged with the plugin id and the query, and that plugin is skipped for the round.',
                'normalize(path) reduces a path to the page it names, and the host opens and deduplicates on the result: /P0AEX9?from=related and /P0AEX9 are one tab if the plugin says so, two if it stays silent. It runs before any of the plugin’s UI exists, so an unparseable path comes back unchanged rather than throwing.',
              ]}
            />
          </Entry>

          <Entry id="cart" name="CartItem, Cart" source="plugins/sdk/cart.ts">
            <Sig>{`interface CartItem {
  id: string;                       // stable; a second add under it replaces the first
  kind: string;                     // the plugin's own word: protein, genome, table
  name: string;
  subject?: string;                 // what it is about, where that differs from the item
  summary?: string;
  terms?: string[];
  source?: { path?: string; href?: string };
  content?: unknown;                // the data, as JSON
  context?: Record<string, unknown>;
}

interface Cart {
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  count: () => number;
  subscribe: (listener: () => void) => Cleanup;
}

// React wrappers over host.cart.
function useCart(): Cart;
function CartButton(props: { item: CartItem; tooltip?: string }): JSX.Element;`}</Sig>
            <Behaviour
              items={[
                'context is what a reader of content cannot infer from it: units, the population a number was measured over, the route the evidence took, the caveats printed beside it. An assistant given content without context can quote a number and cannot qualify it.',
                'An item holding only source makes every consumer re-fetch and is worthless while that service is down; an item holding only content leaves no route back to where it came from.',
                'A plugin can test its own ids with has(). Other plugins’ items are unreadable, except in a prompt handler’s attachments.',
                'The host persists the cart, so content must survive JSON.',
                'host.cart is a plain object, reachable from a command, a mount function or a prompt handler. useCart() and CartButton add nothing to the contract.',
              ]}
            />
          </Entry>

          <Entry id="host" name="PluginHost" source="plugins/sdk/host.ts">
            <Sig>{`interface PluginHost {
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;
  execute: (command: string, args?: Record<string, string | number>) => Promise<void>;
  hasCommand: (command: string) => boolean;
  cart: Cart;
}

function useHost(): PluginHost;`}</Sig>
            <Behaviour
              items={[
                'openRoute focuses a panel of this plugin already showing that path, so a link followed ten times leaves one tab; duplicate: true asks for a second view instead.',
                'execute runs a command by plugin:name, this plugin’s or another’s, and resolves when the handler does.',
                'A plugin cannot open another plugin’s pages, read the layout, or read another plugin’s cart items. Plugins meet through terms, answers and commands, so neither imports the other and either can be uninstalled.',
              ]}
            />
          </Entry>
        </Part>

        <Part id="notes" title="Design notes">
          <Note title="Why a surface is a mount function">
            A contract typed <Code>ComponentType</Code> makes React a property of the platform
            rather than a choice of the plugin. A mount function is the smallest thing every UI
            framework can produce, and the React wrapper sits in a few dozen lines above it. The
            cost is one call in every React plugin, which is the common case.
          </Note>
          <Note title="Why three answers over one query">
            A plugin is asked three separable things, and one query answers all of them whether it
            arrived as typed text or as terms from a panel. Splitting by answer rather than by
            surface is what lets one plugin recognise something and another know what to do with it.
          </Note>
          <Note title="Why a recommendation is a call">
            A call is something a user could have typed, so a suggestion teaches the command behind
            it, a toolbar button is the same object as a suggestion, and either survives being
            written into history or into a message to an assistant. A closure survives none of that.
          </Note>
          <Note title="Why the host asks a plugin to normalize">
            Opening a page that is already open focuses the tab holding it, which is what stops a
            link followed ten times from leaving ten tabs. That check compares paths and the host
            does not read paths, so it asks the one thing that knows which parts of a path are
            decoration.
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
  { id: 'build', label: 'Build one' },
  { id: 'ship', label: 'Ship it' },
  {
    id: 'reference',
    label: 'Reference',
    children: [
      { id: 'manifest', label: 'Manifest' },
      { id: 'commands', label: 'SlashCommand, CommandCall' },
      { id: 'surface', label: 'Mount, fromReact()' },
      { id: 'module', label: 'PluginModule' },
      { id: 'panel', label: 'PanelHandle' },
      { id: 'answers', label: 'Query, answers' },
      { id: 'cart', label: 'CartItem, Cart' },
      { id: 'host', label: 'PluginHost' },
    ],
  },
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

function Entry({
  id,
  name,
  source,
  children,
}: {
  id: string;
  name: string;
  source: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.entry} id={id} aria-labelledby={`${id}-h`}>
      <header className={styles.entryHead}>
        <h3 id={`${id}-h`} className={styles.entryName}>
          {name}
        </h3>
        <code className={styles.source}>{source}</code>
      </header>
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
      <figcaption className={styles.fileName}>{name}</figcaption>
      <CodeBlock collapsible={false} language={language} code={children} />
    </figure>
  );
}

// What the host does that a signature cannot state: when it calls, what it
// does with the answer, and how it fails.
function Behaviour({ items }: { items: string[] }) {
  return (
    <ul className={styles.behaviour}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
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

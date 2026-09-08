import type { ReactNode } from 'react';
import { CodeBlock, Table, Tbody, Td, Th, Thead, Tr } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import styles from './Docs.module.css';

// The plugin contract as it is meant to be, written before it is built: this
// page is the specification, and the implementation is measured against it.
//
// What differs from what ships today, each of them work to do: a surface is a
// mount function with React as a wrapper, rather than a React component
// outright; `navigator` and `document` are `pane` and `route`; the manifest
// says nothing about where the code is, because the service prefix locates it;
// `match` and `related` are one `./answers` module of three independent
// functions over one query; commands live in one registry under
// `plugin:name` and any plugin may run any of them; the build writes the
// manifest from a typed config; a panel shows a plugin at a path and
// the host never parses that path, so params leave the contract entirely;
// panel identity is an opaque id rather than the params, which is what lets a
// plugin navigate inside its own panel; a plugin's federation config names no
// versions.
//
// Three parts in the order a reader needs them: a plugin to copy, the types it
// was built from, then the tasks that come after the first one works. Rationale
// lives in design notes at the end, because a reason inside a field table is
// what makes reference material unreadable.

export function DocsDocument() {
  usePanelTitle('Plugin developer documentation');
  return (
    <div className={styles.layout}>
      <Rail />
      <article className={styles.root}>
        <header className={styles.head} id="top">
          <h1 className="h2">Plugin developer documentation</h1>
          <p className={styles.lede}>
            A plugin is a JSON manifest and a Module Federation remote. The host reads manifests at
            startup and draws tabs, sidebar panes, slash commands and launcher entries from them; it
            fetches a remote when something needs to render or answer. A panel shows one plugin at
            one path, and everything under <Code>/p/&lt;id&gt;</Code> belongs to the plugin — the
            host carries the path and never reads it. Nothing in the contract requires React: a
            surface is a function that mounts into an element, and React is one wrapper over that.
          </p>
        </header>

        <Part id="quickstart" title="A plugin in four files">
          <p className={styles.para}>
            The result: a page under <Code>/p/hello/</Code>, a tab named from the path it is
            showing, and an offer whenever the prompt bar holds a word starting with a capital H.
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

          <File name="vite.config.ts" language="typescript">{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginFederation } from '@kbase/plugin-sdk/vite';

export default defineConfig({
  plugins: [pluginFederation({ config: './plugin.config.ts' }), react()],
});`}</File>

          <File
            name="src/plugin.tsx"
            language="tsx"
          >{`import { definePlugin, react, usePanel, usePanelTitle } from '@kbase/plugin-sdk';

function Hello() {
  const { path } = usePanel();
  const name = path.slice(1) || 'nobody';
  usePanelTitle(name);
  return <p>Hello, {name}.</p>;
}

export default definePlugin({
  route: react(Hello),
  commands: { hello: ({ who }, { host }) => host.openRoute(\`/\${who}\`) },
});`}</File>

          <File
            name="src/answers.ts"
            language="typescript"
          >{`import type { CommandCall, Query } from '@kbase/plugin-sdk';

export function commands({ text }: Query): CommandCall[] {
  const q = text?.trim();
  if (!q || !/^H\\w+$/.test(q)) return [];
  return [{ label: \`Say hello to \${q}\`, command: 'hello', args: { who: q } }];
}

export function terms({ text }: Query): string[] {
  const q = text?.trim();
  return q && /^H\\w+$/.test(q) ? [\`greeting:\${q}\`] : [];
}`}</File>

          <p className={styles.para}>
            The build writes <Code>manifest.json</Code> from that config, stamping the contract
            version and validating against the schema the host parses with — a bad manifest fails
            the build instead of vanishing from a registry with a console warning. The registry
            holds one thing per plugin: the prefix its service is served under. The manifest sits at
            the root of it and the code under <Code>plugin/</Code>, so nothing has to say where
            anything is, and the host draws the launcher entry, the tab and the icon before fetching
            a line of code.
          </p>
        </Part>

        <Part id="reference" title="Reference">
          <Entry id="manifest" name="Manifest" source="plugins/sdk/contract.ts">
            <Sig>{`interface Manifest {
  id: string;                 // /^[a-z][a-z0-9-]{1,40}$/
  title: string;
  description?: string;
  contractVersion: number;
  icon?: string;
  color?: string;
  pane?: { fit?: 'content' };
  route?: { opensEmpty?: boolean };
  commands?: SlashCommand[];
  shortcuts?: CommandCall[];
  promptHandler?: boolean;
}`}</Sig>
            <Fields
              rows={[
                [
                  'id',
                  'string',
                  'yes',
                  'Appears in panel URLs and saved layouts. Changing it strands both.',
                ],
                [
                  'title',
                  'string',
                  'yes',
                  'Names the plugin in tabs, pane headers and the launcher.',
                ],
                ['description', 'string', '', 'One line, shown in the launcher and in Settings.'],
                [
                  'contractVersion',
                  'number',
                  'yes',
                  'Written by the build from the installed SDK, not by hand. The host reads every version it has published and upgrades an older manifest as it loads it.',
                ],
                [
                  'icon',
                  'string',
                  '',
                  'A name from the host icon table. An unlisted name draws a pin.',
                ],
                [
                  'color',
                  'string',
                  '',
                  'blue, green, teal, purple, orange or red. Reaches the icon only.',
                ],
                [
                  'pane',
                  'object',
                  '',
                  'Declares a sidebar surface. fit: "content" holds it at its natural height instead of giving it a share of the stack.',
                ],
                [
                  'route',
                  'object',
                  '',
                  'Declares that this plugin has addressable pages; everything under /p/<id> is then its own. opensEmpty marks a plugin whose root path renders something, which is the condition for the launcher listing it.',
                ],
                ['commands', 'SlashCommand[]', '', 'What a user can type in the prompt bar.'],
                [
                  'shortcuts',
                  'CommandCall[]',
                  '',
                  'Buttons in the sidebar toolbar. Each names a command and what the button reads.',
                ],
                [
                  'promptHandler',
                  'boolean',
                  '',
                  'Mirrors a prompt export. Lets Settings offer this plugin as the assistant before its code loads.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'A manifest that fails to parse is dropped with a console error naming the field; the other plugins load.',
                'A route path carrying a $param, without opensEmpty, cannot appear in the launcher: there would be nothing to open.',
                'Declaring neither pane nor route is valid; the plugin then contributes commands and answers.',
              ]}
            />
          </Entry>

          <Entry id="commands" name="SlashCommand, CommandCall" source="plugins/sdk/contract.ts">
            <Sig>{`// Declared in the manifest. What a user types.
interface SlashCommand {
  name: string;               // /^[a-z][a-z0-9-]*$/ — "/job"
  title: string;
  description?: string;
  args?: { name: string; description?: string; required?: boolean }[];
  icon?: string;
}

// A call to one, with its arguments filled in. What commands() returns, and
// what the manifest's shortcuts are.
interface CommandCall {
  label: string;
  command: string;            // "plugin:name"; bare name means this plugin's own
  args?: Record<string, string | number>;
}`}</Sig>
            <Fields
              rows={[
                [
                  'name',
                  'string',
                  'yes',
                  'The slash name, without the slash. Keys the module’s commands record.',
                ],
                ['title', 'string', 'yes', 'Shown in the command list.'],
                [
                  'args',
                  'object[]',
                  '',
                  'The values a user types after the name, in order. Read before the plugin loads, which is why they are declared and not parsed by the plugin.',
                ],
                [
                  'required',
                  'boolean',
                  '',
                  'Whether the command can run without this value. The prompt bar uses it to tell "press enter" from "still needs an id".',
                ],
                ['label', 'string', 'yes', 'What the row or the button reads.'],
                [
                  'command',
                  'string',
                  'yes',
                  'The command to run, as plugin:name. A bare name is this plugin’s own; the host qualifies it before storing the call anywhere.',
                ],
                [
                  'args',
                  'object',
                  '',
                  'Values by argument name. A call supplies what a user would have typed.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'A recommendation and a shortcut are the same thing — a call — so a suggested action and a toolbar button run by one path, and both show the user a command they could have typed.',
                'Arguments carry no type and no list of choices. One string each, validated by the command that receives them, which is loaded by the time it runs.',
                'Every command lives in one host-wide registry under plugin:name, and any plugin may run any of them. A command name is therefore public: renaming one breaks whoever calls it, exactly as renaming a plugin id would.',
                'There is no catalogue to browse. A caller knows the id it wants and asks hasCommand() first, so a plugin whose neighbour is not installed degrades instead of failing.',
              ]}
            />
          </Entry>

          <Entry id="surfaces" name="mount, react()" source="plugins/sdk/plugin.ts">
            <Sig>{`type Cleanup = () => void;

type Mount = (el: HTMLElement, ctx: { panel: PanelHandle; host: PluginHost }) => Cleanup | void;

// A React component wrapped as one.
function react(Component: ComponentType): { mount: Mount };`}</Sig>
            <Fields
              head={['Member', 'Type', 'Req.', 'Description']}
              rows={[
                [
                  'mount',
                  'Mount',
                  'yes',
                  'Called once with an empty element the plugin owns. The function it returns runs when the panel closes.',
                ],
                [
                  'ctx.panel',
                  'PanelHandle',
                  'yes',
                  'This panel’s path, focus and setters. A plain object; subscribe for changes.',
                ],
                ['ctx.host', 'PluginHost', 'yes', 'Opening pages, running commands, the cart.'],
              ]}
            />
            <Behaviour
              items={[
                'react(Component) renders the component with the panel and host contexts already provided, so the hooks work inside it.',
                'A mount function is called once per panel, not once per navigation: a new path arrives through ctx.panel and its subscription.',
                'A surface that throws during mount is fenced. The panel shows the error; the rest of the workbench keeps working.',
              ]}
            />
          </Entry>

          <Entry id="module" name="PluginModule" source="plugins/sdk/plugin.ts">
            <Sig>{`interface PluginModule {
  route?: { mount: Mount };
  pane?: { mount: Mount };
  commands?: Record<string, (values: CommandValues, ctx: CommandContext) => void | Promise<void>>;
  prompt?: (q: Query, ctx: PromptContext) => Promise<void>;
  status?: (host: PluginHost) => StatusItem[];
}

interface CommandContext {
  host: PluginHost;
  caller: string;             // the plugin id that ran it, or 'user'
}

interface PromptContext {
  host: PluginHost;
  attachments: readonly CartItem[];   // the cart as it stood when enter was pressed
}

function definePlugin(module: PluginModule): PluginModule;`}</Sig>
            <Behaviour
              items={[
                'definePlugin() types the export and returns it unchanged.',
                'The host compares the module against the manifest and logs a mismatch rather than throwing: one wrong declaration costs that surface, not the session.',
                'prompt is where free text goes when it is not a slash command and no suggestion was taken. Settings names the plugin that receives it, from those whose manifest sets promptHandler.',
                'It takes the same Query the answer functions take, so an assistant sees the terms in play as well as the words, and there is one request shape in the contract rather than two.',
                'attachments is the cart as it stood when enter was pressed, not as it is when the promise resolves. It is the only place a plugin sees another plugin’s cart items, and the user put them there deliberately.',
                'The handler owns what happens next: opening its own page with openRoute, streaming into it, or answering without a panel at all.',
                'A command handler is given caller so it can tell a user’s keystroke from another plugin acting for them — a distinction it will need before any permission model exists.',
              ]}
            />
          </Entry>

          <Entry id="panel" name="PanelHandle" source="plugins/sdk/panel.ts">
            <Sig>{`interface PanelHandle {
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

// React wrappers over the same handle.
function usePanel(): PanelHandle;
function usePanelTitle(title: string): void;
function usePanelBreadcrumbs(crumbs: Crumb[]): void;
function usePanelTerms(terms: string[]): void;`}</Sig>
            <Fields
              head={['Member', 'Type', 'Req.', 'Description']}
              rows={[
                [
                  'path',
                  'string',
                  'yes',
                  'What this panel is showing, below /p/<id>. Its shape is the plugin’s own; the host stores it and never parses it.',
                ],
                ['focused', 'boolean', 'yes', 'Whether this panel holds focus in its area.'],
                [
                  'navigate',
                  '(path, options?) => void',
                  '',
                  'Moves this panel to another of the plugin’s paths. The panel keeps its identity, its tab and its place in the layout.',
                ],
                [
                  'setTitle',
                  '(title) => void',
                  '',
                  'Names the tab or pane. Until it is called the host shows the plugin title and the path.',
                ],
                [
                  'setCrumbs',
                  '(crumbs) => void',
                  '',
                  'Draws the trail above the panel, and tells two same-titled tabs apart.',
                ],
                [
                  'setTerms',
                  '(terms) => void',
                  '',
                  'What this panel is about. The host puts these terms to every other plugin’s answers.',
                ],
                [
                  'subscribe',
                  '(listener) => Cleanup',
                  '',
                  'Fires when the path or the focus changes. React surfaces are re-rendered instead; a mount function subscribes.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'usePanel() throws outside a panel. The handle’s setters never throw and never no-op in silence.',
                'A panel has an opaque identity, minted when it opens and kept for as long as it lives. Navigating within it changes what it shows, not which panel it is.',
                'openRoute focuses an open panel of the same plugin already showing that path, so a link followed ten times leaves one tab. duplicate: true asks for a second view instead.',
                'The focused panel’s path is the browser URL: /p/<plugin><path>. The rest of the layout is not addressable.',
              ]}
            />
          </Entry>

          <Entry id="answers" name="Query, PluginAnswers" source="plugins/sdk/answers.ts">
            <Sig>{`// One question shape. The host fills in whatever it knows at the call site.
interface Query {
  text?: string;          // the prompt bar, as typed
  terms?: string[];       // from the focused panel, the cart, or a previous answer
  signal: AbortSignal;
}

// Any of the three, exported by name from ./answers.
interface PluginAnswers {
  terms?(q: Query): string[] | Promise<string[]>;
  commands?(q: Query): CommandCall[] | Promise<CommandCall[]>;
  cartItems?(q: Query): CartItem[] | Promise<CartItem[]>;
}
`}</Sig>
            <Fields
              head={['Member', 'Type', 'Req.', 'Description']}
              rows={[
                ['text', 'string', '', 'What the user has typed. Absent where there is no prompt.'],
                [
                  'terms',
                  'string[]',
                  '',
                  'Namespaced keys — uniprot:P0AEX9, taxon:562 — from the focused panel, from cart items, or returned by another plugin’s terms().',
                ],
                [
                  'signal',
                  'AbortSignal',
                  'yes',
                  'Aborted when the answer stops being wanted: another keystroke, a change of panel, a closed pane.',
                ],
                [
                  'terms()',
                  '(q) => string[]',
                  '',
                  'What this plugin makes of the query. Recognising an accession, resolving a name, expanding a taxon into its genomes.',
                ],
                [
                  'commands()',
                  '(q) => CommandCall[]',
                  '',
                  'What can be done with it, as calls to this plugin’s own slash commands.',
                ],
                [
                  'cartItems()',
                  '(q) => CartItem[]',
                  '',
                  'What is worth collecting. Rendered as a row that opens source.path and adds on the Add control.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'The three are independent. A plugin that only recognises identifiers exports terms(); one that only suggests pages exports commands().',
                'The host calls terms() first, pools every plugin’s answer with the terms it already had, and passes the result to commands() and cartItems() — so one plugin’s recognition reaches another plugin’s answers.',
                'Every call may be asynchronous and every call carries a signal. The prompt bar debounces and aborts; nothing in the contract requires a synchronous answer.',
                'An empty array is the normal answer.',
                'A plugin is not asked about the page it is already showing.',
                'Cart terms arrive newest first, and answers are shown in the order returned.',
                'A call that throws or rejects is logged with the plugin id and the query; that plugin is skipped for the round.',
                'normalize(path), exported from the same module, reduces a path to the page it names, and the host opens and deduplicates on the result. /P0AEX9?from=related and /P0AEX9 are one tab if the plugin says they are; without it the host compares raw strings and opens two.',
              ]}
            />
          </Entry>

          <Entry id="normalize" name="normalize()" source="plugins/sdk/answers.ts">
            <Sig>{`// src/answers.ts — optional, called only by the host
export function normalize(path: string): string {
  const [withoutHash] = path.split('#');
  const [route] = withoutHash.split('?');
  return route.toUpperCase();
}`}</Sig>
            <Behaviour
              items={[
                'The host never parses a plugin’s path, so it cannot know that a query string is decoration or that an accession is case-insensitive. This is where a plugin says so.',
                'Run on every open and every deep link, before any of the plugin’s UI exists. Keep it total: an unparseable path comes back unchanged rather than throwing.',
                'Absent, paths are compared as strings, which is right for a plugin whose paths have one spelling.',
              ]}
            />
          </Entry>

          <Entry id="cart" name="CartItem, Cart" source="plugins/sdk/cart.ts">
            <Sig>{`interface CartItem {
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

// React wrappers over host.cart.
function useCart(): Cart;
function CartButton(props: { item: CartItem; tooltip?: string }): JSX.Element;`}</Sig>
            <Fields
              rows={[
                [
                  'id',
                  'string',
                  'yes',
                  'Unique and stable. A second add under the same id replaces the first.',
                ],
                [
                  'kind',
                  'string',
                  'yes',
                  'The plugin’s own word: protein, genome, table. The host keeps no vocabulary.',
                ],
                ['name', 'string', 'yes', 'What a person calls it. Shown in the tile’s tooltip.'],
                [
                  'subject',
                  'string',
                  '',
                  'What the item is about, where that differs from the item. The tile leads with it.',
                ],
                ['summary', 'string', '', 'The line of text on the tile.'],
                ['terms', 'string[]', '', 'Namespaced keys another plugin may recognise.'],
                ['source', 'object', '', 'The path that reopens this plugin on the thing.'],
                ['content', 'unknown', '', 'The data itself, as JSON.'],
                [
                  'context',
                  'object',
                  '',
                  'What a reader of content cannot infer: units, the population measured over, the route the evidence took, the caveats.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'host.cart is a plain object, reachable from a command, a mount function or a prompt handler. useCart() and CartButton are React wrappers over it and add nothing to the contract.',
                'A plugin can test its own ids with has(); other plugins’ items are not readable.',
                'The host persists the cart, so content must survive JSON.',
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
            <Fields
              head={['Member', 'Type', 'Req.', 'Description']}
              rows={[
                [
                  'openRoute',
                  '(path, options?) => void',
                  'yes',
                  'Opens one of this plugin’s pages. A tab already showing that path is focused; duplicate: true opens a second view of it.',
                ],
                [
                  'execute',
                  '(command, args?) => Promise',
                  'yes',
                  'Runs a command by plugin:name — this plugin’s or another’s. Resolves when the handler does; commands return nothing.',
                ],
                [
                  'hasCommand',
                  '(command) => boolean',
                  'yes',
                  'Whether that command is installed, so a caller can offer the action only when its neighbour is present.',
                ],
                ['cart', 'Cart', 'yes', 'The host’s cart.'],
              ]}
            />
            <Behaviour
              items={[
                'A plugin cannot open another plugin’s pages, read the layout, or read another plugin’s cart items.',
                'It can run another plugin’s commands, which is how one app acts on another on the user’s behalf. Data does not travel this way: a command returns nothing, and what one plugin knows reaches another through terms and answers.',
              ]}
            />
          </Entry>

          <Entry id="build" name="pluginFederation()" source="plugins/sdk/pluginFederation.ts">
            <Sig>{`function pluginFederation(options: { config: string }): Plugin;

// plugin.config.ts
function definePluginManifest(manifest: Omit<Manifest, 'contractVersion'>): Manifest;`}</Sig>
            <Behaviour
              items={[
                'Exposes ./plugin from src/plugin.tsx and ./answers from src/answers.ts, by convention: the host reads the emitted Module Federation manifest to see which of them exist.',
                'Writes manifest.json from the config: the id becomes the federation name, contractVersion comes from the installed SDK, and the whole thing is parsed with the host’s own schema, so a mistake stops the build.',
                'Declares react, react-dom, zod, @kbase/design-system and @kbase/plugin-sdk as singletons. A plugin writes no versions: Module Federation reads them from the plugin’s own dependencies, and singleton is what makes the host’s copy win.',
                'A second React breaks hooks; a second SDK creates a second panel context, so every usePanel() in the plugin throws.',
                'A plugin using neither React nor the design system still shares the SDK, and drops the react() wrapper and the React build plugin.',
              ]}
            />
          </Entry>
        </Part>

        <Part id="howto" title="How to">
          <Task id="task-vanilla" title="Write a surface without React">
            <File
              name="src/plugin.ts"
              language="typescript"
            >{`import { definePlugin } from '@kbase/plugin-sdk';

export default definePlugin({
  route: {
    mount(el, { panel, host }) {
      const name = () => panel.path.slice(1) || 'nobody';

      const line = el.appendChild(document.createElement('p'));
      const add = el.appendChild(document.createElement('button'));
      add.textContent = 'Add';
      add.onclick = () =>
        host.cart.add({ id: \`hello:\${name()}\`, kind: 'greeting', name: name() });

      const draw = () => {
        line.textContent = \`Hello, \${name()}.\`;
        panel.setTitle(name());
        panel.setTerms([\`greeting:\${name()}\`]);
      };

      draw();
      return panel.subscribe(draw);
    },
  },
});`}</File>
          </Task>

          <Task id="task-answers" title="Recognise text, and answer about someone else's terms">
            <File
              name="src/answers.ts"
              language="typescript"
            >{`import type { CartItem, CommandCall, Query } from '@kbase/plugin-sdk';

const NAME: Record<string, string> = { '562': 'Escherichia coli' };
const TAXID = /^taxon:(\\d+)$/;

const taxaIn = (q: Query) => [
  ...(/^\\d+$/.test(q.text?.trim() ?? '') ? [q.text!.trim()] : []),
  ...(q.terms ?? []).flatMap((t) => TAXID.exec(t)?.[1] ?? []),
];

export function terms(q: Query): string[] {
  return taxaIn(q).map((taxid) => \`taxon:\${taxid}\`);
}

export function commands(q: Query): CommandCall[] {
  return taxaIn(q).map((taxid) => ({
    label: \`Taxon dossier for \${NAME[taxid] ?? taxid}\`,
    command: 'taxon',
    args: { q: taxid },
  }));
}

export function cartItems(q: Query): CartItem[] {
  return taxaIn(q).map((taxid) => ({
    id: \`genknown:taxon:\${taxid}\`,
    kind: 'taxon',
    name: NAME[taxid] ?? \`Taxon \${taxid}\`,
    subject: \`taxon \${taxid}\`,
    terms: [\`taxon:\${taxid}\`],
    source: { path: \`/\${taxid}\` },
  }));
}`}</File>
          </Task>

          <Task id="task-panel" title="Give a panel a title, a trail and terms">
            <File name="src/Panel.tsx" language="tsx">{`const { path } = usePanel();
const taxid = path.slice(1);

usePanelTitle(data?.name ?? taxid);
usePanelBreadcrumbs([
  { label: 'Hello', icon: 'HandWaving' },
  { label: taxid, action: { path: \`/\${taxid}\` } },
]);
usePanelTerms(data ? [\`taxon:\${data.taxid}\`] : []);`}</File>
          </Task>

          <Task id="task-cart" title="Add to the cart from a command">
            <File name="src/plugin.tsx" language="tsx">{`export default definePlugin({
  route: react(Dossier),
  commands: {
    'save-current': (_values, { host }) => {
      host.cart.add({ id: 'hello:current', kind: 'greeting', name: 'The current greeting' });
    },
  },
});`}</File>
          </Task>
        </Part>

        <Part id="notes" title="Design notes">
          <Note title="Why a surface is a mount function">
            A contract typed <Code>ComponentType</Code> makes React a requirement of the platform
            rather than a choice of the plugin. A mount function is the smallest thing every UI
            framework can produce, and <Code>react()</Code> is a few dozen lines on top of it. The
            cost is one wrapper call in every React plugin, which is the common case.
          </Note>
          <Note title="Why commands are namespaced and there is no catalogue">
            One registry, ids of the form <Code>plugin:name</Code>, and any plugin may run any
            command — the arrangement JupyterLab and VS Code both settled on. A caller names the id
            it wants and checks <Code>hasCommand</Code>, rather than browsing a list, because a
            browsable catalogue invites coupling to whatever happens to be installed. What travels
            this way is an action taken for the user, never data: a command answers nothing.
          </Note>
          <Note title="Why the build writes the manifest">
            Written by hand it is a third copy of the plugin id, a number someone bumps, and a list
            of module names the bundler already knows. Generated from a typed config it is checked
            at build time by the same schema the host parses with, and the failure lands on the
            person who can fix it.
          </Note>
          <Note title="Why a recommendation calls a command instead of doing the work">
            A call is something a user could have typed, so a suggested action teaches the command
            behind it and a toolbar button is the same object as a suggestion. It also survives
            being written down — into history, into a saved shortcut, into a message to an assistant
            — which a function cannot.
          </Note>
          <Note title="Why three functions over one query">
            A plugin is asked three separable questions — what is this, what can be done with it,
            what is worth keeping — and the same query answers all of them, whether it arrived as
            typed text or as terms from a panel. Splitting by answer rather than by surface is what
            lets the host run <Code>terms()</Code> first and hand the pooled result to everyone
            else’s <Code>commands()</Code>, so recognising something is not the same plugin’s job as
            knowing what to do with it.
          </Note>
          <Note title="Why a cart item carries payload and pointer">
            An item holding only <Code>source</Code> makes every consumer re-fetch, and is worthless
            while that service is down. An item holding only <Code>content</Code> leaves no route
            back to where it came from.
          </Note>
          <Note title="Why terms have no registry">
            A registry of prefixes would make the host the arbiter of what plugins may discuss, and
            every new vocabulary a host release. The cost is that two plugins spelling one idea
            differently produce an empty pane and no error.
          </Note>
          <Note title="Why the host asks a plugin to normalize a path">
            Opening a page that is already open focuses the tab holding it, which stops a link
            followed ten times from leaving ten tabs. That check compares paths, and the host does
            not read paths — so <Code>/P0AEX9</Code> and <Code>/P0AEX9?from=related</Code> would be
            two pages to it and one page to everybody else. The plugin is the only thing that knows
            which parts of its own path are decoration, so it is asked, once, before the tab opens.
          </Note>
          <Note title="Why a panel is not identified by its path">
            A tab keeps its identity while it navigates, the way a browser tab does; if the path
            were the identity, following a link inside a plugin would destroy the panel and build a
            new one in its place, losing scroll, local state and per-panel history. The path is what
            a panel is showing, not which panel it is.
          </Note>
          <Note title="Why the host reads old manifests">
            Negotiation asks every plugin to know about every host. Instead the host publishes a
            contract version, reads every version it has published, and upgrades an older manifest
            as it loads it — so a plugin written once keeps working, and the compatibility code
            lives in one repository rather than a hundred.
          </Note>
        </Part>
      </article>
    </div>
  );
}

const SECTIONS: { id: string; label: string; children?: { id: string; label: string }[] }[] = [
  { id: 'quickstart', label: 'A plugin in four files' },
  {
    id: 'reference',
    label: 'Reference',
    children: [
      { id: 'manifest', label: 'Manifest' },
      { id: 'commands', label: 'SlashCommand, CommandCall' },
      { id: 'surfaces', label: 'mount, react()' },
      { id: 'module', label: 'PluginModule' },
      { id: 'panel', label: 'PanelHandle' },
      { id: 'answers', label: 'Query, PluginAnswers' },
      { id: 'normalize', label: 'normalize()' },
      { id: 'cart', label: 'CartItem, Cart' },
      { id: 'host', label: 'PluginHost' },
      { id: 'build', label: 'pluginFederation()' },
    ],
  },
  {
    id: 'howto',
    label: 'How to',
    children: [
      { id: 'task-vanilla', label: 'A surface without React' },
      { id: 'task-answers', label: 'Recognise text, answer on terms' },
      { id: 'task-panel', label: 'Title, trail and terms' },
      { id: 'task-cart', label: 'Add from a command' },
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

function Fields({ rows, head }: { rows: string[][]; head?: string[] }) {
  const columns = head ?? ['Field', 'Type', 'Req.', 'Description'];
  return (
    <Table compact className={styles.table}>
      <Thead>
        <Tr>
          {columns.map((c, i) => (
            <Th key={c || i} style={COLUMN_WIDTHS[i]}>
              {c}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {rows.map(([name, type, required, text], i) => (
          <Tr key={`${name}-${i}`}>
            <Td>
              <code className={styles.name}>{name}</code>
            </Td>
            <Td>
              <code className={styles.type}>{type}</code>
            </Td>
            <Td className={styles.req}>{required}</Td>
            <Td>{text}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

// Name, type and requiredness are short and known; the description takes what
// is left, which keeps a long sentence from widening the table past the panel.
const COLUMN_WIDTHS = [{ width: '10rem' }, { width: '12rem' }, { width: '4rem' }, undefined];

// What the host does that a signature cannot state: when it is called, what it
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

function Task({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.entry} id={id} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className={styles.entryName}>
        {title}
      </h3>
      {children}
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

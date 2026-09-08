import type { ReactNode } from 'react';
import { CodeBlock, Table, Tbody, Td, Th, Thead, Tr } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import styles from './Docs.module.css';

// The plugin contract as it is meant to be, written before it is built: this
// page is the specification, and the implementation is measured against it.
//
// What differs from what ships today, each of them work to do: a surface is a
// mount function with React as a wrapper, rather than a React component
// outright; `navigator` and `document` are `pane` and `route`; `match` and
// `related` are one `offers` function; a panel shows a plugin at a path and
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

          <File name="manifest.json" language="json">{`{
  "id": "hello",
  "title": "Hello",
  "description": "The smallest plugin that draws something.",
  "contractVersion": 2,
  "icon": "HandWaving",
  "color": "teal",
  "route": { "opensEmpty": true },
  "entry": {
    "url": "/services/hello/plugin/mf-manifest.json",
    "module": "./plugin",
    "offers": "./offers"
  }
}`}</File>

          <File name="vite.config.ts" language="typescript">{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginFederation } from '@kbase/plugin-sdk/vite';

export default defineConfig({
  plugins: [pluginFederation({ name: 'hello', offers: './src/offers.ts' }), react()],
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

export default definePlugin({ route: react(Hello) });`}</File>

          <File
            name="src/offers.ts"
            language="typescript"
          >{`import type { Offers } from '@kbase/plugin-sdk';

const offers: Offers = ({ text }) => {
  const q = text?.trim();
  if (!q || !/^H\\w+$/.test(q)) return [];
  return [{ id: \`hello:\${q}\`, label: \`Say hello to \${q}\`, path: \`/\${q}\` }];
};

export default offers;`}</File>

          <p className={styles.para}>
            The registry serves the manifest and <Code>entry.url</Code> resolves against the
            registry origin. Nothing else is registered: the host knows the tab, the route, the icon
            and the offer before it fetches any code.
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
  commands?: CommandDecl[];
  promptHandler?: boolean;
  entry?: { url: string; module: string; offers?: string };
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
                  'The version this plugin was built against. The host reads every version it has published and upgrades an older manifest as it loads it.',
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
                ['commands', 'CommandDecl[]', '', 'Slash commands.'],
                [
                  'promptHandler',
                  'boolean',
                  '',
                  'Mirrors a prompt export. Lets Settings offer this plugin as the assistant before its code loads.',
                ],
                [
                  'entry',
                  'object',
                  '',
                  'The remote. module holds the surfaces and commands; offers is fetched separately at startup. Absent for plugins bundled with the host.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'A manifest that fails to parse is dropped with a console error naming the field; the other plugins load.',
                'A route path carrying a $param, without opensEmpty, cannot appear in the launcher: there would be nothing to open.',
                'Declaring neither pane nor route is valid; the plugin then contributes commands and offers.',
              ]}
            />
          </Entry>

          <Entry id="commands" name="CommandDecl, ArgDecl" source="plugins/sdk/contract.ts">
            <Sig>{`interface CommandDecl {
  name: string;               // /^[a-z][a-z0-9-]*$/
  title: string;
  description?: string;
  args?: ArgDecl[];
  icon?: string;
  shortcut?: boolean | string;
}

interface ArgDecl {
  name: string;
  type: 'string' | 'number' | 'choice';
  required?: boolean;
  description?: string;
  choices?: string[];
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
                  'ArgDecl[]',
                  '',
                  'Parsed by the host and passed to the handler as values.',
                ],
                [
                  'shortcut',
                  'boolean | string',
                  '',
                  'Places the command in the sidebar toolbar; a string replaces the button label.',
                ],
                ['choices', 'string[]', '', 'Required when an argument’s type is "choice".'],
              ]}
            />
            <Behaviour
              items={[
                'A shortcut command should have no required arguments: the toolbar runs it with none.',
              ]}
            />
          </Entry>

          <Entry id="surfaces" name="Surface, Mount, react()" source="plugins/sdk/surface.ts">
            <Sig>{`type Cleanup = () => void;

type Mount = (el: HTMLElement, ctx: SurfaceContext) => Cleanup | void;

interface Surface {
  mount: Mount;
}

interface SurfaceContext {
  panel: PanelHandle;
  host: PluginHost;
}

function react(Component: ComponentType): Surface;`}</Sig>
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
                ['ctx.host', 'PluginHost', 'yes', 'Opening routes, running commands, the cart.'],
              ]}
            />
            <Behaviour
              items={[
                'react(Component) returns a Surface that renders the component with the panel and host contexts already provided, so the hooks work inside it.',
                'A mount function is called once per panel, not once per navigation: a new path arrives through ctx.panel and its subscription.',
                'A surface that throws during mount is fenced. The panel shows the error; the rest of the workbench keeps working.',
              ]}
            />
          </Entry>

          <Entry id="module" name="PluginModule" source="plugins/sdk/plugin.ts">
            <Sig>{`interface PluginModule {
  route?: Surface;
  pane?: Surface;
  commands?: Record<string, (values: CommandValues, host: PluginHost) => void | Promise<void>>;
  prompt?: PromptHandler;
  status?: (host: PluginHost) => StatusItem[];
}

function definePlugin(module: PluginModule): PluginModule;`}</Sig>
            <Behaviour
              items={[
                'definePlugin() types the export and returns it unchanged.',
                'The host compares the module against the manifest and logs a mismatch rather than throwing: one wrong declaration costs that surface, not the session.',
                'prompt receives the cart as it stood when the message was sent, not as it is when the promise resolves.',
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
                  'What this panel is about. The host asks every other plugin for offers on them.',
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

          <Entry id="offers" name="Offers, OfferRequest, Offer" source="plugins/sdk/offers.ts">
            <Sig>{`type Offers = (request: OfferRequest) => Offer[] | Promise<Offer[]>;

// Optional, exported by name from the same module.
type Canonicalize = (path: string) => string;

interface OfferRequest {
  context: 'prompt' | 'view' | 'cart';
  text?: string;                    // set when context is 'prompt'
  terms?: readonly string[];        // set when context is 'view' or 'cart'
  signal: AbortSignal;
}

interface Offer {
  id: string;
  label: string;
  detail?: string;
  path: string;
  terms?: string[];
  item?: Omit<CartItem, 'id'> & { id?: string };
}`}</Sig>
            <Fields
              rows={[
                [
                  'context',
                  "'prompt' | 'view' | 'cart'",
                  'yes',
                  'What prompted the question: text being typed, the page on screen, or what is in the cart.',
                ],
                [
                  'text',
                  'string',
                  '',
                  'The prompt-bar text, untrimmed. Only in the prompt context.',
                ],
                [
                  'terms',
                  'readonly string[]',
                  '',
                  'Namespaced keys: uniprot:P0AEX9, taxon:562. Only in the view and cart contexts.',
                ],
                [
                  'id',
                  'string',
                  'yes',
                  'Stable per offer. The key a dismissal is remembered under.',
                ],
                [
                  'label',
                  'string',
                  'yes',
                  'What the offer lands on, in the plugin’s words. About thirty characters are visible in a pane.',
                ],
                ['detail', 'string', '', 'A second line, one step down the type scale.'],
                ['path', 'string', 'yes', 'The page this offer opens, below /p/<id>.'],
                [
                  'terms',
                  'string[]',
                  '',
                  'What the offer is about, so the host can relate offers to each other without opening them.',
                ],
                [
                  'item',
                  'CartItem',
                  '',
                  'What the offer’s Add control puts in the cart. An offer without one is a link only.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'One function answers all three contexts. Its module is fetched at startup, so it must stay small and must not import a UI bundle.',
                'In the prompt context it runs on every keystroke and must return synchronously: no I/O, no await. In the view and cart contexts it may return a promise.',
                'An empty array is the normal answer, in every context.',
                'A plugin is never asked about the page it is already showing.',
                'Cart terms arrive newest first and offers are shown in the order returned, so a plugin that truncates its own list discards the answer to what was just added.',
                'The host drops offers whose path is already open in a tab, and whose item id is already in the cart.',
                'A call that throws is logged with the plugin id and the request; that plugin is skipped for the round.',
                'canonicalize(path) reduces a path to the page it names, and the host opens and deduplicates on the result. /P0AEX9?from=related, /P0AEX9#structure and /P0AEX9 are one tab if the plugin says they are; without it the host compares the raw strings and opens three.',
                'canonicalize runs on every open and every deep link, before any of the plugin’s UI exists. Keep it total: an unparseable path comes back unchanged rather than throwing.',
              ]}
            />
          </Entry>

          <Entry id="canonical" name="canonicalize()" source="plugins/sdk/offers.ts">
            <Sig>{`// src/offers.ts
export function canonicalize(path: string): string {
  const [without] = path.split('#');
  const [route] = without.split('?');
  return route.toUpperCase();
}`}</Sig>
            <Behaviour
              items={[
                'The host never parses a plugin’s path, so it cannot know that a query string is decoration or that an accession is case-insensitive. This is where a plugin says so.',
                'Only the host calls it. A plugin’s own links should already be canonical; this catches the ones that are not — a pasted URL, an offer built somewhere else, a link carrying where it came from.',
                'Absent, paths are compared as strings, which is correct for a plugin whose paths have one spelling.',
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
  runCommand: (name: string, values?: Record<string, string | number>) => Promise<void>;
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
                  'runCommand',
                  '(name, values?) => Promise',
                  'yes',
                  'Runs one of this plugin’s own commands.',
                ],
                ['cart', 'Cart', 'yes', 'The host’s cart.'],
              ]}
            />
            <Behaviour
              items={[
                'A plugin cannot open another plugin’s pages, read the layout, or read another plugin’s cart items. Plugins meet through terms and offers, so neither imports the other and either can be uninstalled.',
              ]}
            />
          </Entry>

          <Entry id="build" name="pluginFederation()" source="plugins/sdk/pluginFederation.ts">
            <Sig>{`function pluginFederation(options: {
  name: string;        // must equal the manifest id
  entry?: string;      // default './src/plugin.tsx'
  offers?: string;
}): Plugin;`}</Sig>
            <Behaviour
              items={[
                'Emits remoteEntry.js exposing ./plugin, and ./offers when one is named.',
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

          <Task id="task-offers" title="Offer on typed text and on another plugin's terms">
            <File
              name="src/offers.ts"
              language="typescript"
            >{`import type { Offer, Offers } from '@kbase/plugin-sdk';

const NAME: Record<string, string> = { '562': 'Escherichia coli' };
const TAXON = /^taxon:(\\d+)$/;

const dossier = (taxid: string): Offer => ({
  id: \`dossier:\${taxid}\`,
  label: NAME[taxid] ?? \`Taxon \${taxid}\`,
  detail: \`taxon \${taxid}\`,
  path: \`/\${taxid}\`,
  terms: [\`taxon:\${taxid}\`],
  item: {
    kind: 'taxon',
    name: NAME[taxid] ?? \`Taxon \${taxid}\`,
    terms: [\`taxon:\${taxid}\`],
    source: { path: \`/\${taxid}\` },
  },
});

const offers: Offers = ({ context, text, terms }) => {
  if (context === 'prompt') {
    const q = text?.trim() ?? '';
    return /^\\d+$/.test(q) ? [dossier(q)] : [];
  }
  return (terms ?? []).flatMap((t) => TAXON.exec(t)?.[1] ?? []).map(dossier);
};

export default offers;`}</File>
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
    'save-current': (_values, host) => {
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
          <Note title="Why one offers function">
            Recognising typed text and recognising a term are the same act — the plugin says what it
            has about something. They were two contracts only because one runs on a keystroke and
            the other may reach the network, which is a property of the request and now sits in the
            request. It also leaves room for the host to feed an offer’s own terms back to the other
            plugins, which two separate functions could not express.
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
          <Note title="Why the host asks a plugin to canonicalize">
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
      { id: 'commands', label: 'CommandDecl' },
      { id: 'surfaces', label: 'Surface, react()' },
      { id: 'module', label: 'PluginModule' },
      { id: 'panel', label: 'PanelHandle' },
      { id: 'offers', label: 'Offers, Offer' },
      { id: 'canonical', label: 'canonicalize()' },
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
      { id: 'task-offers', label: 'Offer on text and terms' },
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

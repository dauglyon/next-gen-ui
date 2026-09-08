import type { ReactNode } from 'react';
import { CodeBlock, Table, Tbody, Td, Th, Thead, Tr } from '@kbase/design-system';
import { CONTRACT_VERSION, usePanelTitle } from '../../../plugins/sdk';
import styles from './Docs.module.css';

// Reference for the plugin contract, shipped inside the host it describes, so
// a reader sees the contract that is running rather than one a wiki recorded.
//
// Three parts in the order a reader needs them: a complete plugin to copy, the
// types it was built from, then the tasks that come after the first one works.
// Explanation is quarantined at the end — a rationale sentence inside a field
// table is what makes reference material unreadable.
//
// Every signature is asserted against its source file by Docs.test.ts, so a
// contract change that does not reach this page fails the suite.

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
            startup and draws tabs, sidebar blocks, slash commands and launcher entries from them;
            it fetches a remote when something needs to render or answer. Contract version{' '}
            {CONTRACT_VERSION}.
          </p>
        </header>

        <Part id="quickstart" title="A plugin in four files">
          <p className={styles.para}>
            The result: a page at <Code>/p/hello/$q</Code>, a tab named from its params, and an
            offer whenever the prompt bar holds a word starting with a capital H.
          </p>

          <File name="manifest.json" language="json">{`{
  "id": "hello",
  "title": "Hello",
  "description": "The smallest plugin that draws something.",
  "contractVersion": 1,
  "icon": "HandWaving",
  "color": "teal",
  "document": { "route": "/$q", "opensEmpty": true },
  "entry": {
    "url": "/services/hello/plugin/mf-manifest.json",
    "module": "./plugin",
    "matcher": "./match"
  }
}`}</File>

          <File name="vite.config.ts" language="typescript">{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginFederation } from '@kbase/plugin-sdk/vite';

export default defineConfig({
  plugins: [pluginFederation({ name: 'hello', matcher: './src/match.ts' }), react()],
  build: { target: 'esnext' },
});`}</File>

          <File
            name="src/plugin.tsx"
            language="tsx"
          >{`import { definePlugin, usePanel, usePanelTitle } from '@kbase/plugin-sdk';

function Hello() {
  const { params } = usePanel();
  usePanelTitle(params.q ?? 'Hello');
  return <p>Hello, {params.q ?? 'nobody'}.</p>;
}

export default definePlugin({ document: Hello });`}</File>

          <File
            name="src/match.ts"
            language="typescript"
          >{`import type { Matcher } from '@kbase/plugin-sdk';

const match: Matcher = (text) => {
  const q = text.trim();
  return /^H\\w+$/.test(q) ? [{ label: \`Say hello to \${q}\`, action: { q } }] : [];
};

export default match;`}</File>

          <p className={styles.para}>
            The registry serves the manifest, and <Code>entry.url</Code> resolves against the
            registry origin. Nothing else is registered: the host learns the tab, the route, the
            icon and the offer from those two files before fetching any code.
          </p>
        </Part>

        <Part id="reference" title="Reference">
          <Entry id="manifest" name="Manifest" source="plugins/sdk/contract.ts">
            <Sig>{`interface Manifest {
  id: string;                 // /^[a-z][a-z0-9-]{1,40}$/
  title: string;
  description?: string;
  contractVersion: 1;
  icon?: string;
  color?: string;
  navigator?: { fit?: 'content' };
  document?: { route: string; opensEmpty?: boolean };
  commands?: CommandDecl[];
  promptHandler?: boolean;
  entry?: { url: string; module: string; matcher?: string; related?: string };
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
                  'Names the plugin in tabs, block headers and the launcher.',
                ],
                ['description', 'string', '', 'One line, shown in the launcher and in Settings.'],
                ['contractVersion', '1', 'yes', 'Rejected unless it equals the host constant.'],
                [
                  'icon',
                  'string',
                  '',
                  'A name from workbench/host/icons.ts. An unlisted name draws a pin.',
                ],
                [
                  'color',
                  'string',
                  '',
                  'blue, green, teal, purple, orange or red. Reaches the icon only.',
                ],
                [
                  'navigator',
                  'object',
                  '',
                  'The key declares a sidebar panel. fit: "content" holds the block at its natural height instead of giving it a share of the stack.',
                ],
                [
                  'document',
                  'object',
                  '',
                  'Declares a main-area page. route is a path under /p/<id> carrying $params.',
                ],
                ['commands', 'CommandDecl[]', '', 'Slash commands.'],
                [
                  'promptHandler',
                  'boolean',
                  '',
                  'Mirrors a prompt export. Lets Settings offer this plugin as the assistant before its code loads.',
                ],
                ['entry', 'object', '', 'The remote. Absent for plugins bundled with the host.'],
              ]}
            />
            <Behaviour
              items={[
                'A manifest that fails to parse is dropped with a console warning; the other plugins load.',
                'A route carrying a $param, without opensEmpty, cannot appear in the launcher: there would be nothing to open.',
                'Declaring neither navigator nor document is valid; the plugin then contributes only commands.',
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

          <Entry id="module" name="PluginModule" source="plugins/sdk/plugin.ts">
            <Sig>{`interface PluginModule {
  navigator?: ComponentType;
  document?: ComponentType;
  commands?: Record<string, (values: CommandValues, host: PluginHost) => void | Promise<void>>;
  prompt?: PromptHandler;
  useStatus?: () => StatusItem[];
  usePromptContext?: () => PromptContext | null;
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
  kind: 'navigator' | 'document';
  params: Record<string, string>;
  focused: boolean;
  setTitle: (title: string) => void;
  setCrumbs: (crumbs: Crumb[]) => void;
  setTerms: (terms: string[]) => void;
}

function usePanel(): PanelHandle;
function usePanelTitle(title: string): void;
function usePanelBreadcrumbs(crumbs: Crumb[]): void;
function usePanelTerms(terms: string[]): void;`}</Sig>
            <Fields
              head={['Setter', 'Hook', '', 'What the host does with it']}
              rows={[
                [
                  'setTitle',
                  'usePanelTitle',
                  '',
                  'Names the tab or block. Before the first call the host shows the plugin title and the params.',
                ],
                [
                  'setCrumbs',
                  'usePanelBreadcrumbs',
                  '',
                  'Draws the trail above the panel, and tells two same-titled tabs apart.',
                ],
                [
                  'setTerms',
                  'usePanelTerms',
                  '',
                  'Asks every other plugin what it has about these terms; answers appear in the Related pane.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'usePanel() throws outside a panel. Rendering a plugin component from host chrome is the usual cause.',
                'Panel identity is the plugin id plus its params sorted into a key, so opening a document whose params match an open tab focuses that tab.',
                'The hooks compare before calling the host, so a fresh array each render does not loop.',
              ]}
            />
          </Entry>

          <Entry id="matcher" name="Matcher, Offer" source="plugins/sdk/plugin.ts">
            <Sig>{`type Matcher = (text: string) => Offer[];

interface Offer {
  label: string;
  action: Record<string, string>;
}`}</Sig>
            <Fields
              rows={[
                [
                  'label',
                  'string',
                  'yes',
                  'Where accepting the offer lands, in the plugin’s words.',
                ],
                [
                  'action',
                  'Record<string, string>',
                  'yes',
                  'Becomes the document’s params. Opaque to the host.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'Called synchronously on every keystroke. No I/O, no await.',
                'An empty array is the normal answer.',
                'A matcher that throws is dropped for the session with a console warning.',
              ]}
            />
          </Entry>

          <Entry id="cart" name="CartAddition, CartHandle" source="plugins/sdk/cart.ts">
            <Sig>{`interface CartAddition {
  id: string;
  kind: string;
  name: string;
  subject?: string;
  summary?: string;
  terms?: string[];
  source?: { params?: Record<string, string>; href?: string };
  content?: unknown;
  context?: Record<string, unknown>;
}

interface CartHandle {
  add: (item: CartAddition) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  count: number;
}

function useCart(): CartHandle;`}</Sig>
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
                ['source', 'object', '', 'Params that reopen this plugin’s document on the thing.'],
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
                'A plugin can test its own ids with has(); other plugins’ items are not readable.',
                'The host persists the cart, so content must survive JSON.',
                'CartButton adds one and reads the cart itself, which is why the added state, the second press that removes the item, and the accessible name are settled in one place.',
              ]}
            />
          </Entry>

          <Entry
            id="related"
            name="Related, RelatedRequest, Proposal"
            source="plugins/sdk/related.ts"
          >
            <Sig>{`type RelatedContext = 'view' | 'cart';

interface RelatedRequest {
  terms: readonly string[];
  context: RelatedContext;
  signal: AbortSignal;
}

interface Proposal {
  id: string;
  label: string;
  detail?: string;
  params: Record<string, string>;
  item?: Omit<CartAddition, 'id'> & { id?: string };
}

type Related = (request: RelatedRequest) => Promise<Proposal[]> | Proposal[];`}</Sig>
            <Fields
              rows={[
                [
                  'id',
                  'string',
                  'yes',
                  'Stable per proposal. Part of the key a dismissal is remembered under.',
                ],
                [
                  'label',
                  'string',
                  'yes',
                  'The row’s first line. About thirty characters are visible.',
                ],
                ['detail', 'string', '', 'The row’s second line, one step down the type scale.'],
                ['params', 'Record<string, string>', 'yes', 'Opens this plugin’s document.'],
                [
                  'item',
                  'CartAddition',
                  '',
                  'What the row’s Add button puts in the cart. A row without it is a link only.',
                ],
              ]}
            />
            <Behaviour
              items={[
                'Terms arrive from usePanelTerms() and from each cart item’s terms, asked as two questions, view and cart, deduplicated against each other.',
                'A plugin is never asked about the page it is already showing.',
                'Cart terms arrive newest first and proposals are shown in the order returned, so a plugin that truncates its own list discards the answer to what was just added.',
                'The host drops proposals whose params match an open tab, and whose item id is already in the cart.',
                'The module is fetched only when there are terms to ask about, and a proposal should cost no network to produce.',
              ]}
            />
          </Entry>

          <Entry id="host" name="PluginHost" source="plugins/sdk/host.ts">
            <Sig>{`interface PluginHost {
  openDocument: (params: Record<string, string>) => void;
  runCommand: (name: string, values?: Record<string, string | number>) => Promise<void>;
  cart: PluginCart;
}

function useHost(): PluginHost;`}</Sig>
            <Behaviour
              items={[
                'openDocument opens this plugin’s document, not another’s.',
                'The layout, the other tabs and other plugins’ cart items are unreachable. Plugins meet through terms and proposals, so neither imports the other and either can be uninstalled.',
              ]}
            />
          </Entry>

          <Entry id="shared" name="Shared singletons" source="plugins/sdk/shared.ts">
            <Sig>{`SHARED_SINGLETONS = {
  react, 'react-dom', zod, '@kbase/design-system', '@kbase/plugin-sdk'
}  // every one { singleton: true }`}</Sig>
            <Behaviour
              items={[
                'A second React breaks hooks; a second zod breaks instanceof; a second SDK creates a second panel context, so every usePanel() in the plugin throws.',
                'pluginFederation() declares all five and takes their versions from the host’s package.json.',
              ]}
            />
          </Entry>
        </Part>

        <Part id="howto" title="How to">
          <Task id="task-terms" title="Answer about another plugin's terms">
            <p className={styles.para}>
              Expose a third module and name it in the manifest as <Code>entry.related</Code>. The
              preset does not emit this one, so the federation config names it directly.
            </p>
            <File
              name="src/related.ts"
              language="typescript"
            >{`import type { Proposal, RelatedRequest } from '@kbase/plugin-sdk';

const NAME: Record<string, string> = { '562': 'Escherichia coli' };

export function related({ terms }: RelatedRequest): Proposal[] {
  const taxa = terms.flatMap((t) => /^taxon:(\\d+)$/.exec(t)?.[1] ?? []);
  return taxa.map((taxid) => ({
    id: \`dossier:\${taxid}\`,
    label: NAME[taxid] ?? \`Taxon \${taxid}\`,
    detail: \`taxon \${taxid}\`,
    params: { q: taxid },
    item: {
      id: \`hello:taxon:\${taxid}\`,
      kind: 'taxon',
      name: NAME[taxid] ?? \`Taxon \${taxid}\`,
      terms: [\`taxon:\${taxid}\`],
      source: { params: { q: taxid } },
    },
  }));
}`}</File>
            <File name="vite.config.ts (excerpt)" language="typescript">{`federation({
  name: 'hello',
  filename: 'remoteEntry.js',
  manifest: true,
  exposes: {
    './plugin': './src/plugin.tsx',
    './match': './src/match.ts',
    './related': './src/related.ts',
  },
  shared: SHARED_SINGLETONS,
});`}</File>
          </Task>

          <Task id="task-cart" title="Put something in the cart">
            <File
              name="src/Panel.tsx"
              language="tsx"
            >{`import { CartButton } from '@kbase/plugin-sdk';

<CartButton
  item={{
    id: \`hello:taxon:\${taxid}\`,
    kind: 'taxon',
    name: node.name,
    subject: \`taxon \${taxid}\`,
    terms: [\`taxon:\${taxid}\`],
    source: { params: { q: taxid } },
    content: node,
    context: { rank: node.rank, frame: 'siblings under the same parent' },
  }}
/>;`}</File>
            <p className={styles.para}>
              <Code>useCart()</Code> is the same handle without the control, for a plugin adding an
              item from a command or drawing its own affordance.
            </p>
          </Task>

          <Task id="task-crumbs" title="Give a panel a title, a trail and terms">
            <File name="src/Panel.tsx" language="tsx">{`const { params } = usePanel();

usePanelTitle(data?.name ?? params.q);
usePanelBreadcrumbs([
  { label: 'Hello', icon: 'HandWaving' },
  { label: params.q, action: { q: params.q } },
]);
usePanelTerms(data ? [\`taxon:\${data.taxid}\`] : []);`}</File>
          </Task>
        </Part>

        <Part id="notes" title="Design notes">
          <Note title="Why the matcher is its own module">
            Matching runs on every keystroke and must be synchronous, so it cannot wait behind a UI
            bundle. The host fetches <Code>./match</Code> at startup and everything else on demand.
          </Note>
          <Note title="Why a proposal is a link">
            A pane that fetched a document to decide whether to mention it would cost one request
            per plugin per keystroke. A proposal is assembled from what the answering plugin already
            holds; its payload is added only when someone presses Add.
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
      { id: 'module', label: 'PluginModule' },
      { id: 'panel', label: 'PanelHandle' },
      { id: 'matcher', label: 'Matcher, Offer' },
      { id: 'cart', label: 'CartAddition' },
      { id: 'related', label: 'Related, Proposal' },
      { id: 'host', label: 'PluginHost' },
      { id: 'shared', label: 'Shared singletons' },
    ],
  },
  {
    id: 'howto',
    label: 'How to',
    children: [
      { id: 'task-terms', label: 'Answer about terms' },
      { id: 'task-cart', label: 'Add to the cart' },
      { id: 'task-crumbs', label: 'Title, trail and terms' },
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
        {rows.map(([name, type, required, text]) => (
          <Tr key={name}>
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

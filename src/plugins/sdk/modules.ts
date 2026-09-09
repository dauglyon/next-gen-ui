import type { CartItem } from './cart';
import type { CommandCall } from './contract';
import type { PluginHost } from './host';
import type { PanelHandle } from './panel';

// The five modules a plugin can expose, in the order the host reaches them.
// Each `define*` is identity at runtime: it exists so the file's default
// export is typed, and so a plugin that omits a required field — a route
// without `normalize` — fails to compile rather than to run.

export type Cleanup = () => void;

// A panel's body. Called once, when the panel is first shown, with the
// element to draw into; the return is called when the panel goes away.
// `fromReact` builds one from a component.
export type Mount = (
  el: HTMLElement,
  ctx: { panel: PanelHandle; host: PluginHost },
) => Cleanup | void;

export interface Route {
  mount: Mount;
  // Two paths are the same page when this maps them to one string. The host
  // opens and deduplicates on what it returns, and never reads a path itself.
  normalize: (path: string) => string;
}

export interface Pane {
  mount: Mount;
  // `content`: the sidebar block hugs its content instead of taking a share
  // of the stack's height — for toolbars and status panels.
  fit?: 'content';
}

// What the host asks about: typed text, or a pool of terms from panels and
// the cart. The signal aborts when the question changes.
export interface Query {
  text?: string;
  terms?: string[];
  signal: AbortSignal;
}

export interface Recommendation {
  commands?: (q: Query) => CommandCall[] | Promise<CommandCall[]>;
  cartItems?: (q: Query) => CartItem[] | Promise<CartItem[]>;
}

export interface StatusItem {
  text: string;
  // Run when the line is pressed.
  action?: CommandCall;
}

export interface Background {
  // Every keystroke, and whenever a panel changes its terms. Synchronous,
  // no I/O: recognise the shape of the text and nothing more.
  terms?: (q: Query) => string[];
  // When a query settles. May fetch.
  recommend?: Recommendation;
  // At startup and after every command; shown until the next call.
  status?: () => StatusItem[];
}

export type CommandValues = Record<string, string | number>;

// What a command handler runs against. `caller` is the plugin that called
// `execute`, or 'user' for the prompt bar and every button.
export interface CommandContext {
  host: PluginHost;
  caller: string;
}

export type CommandHandler = (args: CommandValues, ctx: CommandContext) => void | Promise<void>;

export type Commands = Record<string, CommandHandler>;

// Where the next free-text message lands, shown above the prompt bar.
export interface Destination {
  label: string;
  // This plugin's route for it; the bar offers a jump there.
  path?: string;
  // Other places it could land, and how the user picks one.
  options?: { key: string; label: string }[];
  select?: (key: string) => void;
}

export interface Prompt {
  // Free text the prompt bar did not resolve to a command or a suggestion,
  // with the term pool and the cart as it stood when Enter was pressed.
  handle: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>;
  destination?: {
    // What the bar shows; read whenever it redraws.
    current: () => Destination | null;
    // Call `onChange` when `current()` would differ; the function returned
    // stops the calls.
    subscribe: (onChange: () => void) => () => void;
  };
}

export interface Modules {
  background: Background;
  route: Route;
  pane: Pane;
  commands: Commands;
  prompt: Prompt;
}

export const defineBackground = (b: Background): Background => b;
export const defineRoute = (r: Route): Route => r;
export const definePane = (p: Pane): Pane => p;
export const defineCommands = (c: Commands): Commands => c;
export const definePrompt = (p: Prompt): Prompt => p;

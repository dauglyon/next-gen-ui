import type { ComponentType } from 'react';
import type { PluginHost } from './host';

// The module a plugin's entry exports: the code side of the manifest. The
// host checks each manifest declaration against the module it loads and
// reports (not throws) on a mismatch.

export interface StatusItem {
  text: string;
  // A slash command name to run when the item is activated.
  command?: string;
}

export type CommandValues = Record<string, string | number>;

export interface PromptRequest {
  text: string;
  signal: AbortSignal;
}

// The assistant. Free text from the prompt bar arrives here; the handler
// drives its own UI through the host (opening or updating its document).
export type PromptHandler = (request: PromptRequest, host: PluginHost) => Promise<void>;

// A destination the assistant could send free text to.
export interface PromptDestinationOption {
  key: string;
  label: string;
}

// Where the next free-text prompt will land: the open conversation, or
// what submitting would create ("A new arc"). Only the assistant knows
// this; the host shows it above the prompt bar. With `options` and
// `select` the host offers switching the destination before sending;
// with `documentParams` it offers opening the destination's document.
export interface PromptContext {
  label: string;
  documentParams?: Record<string, string>;
  options?: PromptDestinationOption[];
  select?: (key: string) => void;
}

export interface PluginModule {
  navigator?: ComponentType;
  document?: ComponentType;
  commands?: Record<string, (values: CommandValues, host: PluginHost) => void | Promise<void>>;
  prompt?: PromptHandler;
  // A hook, so counts can be live. Called by the host once the module has
  // loaded, which happens when a panel renders or a command runs.
  useStatus?: () => StatusItem[];
  // A hook naming where free text will land (see PromptContext). Called
  // once the module has loaded; until then the bar names only the plugin.
  usePromptContext?: () => PromptContext | null;
}

export function definePlugin(module: PluginModule): PluginModule {
  return module;
}

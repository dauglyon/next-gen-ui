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

export interface PluginModule {
  navigator?: ComponentType;
  document?: ComponentType;
  commands?: Record<string, (values: CommandValues, host: PluginHost) => void | Promise<void>>;
  prompt?: PromptHandler;
  // A hook, so counts can be live. Called by the host once the module has
  // loaded, which happens when a panel renders or a command runs.
  useStatus?: () => StatusItem[];
}

export function definePlugin(module: PluginModule): PluginModule {
  return module;
}

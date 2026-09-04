import type { WorkbenchStore } from '../core';
import type { CommandRegistry } from '../commands';
import type { PanelSource } from '../host/types';
import type { Announcer } from './announcer';
import type { TitleStore } from './titles';

export interface PromptHandle {
  register: (focus: () => void) => () => void;
  focus: () => void;
}

export function createPromptHandle(): PromptHandle {
  let current: (() => void) | null = null;
  return {
    register(focus) {
      current = focus;
      return () => {
        if (current === focus) current = null;
      };
    },
    focus: () => current?.(),
  };
}

// Everything the React layer needs, built once outside React so route
// loaders can reach the same store the components render.
export interface WorkbenchServices {
  store: WorkbenchStore;
  registry: CommandRegistry;
  source: PanelSource;
  titles: TitleStore;
  announcer: Announcer;
  // The prompt bar registers itself here on mount so commands can focus it.
  prompt: PromptHandle;
  // Set to 'user' by pointer/focus handlers right before they dispatch a
  // focus change, so the DOM-focus sync leaves the user's caret alone.
  focusIntentRef: { current: 'command' | 'user' };
}

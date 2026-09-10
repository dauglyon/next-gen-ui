import { z } from 'zod';
import { createEmitter } from '../../plugins/sdk';
import { readStorage, writeStorage } from './storage';

// User settings that are not layout: which plugin answers the prompt bar,
// and which suggests commands for what is typed there. Persisted separately
// so resetting the layout keeps them. A setting a saved copy predates keeps
// its default.
export const SettingsSchema = z.object({
  assistant: z.string().nullable(),
  intent: z.string().nullable().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SETTINGS_STORAGE_KEY = 'workbench.settings.v1';

export interface SettingsStore {
  get: () => Settings;
  set: (patch: Partial<Settings>) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createSettingsStore(storage: Storage | null, defaults: Settings): SettingsStore {
  let current: Settings = { ...defaults, ...(read(storage) ?? {}) };
  const { subscribe, notify } = createEmitter();
  return {
    subscribe,
    get: () => current,
    set(patch) {
      current = { ...current, ...patch };
      writeStorage(storage, SETTINGS_STORAGE_KEY, JSON.stringify(current));
      notify();
    },
  };
}

function read(storage: Storage | null): Settings | null {
  const text = readStorage(storage, SETTINGS_STORAGE_KEY);
  if (!text) return null;
  try {
    const parsed = SettingsSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

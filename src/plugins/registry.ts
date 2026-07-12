import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

export type PluginScope = 'global' | 'per-pod';

// `id` is both the Module Federation remote name and the URL segment the
// plugin mounts at. `per-pod` plugins aren't mountable yet (no project
// concept in the app).
const PluginEntry = z.object({
  id: z.string(),
  manifestUrl: z.string(),
  scope: z.enum(['global', 'per-pod']),
});
export type PluginEntry = z.infer<typeof PluginEntry>;

// No registry service exists yet; stubbed via MSW in dev and test.
const REGISTRY_URL = import.meta.env.VITE_PLUGIN_REGISTRY_URL ?? '/plugin-registry';

async function fetchPlugins(scope: PluginScope): Promise<PluginEntry[]> {
  const res = await fetch(`${REGISTRY_URL}/plugins?scope=${scope}`);
  if (!res.ok) throw new Error(`Plugin registry request failed: ${res.status}`);
  return z.array(PluginEntry).parse(await res.json());
}

export function pluginsOptions(scope: PluginScope = 'global') {
  return queryOptions({ queryKey: ['plugins', scope], queryFn: () => fetchPlugins(scope) });
}

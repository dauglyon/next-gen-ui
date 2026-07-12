// Guards the shared-React fix: host.ts must load plugins through the Module
// Federation runtime globals (registerRemotes / loadRemote) — the instance the
// vite federation() plugin initialized, which holds the shared-singleton scope.
// If someone reverts to a fresh createInstance, a plugin gets its own React and
// these mocked globals go uncalled, failing the test. Also covers the contract
// version gate.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@module-federation/runtime', () => ({
  registerRemotes: vi.fn(),
  loadRemote: vi.fn(),
}));

import { loadRemote, registerRemotes } from '@module-federation/runtime';
import { CONTRACT_VERSION } from './sdk';
import { loadPlugin, registerPlugin } from './host';

const Component = () => null;

beforeEach(() => {
  vi.mocked(registerRemotes).mockClear();
  vi.mocked(loadRemote).mockReset();
});

describe('plugin host', () => {
  it('registers a remote via the shared runtime', () => {
    registerPlugin({ id: 'alpha', manifestUrl: 'https://reg/assets/alpha/mf-manifest.json' });
    expect(registerRemotes).toHaveBeenCalledWith(
      [{ name: 'alpha', entry: 'https://reg/assets/alpha/mf-manifest.json' }],
      expect.anything(),
    );
  });

  it('loads a plugin through loadRemote and returns it', async () => {
    vi.mocked(loadRemote).mockResolvedValue({ default: { contractVersion: CONTRACT_VERSION, Component } });
    const plugin = await loadPlugin('alpha');
    expect(loadRemote).toHaveBeenCalledWith('alpha/Plugin');
    expect(plugin.Component).toBe(Component);
  });

  it('rejects a module with no Component', async () => {
    vi.mocked(loadRemote).mockResolvedValue({ default: { contractVersion: CONTRACT_VERSION } });
    await expect(loadPlugin('alpha')).rejects.toThrow(/no valid/i);
  });

  it('rejects a plugin built for a different contract version', async () => {
    vi.mocked(loadRemote).mockResolvedValue({ default: { contractVersion: '999', Component } });
    await expect(loadPlugin('alpha')).rejects.toThrow(/contract/i);
  });
});

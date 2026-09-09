import { describe, expect, it } from 'vitest';
import { CONTRACT_VERSION, ManifestSchema, qualifyCommand } from './contract';

const base = { id: 'jobs', title: 'Jobs', contractVersion: CONTRACT_VERSION };

describe('ManifestSchema', () => {
  it('accepts a minimal manifest', () => {
    expect(ManifestSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    ['an uppercase id', { ...base, id: 'Jobs' }],
    ['an id with a slash', { ...base, id: 'a/b' }],
    ['another contract version', { ...base, contractVersion: 2 }],
    ['a route without a leading slash', { ...base, document: { route: 'job/$id' } }],
    ['a command name with spaces', { ...base, commands: [{ name: 'do it', title: 'x' }] }],
    ['a call to a command with a slash', { ...base, launcher: { label: 'x', command: '/open' } }],
  ])('rejects %s', (_label, raw) => {
    expect(ManifestSchema.safeParse(raw).success).toBe(false);
  });

  it('accepts a full manifest', () => {
    const result = ManifestSchema.safeParse({
      ...base,
      icon: 'Gear',
      navigator: {},
      document: { route: '/job/$id' },
      commands: [
        {
          name: 'cancel',
          title: 'Cancel a job',
          args: [{ name: 'id', required: true }],
        },
      ],
      shortcuts: [{ label: 'Cancel 12', command: 'cancel', args: { id: '12' } }],
      launcher: { label: 'Jobs', command: 'workbench:open', args: { plugin: 'jobs' } },
      promptHandler: false,
      entry: { url: '/plugin-registry/jobs/remoteEntry.js', module: './plugin' },
    });
    expect(result.success).toBe(true);
  });
});

describe('qualifyCommand', () => {
  it('gives a bare name to its owner and leaves a qualified one alone', () => {
    expect(qualifyCommand('cancel', 'jobs')).toBe('jobs:cancel');
    expect(qualifyCommand('genknown:taxon', 'jobs')).toBe('genknown:taxon');
  });
});

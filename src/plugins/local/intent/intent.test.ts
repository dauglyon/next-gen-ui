import { describe, expect, it } from 'vitest';
import intent from './intent';

const signal = new AbortController().signal;

describe('the bundled intent', () => {
  intent.index([
    {
      plugin: 'function-junction',
      pluginTitle: 'Function Junction',
      name: 'open',
      title: 'Open the evidence dossier for a protein',
      args: [{ name: 'q', description: 'a UniProt or RefSeq id, a gene name, or a sequence' }],
    },
  ]);

  it('leads a row of its own with the identifier and captions it with the command', async () => {
    const [row] = await intent.suggest({ text: 'evidence for WP_000123456.1', terms: [], signal });
    expect(row.call.label).toBe('WP_000123456.1');
    expect(row.detail).toBe('Open the evidence dossier for a protein · Function Junction');
  });
});

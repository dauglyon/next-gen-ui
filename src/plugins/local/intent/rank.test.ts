import { describe, expect, it } from 'vitest';
import type { DeclaredCommand } from '@kbase/plugin-sdk';
import { buildCommandIndex, rankCommands } from './rank';
import { tagText } from './tag';

const fj = { plugin: 'function-junction', pluginTitle: 'Function Junction' };
const gk = { plugin: 'genknown', pluginTitle: 'genKnown' };
const jobs = { plugin: 'jobs', pluginTitle: 'Jobs' };

const commands: DeclaredCommand[] = [
  {
    ...fj,
    name: 'open',
    title: 'Open the evidence dossier for a protein',
    args: [{ name: 'q', description: 'a UniProt or RefSeq id, a gene name, or a sequence' }],
  },
  {
    ...gk,
    name: 'open',
    title: 'Open the taxon dossier',
    args: [
      {
        name: 'q',
        description: 'a taxon name, NCBI taxid, FitnessBrowser orgId, or genome accession',
      },
    ],
  },
  {
    ...gk,
    name: 'compare',
    title: 'Compare two taxa',
    args: [
      { name: 'a', description: 'a taxon name or NCBI taxid' },
      { name: 'b', description: 'a taxon name or NCBI taxid' },
    ],
  },
  {
    ...jobs,
    name: 'cancel',
    title: 'Cancel a job',
    args: [{ name: 'id', required: true, description: 'job id' }],
    semantics: { description: 'Cancel, stop, kill or abort a running or queued job.' },
  },
  {
    ...jobs,
    name: 'open',
    title: 'Open a job',
    args: [{ name: 'id', required: true, description: 'job id' }],
  },
];

const index = buildCommandIndex(commands);
const rank = (text: string, terms: string[] = []) =>
  rankCommands(index, text, tagText(text), terms);

describe('ranking commands against typed text', () => {
  it('reads an accession as what it is and fills the argument', () => {
    const [top] = rank('I want a dossier for P0AEX9');
    expect(top.command).toBe('function-junction:open');
    expect(top.args).toEqual({ q: 'P0AEX9' });
  });

  it('lets the identifier decide between two dossiers', () => {
    const [top] = rank('dossier for taxon:562');
    expect(top.command).toBe('genknown:open');
    expect(top.args).toEqual({ q: '562' });
  });

  it('ranks by the semantics section, which no title carries', () => {
    const [top] = rank('kill the running job');
    expect(top.command).toBe('jobs:cancel');
  });

  it('binds a plugin-minted term through its prefix letters', () => {
    const [top] = rank('cancel this job', ['job:12']);
    expect(top.command).toBe('jobs:cancel');
    expect(top.args).toEqual({ id: '12' });
  });

  it('fills two arguments from two terms, in order', () => {
    const [top] = rank('compare taxon:562 with taxon:1423');
    expect(top.command).toBe('genknown:compare');
    expect(top.args).toEqual({ a: '562', b: '1423' });
  });

  it('leaves an argument empty rather than guess it', () => {
    const [top] = rank('protein dossier for job:12', ['job:12']);
    expect(top.command).toBe('function-junction:open');
    expect(top.args).toEqual({});
  });

  it('answers nothing for letters in common', () => {
    expect(rank('xq')).toEqual([]);
    expect(rank('what is the weather like')).toEqual([]);
  });

  // A fragment carries its own n-grams; one buried in "I want a" does not
  // clear the floor until the word is nearly whole.
  it('answers while a word is still being typed', () => {
    expect(rank('kill the runn')[0]?.command).toBe('jobs:cancel');
    expect(rank('cancel jo')[0]?.command).toBe('jobs:cancel');
  });

  it('shows at most four rows', () => {
    expect(rank('open').length).toBeLessThanOrEqual(4);
  });
});

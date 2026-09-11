import { describe, expect, it } from 'vitest';
import { namespaceOf, tagText } from './tag';

const terms = (text: string) => tagText(text).map((t) => t.term);

describe('tagging identifiers in typed text', () => {
  it('finds an accession inside a sentence, with its span', () => {
    const [tag] = tagText('I want a dossier for P0AEX9.');
    expect(tag).toEqual({
      term: 'uniprot:P0AEX9',
      prefix: 'uniprot',
      id: 'P0AEX9',
      start: 21,
      end: 27,
    });
  });

  const alias = 'reads a typed prefix by any of its registry aliases';
  const anyCase = 'matches a shape in any case and mints the id in the registry case';
  // 767 registry patterns match a bare integer; none of them is minted.
  const bare = 'tags no bare integer';
  const minted = 'knows the shapes the plugins already mint';
  const shaped = 'tags the accession-shaped and not the word-shaped';
  it.each([
    [alias, 'taxon:562', ['ncbitaxon:562']],
    [alias, 'taxid:562 and ncbi:562', ['ncbitaxon:562', 'ncbitaxon:562']],
    [alias, 'GO:0008150', ['go:0008150']],
    [alias, 'CHEBI:15377', ['chebi:15377']],
    [alias, 'PMID:16333295', ['pubmed:16333295']],
    [anyCase, 'dossier for p0aex9', ['uniprot:P0AEX9']],
    [bare, '562', []],
    [bare, '0008150', []],
    [bare, 'what is 9606', []],
    [minted, 'GCF_000005845.2', ['insdc.gcf:GCF_000005845.2']],
    [minted, 'RS_GCF_000005845.2', ['gtdb.genome:RS_GCF_000005845.2']],
    [minted, '12345/6/7', ['upa:12345/6/7']],
    [minted, 'WP_000123456.1', ['refseq:WP_000123456.1']],
    [minted, 'd__Bacteria;p__Pseudomonadota', ['gtdb:d__Bacteria;p__Pseudomonadota']],
    // K00001 is also a well-formed INSDC nucleotide accession; both are minted.
    [shaped, 'K00001 in K12', ['insdc:K00001', 'kegg.orthology:K00001']],
    [shaped, 'EC 1.1.1.1', ['ec:1.1.1.1']],
    [shaped, '1abc but not 2024', ['pdb:1abc']],
    [shaped, 'malE recA Escherichia coli', []],
    [shaped, 'PF00001 IPR000001', ['pfam:PF00001', 'interpro:IPR000001']],
    [
      'strips the punctuation around a token',
      '(P0AEX9), "Q9X0E6"?',
      ['uniprot:P0AEX9', 'uniprot:Q9X0E6'],
    ],
  ])('%s: %s', (_property, text, expected) => {
    expect(terms(text)).toEqual(expected);
  });

  it('mints a lower-cased accession in the registry case', () => {
    expect(terms('gcf_000005845.2')).toContain('insdc.gcf:GCF_000005845.2');
  });
});

describe('what a term prefix is called', () => {
  it('uses the registry words for a known prefix', () => {
    expect(namespaceOf('ncbitaxon:562')?.words).toContain('NCBI Taxonomy');
    expect(namespaceOf('ncbitaxon:562')?.id).toBe('562');
  });

  it('falls back to the prefix letters for a plugin-minted one', () => {
    expect(namespaceOf('taxon-name:Cupriavidus')).toEqual({
      prefix: 'taxon-name',
      id: 'Cupriavidus',
      words: ['taxon', 'name'],
    });
    expect(namespaceOf('bare')).toBeNull();
  });
});

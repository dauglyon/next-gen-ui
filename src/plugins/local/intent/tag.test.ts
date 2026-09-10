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

  // A typed prefix is read by any of its registry aliases; a shape matches
  // in any case and mints the id in the registry's; no bare integer is
  // minted, since 767 registry patterns match one; K00001 is also a
  // well-formed INSDC nucleotide accession, so both are minted.
  it.each([
    ['taxon:562', ['ncbitaxon:562']],
    ['taxid:562 and ncbi:562', ['ncbitaxon:562', 'ncbitaxon:562']],
    ['GO:0008150', ['go:0008150']],
    ['CHEBI:15377', ['chebi:15377']],
    ['PMID:16333295', ['pubmed:16333295']],
    ['dossier for p0aex9', ['uniprot:P0AEX9']],
    ['562', []],
    ['0008150', []],
    ['what is 9606', []],
    ['GCF_000005845.2', ['insdc.gcf:GCF_000005845.2']],
    ['RS_GCF_000005845.2', ['gtdb.genome:RS_GCF_000005845.2']],
    ['12345/6/7', ['upa:12345/6/7']],
    ['WP_000123456.1', ['refseq:WP_000123456.1']],
    ['d__Bacteria;p__Pseudomonadota', ['gtdb:d__Bacteria;p__Pseudomonadota']],
    ['K00001 in K12', ['insdc:K00001', 'kegg.orthology:K00001']],
    ['EC 1.1.1.1', ['ec:1.1.1.1']],
    ['1abc but not 2024', ['pdb:1abc']],
    ['malE recA Escherichia coli', []],
    ['PF00001 IPR000001', ['pfam:PF00001', 'interpro:IPR000001']],
    ['(P0AEX9), "Q9X0E6"?', ['uniprot:P0AEX9', 'uniprot:Q9X0E6']],
  ])('%s → %j', (text, expected) => {
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

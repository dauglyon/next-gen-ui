import type { Matcher } from '@kbase/plugin-sdk';

// GenKnown browses what is known about a genome, so it claims the
// identifiers that name one and the vocabulary of genomes and the
// organisms they came from.

const IDENTIFIERS: Array<[RegExp, string]> = [
  [/^GC[AF]_\d{9}(?:\.\d+)?$/i, 'assembly accession'],
  [/^(?:taxon|taxid|ncbitaxon)[:_]\s?\d{1,8}$/i, 'NCBI taxon'],
  // A KBase object: workspace/object, with an optional version.
  [/^\d+\/\d+(?:\/\d+)?$/, 'KBase object reference'],
  // Nucleotides. Note ACGT are also amino-acid letters, so a plain DNA
  // run matches Function Junction too — two plugins volunteering for one
  // string is the expected case, not a conflict.
  [/^[ACGTUN]{20,}$/i, 'nucleotide sequence'],
  // A binomial: "Escherichia coli", "E. coli", "B. subtilis str. 168".
  // The genus must be abbreviated with a point or long enough to be one,
  // which is what keeps ordinary two-word phrases out.
  [
    /^(?:[A-Z]\.|[A-Z][a-z]{4,})\s+[a-z]{3,}(?:\s+(?:subsp|str|sp|var)\.?\s+\S+)?$/,
    'organism name',
  ],
];

const TOPICS: Array<[string[], string]> = [
  [['genome', 'assembly', 'contig', 'scaffold', 'plasmid', 'chromosome'], 'genome data'],
  [['organism', 'strain', 'isolate', 'culture'], 'organism data'],
  [['taxonomy', 'taxon', 'clade', 'phylogeny', 'lineage', 'phylum'], 'taxonomy'],
  [['pangenome', 'core-genome', 'accessory'], 'pangenome data'],
  [['16s', 'rrna', 'marker', 'barcode'], 'marker genes'],
];

export const match: Matcher = (text) => {
  const q = text.trim();
  if (!q) return [];
  for (const [pattern, why] of IDENTIFIERS) {
    if (pattern.test(q)) return [{ params: { q }, why }];
  }
  // Both forms of a word ending in s, since it may be a plural (proteins)
  // or may not (fitness); stripping outright loses the latter.
  const words = new Set(
    q
      .toLowerCase()
      .split(/[^a-z0-9-]+/)
      .filter(Boolean)
      .flatMap((w) => (w.endsWith('s') ? [w, w.slice(0, -1)] : [w])),
  );
  for (const [terms, why] of TOPICS) {
    if (terms.some((t) => words.has(t))) return [{ params: { q }, why }];
  }
  return [];
};

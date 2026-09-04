import type { Matcher } from '@kbase/plugin-sdk';

// Function Junction converges every line of functional evidence on one
// protein, so it claims the identifiers that name a protein and the
// vocabulary of the evidence it aggregates. Both lists are the plugin's
// own: the host has no idea what a Pfam family is, and does not need to.

// Identifiers, in the shapes their registries publish.
const IDENTIFIERS: Array<[RegExp, string]> = [
  [
    /^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})$/i,
    'UniProt accession',
  ],
  [/^(?:EC[: ]?)?\d+\.\d+\.\d+\.(?:\d+|-)$/i, 'EC number'],
  [/^PF\d{5}$/i, 'Pfam family'],
  [/^IPR\d{6}$/i, 'InterPro entry'],
  [/^K\d{5}$/, 'KEGG ortholog'],
  [/^[0-9][A-Za-z0-9]{3}$/, 'PDB entry'],
  // A gene symbol: lowercase stem, capitalised suffix — nifH, recA, rpoB.
  // The capital is what keeps ordinary words out.
  [/^[a-z]{2,4}[A-Z][0-9]?$/, 'gene symbol'],
  // Amino-acid residues. A short run is a word, not a sequence.
  [/^[ACDEFGHIKLMNPQRSTVWY]{20,}$/i, 'protein sequence'],
];

// The words its users use, by the evidence axis they land on. Singular:
// a trailing s is stripped before matching.
const TOPICS: Array<[string[], string]> = [
  [['structure', 'alphafold', 'pdb', 'fold', 'foldseek', 'conformation'], 'structural evidence'],
  [
    ['ortholog', 'homolog', 'paralog', 'interaction', 'neighborhood', 'operon'],
    'comparative evidence',
  ],
  [['fitness', 'tnseq', 'essential', 'knockout', 'phenotype'], 'fitness evidence'],
  [['domain', 'pfam', 'interpro', 'motif', 'architecture'], 'domain architecture'],
  [['paper', 'literature', 'publication', 'paperblast', 'citation'], 'literature evidence'],
  [
    ['protein', 'enzyme', 'annotation', 'function', 'kinase', 'transporter', 'reaction', 'pathway'],
    'protein evidence',
  ],
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

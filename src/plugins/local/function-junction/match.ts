import type { Matcher } from '@kbase/plugin-sdk';

// UniProtKB accession, in the registry's own shape.
const ACCESSION = /^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})$/i;
// Amino-acid residues. A short run is a word, not a sequence.
const RESIDUES = /^[ACDEFGHIKLMNPQRSTVWY]{20,}$/i;

// What this app claims. The host never learns what a UniProt accession
// is; it only relays the plugin's own answer.
export const match: Matcher = (text) => {
  const q = text.trim();
  if (ACCESSION.test(q)) return [{ params: { q }, why: 'UniProt accession' }];
  if (RESIDUES.test(q)) return [{ params: { q }, why: 'protein sequence' }];
  return [];
};

import type { Matcher } from '@kbase/plugin-sdk';

// GenBank/RefSeq assembly accessions.
const ASSEMBLY = /^GC[AF]_\d{9}(?:\.\d+)?$/i;
// A taxon, said explicitly: bare numbers are too many other things.
const TAXON = /^taxon:\d{1,8}$/i;
// Nucleotides. Note ACGT are also amino-acid letters, so a plain DNA run
// matches Function Junction too — two plugins volunteering for one
// string is the expected case, not a conflict.
const NUCLEOTIDES = /^[ACGTUN]{20,}$/i;

export const match: Matcher = (text) => {
  const q = text.trim();
  if (ASSEMBLY.test(q)) return [{ params: { q }, why: 'assembly accession' }];
  if (TAXON.test(q)) return [{ params: { q }, why: 'NCBI taxon' }];
  if (NUCLEOTIDES.test(q)) return [{ params: { q }, why: 'nucleotide sequence' }];
  return [];
};

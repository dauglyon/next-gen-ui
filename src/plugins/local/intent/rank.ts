import type { ArgDecl, CommandCall, DeclaredCommand } from '@kbase/plugin-sdk';
import { qualifyCommand } from '@kbase/plugin-sdk';
import type { Tag } from './tag';
import { namespaceOf, shapeFor } from './tag';

// A command is indexed by what its declaration says about it: the plugin,
// the name, the title, the descriptions, the semantics section, the examples.
// Text is scored against that by character n-gram cosine, which is what
// held up best on partial words and on descriptions that share letters but
// not tokens with what was typed. An identifier in the text is scored as
// what it is rather than as letters: its span is replaced by the registry's
// name for the prefix, so `P0AEX9` reads as "UniProt Protein" against an
// argument described as "a UniProt or RefSeq id".
//
// An argument is filled by the same cosine, between the prefix's words and
// the argument's description, when one argument clearly takes the term.
// No shared vocabulary is assumed between the plugin that mints a prefix
// and the one whose argument takes it: a description that says what it
// takes, in words, is enough.

export interface RankedCall {
  plugin: string;
  pluginTitle: string;
  // Qualified: "plugin:name".
  command: string;
  title: string;
  // The plugin's own wording, when the row is its offer.
  label?: string;
  args: Record<string, string | number>;
  score: number;
}

interface Entry {
  decl: DeclaredCommand;
  command: string;
  vector: Map<string, number>;
  // Each argument's description as a vector, for binding.
  argVectors: Map<string, number>[];
}

export interface CommandIndex {
  entries: Entry[];
  idf: Map<string, number>;
  // The idf of a gram no document has.
  unseen: number;
}

// Below this cosine a match is letters in common, not a command in mind.
// Chosen where, on the routing set, coverage was still 96% and precision
// rose; at 0.3 precision rose further but a tenth of real queries went
// unanswered.
export const FLOOR = 0.2;
// Below this an argument's description does not say it takes the term.
export const BIND_FLOOR = 0.15;
// Added to a command a plugin offered for a term in the text: the plugin
// recognising its own identifier is evidence the command applies, and the
// row keeps the plugin's label and arguments. The lift is not a judgement of
// the sentence: an offer for an identifier that is a coincidence in context
// scores by the letters around it like anything else, and with this scorer
// that is usually above the floor. Dropping it needs a scorer that reads
// context.
export const OFFER_LIFT = 0.1;

const N_MIN = 2;
const N_MAX = 5;

// Character n-grams within word boundaries, each word padded with a space,
// as a multiset.
function counts(text: string): Map<string, number> {
  const c = new Map<string, number>();
  for (const word of text.toLowerCase().split(/\s+/)) {
    if (!word) continue;
    const padded = ` ${word} `;
    for (let n = N_MIN; n <= N_MAX; n++) {
      for (let i = 0; i + n <= padded.length; i++) {
        const g = padded.slice(i, i + n);
        c.set(g, (c.get(g) ?? 0) + 1);
      }
    }
  }
  return c;
}

// Sublinear tf, smoothed idf, unit length: sklearn's defaults, which the
// numbers were measured with.
function vectorize(text: string, idf: Map<string, number>, unseen: number): Map<string, number> {
  const v = new Map<string, number>();
  let norm = 0;
  for (const [g, tf] of counts(text)) {
    const w = (1 + Math.log(tf)) * (idf.get(g) ?? unseen);
    v.set(g, w);
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [g, w] of v) v.set(g, w / norm);
  return v;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [g, w] of small) dot += w * (large.get(g) ?? 0);
  return dot;
}

const argText = (arg: ArgDecl) => `${arg.name} ${arg.description ?? ''}`;

const docOf = (d: DeclaredCommand) =>
  [
    d.plugin,
    d.pluginTitle,
    d.name,
    d.title,
    d.description ?? '',
    d.semantics?.description ?? '',
    ...(d.semantics?.examples ?? []),
    ...(d.args ?? []).map(argText),
  ].join(' ');

export function buildCommandIndex(commands: DeclaredCommand[]): CommandIndex {
  const docs = commands.map((decl) => ({ decl, text: docOf(decl) }));
  const df = new Map<string, number>();
  for (const { text } of docs) {
    for (const g of counts(text).keys()) df.set(g, (df.get(g) ?? 0) + 1);
  }
  const n = docs.length;
  const idf = new Map([...df].map(([g, d]) => [g, Math.log((1 + n) / (1 + d)) + 1]));
  const unseen = Math.log(1 + n) + 1;
  const entries = docs.map(({ decl, text }) => ({
    decl,
    command: qualifyCommand(decl.name, decl.plugin),
    vector: vectorize(text, idf, unseen),
    argVectors: (decl.args ?? []).map((a) => vectorize(argText(a), idf, unseen)),
  }));
  return { entries, idf, unseen };
}

// The text with each tagged span read as the kind of thing it is.
function reading(text: string, tags: Tag[]): string {
  let out = '';
  let at = 0;
  for (const tag of [...tags].sort((a, b) => a.start - b.start)) {
    if (tag.start < at) continue;
    out += text.slice(at, tag.start) + (shapeFor(tag.prefix)?.name ?? tag.prefix);
    at = tag.end;
  }
  return out + text.slice(at);
}

// One argument per term: the unfilled one whose description takes it best,
// the earlier declared of two that take it equally. A term no argument
// takes fills nothing.
function bind(entry: Entry, index: CommandIndex, terms: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  const argDecls = entry.decl.args ?? [];
  for (const term of terms) {
    const ns = namespaceOf(term);
    if (!ns) continue;
    const query = vectorize(ns.words.join(' '), index.idf, index.unseen);
    let best = -1;
    let bestScore = -Infinity;
    entry.argVectors.forEach((v, i) => {
      const score = cosine(query, v);
      if (!(argDecls[i].name in args) && score >= BIND_FLOOR && score > bestScore) {
        best = i;
        bestScore = score;
      }
    });
    if (best >= 0) args[argDecls[best].name] = ns.id;
  }
  return args;
}

export function rankCommands(
  index: CommandIndex,
  text: string,
  tags: Tag[],
  terms: string[],
  offers: CommandCall[] = [],
  limit = 4,
): RankedCall[] {
  const trimmed = text.trim();
  if (trimmed.length < 2 || !index.entries.length) return [];
  const query = vectorize(reading(trimmed, tags), index.idf, index.unseen);
  const pool = [...new Set([...tags.map((t) => t.term), ...terms])];
  const offered = new Map<string, CommandCall>();
  for (const offer of offers) if (!offered.has(offer.command)) offered.set(offer.command, offer);
  return (
    index.entries
      .map((entry) => {
        const offer = offered.get(entry.command);
        return { entry, offer, score: cosine(query, entry.vector) + (offer ? OFFER_LIFT : 0) };
      })
      // A plugin's own offer is the plugin saying it recognised the text; it
      // is ranked by the letters like the rest, never dropped by them.
      .filter(({ offer, score }) => offer || score >= FLOOR)
      .map((row) => ({
        ...row,
        args: row.offer ? (row.offer.args ?? {}) : bind(row.entry, index, pool),
      }))
      // A row runs when pressed, so a command is offered only with every
      // required argument filled: "kill the running job" names no job, and a
      // row for it would open an error, not a job.
      .filter(({ entry, args }) =>
        (entry.decl.args ?? []).every((a) => !a.required || a.name in args),
      )
      .sort((a, b) => b.score - a.score || a.entry.command.localeCompare(b.entry.command))
      .slice(0, limit)
      .map(({ entry: { decl, command }, offer, score, args }) => ({
        plugin: decl.plugin,
        pluginTitle: decl.pluginTitle,
        command,
        title: decl.title,
        label: offer?.label,
        args,
        score,
      }))
  );
}

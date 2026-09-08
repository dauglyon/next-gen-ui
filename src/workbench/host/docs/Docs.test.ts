import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The documentation page prints signatures by hand, because generating them
// from the source would mean a build step and a parser for the sake of nine
// blocks. This is the cheap half of that: every field and function the page
// claims exists has to appear in the file the page names.
//
// It catches the failure that makes reference material worse than none — a
// renamed field the docs still advertise — and does not pretend to catch a
// changed type.

// From the repository root: vitest runs there, and the SDK path is what the
// page prints beside each entry.
const read = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');

const CLAIMS: Record<string, string[]> = {
  'plugins/sdk/contract.ts': [
    'contractVersion',
    'promptHandler',
    'opensEmpty',
    'shortcut',
    'choices',
    'matcher',
    'related',
  ],
  'plugins/sdk/plugin.ts': [
    'export type Matcher',
    'export function definePlugin',
    'usePromptContext',
    'useStatus',
    'prompt?',
  ],
  'plugins/sdk/panel.ts': [
    'setTitle',
    'setCrumbs',
    'setTerms',
    'export function usePanel',
    'export function usePanelTitle',
    'export function usePanelBreadcrumbs',
    'export function usePanelTerms',
  ],
  'plugins/sdk/cart.ts': [
    'export interface CartAddition',
    'export interface CartHandle',
    'export function useCart',
    'subject?',
    'terms?',
    'context?',
  ],
  'plugins/sdk/related.ts': [
    "export type RelatedContext = 'view' | 'cart'",
    'export interface RelatedRequest',
    'export interface Proposal',
    'export type Related',
    'detail?',
    'signal: AbortSignal',
  ],
  'plugins/sdk/host.ts': ['openDocument', 'runCommand', 'export function useHost'],
  'plugins/sdk/shared.ts': ['SHARED_SINGLETONS', '@kbase/design-system', '@kbase/plugin-sdk'],
};

describe('the documented contract', () => {
  for (const [path, claims] of Object.entries(CLAIMS)) {
    it(`still matches ${path}`, () => {
      const source = read(path);
      for (const claim of claims)
        expect(source, `${path} no longer contains "${claim}"`).toContain(claim);
    });
  }
});

describe('the version on the page', () => {
  // Printed from the constant rather than typed, so this only has to hold
  // that the constant is where the page says it is.
  it('comes from the contract', () => {
    expect(read('plugins/sdk/contract.ts')).toContain('export const CONTRACT_VERSION');
  });
});

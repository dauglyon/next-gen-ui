import { describe, expect, it } from 'vitest';
import type { Manifest } from '../../../plugins/sdk';
import { CONTRACT_VERSION } from '../../../plugins/sdk';
import { isApp } from './Home';

// Which installed plugins the launcher can offer as an app.
//
// The rule used to be "no route params", which reads as a statement about
// routes but is really a statement about openability: a document whose route
// names a value can only be reached by a link that already knows the value, so
// a list has nothing to open. A plugin that renders a landing state when its
// params are absent breaks that equivalence, and Function Junction is one —
// its route names a protein so a dossier has a readable URL, and it asks for
// one when none is given. Without `opensEmpty` it published a manifest the
// launcher silently dropped, which is how it went missing.

const manifest = (id: string, document?: Manifest['document']): Manifest => ({
  id,
  title: id,
  description: '',
  contractVersion: CONTRACT_VERSION,
  document,
});

describe('apps on the launcher', () => {
  it('offers a document that takes no params', () => {
    expect(isApp(manifest('settings', { route: '/' }))).toBe(true);
  });

  it('withholds a document whose route names a value it has no way to supply', () => {
    expect(isApp(manifest('koros', { route: '/arc/$slug' }))).toBe(false);
  });

  it('offers one that names a value but says it opens without it', () => {
    expect(isApp(manifest('function-junction', { route: '/protein/$q', opensEmpty: true }))).toBe(
      true,
    );
  });

  it('withholds a plugin with no document at all', () => {
    expect(isApp(manifest('shortcuts'))).toBe(false);
  });
});

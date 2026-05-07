import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COOKIE_NAME, clearToken, getToken, setToken } from './cookie';

beforeEach(() => clearToken());
afterEach(() => clearToken());

describe('getToken', () => {
  it('returns null when the cookie is absent', () => {
    expect(getToken()).toBeNull();
  });

  it('round-trips a normal value', () => {
    setToken('abc123', new Date(Date.now() + 60_000));
    expect(getToken()).toBe('abc123');
  });

  it('round-trips a value with characters that get percent-encoded', () => {
    setToken('a b/c?', new Date(Date.now() + 60_000));
    expect(getToken()).toBe('a b/c?');
  });

  it('returns null and evicts on a malformed percent escape', () => {
    document.cookie = `${COOKIE_NAME}=%E0; path=/`;
    expect(getToken()).toBeNull();
    expect(document.cookie).not.toContain(`${COOKIE_NAME}=%E0`);
  });

  it('returns null for an explicitly empty cookie value', () => {
    document.cookie = `${COOKIE_NAME}=; path=/`;
    expect(getToken()).toBeNull();
  });
});

describe('clearToken', () => {
  it('removes a previously set cookie', () => {
    setToken('xyz', new Date(Date.now() + 60_000));
    expect(getToken()).toBe('xyz');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

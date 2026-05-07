import { ZodError } from 'zod';
import { AuthApiError } from './client';

export interface AuthErrorMessageOptions {
  /**
   * `'signin'` swaps in sign-in-context phrasings on 401/403 ("Sign-in
   * attempt has expired. Try again.") and 5xx ("Auth service is
   * unavailable."). Default leaves the API error message untouched.
   */
  context?: 'signin';
}

/**
 * Translate a thrown auth-layer error into a user-facing line.
 * - `RangeError`: setToken's expiry clamp tripped (very rare; surfaced
 *   at sign-in time).
 * - `AuthApiError`: pass through the message unless `signin` context.
 * - `ZodError`: wire-shape drift (input rules live at the form layer,
 *   so a Zod throw here is always a wire-format problem).
 */
export function authErrorMessage(err: unknown, opts?: AuthErrorMessageOptions): string {
  if (err instanceof RangeError) {
    if (import.meta.env.DEV) console.error('[auth] token expiry clamp triggered', err);
    return 'Sign-in succeeded but the session token expiry looks invalid. Try again or report this.';
  }
  if (err instanceof AuthApiError) {
    if (opts?.context === 'signin') {
      if (err.status === 401 || err.status === 403) {
        return 'Sign-in attempt has expired. Try again.';
      }
      if (err.status >= 500) {
        return 'Auth service is unavailable. Try again in a minute.';
      }
    }
    return err.message;
  }
  if (err instanceof ZodError) return 'Auth service returned a response in an unexpected shape.';
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

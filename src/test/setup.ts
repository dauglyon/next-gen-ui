import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Default handler set: a happy /api/V2/me. Tests override per-case
// via `server.use(...)`. The wildcard host avoids depending on the
// resolved VITE_AUTH_ORIGIN at test time. `idents`, `created`,
// `lastlogin` are deliberately omitted to exercise MeSchema defaults.
export const defaultMeBody = { user: 'tester', display: 'Tester' };

export const handlers = [
  http.get('*/services/auth/api/V2/me', () => HttpResponse.json(defaultMeBody)),
];

export const server = setupServer(...handlers);

// `bypass` so unit tests that stub global.fetch directly (e.g.
// queries.test.ts) aren't flagged.
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

import { test, expect } from '@playwright/test';

// The headline guarantee: a plugin loaded through the host's Module Federation
// runtime reuses the host's React instance instead of bundling its own. This
// loads the real example remote through the real host loader in a real browser
// and asserts React identity — the only faithful proof (jsdom can't run MF's
// script-injection loader).
test('a loaded plugin shares the host React instance', async ({ page, context }) => {
  // Satisfy the auth gate: a session cookie plus mocked KBase token/me.
  await context.addCookies([
    { name: 'kbase_session', value: 'e2e-token', domain: 'localhost', path: '/' },
  ]);
  await page.route('**/services/auth/api/V2/token', (route) =>
    route.fulfill({ json: { id: 'e2e', user: 'tester', mfa: 'Used', expires: 4102444800000 } }),
  );
  await page.route('**/services/auth/api/V2/me', (route) =>
    route.fulfill({ json: { user: 'tester', display: 'Tester' } }),
  );

  // Serve one plugin whose assets are the example remote copied same-origin.
  await page.route('**/plugin-registry/plugins', (route) =>
    route.fulfill({
      json: [{ id: 'example', manifestUrl: '/plugin-registry/assets/example/mf-manifest.json' }],
    }),
  );

  await page.goto('/example');

  // The example remote mounted through the real host loader.
  await expect(page.getByRole('heading', { name: 'Example plugin' })).toBeVisible();

  // Proof: the remote's React IS the host's React (same useState identity). If
  // the shared-singleton wiring regresses, the remote bundles its own copy and
  // these differ.
  const shared = await page.evaluate(() => {
    const w = window as unknown as {
      __hostReact?: { useState?: unknown };
      __pluginReact?: { useState?: unknown };
    };
    return Boolean(w.__hostReact?.useState && w.__hostReact.useState === w.__pluginReact?.useState);
  });
  expect(shared).toBe(true);
});

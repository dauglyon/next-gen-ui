import { defineConfig, devices } from '@playwright/test';

// Browser proof that a loaded plugin shares the host's React (the shared-
// singleton guarantee). Assumes the app is already built with VITE_EXPOSE_REACT
// and the example remote copied into dist — see the `test:e2e` npm script.
const PORT = 41732;

export default defineConfig({
  testDir: './e2e',
  reporter: 'line',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

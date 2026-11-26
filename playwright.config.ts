import { defineConfig, devices } from '@playwright/test'

/* Same port as `npm run dev`, so a dev server that is already up gets reused. */
const PORT = 5555
const isCI = !!process.env.CI

/** See https://playwright.dev/docs/test-configuration. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Specs assert English copy; pin it so the OS locale can't change the UI.
    locale: 'en-US',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  /* Starts Vite for the run, or reuses an `npm run dev` already on the port. */
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
  },
})

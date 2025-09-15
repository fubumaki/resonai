import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// This config lives in repoRoot/playwright, so tests are in ./tests relative to this file.
// Make it absolute so it works no matter where you launch the CLI from.
const TEST_DIR = path.resolve(process.cwd(), './playwright/tests');

const PORT = 3003;
const BASE_URL = `http://localhost:${PORT}`;

console.log(`[PW-CONFIG] NOWEB baseURL=${BASE_URL} | webServer=disabled | testDir=${TEST_DIR}`);

export default defineConfig({
  testDir: TEST_DIR,
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 60_000,
  },
  // IMPORTANT: no webServer here
  webServer: undefined,
  projects: [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }],
});
import { defineConfig, devices } from '@playwright/test';
import type { ReporterDescription } from '@playwright/test';
import path from 'path';

// Tests live in repoRoot/playwright/tests
const TEST_DIR = path.resolve(process.cwd(), './playwright/tests');

const PORT = 3003;
const BASE_URL = `http://localhost:${PORT}`;
const DISABLE_WEBSERVER = !!process.env.PW_DISABLE_WEBSERVER;
const onCI = !!process.env.CI;
const jsonReporterOutputFile =
  process.env.PLAYWRIGHT_JSON_OUTPUT_FILE ??
  (onCI ? 'playwright-report/results.json' : undefined);

const reporters: ReporterDescription[] = [['list']];

if (onCI) {
  reporters.push(['github']);
}

reporters.push(['html', { open: 'never' }]);

if (jsonReporterOutputFile) {
  reporters.push(['json', { outputFile: jsonReporterOutputFile }]);
}

console.log(`[PW-CONFIG] ROOT baseURL=${BASE_URL} | webServer=${DISABLE_WEBSERVER ? 'disabled' : 'enabled'} | testDir=${TEST_DIR}`);

export default defineConfig({
  testDir: TEST_DIR,
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: reporters,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 60_000,
  },
  webServer: DISABLE_WEBSERVER ? undefined : {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }],
});

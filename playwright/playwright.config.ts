import { defineConfig, devices } from '@playwright/test';

const PORT = 3003;
const BASE_URL = `http://localhost:${PORT}`;
const DISABLE_WEBSERVER = !!process.env.PW_DISABLE_WEBSERVER;

// Optional: console hint so you *see* which branch ran
// (shown once when Playwright loads the config)
console.log(`[PW-CONFIG] baseURL=${BASE_URL} | webServer=${DISABLE_WEBSERVER ? 'disabled' : 'enabled'}`);

export default defineConfig({
  testDir: './playwright/tests',
  workers: 1,                 // Single server → single worker = fewer flake points
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
  webServer: DISABLE_WEBSERVER ? undefined : {
    command: 'npm run dev:ci',    // this *pins* Next to :3003
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { PORT: String(PORT) }   // benign; command already sets -p 3003
  },
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ]
});


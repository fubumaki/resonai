#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const outputFile = resolve('.artifacts/playwright.json');
const runner = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const args = ['exec', 'playwright', 'test', ...process.argv.slice(2)];

const child = spawn(runner, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_JSON_OUTPUT_FILE: outputFile,
  },
});

child.on('close', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if (typeof code === 'number' && code !== 0) {
    console.warn(
      `[@playwright/test] exited with code ${code}; preserving report in ${outputFile}`
    );
  }

  process.exit(0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

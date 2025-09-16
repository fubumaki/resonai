#!/usr/bin/env tsx

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const LOCK_FILE = path.resolve(ROOT, '.agent/LOCK');
const RUNNER_SCRIPT = path.resolve(ROOT, 'scripts/agent/runner.ts');
const POLL_INTERVAL = 10000; // 10 seconds
const RESTART_DELAY = 5000; // 5 seconds

class AgentWatchdog {
  private childProcess: ChildProcess | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    const cleanup = () => {
      this.isShuttingDown = true;
      this.stopPolling();
      this.stopChild();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private spawnRunner(): ChildProcess {
    console.log('[watchdog] Starting agent runner...');
    const child = spawn('pnpm', ['exec', 'tsx', RUNNER_SCRIPT], {
      stdio: 'inherit',
      env: process.env,
      cwd: ROOT,
    });

    child.on('error', (error) => {
      console.error('[watchdog] Runner process error:', error);
    });

    child.on('exit', (code, signal) => {
      console.log(`[watchdog] Runner process exited with code ${code}, signal ${signal}`);
      this.childProcess = null;

      if (!this.isShuttingDown) {
        this.scheduleRestart();
      }
    });

    return child;
  }

  private stopChild(): void {
    if (this.childProcess) {
      console.log('[watchdog] Stopping child process...');
      this.childProcess.kill('SIGTERM');

      // Force kill after 10 seconds if it doesn't stop gracefully
      setTimeout(() => {
        if (this.childProcess && !this.childProcess.killed) {
          console.log('[watchdog] Force killing child process...');
          this.childProcess.kill('SIGKILL');
        }
      }, 10000);

      this.childProcess = null;
    }
  }

  private scheduleRestart(): void {
    if (this.restartTimer || this.isShuttingDown) {
      return;
    }

    console.log(`[watchdog] Scheduling restart in ${RESTART_DELAY}ms...`);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.startRunner();
    }, RESTART_DELAY);
  }

  private async startRunner(): Promise<void> {
    if (this.childProcess || this.isShuttingDown) {
      return;
    }

    const lockExists = await this.fileExists(LOCK_FILE);
    if (lockExists) {
      console.log('[watchdog] Lock file present, not starting runner');
      return;
    }

    this.childProcess = this.spawnRunner();
  }

  private async pollLockFile(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    try {
      const lockExists = await this.fileExists(LOCK_FILE);
      const runnerRunning = this.childProcess && !this.childProcess.killed;

      if (lockExists && runnerRunning) {
        console.log('[watchdog] Lock file detected, stopping runner...');
        this.stopChild();
      } else if (!lockExists && !runnerRunning) {
        console.log('[watchdog] Lock file removed, starting runner...');
        this.startRunner();
      }
    } catch (error) {
      console.error('[watchdog] Error during lock file polling:', error);
    }
  }

  private startPolling(): void {
    if (this.pollTimer) {
      return;
    }

    console.log('[watchdog] Starting lock file polling...');
    this.pollTimer = setInterval(() => {
      this.pollLockFile().catch((error) => {
        console.error('[watchdog] Poll error:', error);
      });
    }, POLL_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  public async start(): Promise<void> {
    console.log('[watchdog] Starting agent watchdog...');
    console.log(`[watchdog] Lock file path: ${LOCK_FILE}`);
    console.log(`[watchdog] Runner script: ${RUNNER_SCRIPT}`);
    console.log(`[watchdog] Poll interval: ${POLL_INTERVAL}ms`);

    this.startPolling();
    await this.startRunner();

    console.log('[watchdog] Watchdog started successfully');
  }
}

// Main execution
const main = async (): Promise<void> => {
  const watchdog = new AgentWatchdog();

  try {
    await watchdog.start();
  } catch (error) {
    console.error('[watchdog] Failed to start watchdog:', error);
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error('[watchdog] Unhandled error:', error);
  process.exitCode = 1;
});

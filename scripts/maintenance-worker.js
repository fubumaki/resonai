#!/usr/bin/env node

/**
 * Resonai Maintenance Worker
 * 
 * Automated background worker that maintains codebase health through
 * lightweight, budgeted maintenance cycles.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MaintenanceWorker {
  constructor() {
    this.configPath = '.agent/config.json';
    this.statePath = '.agent/state.json';
    this.queuePath = '.agent/agent_queue.json';
    this.lockPath = '.agent/LOCK';

    this.config = this.loadConfig();
    this.state = this.loadState();
    this.queue = this.loadQueue();
  }

  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    } catch (error) {
      console.error('Failed to load config:', error.message);
      process.exit(1);
    }
  }

  loadState() {
    try {
      if (fs.existsSync(this.statePath)) {
        return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      }
      return {
        lastRun: null,
        currentCycle: 0,
        consecutiveFailures: 0,
        isPaused: false,
        pauseReason: null,
        lastSuccessfulJob: null,
        jobHistory: [],
        budgets: { filesModified: 0, linesModified: 0, jobsExecuted: 0 },
        nextScheduledRun: null,
        backoffUntil: null
      };
    } catch (error) {
      console.error('Failed to load state:', error.message);
      return this.state;
    }
  }

  loadQueue() {
    try {
      if (fs.existsSync(this.queuePath)) {
        return JSON.parse(fs.readFileSync(this.queuePath, 'utf8'));
      }
      return { queue: [], inProgress: [], completed: [], failed: [], retryQueue: [], maxQueueSize: 10, maxRetries: 3 };
    } catch (error) {
      console.error('Failed to load queue:', error.message);
      return { queue: [], inProgress: [], completed: [], failed: [], retryQueue: [], maxQueueSize: 10, maxRetries: 3 };
    }
  }

  saveState() {
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save state:', error.message);
    }
  }

  saveQueue() {
    try {
      fs.writeFileSync(this.queuePath, JSON.stringify(this.queue, null, 2));
    } catch (error) {
      console.error('Failed to save queue:', error.message);
    }
  }

  checkKillSwitch() {
    if (fs.existsSync(this.lockPath)) {
      console.log('🔒 Kill switch activated - pausing maintenance worker');
      this.state.isPaused = true;
      this.state.pauseReason = 'Kill switch activated';
      this.saveState();
      return true;
    }
    return false;
  }

  checkBudgets() {
    const budgets = this.config.budgets;
    const current = this.state.budgets;

    if (current.jobsExecuted >= budgets.maxJobsPerCycle) {
      console.log('📊 Job budget exceeded for this cycle');
      return false;
    }

    if (current.filesModified >= budgets.maxFilesPerCycle) {
      console.log('📁 File budget exceeded for this cycle');
      return false;
    }

    if (current.linesModified >= budgets.maxLinesPerCycle) {
      console.log('📝 Line budget exceeded for this cycle');
      return false;
    }

    return true;
  }

  resetBudgets() {
    this.state.budgets = { filesModified: 0, linesModified: 0, jobsExecuted: 0 };
  }

  async executeJob(job) {
    console.log(`🔄 Executing: ${job.name}`);

    try {
      // Check if command exists in package.json
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (!packageJson.scripts || !packageJson.scripts[job.command.split(' ')[1]]) {
        console.log(`⚠️  Command not found: ${job.command}`);
        return { success: false, reason: 'Command not found' };
      }

      // Execute the command
      const result = execSync(job.command, {
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: process.cwd()
      });

      console.log(`✅ Job completed: ${job.name}`);
      return { success: true, output: result };

    } catch (error) {
      console.error(`❌ Job failed: ${job.name}`, error.message);
      return { success: false, reason: error.message };
    }
  }

  async runMaintenanceCycle() {
    console.log('🚀 Starting maintenance cycle...');

    // Check kill switch
    if (this.checkKillSwitch()) {
      return;
    }

    // Check if we're in backoff period
    if (this.state.backoffUntil && new Date() < new Date(this.state.backoffUntil)) {
      console.log('⏳ In backoff period, skipping cycle');
      return;
    }

    // Reset budgets for new cycle
    this.resetBudgets();

    // Get available jobs
    const availableJobs = this.config.maintenance.cycles
      .filter(cycle => cycle.priority <= 7)
      .sort((a, b) => a.priority - b.priority);

    let jobsExecuted = 0;

    for (const job of availableJobs) {
      if (!this.checkBudgets()) {
        break;
      }

      const result = await this.executeJob(job);

      if (result.success) {
        jobsExecuted++;
        this.state.budgets.jobsExecuted++;
        this.state.lastSuccessfulJob = job.id;
        this.state.consecutiveFailures = 0;

        // Commit changes if there are any
        try {
          execSync('git add .', { stdio: 'pipe' });
          const status = execSync('git status --porcelain', { encoding: 'utf8' });
          if (status.trim()) {
            execSync(`git commit -m "${job.commitMessage}"`, { stdio: 'pipe' });
            console.log(`📝 Committed: ${job.commitMessage}`);
          }
        } catch (error) {
          console.log('ℹ️  No changes to commit');
        }

      } else {
        this.state.consecutiveFailures++;
        console.log(`⚠️  Job failed: ${job.name} (${result.reason})`);

        // Apply backoff if too many failures
        if (this.state.consecutiveFailures >= this.config.safety.maxConsecutiveFailures) {
          const backoffMinutes = Math.pow(this.config.budgets.backoffMultiplier, this.state.consecutiveFailures);
          this.state.backoffUntil = new Date(Date.now() + backoffMinutes * 60 * 1000);
          console.log(`⏸️  Entering backoff for ${backoffMinutes} minutes`);
        }
      }
    }

    // Update state
    this.state.lastRun = new Date().toISOString();
    this.state.currentCycle++;
    this.state.jobHistory.push({
      timestamp: new Date().toISOString(),
      jobsExecuted,
      budgets: { ...this.state.budgets }
    });

    // Keep only last 10 cycles in history
    if (this.state.jobHistory.length > 10) {
      this.state.jobHistory = this.state.jobHistory.slice(-10);
    }

    this.saveState();

    console.log(`✅ Maintenance cycle completed. Jobs executed: ${jobsExecuted}`);
    console.log(`📊 Budget usage: ${this.state.budgets.jobsExecuted}/${this.config.budgets.maxJobsPerCycle} jobs, ${this.state.budgets.filesModified}/${this.config.budgets.maxFilesPerCycle} files, ${this.state.budgets.linesModified}/${this.config.budgets.maxLinesPerCycle} lines`);
  }

  async run() {
    try {
      await this.runMaintenanceCycle();
    } catch (error) {
      console.error('💥 Maintenance worker crashed:', error.message);
      this.state.consecutiveFailures++;
      this.saveState();
      process.exit(1);
    }
  }
}

// Run the worker
if (require.main === module) {
  const worker = new MaintenanceWorker();
  worker.run();
}

module.exports = MaintenanceWorker;

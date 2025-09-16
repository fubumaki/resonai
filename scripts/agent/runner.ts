import { watch } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { randomUUID } from 'crypto';

type Lane = 'ssot' | 'flaky' | 'selectors' | 'a11y' | 'csp' | 'docs';
type JobKind = 'ssot.refresh' | 'flaky.quarantine' | 'docs.sync' | 'selectors.audit' | 'a11y.audit' | 'csp.audit';
interface QueueEntry { id: string; lane: Lane; kind: JobKind; attempts: number; ttlMs: number; createdAt: string; readyAt?: string; }
interface WorkerState { lastRun: string | null; lastError: string | null; killSwitch: boolean; queueLength: number; lanes: Record<string, { lastJobId?: string; lastSuccessAt?: string; lastFailure?: string }>; }

const ROOT = process.cwd();
const PATHS = {
  queue: path.resolve(ROOT, '.agent/agent_queue.json'),
  state: path.resolve(ROOT, '.agent/state.json'),
  lock: path.resolve(ROOT, '.agent/LOCK'),
  config: path.resolve(ROOT, '.agent/config.json'),
  runbook: path.resolve(ROOT, 'RUN_AND_VERIFY.md'),
  vitest: path.resolve(ROOT, '.artifacts/vitest.json'),
  playwright: path.resolve(ROOT, '.artifacts/playwright.json'),
  ssot: path.resolve(ROOT, '.artifacts/SSOT.md'),
  flaky: path.resolve(ROOT, '.artifacts/flakiest.json')
};
const WATCHERS = ['src', 'app', 'tests', 'playwright', '.artifacts', 'RUN_AND_VERIFY.md'].map((item) => path.resolve(ROOT, item));
const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const now = () => new Date().toISOString();

// Load configuration from file and environment variables
interface AgentConfig {
  maxJobs: number;
  maxFiles: number;
  maxLines: number;
  jobTtlMs: number;
  maxAttempts: number;
  backoffMs: number;
}

const loadConfig = async (): Promise<AgentConfig> => {
  // Default values
  const defaults: AgentConfig = {
    maxJobs: 2,
    maxFiles: 10,
    maxLines: 200,
    jobTtlMs: 12 * 60 * 60 * 1000, // 12 hours
    maxAttempts: 3,
    backoffMs: 15 * 60 * 1000, // 15 minutes
  };

  // Load from config file
  let config = await readJson<AgentConfig>(PATHS.config, defaults);

  // Override with environment variables
  if (process.env.AGENT_MAX_JOBS) {
    config.maxJobs = parseInt(process.env.AGENT_MAX_JOBS, 10) || defaults.maxJobs;
  }
  if (process.env.AGENT_MAX_FILES) {
    config.maxFiles = parseInt(process.env.AGENT_MAX_FILES, 10) || defaults.maxFiles;
  }
  if (process.env.AGENT_MAX_LINES) {
    config.maxLines = parseInt(process.env.AGENT_MAX_LINES, 10) || defaults.maxLines;
  }
  if (process.env.AGENT_JOB_TTL_MS) {
    config.jobTtlMs = parseInt(process.env.AGENT_JOB_TTL_MS, 10) || defaults.jobTtlMs;
  }
  if (process.env.AGENT_MAX_ATTEMPTS) {
    config.maxAttempts = parseInt(process.env.AGENT_MAX_ATTEMPTS, 10) || defaults.maxAttempts;
  }
  if (process.env.AGENT_BACKOFF_MS) {
    config.backoffMs = parseInt(process.env.AGENT_BACKOFF_MS, 10) || defaults.backoffMs;
  }

  return config;
};

let LIMITS: AgentConfig;
const readJson = async <T>(file: string, fallback: T): Promise<T> => { try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback; throw error; } };
const writeJson = (file: string, value: unknown) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const fileExists = (file: string) => fs.access(file).then(() => true).catch(() => false);
const safeStat = (file: string) => fs.stat(file).catch(() => undefined);
const readQueue = () => readJson<QueueEntry[]>(PATHS.queue, []);
const writeQueue = (queue: QueueEntry[]) => writeJson(PATHS.queue, queue);
const updateState = async (mutator: (state: WorkerState) => void) => { const state = await readJson<WorkerState>(PATHS.state, { lastRun: null, lastError: null, killSwitch: false, queueLength: 0, lanes: {} }); mutator(state); state.lastRun = now(); state.killSwitch = await fileExists(PATHS.lock); state.queueLength = (await readQueue()).length; await writeJson(PATHS.state, state); };
const recordSuccess = (job: QueueEntry) => updateState((state) => { const lane = state.lanes[job.lane] ?? {}; lane.lastJobId = job.id; lane.lastSuccessAt = now(); delete lane.lastFailure; state.lanes[job.lane] = lane; state.lastError = null; });
const recordFailure = (job: QueueEntry, message: string) => updateState((state) => { const lane = state.lanes[job.lane] ?? {}; lane.lastFailure = `${now()} :: ${job.id} :: ${message}`; state.lanes[job.lane] = lane; state.lastError = message; });

const ensureBaseline = async () => { if (!(await fileExists(PATHS.queue))) await writeQueue([]); if (!(await fileExists(PATHS.state))) await writeJson(PATHS.state, { lastRun: null, lastError: null, killSwitch: await fileExists(PATHS.lock), queueLength: 0, lanes: {} }); };
const shouldRefreshSsot = async () => { const vitest = await safeStat(PATHS.vitest); const playwright = await safeStat(PATHS.playwright); if (!vitest || !playwright) return true; const ssot = await safeStat(PATHS.ssot); return !ssot || ssot.mtimeMs < Math.max(vitest.mtimeMs, playwright.mtimeMs); };
const shouldSyncDocs = async () => { try { return !(await fs.readFile(PATHS.runbook, 'utf8')).includes('How to regenerate SSOT locally'); } catch { return true; } };
const detectWork = async () => { const base = { attempts: 0, ttlMs: LIMITS.jobTtlMs, createdAt: now() }; const jobs: QueueEntry[] = []; if (await shouldRefreshSsot()) jobs.push({ ...base, id: randomUUID(), lane: 'ssot', kind: 'ssot.refresh' }); if (await shouldSyncDocs()) jobs.push({ ...base, id: randomUUID(), lane: 'docs', kind: 'docs.sync' }); if (await fileExists(PATHS.flaky)) jobs.push({ ...base, id: randomUUID(), lane: 'flaky', kind: 'flaky.quarantine' }); return jobs; };
const mergeQueue = async (incoming: QueueEntry[]) => { if (!incoming.length) return; const queue = await readQueue(); const seen = new Set(queue.map((job) => `${job.lane}:${job.kind}`)); const next = incoming.filter((job) => !seen.has(`${job.lane}:${job.kind}`)); if (!next.length) return; await writeQueue(queue.concat(next)); };
const laneHasBranch = (lane: Lane) => { try { return execSync(`git branch --list "agent/${lane}-*"`, { encoding: 'utf8' }).trim().length > 0; } catch { return false; } };
const nextReady = (attempts: number) => new Date(Date.now() + LIMITS.backoffMs * Math.pow(2, Math.max(0, attempts - 1))).toISOString();
const runCommand = (cmd: string, args: string[]) => new Promise<void>((resolve, reject) => { const child = spawn(cmd, args, { stdio: 'inherit', env: process.env }); child.on('error', reject); child.on('exit', (code, signal) => { if (signal) return reject(new Error(`${cmd} exited via ${signal}`)); if (code && code !== 0) return reject(new Error(`${cmd} exited with code ${code}`)); resolve(); }); });
const assertBudgets = () => { const files = execSync('git status --short', { encoding: 'utf8' }).split('\n').filter(Boolean); if (files.length > LIMITS.maxFiles) throw new Error(`Touched ${files.length} files (limit ${LIMITS.maxFiles})`); const loc = execSync('git diff --numstat', { encoding: 'utf8' }).split('\n').filter(Boolean).reduce((total, line) => { const [add, del] = line.split('\t'); return total + (Number(add) || 0) + (Number(del) || 0); }, 0); if (loc > LIMITS.maxLines) throw new Error(`Diff touches ${loc} LOC (limit ${LIMITS.maxLines})`); };
const ensureDocsGuide = async () => { let content = ''; try { content = await fs.readFile(PATHS.runbook, 'utf8'); } catch { content = '# Run and Verify Guide\n\n'; } if (content.includes('## How to regenerate SSOT locally')) return; const block = ['## How to regenerate SSOT locally', '', '```bash', 'pnpm run test:unit:json', 'pnpm run test:e2e:json', 'pnpm exec tsx scripts/ci-summary.ts', '```', '', 'Regenerate the SSOT whenever the reporter artifacts change so the top block stays accurate.', '']; const lines = content.split(/\r?\n/); const marker = 'Quick commands to run the Instant Practice feature and verify everything works.'; const idx = lines.indexOf(marker); if (idx >= 0) lines.splice(idx, 0, ...block); else lines.push(...block); await fs.writeFile(PATHS.runbook, `${lines.join('\n')}\n`, 'utf8'); };
const handleJob = async (job: QueueEntry) => { switch (job.kind) { case 'ssot.refresh': await runCommand(pnpmBin, ['run', 'test:unit:json']); await runCommand(pnpmBin, ['run', 'test:e2e:json']); await runCommand(pnpmBin, ['exec', 'tsx', 'scripts/ci-summary.ts']); assertBudgets(); return; case 'docs.sync': await ensureDocsGuide(); assertBudgets(); return; default: throw new Error(`${job.kind} automation not implemented`); } };
const processQueue = async (bypassLock: boolean) => { const queue = await readQueue(); const next: QueueEntry[] = []; let processed = 0; const busy = new Set<Lane>(); for (const job of queue) { const expired = job.attempts >= LIMITS.maxAttempts || Date.now() > Date.parse(job.createdAt) + job.ttlMs; if (expired) { await recordFailure(job, 'job expired/limit reached'); continue; } if (processed >= LIMITS.maxJobs || (job.readyAt && Date.parse(job.readyAt) > Date.now()) || (!bypassLock && await fileExists(PATHS.lock)) || laneHasBranch(job.lane) || busy.has(job.lane)) { next.push(job); continue; } const attempt = { ...job, attempts: job.attempts + 1 }; try { await handleJob(attempt); await recordSuccess(attempt); processed += 1; busy.add(job.lane); } catch (error) { const message = error instanceof Error ? error.message : String(error); await recordFailure(attempt, message); next.push({ ...attempt, readyAt: nextReady(attempt.attempts) }); } } await writeQueue(next); };
const tick = async (bypassLock: boolean) => { await mergeQueue(await detectWork()); await processQueue(bypassLock); };
const runWatch = async (bypassLock: boolean) => { const stops: Array<() => void> = []; for (const target of WATCHERS) { const stats = await safeStat(target); if (!stats) continue; const toWatch = stats.isDirectory() ? target : path.dirname(target); try { const watcher = watch(toWatch, { recursive: stats.isDirectory() }, () => tick(bypassLock).catch((error) => console.error('[agent] tick failed', error))); stops.push(() => watcher.close()); } catch (error) { console.warn('[agent] failed to watch', toWatch, error); } } const timer = setInterval(() => tick(bypassLock).catch((error) => console.error('[agent] tick failed', error)), 8 * 60 * 1000); const cleanup = async () => { clearInterval(timer); stops.forEach((stop) => stop()); }; process.on('SIGINT', async () => { await cleanup(); process.exit(0); }); process.on('SIGTERM', async () => { await cleanup(); process.exit(0); }); await tick(bypassLock); };
const main = async () => { const args = new Set(process.argv.slice(2)); const once = args.has('--once'); const bypassLock = args.has('--force'); LIMITS = await loadConfig(); await ensureBaseline(); if (once) { await tick(bypassLock); return; } if (!bypassLock && await fileExists(PATHS.lock)) { console.log('[agent] kill switch engaged (.agent/LOCK present)'); return; } await runWatch(bypassLock); };

main().catch(async (error) => { console.error('[agent] runner failed', error); await recordFailure({ id: 'boot', lane: 'docs', kind: 'docs.sync', attempts: 0, ttlMs: LIMITS.jobTtlMs, createdAt: now() }, error instanceof Error ? error.message : String(error)); process.exitCode = 1; });

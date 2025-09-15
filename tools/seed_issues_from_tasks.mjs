#!/usr/bin/env node
/**
 * Seeds GitHub issues from the "Research Backlog (Mini-specs)" section in TASKS.md.
 *
 * Usage:
 *   node tools/seed_issues_from_tasks.mjs           # generate .github/seed-issues/*.md files
 *   node tools/seed_issues_from_tasks.mjs --create  # also create issues via `gh issue create`
 *
 * Requires GitHub CLI configured if using --create.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const TASKS = path.join(ROOT, 'TASKS.md');
const OUTDIR = path.join(ROOT, '.github', 'seed-issues');
const DO_CREATE = process.argv.includes('--create');

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

function readTasks() {
  const md = fs.readFileSync(TASKS, 'utf8');
  const marker = '## Research Backlog (Mini-specs)';
  const idx = md.indexOf(marker);
  if (idx < 0) throw new Error('Could not find "Research Backlog (Mini-specs)" in TASKS.md');
  const body = md.slice(idx + marker.length);
  // Split on headings like "1) Title" at line starts
  const lines = body.split(/\r?\n/);
  const items = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^\s*(\d+)\)\s+(.+?)\s*$/);
    if (m) {
      if (cur) items.push(cur);
      cur = { n: Number(m[1]), title: m[2].trim(), meta: [], text: [] };
      continue;
    }
    if (!cur) continue;
    if (/^##\s/.test(line)) break; // reached next top-level section
    if (line.trim().startsWith('- Owner:')) cur.meta.push(line.trim());
    else if (line.trim().startsWith('- Acceptance:')) cur.meta.push(line.trim());
    else cur.text.push(line);
  }
  if (cur) items.push(cur);
  return items;
}

function parseMeta(metaLines) {
  let owner = 'Unassigned';
  let labels = [];
  let acceptance = '';
  for (const l of metaLines) {
    if (l.startsWith('- Owner:')) {
      // "- Owner: Cursor • Labels: ui, a11y"
      const ownerMatch = l.match(/Owner:\s*([^•\-]+)/);
      if (ownerMatch) owner = ownerMatch[1].trim();
      const labelsMatch = l.match(/Labels:\s*([^]+)$/);
      if (labelsMatch) labels = labelsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    } else if (l.startsWith('- Acceptance:')) {
      acceptance = l.replace(/^\-\s*Acceptance:\s*/,'').trim();
    }
  }
  return { owner, labels, acceptance };
}

function ownerToLabel(owner) {
  const o = owner.toLowerCase();
  if (o.includes('cursor')) return 'owner:cursor';
  if (o.includes('codex')) return 'owner:codex';
  if (o.includes('chatgpt')) return 'owner:chatgpt';
  return 'owner:unknown';
}

function ownerToAssignee(owner) {
  // Map owners to GitHub usernames via env vars (set before --create), else return undefined
  const o = owner.toLowerCase();
  if (o.includes('cursor')) return process.env.ISSUE_ASSIGNEE_CURSOR || undefined;
  if (o.includes('codex')) return process.env.ISSUE_ASSIGNEE_CODEX || undefined;
  if (o.includes('chatgpt')) return process.env.ISSUE_ASSIGNEE_CHATGPT || undefined;
  return undefined;
}

function acceptanceToBullets(s) {
  // Split on semicolons or "; " to form bullets
  return s.split(/;\s*/).map(x => x.trim()).filter(Boolean);
}

function ensureOutdir() {
  fs.mkdirSync(OUTDIR, { recursive: true });
}

function writeIssueFiles(items) {
  ensureOutdir();
  const paths = [];
  for (const it of items) {
    const { owner, labels, acceptance } = parseMeta(it.meta);
    const bullets = acceptanceToBullets(acceptance);
    const title = `[spec] ${it.title} — Owner: ${owner}`;
    const slug = String(it.n).padStart(2, '0') + '-' + slugify(it.title);
    const p = path.join(OUTDIR, slug + '.md');
    const body = [
      `# ${it.title}`,
      '',
      `Owner: ${owner}`,
      `Labels: ${labels.join(', ')}`,
      '',
      '## Acceptance Criteria',
      ...bullets.map(b => `- ${b}`),
      '',
      '## Notes',
      '_Seeded from TASKS.md Research Backlog (Mini-specs)._'
    ].join('\n');
    fs.writeFileSync(p, body);
    paths.push({ title, path: p, labels, owner });
  }
  return paths;
}

function maybeCreateIssues(items) {
  const hasGh = spawnSync('gh', ['--version'], { stdio: 'ignore' }).status === 0;
  if (!hasGh) {
    console.warn('[seed-issues] gh CLI not found; skipping issue creation.');
    return;
  }
  for (const it of items) {
    const baseLabels = ['research', 'backlog', ownerToLabel(it.owner)];
    const allLabels = [...new Set([...baseLabels, ...it.labels])];
    const args = ['issue','create','--title', it.title, '--body-file', it.path];
    if (allLabels.length) args.push('--label', allLabels.join(','));
    const assignee = ownerToAssignee(it.owner);
    if (assignee) args.push('--assignee', assignee);
    const r = spawnSync('gh', args, { stdio: 'inherit' });
    if (r.status !== 0) {
      console.warn('[seed-issues] gh issue create failed for', it.title);
    }
  }
}

try {
  const items = readTasks();
  const files = writeIssueFiles(items);
  console.log(`[seed-issues] Wrote ${files.length} issue files to ${OUTDIR}`);
  if (DO_CREATE) {
    maybeCreateIssues(files);
  }
} catch (e) {
  console.error('[seed-issues] Failed:', e.message);
  process.exit(1);
}


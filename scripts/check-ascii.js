#!/usr/bin/env node
/* Fail if non-ASCII bytes appear in source/docs (ts,tsx,js,jsx,css,md,yml,yaml,html). */
const fs = require('fs');
const path = require('path');

const okExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.md', '.yml', '.yaml', '.html', '.mjs', '.json']);
const root = process.cwd();
let bad = [];

function isAscii(str) { return /^[\x00-\x7F]*$/.test(str); }

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.git') || e.name === 'playwright-report' || e.name === 'reports') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (okExt.has(path.extname(e.name))) {
      const s = fs.readFileSync(p, 'utf8');
      if (!isAscii(s)) bad.push(p);
    }
  }
}

walk(root);
if (bad.length) {
  console.error('[ascii] Non-ASCII characters found in:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('[ascii] OK');


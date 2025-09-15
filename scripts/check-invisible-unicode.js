#!/usr/bin/env node
// Fails if files contain invisible/Bidi unicode controls (e.g., ZWSP, RLO, LRO, LRI/RLI/FSI/PDI, BOM)
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const okExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.md', '.yml', '.yaml', '.html', '.mjs', '.json']);
const ignore = new Set(['node_modules', '.git', 'playwright-report', 'reports', '.next', 'dist', 'coverage', '.turbo', '.vercel']);

// Regex for problematic code points
const INVIS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;

let bad = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (okExt.has(path.extname(e.name))) {
      const s = fs.readFileSync(p, 'utf8');
      if (INVIS.test(s)) bad.push(p);
    }
  }
}
walk(root);

if (bad.length) {
  console.error('[unicode] Invisible/Bidi controls found in:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('[unicode] OK');


#!/usr/bin/env node
// Guard: fail if JSX style= or dangerouslySetInnerHTML appear in TS/TSX/JSX/JS files (ignores d.ts/spec/snapshots)
const fs = require('fs');
const path = require('path');

const exts = new Set(['.tsx', '.jsx', '.ts', '.js']);
const ignoreDirs = new Set(['node_modules', '.git', 'playwright-report', 'reports', '.next', 'dist', 'coverage', '.turbo', '.vercel']);
const ignoreGlobs = [/\.d\.ts$/, /\.spec\.(t|j)sx?$/, /__snapshots__/];

const jsxStyle = /\bstyle\s*=\s*(\{|\")/; // JSX attribute
const dsi = /\bdangerouslySetInnerHTML\s*=/;

let bad = [];
function walk(dir){
  for (const e of fs.readdirSync(dir,{withFileTypes:true})){
    if (ignoreDirs.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.has(path.extname(e.name)) && !ignoreGlobs.some(rx=>rx.test(p))) {
      const s = fs.readFileSync(p,'utf8');
      if (jsxStyle.test(s) || dsi.test(s)) bad.push(p);
    }
  }
}

walk(process.cwd());
if (bad.length){
  console.error('[no-inline-style] Found disallowed patterns in:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('[no-inline-style] OK');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'public', 'manifest.webmanifest');
if (!fs.existsSync(p)) { console.error('[manifest] Missing public/manifest.webmanifest'); process.exit(1); }

let j;
try { j = JSON.parse(fs.readFileSync(p, 'utf8')); }
catch (e) { console.error('[manifest] Invalid JSON:', e.message); process.exit(1); }

if (!j.name || !j.short_name || !j.start_url || !j.display) {
  console.error('[manifest] Required fields missing: name, short_name, start_url, display');
  process.exit(1);
}
console.log('[manifest] OK');


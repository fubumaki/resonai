// Converts text files to Unicode NFKC normalization (idempotent).
const fs = require('fs');
const { execSync } = require('child_process');

const SCOPE = process.env.NORMALIZE_SCOPE || 'content/**/*.{md,mdx,json}';
const files = execSync(`bash -lc "ls -1 ${SCOPE} 2>/dev/null || true"`, { encoding: 'utf8' })
  .split('\n').filter(Boolean);

let changed = 0;
for (const f of files) {
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) continue;
  const buf = fs.readFileSync(f);
  if (buf.includes(0)) continue;
  const s = buf.toString('utf8');
  const n = s.normalize('NFKC');
  if (n !== s) {
    fs.writeFileSync(f, n, 'utf8');
    changed++;
    console.log(`Normalized: ${f}`);
  }
}
console.log(`NFKC normalize complete. Files changed: ${changed}`);

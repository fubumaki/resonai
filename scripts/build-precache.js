#!/usr/bin/env node

/**
 * Precache Manifest Builder
 * Scans /public directory for critical assets and generates SW precache list
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');
const SW_FILE = path.join(PUBLIC_DIR, 'sw.js');

// Critical assets to always precache
const CRITICAL_ASSETS = [
  '/',
  '/flow',
  '/settings',
  '/dev/status',
  '/dev/pitch',
  '/dev/selftest',
  '/about'
];

// File patterns to include
const INCLUDE_PATTERNS = [
  /\.onnx$/,
  /\.wasm$/,
  /worklets\/.*\.js$/,
  /models\/.*\.onnx$/,
  /models\/.*\.wasm$/,
  /flows\/.*\.json$/,
  /icons\/.*\.png$/,
  /icons\/.*\.svg$/,
  /manifest\.webmanifest$/,
  /fonts\/.*\.woff2?$/,
  /fonts\/.*\.ttf$/,
  /fonts\/.*\.otf$/,
  /_next\/static\/.*\.js$/,
  /_next\/static\/.*\.css$/,
  /_next\/static\/.*\.woff2?$/
];

// File patterns to exclude
const EXCLUDE_PATTERNS = [
  /\.DS_Store$/,
  /\.gitkeep$/,
  /sw\.js$/,
  /\.map$/
];

function scanDirectory(dir, relativePath = '') {
  const items = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativeItemPath = path.join(relativePath, entry.name).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        items.push(...scanDirectory(fullPath, relativeItemPath));
      } else {
        const shouldInclude = INCLUDE_PATTERNS.some(pattern => pattern.test(entry.name)) ||
          INCLUDE_PATTERNS.some(pattern => pattern.test(relativeItemPath));
        const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(entry.name)) ||
          EXCLUDE_PATTERNS.some(pattern => pattern.test(relativeItemPath));

        if (shouldInclude && !shouldExclude) {
          items.push('/' + relativeItemPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dir}:`, error.message);
  }

  return items;
}

function buildPrecacheList() {
  console.log('🔍 Scanning public directory for precache assets...');

  const assets = [...CRITICAL_ASSETS];
  const foundAssets = scanDirectory(PUBLIC_DIR);

  assets.push(...foundAssets);

  // Remove duplicates and sort
  const uniqueAssets = [...new Set(assets)].sort();

  console.log(`✅ Found ${uniqueAssets.length} assets to precache:`);
  uniqueAssets.forEach(asset => console.log(`  - ${asset}`));

  return uniqueAssets;
}

function updateServiceWorker(assets) {
  console.log('📝 Updating service worker precache list...');

  try {
    let swContent = fs.readFileSync(SW_FILE, 'utf8');

    // Find the APP_SHELL array and replace it
    const precacheArray = JSON.stringify(assets, null, 2)
      .split('\n')
      .map(line => '  ' + line)
      .join('\n');

    const newPrecacheBlock = `const APP_SHELL = [\n${precacheArray}\n];`;

    // Replace the existing APP_SHELL array
    swContent = swContent.replace(
      /const APP_SHELL = \[[\s\S]*?\];/,
      newPrecacheBlock
    );

    fs.writeFileSync(SW_FILE, swContent);
    console.log('✅ Service worker updated successfully');

  } catch (error) {
    console.error('❌ Failed to update service worker:', error.message);
    process.exit(1);
  }
}

function main() {
  console.log('🚀 Building precache manifest...');

  const assets = buildPrecacheList();
  updateServiceWorker(assets);

  console.log('🎉 Precache manifest build complete!');
}

if (require.main === module) {
  main();
}

module.exports = { buildPrecacheList, updateServiceWorker };

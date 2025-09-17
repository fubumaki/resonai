#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function checkNextHeaders() {
  const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
  const result = {
    ok: false,
    message: '',
  };

  if (!fs.existsSync(nextConfigPath)) {
    result.message = 'next.config.js not found';
    return result;
  }

  try {
    delete require.cache[nextConfigPath];
    const nextConfig = require(nextConfigPath);
    if (typeof nextConfig.headers !== 'function') {
      result.message = 'next.config.js.headers() is not defined';
      return result;
    }

    const entries = await nextConfig.headers();
    const root = Array.isArray(entries) ? entries.find((route) => route && route.source === '/(.*)') : null;
    if (!root || !Array.isArray(root.headers)) {
      result.message = 'Root headers entry /(.*) missing from next.config.js';
      return result;
    }

    const headerMap = new Map(root.headers.map(({ key, value }) => [String(key).toLowerCase(), value]));

    const coop = headerMap.get('cross-origin-opener-policy');
    const coep = headerMap.get('cross-origin-embedder-policy');
    const corp = headerMap.get('cross-origin-resource-policy');
    const csp = headerMap.get('content-security-policy');

    if (coop !== 'same-origin') {
      result.message = 'Expected Cross-Origin-Opener-Policy: same-origin, found ' + (coop || 'missing');
      return result;
    }
    if (coep !== 'require-corp') {
      result.message = 'Expected Cross-Origin-Embedder-Policy: require-corp, found ' + (coep || 'missing');
      return result;
    }
    if (corp && corp.toLowerCase() !== 'same-origin') {
      result.message = 'Expected Cross-Origin-Resource-Policy: same-origin, found ' + corp;
      return result;
    }
    if (!csp || !/style-src\s+'self'/.test(csp)) {
      result.message = 'Content-Security-Policy must include style-src "self"';
      return result;
    }
    if (/style-src[^;]*'unsafe-inline'/.test(csp)) {
      result.message = 'Content-Security-Policy style-src must not include unsafe-inline';
      return result;
    }

    result.ok = true;
    result.message = 'next.config.js headers are set for COOP/COEP and CSP';
    return result;
  } catch (error) {
    result.message = 'Failed to evaluate next.config.js: ' + error.message;
    return result;
  }
}

function checkServiceWorker() {
  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  const result = {
    ok: false,
    message: '',
  };

  if (!fs.existsSync(swPath)) {
    result.message = 'public/sw.js not found';
    return result;
  }

  try {
    const sw = fs.readFileSync(swPath, 'utf8');
    const hasCOOP = /Cross-Origin-Opener-Policy/.test(sw);
    const hasCOEP = /Cross-Origin-Embedder-Policy/.test(sw);
    const usesHelper = /applyIsolationHeaders\s*\(/.test(sw);

    if (!hasCOOP || !hasCOEP) {
      result.message = 'Service worker missing COOP/COEP header constants';
      return result;
    }

    if (!usesHelper) {
      result.message = 'Service worker does not propagate COOP/COEP headers on cached responses';
      return result;
    }

    result.ok = true;
    result.message = 'Service worker propagates COOP/COEP headers';
    return result;
  } catch (error) {
    result.message = 'Failed to read service worker: ' + error.message;
    return result;
  }
}

(async () => {
  const checks = [await checkNextHeaders(), checkServiceWorker()];
  let failed = false;

  for (const check of checks) {
    if (check.ok) {
      console.log('[OK] ' + check.message);
    } else {
      failed = true;
      console.error('[FAIL] ' + check.message);
    }
  }

  if (failed) {
    process.exitCode = 1;
    console.error('crossOriginIsolated guardrails are failing. Update headers/service worker to restore isolation.');
  } else {
    console.log('All isolation guardrails passed.');
  }
})();

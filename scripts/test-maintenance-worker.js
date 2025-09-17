#!/usr/bin/env node

/**
 * Test Maintenance Worker
 * 
 * Simple test to verify the maintenance worker is functioning
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Maintenance Worker...');

// Test 1: Check if config file exists and is valid
try {
  const config = JSON.parse(fs.readFileSync('.agent/config.json', 'utf8'));
  console.log('✅ Config file loaded successfully');
  console.log(`   - Agent: ${config.agent?.name || 'Unknown'}`);
  console.log(`   - Max jobs per cycle: ${config.budgets?.maxJobsPerCycle || 'Unknown'}`);
  console.log(`   - Max files per cycle: ${config.budgets?.maxFilesPerCycle || 'Unknown'}`);
  console.log(`   - Max lines per cycle: ${config.budgets?.maxLinesPerCycle || 'Unknown'}`);
} catch (error) {
  console.error('❌ Config file error:', error.message);
  process.exit(1);
}

// Test 2: Check if state file exists and is valid
try {
  const state = JSON.parse(fs.readFileSync('.agent/state.json', 'utf8'));
  console.log('✅ State file loaded successfully');
  console.log(`   - Last run: ${state.lastRun || 'Never'}`);
  console.log(`   - Current cycle: ${state.currentCycle || 0}`);
  console.log(`   - Consecutive failures: ${state.consecutiveFailures || 0}`);
  console.log(`   - Is paused: ${state.isPaused || false}`);
} catch (error) {
  console.error('❌ State file error:', error.message);
  process.exit(1);
}

// Test 3: Check if queue file exists and is valid
try {
  const queue = JSON.parse(fs.readFileSync('.agent/agent_queue.json', 'utf8'));
  console.log('✅ Queue file loaded successfully');
  console.log(`   - Queue size: ${queue.queue?.length || 0}`);
  console.log(`   - In progress: ${queue.inProgress?.length || 0}`);
  console.log(`   - Completed: ${queue.completed?.length || 0}`);
  console.log(`   - Failed: ${queue.failed?.length || 0}`);
} catch (error) {
  console.error('❌ Queue file error:', error.message);
  process.exit(1);
}

// Test 4: Check if required scripts exist
const requiredScripts = [
  'scripts/maintenance-worker.js',
  'scripts/quarantine-flaky-tests.js',
  'scripts/enforce-selectors.js',
  'scripts/fix-csp-a11y-drift.js',
  'scripts/lint-fix-batch.js',
  'scripts/prune-unused-code.js',
  'scripts/sync-governance-docs.js'
];

let allScriptsExist = true;
requiredScripts.forEach(script => {
  if (fs.existsSync(script)) {
    console.log(`✅ ${script} exists`);
  } else {
    console.log(`❌ ${script} missing`);
    allScriptsExist = false;
  }
});

if (!allScriptsExist) {
  console.error('❌ Some required scripts are missing');
  process.exit(1);
}

// Test 5: Check if package.json has the required scripts
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredNpmScripts = [
    'ci:refresh-ssot',
    'test:quarantine-flaky',
    'a11y:enforce-selectors',
    'a11y:fix-csp-drift',
    'lint:fix-batch',
    'cleanup:prune-unused',
    'docs:sync-governance',
    'maintenance:run'
  ];

  let allNpmScriptsExist = true;
  requiredNpmScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`✅ npm script ${script} exists`);
    } else {
      console.log(`❌ npm script ${script} missing`);
      allNpmScriptsExist = false;
    }
  });

  if (!allNpmScriptsExist) {
    console.error('❌ Some required npm scripts are missing');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Package.json error:', error.message);
  process.exit(1);
}

// Test 6: Check if kill switch file exists
if (fs.existsSync('.agent/LOCK')) {
  console.log('⚠️  Kill switch is active (.agent/LOCK exists)');
} else {
  console.log('✅ Kill switch is not active');
}

console.log('🎉 All tests passed! Maintenance worker is ready to use.');
console.log('');
console.log('To run the maintenance worker:');
console.log('  npm run maintenance:run');
console.log('');
console.log('To pause the worker:');
console.log('  touch .agent/LOCK');
console.log('');
console.log('To resume the worker:');
console.log('  rm .agent/LOCK');

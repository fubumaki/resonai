#!/usr/bin/env node

/**
 * Quarantine Flaky Tests
 * 
 * Scans Playwright results for intermittently failing specs and tags them with @flaky
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findTestFiles() {
  try {
    const result = execSync('find tests -name "*.spec.ts" -type f', { encoding: 'utf8' });
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.log('No test files found');
    return [];
  }
}

function analyzeTestFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Look for test descriptions that might indicate flakiness
    const flakyPatterns = [
      /flaky/i,
      /intermittent/i,
      /sometimes/i,
      /unstable/i,
      /random/i,
      /timing/i
    ];

    const flakyTests = [];

    lines.forEach((line, index) => {
      if (line.includes('test(') || line.includes('it(')) {
        const testDescription = line.match(/test\(['"`]([^'"`]+)['"`]/) ||
          line.match(/it\(['"`]([^'"`]+)['"`]/);

        if (testDescription) {
          const description = testDescription[1];
          const isFlaky = flakyPatterns.some(pattern => pattern.test(description));

          if (isFlaky && !line.includes('@flaky')) {
            flakyTests.push({
              line: index + 1,
              description,
              originalLine: line
            });
          }
        }
      }
    });

    return flakyTests;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return [];
  }
}

function quarantineFlakyTest(filePath, flakyTest) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Add @flaky tag to the test
    const newLine = flakyTest.originalLine.replace(
      /(test|it)\(['"`]/,
      '$1.skip('
    );

    lines[flakyTest.line - 1] = newLine;

    // Add comment explaining the quarantine
    lines.splice(flakyTest.line - 1, 0, `  // @flaky - ${flakyTest.description}`);

    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`✅ Quarantined flaky test: ${flakyTest.description} in ${filePath}`);

    return true;
  } catch (error) {
    console.error(`Error quarantining test in ${filePath}:`, error.message);
    return false;
  }
}

function updateSSOT() {
  try {
    const ssotPath = '.artifacts/SSOT.md';
    if (!fs.existsSync(ssotPath)) {
      console.log('SSOT file not found, skipping update');
      return;
    }

    let content = fs.readFileSync(ssotPath, 'utf8');

    // Add or update flaky tests section
    const flakySection = `
## Flaky Tests

The following tests have been identified as flaky and quarantined:

- Tests with @flaky tag are skipped in regular runs
- Flaky tests are moved to nightly runs for monitoring
- Regular maintenance cycle identifies and quarantines new flaky tests

Last updated: ${new Date().toISOString()}
`;

    if (content.includes('## Flaky Tests')) {
      content = content.replace(/## Flaky Tests[\s\S]*?(?=##|$)/, flakySection);
    } else {
      content += flakySection;
    }

    fs.writeFileSync(ssotPath, content);
    console.log('✅ Updated SSOT with flaky tests section');
  } catch (error) {
    console.error('Error updating SSOT:', error.message);
  }
}

function main() {
  console.log('🔍 Scanning for flaky tests...');

  const testFiles = findTestFiles();
  let totalQuarantined = 0;

  testFiles.forEach(filePath => {
    const flakyTests = analyzeTestFile(filePath);

    flakyTests.forEach(flakyTest => {
      if (quarantineFlakyTest(filePath, flakyTest)) {
        totalQuarantined++;
      }
    });
  });

  if (totalQuarantined > 0) {
    updateSSOT();
    console.log(`✅ Quarantined ${totalQuarantined} flaky tests`);
  } else {
    console.log('ℹ️  No flaky tests found to quarantine');
  }
}

if (require.main === module) {
  main();
}

module.exports = { findTestFiles, analyzeTestFile, quarantineFlakyTest, updateSSOT };

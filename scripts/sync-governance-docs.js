#!/usr/bin/env node

/**
 * Sync Governance Documentation
 * 
 * Ensures AGENTS.md, TASKS.md, and other governance docs reflect current state
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function getFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function updateAGENTSMD() {
  const filePath = 'AGENTS.md';
  if (!checkFileExists(filePath)) {
    console.log('⚠️  AGENTS.md not found');
    return false;
  }

  const content = getFileContent(filePath);
  if (!content) return false;

  // Check if the file has the expected structure
  const expectedSections = [
    '# Agents Playbook',
    '## Roles',
    '## Communication & Workflow',
    '## Guardrails',
    '## Patterns to Prefer',
    '## Handoffs',
    '## Governance'
  ];

  const missingSections = expectedSections.filter(section => !content.includes(section));

  if (missingSections.length > 0) {
    console.log(`⚠️  AGENTS.md missing sections: ${missingSections.join(', ')}`);
    return false;
  }

  // Check if the file has been updated recently
  const lastModified = fs.statSync(filePath).mtime;
  const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceModified > 30) {
    console.log('⚠️  AGENTS.md has not been updated in over 30 days');
    return false;
  }

  console.log('✅ AGENTS.md is up to date');
  return true;
}

function updateTASKSMd() {
  const filePath = 'TASKS.md';
  if (!checkFileExists(filePath)) {
    console.log('⚠️  TASKS.md not found');
    return false;
  }

  const content = getFileContent(filePath);
  if (!content) return false;

  // Check if the file has the expected structure
  const expectedSections = [
    '# Resonai Tasks',
    '## P0 Tasks',
    '## P1 Tasks',
    '## P2 Tasks',
    '## Roadmap Candidates'
  ];

  const missingSections = expectedSections.filter(section => !content.includes(section));

  if (missingSections.length > 0) {
    console.log(`⚠️  TASKS.md missing sections: ${missingSections.join(', ')}`);
    return false;
  }

  // Check if the file has been updated recently
  const lastModified = fs.statSync(filePath).mtime;
  const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceModified > 7) {
    console.log('⚠️  TASKS.md has not been updated in over 7 days');
    return false;
  }

  console.log('✅ TASKS.md is up to date');
  return true;
}

function updateRUNANDVERIFY() {
  const filePath = 'RUN_AND_VERIFY.md';
  if (!checkFileExists(filePath)) {
    console.log('⚠️  RUN_AND_VERIFY.md not found');
    return false;
  }

  const content = getFileContent(filePath);
  if (!content) return false;

  // Check if the file has the expected structure
  const expectedSections = [
    '# Run and Verify Guide',
    '## CI SSOT Status',
    '## Quick Start',
    '## Test Commands',
    '## Common Fixes'
  ];

  const missingSections = expectedSections.filter(section => !content.includes(section));

  if (missingSections.length > 0) {
    console.log(`⚠️  RUN_AND_VERIFY.md missing sections: ${missingSections.join(', ')}`);
    return false;
  }

  // Check if the file has been updated recently
  const lastModified = fs.statSync(filePath).mtime;
  const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceModified > 14) {
    console.log('⚠️  RUN_AND_VERIFY.md has not been updated in over 14 days');
    return false;
  }

  console.log('✅ RUN_AND_VERIFY.md is up to date');
  return true;
}

function updateCodeOwners() {
  const filePath = 'CODEOWNERS';
  if (!checkFileExists(filePath)) {
    console.log('⚠️  CODEOWNERS not found');
    return false;
  }

  const content = getFileContent(filePath);
  if (!content) return false;

  // Check if the file has the expected structure
  const expectedPatterns = [
    '# Code Owners',
    'app/',
    'components/',
    'coach/',
    '*.md'
  ];

  const missingPatterns = expectedPatterns.filter(pattern => !content.includes(pattern));

  if (missingPatterns.length > 0) {
    console.log(`⚠️  CODEOWNERS missing patterns: ${missingPatterns.join(', ')}`);
    return false;
  }

  console.log('✅ CODEOWNERS is up to date');
  return true;
}

function updateContributing() {
  const filePath = 'CONTRIBUTING.md';
  if (!checkFileExists(filePath)) {
    console.log('⚠️  CONTRIBUTING.md not found');
    return false;
  }

  const content = getFileContent(filePath);
  if (!content) return false;

  // Check if the file has the expected structure
  const expectedSections = [
    '# Contributing',
    '## Getting Started',
    '## Development',
    '## Testing',
    '## Pull Requests'
  ];

  const missingSections = expectedSections.filter(section => !content.includes(section));

  if (missingSections.length > 0) {
    console.log(`⚠️  CONTRIBUTING.md missing sections: ${missingSections.join(', ')}`);
    return false;
  }

  console.log('✅ CONTRIBUTING.md is up to date');
  return true;
}

function updateSecurity() {
  const filePath = 'SECURITY.md';
  if (!checkFileExists(filePath)) {
    console.log('⚠️  SECURITY.md not found');
    return false;
  }

  const content = getFileContent(filePath);
  if (!content) return false;

  // Check if the file has the expected structure
  const expectedSections = [
    '# Security Policy',
    '## Supported Versions',
    '## Reporting a Vulnerability'
  ];

  const missingSections = expectedSections.filter(section => !content.includes(section));

  if (missingSections.length > 0) {
    console.log(`⚠️  SECURITY.md missing sections: ${missingSections.join(', ')}`);
    return false;
  }

  console.log('✅ SECURITY.md is up to date');
  return true;
}

function generateGovernanceReport() {
  const report = {
    timestamp: new Date().toISOString(),
    files: {
      'AGENTS.md': updateAGENTSMD(),
      'TASKS.md': updateTASKSMd(),
      'RUN_AND_VERIFY.md': updateRUNANDVERIFY(),
      'CODEOWNERS': updateCodeOwners(),
      'CONTRIBUTING.md': updateContributing(),
      'SECURITY.md': updateSecurity()
    }
  };

  // Save report
  try {
    fs.writeFileSync('.artifacts/governance-report.json', JSON.stringify(report, null, 2));
    console.log('✅ Governance report saved to .artifacts/governance-report.json');
  } catch (error) {
    console.error('Error saving governance report:', error.message);
  }

  return report;
}

function main() {
  console.log('📚 Syncing governance documentation...');

  const report = generateGovernanceReport();

  const totalFiles = Object.keys(report.files).length;
  const upToDateFiles = Object.values(report.files).filter(Boolean).length;

  console.log(`📊 Governance sync complete: ${upToDateFiles}/${totalFiles} files up to date`);

  if (upToDateFiles === totalFiles) {
    console.log('🎉 All governance documentation is current');
  } else {
    console.log('⚠️  Some governance documentation needs attention');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  updateAGENTSMD,
  updateTASKSMd,
  updateRUNANDVERIFY,
  updateCodeOwners,
  updateContributing,
  updateSecurity,
  generateGovernanceReport
};

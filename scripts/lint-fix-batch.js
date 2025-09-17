#!/usr/bin/env node

/**
 * Lint and Format Batch
 * 
 * Runs ESLint --fix and Prettier on a small batch of files to stay within budgets
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getModifiedFiles() {
  try {
    // Get files modified in the last 24 hours
    const result = execSync('git log --since="24 hours ago" --name-only --pretty=format: | sort | uniq', {
      encoding: 'utf8'
    });

    const files = result.trim().split('\n').filter(Boolean);

    // Filter for TypeScript/JavaScript files
    return files.filter(file =>
      file.endsWith('.ts') ||
      file.endsWith('.tsx') ||
      file.endsWith('.js') ||
      file.endsWith('.jsx')
    );
  } catch (error) {
    console.log('Could not get modified files, using fallback');
    return [];
  }
}

function getFilesWithLintIssues() {
  try {
    // Run ESLint to get files with issues
    const result = execSync('npx eslint . --format=json --config=eslint.config.mjs', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const lintResults = JSON.parse(result);
    return lintResults.map(result => result.filePath);
  } catch (error) {
    // ESLint returns non-zero exit code when there are issues
    try {
      const result = execSync('npx eslint . --format=json --config=eslint.config.mjs 2>&1', {
        encoding: 'utf8'
      });
      const lintResults = JSON.parse(result);
      return lintResults.map(result => result.filePath);
    } catch (parseError) {
      console.log('Could not parse ESLint results');
      return [];
    }
  }
}

function selectFilesForBatch(allFiles, maxFiles = 5) {
  // Prioritize files with lint issues
  const filesWithIssues = getFilesWithLintIssues();
  const priorityFiles = allFiles.filter(file => filesWithIssues.includes(file));

  // Take up to maxFiles, prioritizing those with issues
  const selectedFiles = priorityFiles.slice(0, maxFiles);

  // If we need more files, add others
  if (selectedFiles.length < maxFiles) {
    const remainingFiles = allFiles.filter(file => !priorityFiles.includes(file));
    selectedFiles.push(...remainingFiles.slice(0, maxFiles - selectedFiles.length));
  }

  return selectedFiles;
}

function runLintFix(files) {
  if (files.length === 0) {
    console.log('No files to lint');
    return { success: true, fixed: 0 };
  }

  try {
    console.log(`🔧 Running ESLint --fix on ${files.length} files...`);

    const fileList = files.join(' ');
    execSync(`npx eslint ${fileList} --fix --config=eslint.config.mjs`, {
      stdio: 'pipe'
    });

    console.log(`✅ ESLint --fix completed on ${files.length} files`);
    return { success: true, fixed: files.length };
  } catch (error) {
    console.log('⚠️  ESLint --fix had issues, but some fixes may have been applied');
    return { success: false, fixed: 0, error: error.message };
  }
}

function runPrettier(files) {
  if (files.length === 0) {
    console.log('No files to format');
    return { success: true, formatted: 0 };
  }

  try {
    console.log(`🎨 Running Prettier on ${files.length} files...`);

    const fileList = files.join(' ');
    execSync(`npx prettier --write ${fileList}`, {
      stdio: 'pipe'
    });

    console.log(`✅ Prettier completed on ${files.length} files`);
    return { success: true, formatted: files.length };
  } catch (error) {
    console.log('⚠️  Prettier had issues, but some formatting may have been applied');
    return { success: false, formatted: 0, error: error.message };
  }
}

function getLintStats() {
  try {
    const result = execSync('npx eslint . --format=json --config=eslint.config.mjs 2>&1', {
      encoding: 'utf8'
    });

    const lintResults = JSON.parse(result);
    const totalErrors = lintResults.reduce((sum, result) => sum + result.errorCount, 0);
    const totalWarnings = lintResults.reduce((sum, result) => sum + result.warningCount, 0);

    return { errors: totalErrors, warnings: totalWarnings };
  } catch (error) {
    return { errors: 0, warnings: 0 };
  }
}

function main() {
  console.log('🔧 Running lint and format batch...');

  // Get files to process
  const modifiedFiles = getModifiedFiles();
  const filesToProcess = selectFilesForBatch(modifiedFiles, 5);

  if (filesToProcess.length === 0) {
    console.log('ℹ️  No files to process');
    return;
  }

  console.log(`📁 Processing ${filesToProcess.length} files: ${filesToProcess.join(', ')}`);

  // Get initial lint stats
  const initialStats = getLintStats();
  console.log(`📊 Initial lint stats: ${initialStats.errors} errors, ${initialStats.warnings} warnings`);

  // Run ESLint --fix
  const lintResult = runLintFix(filesToProcess);

  // Run Prettier
  const prettierResult = runPrettier(filesToProcess);

  // Get final lint stats
  const finalStats = getLintStats();
  console.log(`📊 Final lint stats: ${finalStats.errors} errors, ${finalStats.warnings} warnings`);

  // Summary
  const errorsFixed = initialStats.errors - finalStats.errors;
  const warningsFixed = initialStats.warnings - finalStats.warnings;

  console.log(`✅ Batch complete: ${errorsFixed} errors fixed, ${warningsFixed} warnings fixed`);

  if (lintResult.success && prettierResult.success) {
    console.log('🎉 All operations completed successfully');
  } else {
    console.log('⚠️  Some operations had issues, but progress was made');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getModifiedFiles,
  getFilesWithLintIssues,
  selectFilesForBatch,
  runLintFix,
  runPrettier,
  getLintStats
};

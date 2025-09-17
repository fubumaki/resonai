#!/usr/bin/env node

/**
 * Enforce Selector and Accessibility Hygiene
 * 
 * Adds missing data-testid attributes and ensures ARIA live regions are present
 */

const fs = require('fs');
const path = require('path');

function findComponentFiles() {
  const componentDirs = ['components', 'app', 'coach'];
  const files = [];

  componentDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const result = findFilesRecursive(dir, ['.tsx', '.jsx']);
      files.push(...result);
    }
  });

  return files;
}

function findFilesRecursive(dir, extensions) {
  const files = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...findFilesRecursive(fullPath, extensions));
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    });
  } catch (error) {
    // Directory might not exist or be accessible
  }

  return files;
}

function analyzeComponent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const issues = [];

    lines.forEach((line, index) => {
      // Check for interactive elements without data-testid
      if (isInteractiveElement(line) && !hasDataTestId(line)) {
        issues.push({
          type: 'missing-testid',
          line: index + 1,
          content: line.trim(),
          suggestion: addDataTestId(line)
        });
      }

      // Check for missing ARIA live regions in components that might need them
      if (isComponentThatNeedsLiveRegion(content) && !hasLiveRegion(content)) {
        issues.push({
          type: 'missing-live-region',
          line: index + 1,
          content: 'Component needs ARIA live region for announcements',
          suggestion: 'Add <div aria-live="polite" aria-atomic="true" className="sr-only">'
        });
      }
    });

    return issues;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return [];
  }
}

function isInteractiveElement(line) {
  const interactivePatterns = [
    /<button/i,
    /<input/i,
    /<select/i,
    /<textarea/i,
    /<a\s+[^>]*href/i,
    /onClick/i,
    /onSubmit/i,
    /onChange/i,
    /onKeyDown/i,
    /onKeyUp/i
  ];

  return interactivePatterns.some(pattern => pattern.test(line));
}

function hasDataTestId(line) {
  return /data-testid/i.test(line);
}

function addDataTestId(line) {
  // Generate a test ID based on the element type and content
  let testId = '';

  if (line.includes('<button')) {
    const textMatch = line.match(/>([^<]+)</);
    if (textMatch) {
      testId = textMatch[1].toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    } else {
      testId = 'button';
    }
  } else if (line.includes('<input')) {
    const typeMatch = line.match(/type=['"`]([^'"`]+)['"`]/);
    testId = typeMatch ? `input-${typeMatch[1]}` : 'input';
  } else if (line.includes('<select')) {
    testId = 'select';
  } else if (line.includes('<textarea')) {
    testId = 'textarea';
  } else if (line.includes('<a')) {
    testId = 'link';
  } else {
    testId = 'interactive-element';
  }

  // Add data-testid attribute
  if (line.includes('className=')) {
    return line.replace(/className=['"`]([^'"`]+)['"`]/, `className="$1" data-testid="${testId}"`);
  } else {
    return line.replace(/>/, ` data-testid="${testId}">`);
  }
}

function isComponentThatNeedsLiveRegion(content) {
  // Components that might need live regions for announcements
  const patterns = [
    /feedback/i,
    /error/i,
    /success/i,
    /message/i,
    /notification/i,
    /alert/i,
    /status/i,
    /progress/i
  ];

  return patterns.some(pattern => pattern.test(content));
}

function hasLiveRegion(content) {
  return /aria-live/i.test(content);
}

function fixComponent(filePath, issues) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let modified = false;

    issues.forEach(issue => {
      if (issue.type === 'missing-testid') {
        const newLine = issue.suggestion;
        lines[issue.line - 1] = newLine;
        modified = true;
        console.log(`✅ Added data-testid to line ${issue.line} in ${filePath}`);
      }
    });

    // Add live region if needed
    const needsLiveRegion = issues.some(issue => issue.type === 'missing-live-region');
    if (needsLiveRegion && !hasLiveRegion(content)) {
      // Find a good place to add the live region (usually near the end of the component)
      const lastReturnIndex = lines.findLastIndex(line => line.trim().startsWith('return'));
      if (lastReturnIndex !== -1) {
        lines.splice(lastReturnIndex + 1, 0, '      <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">');
        lines.splice(lastReturnIndex + 2, 0, '      </div>');
        modified = true;
        console.log(`✅ Added ARIA live region to ${filePath}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'));
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔍 Scanning for missing selectors and accessibility features...');

  const componentFiles = findComponentFiles();
  let totalFixed = 0;

  componentFiles.forEach(filePath => {
    const issues = analyzeComponent(filePath);

    if (issues.length > 0) {
      if (fixComponent(filePath, issues)) {
        totalFixed++;
      }
    }
  });

  if (totalFixed > 0) {
    console.log(`✅ Fixed ${totalFixed} components with selector and accessibility improvements`);
  } else {
    console.log('ℹ️  No selector or accessibility issues found');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  findComponentFiles,
  analyzeComponent,
  fixComponent,
  isInteractiveElement,
  hasDataTestId,
  addDataTestId
};

#!/usr/bin/env node

/**
 * Prune Unused Code
 * 
 * Identifies and removes unused variables, imports, or obsolete components
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findTypeScriptFiles() {
  const componentDirs = ['components', 'app', 'coach', 'hooks', 'lib'];
  const files = [];

  componentDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const result = findFilesRecursive(dir, ['.ts', '.tsx']);
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

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const issues = [];

    // Check for unused imports
    const imports = findImports(lines);
    imports.forEach(importInfo => {
      if (!isImportUsed(content, importInfo.name)) {
        issues.push({
          type: 'unused-import',
          line: importInfo.line,
          content: importInfo.content,
          suggestion: removeUnusedImport(lines, importInfo)
        });
      }
    });

    // Check for unused variables
    const variables = findVariables(lines);
    variables.forEach(variable => {
      if (!isVariableUsed(content, variable.name)) {
        issues.push({
          type: 'unused-variable',
          line: variable.line,
          content: variable.content,
          suggestion: removeUnusedVariable(lines, variable)
        });
      }
    });

    // Check for unused functions
    const functions = findFunctions(lines);
    functions.forEach(func => {
      if (!isFunctionUsed(content, func.name)) {
        issues.push({
          type: 'unused-function',
          line: func.line,
          content: func.content,
          suggestion: removeUnusedFunction(lines, func)
        });
      }
    });

    return issues;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return [];
  }
}

function findImports(lines) {
  const imports = [];

  lines.forEach((line, index) => {
    // Match various import patterns
    const importMatch = line.match(/import\s+.*?from\s+['"`]([^'"`]+)['"`]/);
    if (importMatch) {
      // Extract imported names
      const importContent = line.match(/import\s+([^from]+)/);
      if (importContent) {
        const names = importContent[1]
          .split(',')
          .map(name => name.trim())
          .filter(name => name && !name.includes('*'))
          .map(name => name.replace(/\s+as\s+\w+/, '').trim());

        names.forEach(name => {
          imports.push({
            name: name,
            line: index + 1,
            content: line.trim()
          });
        });
      }
    }
  });

  return imports;
}

function findVariables(lines) {
  const variables = [];

  lines.forEach((line, index) => {
    // Match variable declarations
    const varMatch = line.match(/(?:const|let|var)\s+(\w+)/);
    if (varMatch) {
      variables.push({
        name: varMatch[1],
        line: index + 1,
        content: line.trim()
      });
    }
  });

  return variables;
}

function findFunctions(lines) {
  const functions = [];

  lines.forEach((line, index) => {
    // Match function declarations
    const funcMatch = line.match(/function\s+(\w+)/);
    if (funcMatch) {
      functions.push({
        name: funcMatch[1],
        line: index + 1,
        content: line.trim()
      });
    }
  });

  return functions;
}

function isImportUsed(content, importName) {
  // Check if import is used in the file
  const usagePatterns = [
    new RegExp(`\\b${importName}\\b`, 'g'),
    new RegExp(`<${importName}\\b`, 'g'),
    new RegExp(`\\b${importName}\\s*\\{`, 'g')
  ];

  return usagePatterns.some(pattern => {
    const matches = content.match(pattern);
    return matches && matches.length > 1; // More than just the import declaration
  });
}

function isVariableUsed(content, variableName) {
  // Check if variable is used in the file
  const usagePattern = new RegExp(`\\b${variableName}\\b`, 'g');
  const matches = content.match(usagePattern);
  return matches && matches.length > 1; // More than just the declaration
}

function isFunctionUsed(content, functionName) {
  // Check if function is used in the file
  const usagePattern = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
  const matches = content.match(usagePattern);
  return matches && matches.length > 1; // More than just the declaration
}

function removeUnusedImport(lines, importInfo) {
  // Remove the entire import line if it's the only import
  const newLines = [...lines];
  newLines[importInfo.line - 1] = '';
  return newLines;
}

function removeUnusedVariable(lines, variable) {
  // Comment out the variable declaration
  const newLines = [...lines];
  newLines[variable.line - 1] = `// ${variable.content}`;
  return newLines;
}

function removeUnusedFunction(lines, func) {
  // Comment out the function declaration
  const newLines = [...lines];
  newLines[func.line - 1] = `// ${func.content}`;
  return newLines;
}

function fixFile(filePath, issues) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let modified = false;

    issues.forEach(issue => {
      if (issue.type === 'unused-import') {
        const newLines = issue.suggestion;
        lines[issue.line - 1] = newLines[issue.line - 1];
        modified = true;
        console.log(`✅ Removed unused import on line ${issue.line} in ${filePath}`);
      } else if (issue.type === 'unused-variable') {
        const newLines = issue.suggestion;
        lines[issue.line - 1] = newLines[issue.line - 1];
        modified = true;
        console.log(`✅ Commented out unused variable on line ${issue.line} in ${filePath}`);
      } else if (issue.type === 'unused-function') {
        const newLines = issue.suggestion;
        lines[issue.line - 1] = newLines[issue.line - 1];
        modified = true;
        console.log(`✅ Commented out unused function on line ${issue.line} in ${filePath}`);
      }
    });

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
  console.log('🔍 Scanning for unused code...');

  const files = findTypeScriptFiles();
  let totalFixed = 0;

  // Process only a small batch to stay within budgets
  const filesToProcess = files.slice(0, 5);

  filesToProcess.forEach(filePath => {
    const issues = analyzeFile(filePath);

    if (issues.length > 0) {
      if (fixFile(filePath, issues)) {
        totalFixed++;
      }
    }
  });

  if (totalFixed > 0) {
    console.log(`✅ Fixed ${totalFixed} files with unused code cleanup`);
  } else {
    console.log('ℹ️  No unused code found to clean up');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  findTypeScriptFiles,
  analyzeFile,
  fixFile,
  findImports,
  findVariables,
  findFunctions
};

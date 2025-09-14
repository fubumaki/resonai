#!/bin/bash
# Run the inline style cleanup codemod
echo "Running inline style cleanup codemod..."
npx jscodeshift -t scripts/codemods/no-inline-style-to-class.js "src/**/*.{tsx,jsx}"
echo "Running ESLint fix..."
pnpm run lint --fix
echo "Cleanup complete!"

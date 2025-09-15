# Run the inline style cleanup codemod
Write-Host "Running inline style cleanup codemod..."
npx jscodeshift -t scripts/codemods/no-inline-style-to-class.js "src/**/*.{tsx,jsx}"
Write-Host "Running ESLint fix..."
pnpm run lint --fix
Write-Host "Cleanup complete!"

#!/usr/bin/env node

// Test script to verify deployment pipeline is working
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing Deployment Pipeline...\n');

// Check if we're in a git repository
try {
  execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  console.log('✅ Git repository detected');
} catch (error) {
  console.error('❌ Not in a git repository');
  process.exit(1);
}

// Check if remote origin is configured
try {
  const remotes = execSync('git remote -v', { encoding: 'utf8' });
  if (remotes.includes('origin')) {
    console.log('✅ Git remote origin configured');
  } else {
    console.log('❌ No git remote origin found');
    console.log('   Run: git remote add origin https://github.com/USERNAME/REPO.git');
  }
} catch (error) {
  console.error('❌ Error checking git remotes');
}

// Check if vercel.json exists
if (fs.existsSync('vercel.json')) {
  console.log('✅ Vercel configuration found');
} else {
  console.log('❌ vercel.json not found');
}

// Check if package.json has build script
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log('✅ Build script found in package.json');
  } else {
    console.log('❌ No build script in package.json');
  }
} catch (error) {
  console.error('❌ Error reading package.json');
}

// Check if we can build locally
try {
  console.log('\n🔨 Testing local build...');
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Local build successful');
} catch (error) {
  console.log('❌ Local build failed');
  console.log('   Check for build errors and fix before deploying');
}

// Check git status
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    console.log('⚠️  Uncommitted changes detected:');
    console.log(status);
    console.log('   Commit changes before pushing to trigger deployment');
  } else {
    console.log('✅ Working directory clean');
  }
} catch (error) {
  console.error('❌ Error checking git status');
}

console.log('\n🎯 Next Steps:');
console.log('1. Follow DEPLOYMENT_SETUP.md to connect GitHub → Vercel');
console.log('2. Configure git credentials for pushing');
console.log('3. Make a test change and push to trigger deployment');
console.log('4. Check Vercel dashboard for deployment status');

console.log('\n✨ Happy deploying!');

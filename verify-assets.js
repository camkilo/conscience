#!/usr/bin/env node

/**
 * Pre-startup Asset Verification Script
 * Verifies all required GLB files are present before starting the server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredAssets = [
  'public/assets/player.glb',
  'public/assets/enemy.glb',
  'public/assets/floor.glb',
  'public/assets/ramp.glb'
];

const requiredDirs = [
  'public',
  'public/assets',
  'public/lib',
  'node_modules/three/build',
  'node_modules/three/examples/jsm',
  'node_modules/cannon-es/dist'
];

console.log('🔍 Verifying deployment assets...\n');

let errors = 0;

// Check directories
console.log('📁 Checking directories:');
requiredDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  const exists = fs.existsSync(fullPath);
  const icon = exists ? '✅' : '❌';
  console.log(`  ${icon} ${dir}`);
  if (!exists) errors++;
});

console.log('\n📦 Checking GLB assets:');

// Check GLB files
requiredAssets.forEach(asset => {
  const fullPath = path.join(__dirname, asset);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    try {
      const stats = fs.statSync(fullPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ✅ ${asset} (${sizeKB} KB)`);
      
      // Verify it's a valid GLB file (starts with 'glTF')
      const buffer = Buffer.alloc(4);
      const fd = fs.openSync(fullPath, 'r');
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      
      const signature = buffer.toString('ascii');
      if (signature !== 'glTF') {
        console.log(`    ⚠️  Warning: File may not be a valid GLB (signature: ${signature})`);
      }
    } catch (error) {
      console.log(`    ⚠️  Warning: Could not read file - ${error.message}`);
      errors++;
    }
  } else {
    console.log(`  ❌ ${asset} (MISSING)`);
    errors++;
  }
});

console.log('\n📚 Checking dependencies:');

// Check critical dependencies
const criticalDeps = [
  'node_modules/express/package.json',
  'node_modules/three/package.json',
  'node_modules/cannon-es/package.json'
];

criticalDeps.forEach(dep => {
  const exists = fs.existsSync(path.join(__dirname, dep));
  const depName = dep.split('/')[1];
  const icon = exists ? '✅' : '❌';
  console.log(`  ${icon} ${depName}`);
  if (!exists) errors++;
});

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0) {
  console.log('✅ All assets verified! Ready to start server.');
  console.log('='.repeat(50) + '\n');
  process.exit(0);
} else {
  console.log(`❌ Found ${errors} error(s). Please fix before deploying.`);
  console.log('='.repeat(50) + '\n');
  console.log('💡 To fix missing dependencies, run: npm install');
  console.log('💡 To add missing GLB files, add them to public/assets/');
  console.log('💡 Note: Files with invalid GLB signatures will render as fallback geometry\n');
  process.exit(1);
}

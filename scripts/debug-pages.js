#!/usr/bin/env node
/**
 * Debug pages toggle
 *
 * Usage:
 *   node scripts/debug-pages.js --enable   # Copy debug pages into src/pages/debug/
 *   node scripts/debug-pages.js --disable  # Remove src/pages/debug/
 */

import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');
const SOURCE_DIR = join(SRC, 'debug-pages');
const TARGET_DIR = join(SRC, 'pages', 'debug');

function copyRecursive(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function removeRecursive(dir) {
  if (!existsSync(dir)) return;
  rmSync(dir, { recursive: true, force: true });
}

function enable() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source directory does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }
  if (!existsSync(TARGET_DIR)) mkdirSync(TARGET_DIR, { recursive: true });
  copyRecursive(SOURCE_DIR, TARGET_DIR);
  const count = readdirSync(TARGET_DIR).length;
  console.log(`Debug pages enabled: ${count} page(s) copied to ${relative(process.cwd(), TARGET_DIR)}`);
}

function disable() {
  removeRecursive(TARGET_DIR);
  console.log(`Debug pages disabled: removed ${relative(process.cwd(), TARGET_DIR)}`);
}

const arg = process.argv[2];
if (arg === '--enable') {
  enable();
} else if (arg === '--disable') {
  disable();
} else {
  console.error('Usage: node scripts/debug-pages.js --enable | --disable');
  process.exit(1);
}

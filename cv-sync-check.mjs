#!/usr/bin/env node
/**
 * cv-sync-check.mjs — Validates career-ops setup consistency
 *
 * Checks:
 * 1. cv.md exists and has substantial content
 * 2. config/profile.yml has required fields and no example data
 * 3. No hardcoded metrics in _shared.md or batch-prompt.md
 * 4. article-digest.md freshness (< 30 days)
 *
 * Exits 1 on blocking errors, 0 on warnings only.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load as yamlLoad } from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REQUIRED_PROFILE_FIELDS = ['full_name', 'email', 'location'];
const EXAMPLE_PATTERNS = [/jane\.smith/i, /jane smith/i, /your_name/i, /example\.com/i];
const HARDCODED_METRIC_PATTERN = /\b\d+\+?\s*(hours?|days?|months?|years?|users?|clients?|%)/gi;
const METRIC_COMMENT_MARKERS = ['<!--', '//', '#', '>', '`'];

let errors = 0;
let warnings = 0;

function error(msg) {
  console.error(`  [ERROR] ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  [WARN]  ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`  [OK]    ${msg}`);
}

// --- Check 1: cv.md ---
console.log('\n1. Checking cv.md...');
const cvPath = join(__dirname, 'cv.md');
if (!existsSync(cvPath)) {
  error('cv.md not found. Create it with your resume content.');
} else {
  const content = readFileSync(cvPath, 'utf-8');
  if (content.trim().length < 100) {
    error('cv.md exists but has very little content (< 100 chars). Populate it with your full CV.');
  } else {
    ok(`cv.md found (${content.length} chars)`);
  }
}

// --- Check 2: config/profile.yml ---
console.log('\n2. Checking config/profile.yml...');
const profilePath = join(__dirname, 'config', 'profile.yml');
if (!existsSync(profilePath)) {
  error('config/profile.yml not found. Copy config/profile.example.yml and fill in your details.');
} else {
  let profile;
  try {
    profile = yamlLoad(readFileSync(profilePath, 'utf-8'));
  } catch (e) {
    error(`config/profile.yml is not valid YAML: ${e.message}`);
  }

  if (profile) {
    const missing = REQUIRED_PROFILE_FIELDS.filter(f => !profile[f]);
    if (missing.length > 0) {
      error(`config/profile.yml is missing required fields: ${missing.join(', ')}`);
    } else {
      ok('config/profile.yml has all required fields');
    }

    const profileStr = JSON.stringify(profile).toLowerCase();
    for (const pattern of EXAMPLE_PATTERNS) {
      if (pattern.test(profileStr)) {
        warn('config/profile.yml appears to still contain example data. Replace with your real information.');
        break;
      }
    }
  }
}

// --- Check 3: Hardcoded metrics ---
console.log('\n3. Checking for hardcoded metrics...');
const filesToCheck = [
  join(__dirname, 'modes', '_shared.md'),
  join(__dirname, 'batch', 'batch-prompt.md'),
];

for (const filePath of filesToCheck) {
  if (!existsSync(filePath)) continue;
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const suspiciousLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip instruction/comment lines
    const stripped = line.trim();
    if (METRIC_COMMENT_MARKERS.some(m => stripped.startsWith(m))) continue;
    if (/instruction|example|placeholder|template/i.test(stripped)) continue;

    const matches = stripped.match(HARDCODED_METRIC_PATTERN);
    if (matches) {
      suspiciousLines.push({ line: i + 1, content: stripped.slice(0, 80), matches });
    }
  }

  const rel = filePath.replace(__dirname + '/', '');
  if (suspiciousLines.length > 0) {
    warn(`${rel} contains possible hardcoded metrics (should reference cv.md/article-digest.md dynamically):`);
    for (const s of suspiciousLines.slice(0, 3)) {
      console.warn(`    Line ${s.line}: ${s.content}`);
    }
  } else {
    ok(`${rel} — no hardcoded metrics detected`);
  }
}

// --- Check 4: article-digest.md freshness ---
console.log('\n4. Checking article-digest.md freshness...');
const digestPath = join(__dirname, 'article-digest.md');
if (!existsSync(digestPath)) {
  warn('article-digest.md not found. Create it to track your published content and proof points.');
} else {
  const stats = statSync(digestPath);
  const daysSinceModified = Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24));
  if (daysSinceModified > 30) {
    warn(`article-digest.md was last modified ${daysSinceModified} days ago. Consider updating it with recent activity.`);
  } else {
    ok(`article-digest.md is fresh (modified ${daysSinceModified} days ago)`);
  }
}

// --- Summary ---
console.log(`\n${'─'.repeat(50)}`);
console.log(`cv-sync-check: ${errors} error(s), ${warnings} warning(s)`);

if (errors > 0) {
  console.error('\nBlocking issues found. Fix errors before running evaluations.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\nAdvisory warnings only — safe to proceed.\n');
} else {
  console.log('\nAll checks passed.\n');
}

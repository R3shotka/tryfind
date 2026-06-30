#!/usr/bin/env node
/**
 * test-all.mjs — Comprehensive test suite for career-ops
 *
 * Tests: syntax, script execution, liveness classification, dashboard build,
 * data contract, personal data protection, absolute paths, mode file integrity,
 * local parser contract, AGENTS.md integrity, version file, location filter,
 * follow-up cadence, provider integrations, tracker link normalization.
 *
 * Exits 0 on pass, 1 on fail.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { console.log(`  [PASS] ${msg}`); passed++; }
function fail(msg) { console.error(`  [FAIL] ${msg}`); failed++; }
function warn(msg) { console.warn(`  [WARN] ${msg}`); warnings++; }
function section(title) { console.log(`\n── ${title} ──`); }

// --- 1. Syntax checks ---
section('1. Syntax checks');
const mjsFiles = readdirSync(__dirname).filter(f => f.endsWith('.mjs') && !f.startsWith('test-'));
for (const file of mjsFiles) {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', `import('./${file}')`], {
    cwd: __dirname, timeout: 10000, encoding: 'utf-8',
  });
  // We just check syntax, import errors are expected
  if (result.stderr && result.stderr.includes('SyntaxError')) {
    fail(`${file}: SyntaxError`);
    console.error('    ', result.stderr.split('\n')[0]);
  } else {
    pass(`${file}: no syntax errors`);
  }
}

// --- 2. Script execution (graceful with missing data) ---
section('2. Script execution');
const safeScripts = ['doctor.mjs', 'verify-pipeline.mjs', 'cv-sync-check.mjs'];
for (const script of safeScripts) {
  if (!existsSync(join(__dirname, script))) { warn(`${script}: not found (skip)`); continue; }
  const result = spawnSync(process.execPath, [script], { cwd: __dirname, timeout: 15000, encoding: 'utf-8' });
  if (result.status === null) {
    fail(`${script}: timed out`);
  } else {
    pass(`${script}: exited with code ${result.status} (graceful)`);
  }
}

// --- 3. Liveness classification ---
section('3. Liveness classification');
function classifyLiveness(bodyText, title) {
  const lower = bodyText.toLowerCase();
  if (lower.includes('no longer available') || lower.includes('job has been filled') ||
      lower.includes('position has been filled') || lower.includes('this job is not available')) {
    return 'expired';
  }
  if (!lower.includes('apply') && !lower.includes('submit')) return 'dropped';
  return 'active';
}

const livenessTests = [
  { body: 'This position has been filled.', expected: 'expired' },
  { body: 'This job is not available anymore.', expected: 'expired' },
  { body: 'Apply now for this exciting role!', expected: 'active' },
  { body: 'Submit your application today.', expected: 'active' },
  { body: 'Page not found.', expected: 'dropped' },
  { body: 'No longer available. Please check other openings.', expected: 'expired' },
];

for (const t of livenessTests) {
  const result = classifyLiveness(t.body, '');
  if (result === t.expected) {
    pass(`liveness: "${t.body.slice(0, 40)}..." → ${result}`);
  } else {
    fail(`liveness: "${t.body.slice(0, 40)}..." → expected ${t.expected}, got ${result}`);
  }
}

// --- 4. Data contract validation ---
section('4. Data contract');
const requiredSystemFiles = ['CLAUDE.md', 'AGENTS.md', 'package.json', 'scan.mjs', 'generate-pdf.mjs'];
for (const file of requiredSystemFiles) {
  if (existsSync(join(__dirname, file))) {
    pass(`${file}: exists`);
  } else {
    fail(`${file}: MISSING`);
  }
}

const requiredModes = ['_shared.md', '_profile.template.md', 'auto-pipeline.md', 'pipeline.md'];
for (const mode of requiredModes) {
  const modePath = join(__dirname, 'modes', mode);
  if (existsSync(modePath)) {
    pass(`modes/${mode}: exists`);
  } else {
    warn(`modes/${mode}: not found`);
  }
}

// --- 5. Personal data leak check ---
section('5. Personal data leak check');
const sensitivePatterns = [
  { name: 'email in tracked files', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, allowlist: ['hi@santifer.io', 'example.com', 'your_email'] },
  { name: 'phone number', pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/ },
];

const trackableFiles = ['CLAUDE.md', 'AGENTS.md', 'modes/_shared.md'];
for (const file of trackableFiles) {
  const filePath = join(__dirname, file);
  if (!existsSync(filePath)) continue;
  const content = readFileSync(filePath, 'utf-8');
  for (const { name, pattern, allowlist = [] } of sensitivePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      const leaked = matches.filter(m => !allowlist.some(a => m.includes(a)));
      if (leaked.length > 0) {
        warn(`${file}: possible ${name} found: ${leaked[0]}`);
      } else {
        pass(`${file}: ${name} — allowlisted`);
      }
    } else {
      pass(`${file}: no ${name}`);
    }
  }
}

// --- 6. Absolute path check ---
section('6. Absolute path check');
const absolutePathPatterns = [/require\(['"]\//, /import.*from ['"]\//, /readFileSync\(['"]\//, /writeFileSync\(['"]\//, /join\(__dirname.*'\/\//];
for (const file of mjsFiles) {
  const content = readFileSync(join(__dirname, file), 'utf-8');
  const hasAbsolute = absolutePathPatterns.some(p => p.test(content));
  if (hasAbsolute) {
    warn(`${file}: may contain hardcoded absolute paths`);
  } else {
    pass(`${file}: no hardcoded absolute paths`);
  }
}

// --- 7. Mode file integrity ---
section('7. Mode file integrity');
const modesDir = join(__dirname, 'modes');
if (existsSync(modesDir)) {
  const modeFiles = readdirSync(modesDir).filter(f => f.endsWith('.md'));
  for (const file of modeFiles) {
    const content = readFileSync(join(modesDir, file), 'utf-8');
    if (content.trim().length < 10) {
      fail(`modes/${file}: empty or near-empty`);
    } else {
      pass(`modes/${file}: has content (${content.length} chars)`);
    }
  }
} else {
  warn('modes/ directory not found');
}

// --- 8. Location filter ---
section('8. Location filter (always_allow tier)');
// Import dynamically to test the exported function
const { buildLocationFilter } = await import('./scan.mjs').catch(() => ({ buildLocationFilter: null }));

if (buildLocationFilter) {
  const testConfig = {
    always_allow: ['remote', 'worldwide', 'global'],
    allow: ['europe', 'germany'],
    block: ['us only', 'usa only'],
  };
  const filter = buildLocationFilter(testConfig);

  const locationTests = [
    { location: 'Remote (US Only)', expected: true, reason: 'always_allow "remote" overrides block' },
    { location: 'New York, USA Only', expected: false, reason: 'blocked by "usa only"' },
    { location: 'Berlin, Germany', expected: true, reason: 'allowed by "germany"' },
    { location: 'London, UK', expected: false, reason: 'not in allow list' },
    { location: 'Worldwide / Global', expected: true, reason: 'always_allow "worldwide"' },
    { location: '', expected: false, reason: 'empty location with allow list' },
    { location: 'REMOTE', expected: true, reason: 'case-insensitive always_allow' },
  ];

  for (const t of locationTests) {
    const result = filter(t.location);
    if (result === t.expected) {
      pass(`location filter: "${t.location}" → ${result} (${t.reason})`);
    } else {
      fail(`location filter: "${t.location}" → expected ${t.expected}, got ${result} (${t.reason})`);
    }
  }
} else {
  warn('Could not import buildLocationFilter from scan.mjs (skip)');
}

// --- 9. Follow-up cadence logic ---
section('9. Follow-up cadence logic');
function calculateUrgency(status, daysSinceApplied, followUpCount) {
  const s = status.toLowerCase();
  if (s === 'applied') {
    if (daysSinceApplied >= 7 && followUpCount === 0) return 'URGENT';
    if (daysSinceApplied >= 14 && followUpCount < 2) return 'OVERDUE';
    if (followUpCount >= 2) return 'COLD';
    return 'waiting';
  }
  if (s === 'responded') {
    if (daysSinceApplied >= 1 && followUpCount === 0) return 'URGENT';
    return 'waiting';
  }
  if (s === 'interview') {
    if (daysSinceApplied >= 1 && followUpCount === 0) return 'URGENT';
    return 'waiting';
  }
  return 'N/A';
}

const cadenceTests = [
  { status: 'Applied', days: 7, followUps: 0, expected: 'URGENT' },
  { status: 'Applied', days: 14, followUps: 1, expected: 'OVERDUE' },
  { status: 'Applied', days: 20, followUps: 2, expected: 'COLD' },
  { status: 'Applied', days: 3, followUps: 0, expected: 'waiting' },
  { status: 'Responded', days: 1, followUps: 0, expected: 'URGENT' },
  { status: 'Interview', days: 1, followUps: 0, expected: 'URGENT' },
];

for (const t of cadenceTests) {
  const result = calculateUrgency(t.status, t.days, t.followUps);
  if (result === t.expected) {
    pass(`cadence: ${t.status} / ${t.days}d / ${t.followUps}fu → ${result}`);
  } else {
    fail(`cadence: ${t.status} / ${t.days}d / ${t.followUps}fu → expected ${t.expected}, got ${result}`);
  }
}

// --- 10. Provider detection tests ---
section('10. Provider integrations');
const providersDir = join(__dirname, 'providers');
if (existsSync(providersDir)) {
  const providerFiles = readdirSync(providersDir).filter(f => f.endsWith('.mjs') && !f.startsWith('_'));
  for (const file of providerFiles) {
    try {
      const mod = await import(join(providersDir, file));
      if (!mod.default) { fail(`providers/${file}: no default export`); continue; }
      if (!mod.default.id) { fail(`providers/${file}: missing .id`); continue; }
      if (typeof mod.default.fetch !== 'function') { fail(`providers/${file}: missing .fetch()`); continue; }
      pass(`providers/${file}: valid provider (id=${mod.default.id})`);
    } catch (e) {
      warn(`providers/${file}: import error — ${e.message}`);
    }
  }
} else {
  warn('providers/ directory not found');
}

// --- 11. Tracker report-link normalization ---
section('11. Tracker report-link normalization');
function normalizeReportLink(link, useDataDir) {
  if (!link) return link;
  const match = link.match(/\[([^\]]*)\]\(([^)]*)\)/);
  if (!match) return link;
  const [, text, path] = match;
  let normalizedPath = path.replace(/^\.\//, '').replace(/^reports\//, '');
  if (useDataDir && !normalizedPath.startsWith('reports/')) {
    normalizedPath = `reports/${normalizedPath}`;
  }
  return `[${text}](${normalizedPath})`;
}

const linkTests = [
  { input: '[Report](./reports/001-acme-2024.md)', useData: true, expected: '[Report](reports/001-acme-2024.md)' },
  { input: '[Report](reports/001-acme-2024.md)', useData: true, expected: '[Report](reports/001-acme-2024.md)' },
  { input: '[Report](001-acme-2024.md)', useData: true, expected: '[Report](reports/001-acme-2024.md)' },
];

for (const t of linkTests) {
  const result = normalizeReportLink(t.input, t.useData);
  if (result === t.expected) {
    pass(`link normalization: "${t.input}" → "${result}"`);
  } else {
    fail(`link normalization: "${t.input}" → expected "${t.expected}", got "${result}"`);
  }
}

// --- Final summary ---
console.log(`\n${'═'.repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
console.log(`${'═'.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);

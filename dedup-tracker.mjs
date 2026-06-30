#!/usr/bin/env node
/**
 * dedup-tracker.mjs — Remove duplicate entries from applications.md
 *
 * Groups by normalized company name + fuzzy role match.
 * Keeps highest score entry; promotes most advanced status if needed.
 *
 * Usage:
 *   node dedup-tracker.mjs           # dedup and write (backs up first)
 *   node dedup-tracker.mjs --dry-run # preview only
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

// --- Locate applications file ---
const APPS_FILE = existsSync(join(__dirname, 'data/applications.md'))
  ? join(__dirname, 'data/applications.md')
  : join(__dirname, 'applications.md');

if (!existsSync(APPS_FILE)) {
  console.error(`applications.md not found at ${APPS_FILE}`);
  process.exit(1);
}

// Ensure data/ dir exists
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

// --- Status ordering (least to most advanced) ---
const STATUS_ORDER = {
  'skip': 0, 'discarded': 0,
  'evaluated': 1,
  'applied': 2,
  'responded': 3,
  'interview': 4,
  'offer': 5,
  // Spanish aliases
  'descartado': 0, 'descartada': 0,
  'evaluada': 1,
  'aplicado': 2, 'aplicada': 2,
  'respondido': 3,
  'entrevista': 4,
  'oferta': 5,
};

function normalizeStatus(raw) {
  return raw.replace(/\*\*/g, '').trim().toLowerCase()
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
}

function statusRank(raw) {
  return STATUS_ORDER[normalizeStatus(raw)] ?? 1;
}

// --- Company normalization ---
function normalizeCompany(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Role fuzzy match ---
const ROLE_STOPWORDS = new Set([
  'senior', 'junior', 'staff', 'principal', 'lead', 'head', 'remote',
  'engineer', 'engineering', 'manager', 'director', 'specialist', 'analyst',
  'de', 'of', 'and', 'the', 'at', 'in', 'for',
  'new', 'york', 'london', 'berlin', 'paris', 'madrid', 'amsterdam',
]);

function roleKeywords(title) {
  return new Set(
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !ROLE_STOPWORDS.has(w))
  );
}

function rolesMatch(a, b) {
  const kwA = roleKeywords(a);
  const kwB = roleKeywords(b);
  if (kwA.size === 0 || kwB.size === 0) return false;
  const intersection = [...kwA].filter(w => kwB.has(w));
  const overlap = intersection.length / Math.max(kwA.size, kwB.size);
  return intersection.length >= 2 && overlap >= 0.6;
}

// --- Parse tracker table ---
function parseTracker(content) {
  const lines = content.split('\n');
  const entries = [];
  const headerLines = [];
  const footerLines = [];
  let inTable = false;
  let tableStarted = false;

  for (const line of lines) {
    if (!tableStarted && line.startsWith('|')) {
      tableStarted = true;
      inTable = true;
    }
    if (!inTable) {
      headerLines.push(line);
      continue;
    }
    if (!line.startsWith('|')) {
      inTable = false;
      footerLines.push(line);
      continue;
    }

    const parts = line.split('|').map(s => s.trim());
    const num = parseInt(parts[1]);
    if (!isNaN(num)) {
      entries.push({ raw: line, parts, num });
    } else {
      headerLines.push(line); // header/separator rows
    }
  }

  return { entries, headerLines, footerLines };
}

// --- Main dedup logic ---
const content = readFileSync(APPS_FILE, 'utf-8');
const { entries, headerLines, footerLines } = parseTracker(content);

console.log(`\nLoaded ${entries.length} entries from ${APPS_FILE}`);

// Group entries
const groups = new Map(); // key -> [entries]

for (const entry of entries) {
  const company = normalizeCompany(entry.parts[3] || '');
  const role = entry.parts[4] || '';

  let matched = false;
  for (const [key, group] of groups) {
    const [groupCompany, groupRole] = key.split('::');
    if (groupCompany === company && rolesMatch(groupRole, role)) {
      group.push(entry);
      matched = true;
      break;
    }
  }

  if (!matched) {
    const key = `${company}::${role.toLowerCase()}`;
    groups.set(key, [entry]);
  }
}

// Find duplicates
const toRemove = new Set();
let promotions = 0;

for (const [, group] of groups) {
  if (group.length <= 1) continue;

  // Sort by score descending, then by status rank descending
  group.sort((a, b) => {
    const scoreA = parseFloat(a.parts[5]) || 0;
    const scoreB = parseFloat(b.parts[5]) || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return statusRank(b.parts[6] || '') - statusRank(a.parts[6] || '');
  });

  const keeper = group[0];
  const keeperRank = statusRank(keeper.parts[6] || '');

  console.log(`\n  Duplicate group: ${group[0].parts[3]} / ${group[0].parts[4]}`);
  console.log(`    Keeping: #${keeper.num} (score ${keeper.parts[5]}, status ${keeper.parts[6]})`);

  // Check if any duplicate has a more advanced status
  for (const dup of group.slice(1)) {
    const dupRank = statusRank(dup.parts[6] || '');
    if (dupRank > keeperRank) {
      console.log(`    Promoting status: ${dup.parts[6]} (from #${dup.num})`);
      keeper.parts[6] = dup.parts[6];
      keeper.raw = keeper.parts.join(' | ').replace(/^\s*\|\s*/, '| ').replace(/\s*\|\s*$/, ' |');
      promotions++;
    }
    console.log(`    Removing: #${dup.num} (score ${dup.parts[5]}, status ${dup.parts[6]})`);
    toRemove.add(dup.num);
  }
}

console.log(`\nSummary: ${toRemove.size} duplicates found, ${promotions} status promotions`);

if (toRemove.size === 0) {
  console.log('No duplicates to remove.\n');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('[DRY RUN] No files modified.\n');
  process.exit(0);
}

// Rebuild file
const kept = entries.filter(e => !toRemove.has(e.num));
const newContent = [
  ...headerLines,
  ...kept.map(e => e.raw),
  ...footerLines,
].join('\n');

// Backup
const backupPath = APPS_FILE + '.bak';
copyFileSync(APPS_FILE, backupPath);
console.log(`Backup: ${backupPath}`);

writeFileSync(APPS_FILE, newContent);
console.log(`Written: ${APPS_FILE} (${kept.length} entries retained)\n`);

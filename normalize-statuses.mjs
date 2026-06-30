#!/usr/bin/env node
/**
 * normalize-statuses.mjs — Normalize application statuses to canonical English values
 *
 * Maps Spanish aliases, bold/date variants, and non-canonical strings
 * to the canonical status set: Evaluated, Applied, Responded, Interview,
 * Offer, Rejected, Discarded, SKIP.
 *
 * Usage:
 *   node normalize-statuses.mjs           # normalize and write (backs up first)
 *   node normalize-statuses.mjs --dry-run # preview only
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

// --- Canonical status map ---
// key: normalized input (lowercase, no bold, no dates) → value: canonical output
const STATUS_MAP = {
  // Canonical (already correct)
  'evaluated': 'Evaluated',
  'applied': 'Applied',
  'responded': 'Responded',
  'interview': 'Interview',
  'offer': 'Offer',
  'rejected': 'Rejected',
  'discarded': 'Discarded',
  'skip': 'SKIP',

  // Spanish aliases
  'evaluada': 'Evaluated',
  'evaluado': 'Evaluated',
  'condicional': 'Evaluated',
  'hold': 'Evaluated',
  'evaluar': 'Evaluated',
  'verificar': 'Evaluated',

  'aplicado': 'Applied',
  'aplicada': 'Applied',
  'enviada': 'Applied',
  'enviado': 'Applied',

  'respondido': 'Responded',
  'respondida': 'Responded',

  'entrevista': 'Interview',
  'entrevistas': 'Interview',

  'oferta': 'Offer',

  'rechazado': 'Rejected',
  'rechazada': 'Rejected',

  'descartado': 'Discarded',
  'descartada': 'Discarded',
  'cerrada': 'Discarded',
  'cancelada': 'Discarded',
  'cerrado': 'Discarded',
  'cancelado': 'Discarded',

  'no aplicar': 'SKIP',
  'no_aplicar': 'SKIP',
  'monitor': 'SKIP',
  'geo blocker': 'SKIP',
  'geo-blocker': 'SKIP',
  'no apply': 'SKIP',
};

// --- Normalize a raw status cell ---
function normalizeStatus(raw) {
  // Strip markdown bold markers
  let cleaned = raw.replace(/\*\*/g, '').trim();

  // Extract DUPLICADO note if present
  let duplicadoNote = '';
  const dupMatch = cleaned.match(/\s*[\[(]?DUPLICADO[^\])]*/i);
  if (dupMatch) {
    duplicadoNote = dupMatch[0].trim();
    cleaned = cleaned.replace(dupMatch[0], '').trim();
  }

  // Strip trailing dates like "Applied 2024-01-15"
  cleaned = cleaned.replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();

  const lookupKey = cleaned.toLowerCase().trim();
  const canonical = STATUS_MAP[lookupKey];

  return { canonical, cleaned, lookupKey, duplicadoNote };
}

// --- Process file ---
const content = readFileSync(APPS_FILE, 'utf-8');
const lines = content.split('\n');
const changes = [];
const unknowns = new Set();

const newLines = lines.map((line, idx) => {
  if (!line.startsWith('|')) return line;

  const parts = line.split('|');
  if (parts.length < 8) return line;

  const numStr = parts[1]?.trim();
  if (isNaN(parseInt(numStr))) return line; // header/separator

  // Status is column 6 (0-indexed: parts[6])
  const rawStatus = parts[6]?.trim() || '';
  if (!rawStatus) return line;

  const { canonical, cleaned, lookupKey, duplicadoNote } = normalizeStatus(rawStatus);

  if (!canonical) {
    if (lookupKey && lookupKey !== '—' && lookupKey !== '-') {
      unknowns.add(lookupKey);
    }
    return line;
  }

  if (canonical === cleaned && !duplicadoNote) return line; // already canonical

  // Apply change
  parts[6] = ` ${canonical} `;

  // Move DUPLICADO to notes column if present
  if (duplicadoNote && parts[9] !== undefined) {
    const currentNotes = parts[9]?.trim() || '';
    parts[9] = ` ${currentNotes ? currentNotes + '; ' : ''}${duplicadoNote} `;
  }

  const newLine = parts.join('|');
  if (newLine !== line) {
    changes.push({
      lineNum: idx + 1,
      entry: numStr,
      from: rawStatus,
      to: canonical,
    });
  }

  return newLine;
});

// --- Report ---
console.log(`\nNormalize-statuses report`);
console.log(`  File: ${APPS_FILE}`);
console.log(`  Changes: ${changes.length}`);

if (changes.length > 0) {
  for (const c of changes) {
    console.log(`    #${c.entry}: "${c.from}" → "${c.to}"`);
  }
}

if (unknowns.size > 0) {
  console.log(`\n  Unknown statuses (need manual review):`);
  for (const u of unknowns) {
    console.log(`    "${u}"`);
  }
}

if (changes.length === 0) {
  console.log('\nAll statuses are already canonical. Nothing to do.\n');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('\n[DRY RUN] No files modified.\n');
  process.exit(0);
}

// Backup and write
const backupPath = APPS_FILE + '.bak';
copyFileSync(APPS_FILE, backupPath);
console.log(`\nBackup: ${backupPath}`);

writeFileSync(APPS_FILE, newLines.join('\n'));
console.log(`Written: ${APPS_FILE}\n`);

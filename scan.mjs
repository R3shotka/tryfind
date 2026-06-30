#!/usr/bin/env node
/**
 * scan.mjs — Zero-token portal scanner for career-ops
 *
 * Loads providers from providers/*.mjs and scans configured companies.
 * Writes new offers to data/pipeline.md and data/scan-history.tsv.
 *
 * Usage:
 *   node scan.mjs                      # scan all enabled companies
 *   node scan.mjs --dry-run            # preview without writing
 *   node scan.mjs --company <name>     # scan single company
 *   node scan.mjs --verify             # verify URL liveness with Playwright
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { load as yamlLoad } from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTALS_FILE = join(__dirname, 'portals.yml');
const PIPELINE_FILE = existsSync(join(__dirname, 'data/pipeline.md'))
  ? join(__dirname, 'data/pipeline.md')
  : join(__dirname, 'pipeline.md');
const SCAN_HISTORY_FILE = existsSync(join(__dirname, 'data'))
  ? join(__dirname, 'data/scan-history.tsv')
  : join(__dirname, 'scan-history.tsv');
const APPS_FILE = existsSync(join(__dirname, 'data/applications.md'))
  ? join(__dirname, 'data/applications.md')
  : join(__dirname, 'applications.md');

const PROVIDERS_DIR = join(__dirname, 'providers');
const CONCURRENCY_LIMIT = 10;

// --- CLI args ---
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERIFY = args.includes('--verify');
const companyIdx = args.indexOf('--company');
const COMPANY_FILTER = companyIdx !== -1 ? args[companyIdx + 1] : null;

// --- Load providers ---
async function loadProviders() {
  if (!existsSync(PROVIDERS_DIR)) return [];
  const files = readdirSync(PROVIDERS_DIR)
    .filter(f => f.endsWith('.mjs') && !f.startsWith('_'))
    .sort();

  const providers = [];
  for (const file of files) {
    try {
      const mod = await import(join(PROVIDERS_DIR, file));
      if (mod.default && mod.default.id && typeof mod.default.fetch === 'function') {
        providers.push(mod.default);
      }
    } catch (e) {
      console.warn(`  [WARN] Failed to load provider ${file}: ${e.message}`);
    }
  }
  return providers;
}

// --- Resolve which provider to use for a company ---
function resolveProvider(company, providers) {
  const api = company.api || {};
  for (const provider of providers) {
    if (provider.detect && provider.detect(company)) return provider;
    if (api.type === provider.id) return provider;
  }
  return null;
}

// --- Title filtering ---
export function buildTitleFilter(config) {
  const positive = (config?.positive || []).map(k => k.toLowerCase());
  const negative = (config?.negative || []).map(k => k.toLowerCase());
  const seniority = (config?.seniority_boost || []).map(k => k.toLowerCase());

  return function filterTitle(title) {
    const lower = title.toLowerCase();
    if (negative.some(kw => lower.includes(kw))) return false;
    if (positive.length > 0 && !positive.some(kw => lower.includes(kw))) return false;
    return true;
  };
}

// --- Location filtering ---
export function buildLocationFilter(config) {
  if (!config) return () => true;
  const alwaysAllow = (config.always_allow || []).map(k => k.toLowerCase());
  const allow = (config.allow || []).map(k => k.toLowerCase());
  const block = (config.block || []).map(k => k.toLowerCase());

  return function filterLocation(location) {
    if (!location) return allow.length === 0; // if no location and no allow list, pass
    const lower = location.toLowerCase();

    // always_allow overrides everything
    if (alwaysAllow.some(kw => lower.includes(kw))) return true;

    // check block list
    if (block.some(kw => lower.includes(kw))) return false;

    // if allow list is set, must match
    if (allow.length > 0) return allow.some(kw => lower.includes(kw));

    return true;
  };
}

// --- Load seen URLs (dedup) ---
function loadSeenUrls() {
  const seen = new Set();
  for (const file of [SCAN_HISTORY_FILE, PIPELINE_FILE, APPS_FILE]) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf-8');
    const urlPattern = /https?:\/\/[^\s|)\]"']+/g;
    for (const match of content.matchAll(urlPattern)) {
      seen.add(match[0].replace(/[.,;)]+$/, ''));
    }
  }
  return seen;
}

// --- Load seen company+role combinations ---
function loadSeenCompanyRoles() {
  const seen = new Set();
  for (const file of [SCAN_HISTORY_FILE, PIPELINE_FILE, APPS_FILE]) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        seen.add(`${parts[1]?.toLowerCase()}::${parts[2]?.toLowerCase()}`);
      }
    }
  }
  return seen;
}

// --- Append to pipeline ---
function appendToPipeline(offers) {
  if (!existsSync(dirname(PIPELINE_FILE))) {
    mkdirSync(dirname(PIPELINE_FILE), { recursive: true });
  }
  if (!existsSync(PIPELINE_FILE)) {
    writeFileSync(PIPELINE_FILE, '# Pipeline\n\n## Pendientes\n\n## Processed\n');
  }
  let content = readFileSync(PIPELINE_FILE, 'utf-8');
  const pendingIdx = content.indexOf('## Pendientes');
  if (pendingIdx === -1) {
    content += '\n## Pendientes\n';
  }

  const insertIdx = content.indexOf('\n', content.indexOf('## Pendientes')) + 1;
  const newLines = offers.map(o => `- [ ] ${o.url} | ${o.company} | ${o.title}`).join('\n') + '\n';

  content = content.slice(0, insertIdx) + newLines + content.slice(insertIdx);
  if (!DRY_RUN) writeFileSync(PIPELINE_FILE, content);
}

// --- Append to scan history ---
function appendToScanHistory(records) {
  if (!existsSync(dirname(SCAN_HISTORY_FILE))) {
    mkdirSync(dirname(SCAN_HISTORY_FILE), { recursive: true });
  }
  const now = new Date().toISOString().split('T')[0];
  const lines = records.map(r =>
    `${now}\t${r.company}\t${r.title}\t${r.url}\t${r.status}`
  ).join('\n') + '\n';
  if (!DRY_RUN) appendFileSync(SCAN_HISTORY_FILE, lines);
}

// --- Parallel fetch with concurrency limit ---
async function parallelFetch(tasks, limit) {
  const results = [];
  const queue = [...tasks];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      try {
        results.push(await task());
      } catch (e) {
        results.push({ error: e.message });
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// --- Verify offer liveness with Playwright ---
async function verifyOffers(offers) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const verified = [];

  try {
    for (const offer of offers) {
      const page = await browser.newPage();
      try {
        await page.goto(offer.url, { timeout: 15000, waitUntil: 'domcontentloaded' });
        const title = await page.title();
        const bodyText = await page.textContent('body').catch(() => '');
        const lower = bodyText.toLowerCase();

        let status = 'active';
        if (lower.includes('no longer available') || lower.includes('job has been filled') ||
            lower.includes('position has been filled') || lower.includes('this job is not available')) {
          status = 'expired';
        } else if (!lower.includes('apply') && !lower.includes('submit')) {
          status = 'dropped';
        }

        verified.push({ ...offer, liveness: status });
      } catch {
        verified.push({ ...offer, liveness: 'invalid' });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return verified;
}

// --- Main ---
async function main() {
  if (!existsSync(PORTALS_FILE)) {
    console.error(`portals.yml not found at ${PORTALS_FILE}`);
    console.error('Copy templates/portals.example.yml to portals.yml and configure it.');
    process.exit(1);
  }

  const config = yamlLoad(readFileSync(PORTALS_FILE, 'utf-8'));
  const companies = (config.tracked_companies || []).filter(c => c.enabled !== false);

  const filteredCompanies = COMPANY_FILTER
    ? companies.filter(c => c.name?.toLowerCase().includes(COMPANY_FILTER.toLowerCase()))
    : companies;

  if (filteredCompanies.length === 0) {
    console.log('No companies match the filter.');
    return;
  }

  const providers = await loadProviders();
  const filterTitle = buildTitleFilter(config.title_filter);
  const filterLocation = buildLocationFilter(config.location_filter);
  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();

  console.log(`Scanning ${filteredCompanies.length} companies with ${providers.length} providers...`);
  if (DRY_RUN) console.log('[DRY RUN] No files will be modified.');

  const allNew = [];
  const allHistory = [];

  const tasks = filteredCompanies.map(company => async () => {
    const provider = resolveProvider(company, providers);
    if (!provider) {
      console.log(`  [SKIP] ${company.name}: no provider matched`);
      return;
    }

    let offers = [];
    try {
      offers = await provider.fetch(company, config);
      console.log(`  [OK] ${company.name}: ${offers.length} offers fetched`);
    } catch (e) {
      console.warn(`  [ERR] ${company.name}: ${e.message}`);
      return;
    }

    for (const offer of offers) {
      const url = offer.url?.trim();
      if (!url || seenUrls.has(url)) {
        allHistory.push({ company: company.name, title: offer.title || '', url: url || '', status: 'skipped_dup' });
        continue;
      }

      if (!filterTitle(offer.title || '')) {
        allHistory.push({ company: company.name, title: offer.title || '', url, status: 'skipped_title' });
        continue;
      }

      if (!filterLocation(offer.location || '')) {
        allHistory.push({ company: company.name, title: offer.title || '', url, status: 'skipped_location' });
        continue;
      }

      const key = `${company.name.toLowerCase()}::${(offer.title || '').toLowerCase()}`;
      if (seenCompanyRoles.has(key)) {
        allHistory.push({ company: company.name, title: offer.title || '', url, status: 'skipped_dup' });
        continue;
      }

      seenUrls.add(url);
      seenCompanyRoles.add(key);
      allNew.push({ company: company.name, title: offer.title || '', url, location: offer.location || '' });
      allHistory.push({ company: company.name, title: offer.title || '', url, status: 'added' });
    }
  });

  await parallelFetch(tasks, CONCURRENCY_LIMIT);

  if (VERIFY && allNew.length > 0) {
    console.log(`\nVerifying ${allNew.length} new offers...`);
    const verified = await verifyOffers(allNew);
    const live = verified.filter(o => o.liveness === 'active');
    const dead = verified.filter(o => o.liveness !== 'active');
    console.log(`  Live: ${live.length}, Expired/Invalid: ${dead.length}`);

    if (live.length > 0) appendToPipeline(live);
    appendToScanHistory(allHistory);
  } else if (allNew.length > 0) {
    appendToPipeline(allNew);
    appendToScanHistory(allHistory);
  } else {
    appendToScanHistory(allHistory);
  }

  console.log(`\nScan complete: ${allNew.length} new offers added.`);
  if (allNew.length > 0) {
    console.log(`New offers written to: ${PIPELINE_FILE}`);
  }
}

main().catch(err => {
  console.error('Scan failed:', err.message);
  process.exit(1);
});

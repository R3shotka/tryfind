#!/usr/bin/env node
/**
 * generate-pdf.mjs — HTML to PDF converter with ATS normalization
 *
 * Usage:
 *   node generate-pdf.mjs <input.html> <output.pdf> [--format=letter|a4]
 *
 * Features:
 * - Playwright-based headless PDF rendering
 * - ATS Unicode normalization (em-dashes, smart quotes, arrows, etc.)
 * - Absolute font path resolution for file:// URLs
 * - Page count estimation from PDF structure
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node generate-pdf.mjs <input.html> <output.pdf> [--format=letter|a4]');
  process.exit(1);
}

const inputPath = resolve(args[0]);
const outputPath = resolve(args[1]);
const formatArg = args.find(a => a.startsWith('--format='));
const format = formatArg ? formatArg.split('=')[1] : 'a4';

/**
 * Normalize problematic Unicode characters for ATS compatibility.
 * Replaces em-dashes, smart quotes, zero-width chars, arrows, and bullets
 * with ASCII equivalents. Preserves CSS, JS, and tag attributes.
 */
function normalizeTextForATS(html) {
  const replacements = [
    // Em-dashes and en-dashes
    { pattern: /—/g, replacement: '--', label: 'em-dash' },
    { pattern: /–/g, replacement: '-', label: 'en-dash' },
    // Smart quotes
    { pattern: /[‘’]/g, replacement: "'", label: 'smart-single-quote' },
    { pattern: /[“”]/g, replacement: '"', label: 'smart-double-quote' },
    // Zero-width characters
    { pattern: /[​‌‍﻿]/g, replacement: '', label: 'zero-width' },
    // Arrows
    { pattern: /→/g, replacement: '->', label: 'right-arrow' },
    { pattern: /←/g, replacement: '<-', label: 'left-arrow' },
    { pattern: /↔/g, replacement: '<->', label: 'bi-arrow' },
    // Bullets
    { pattern: /•/g, replacement: '*', label: 'bullet' },
    { pattern: /●/g, replacement: '*', label: 'filled-circle' },
    { pattern: /■/g, replacement: '*', label: 'filled-square' },
    // Ellipsis
    { pattern: /…/g, replacement: '...', label: 'ellipsis' },
    // Multiplication sign
    { pattern: /×/g, replacement: 'x', label: 'multiplication' },
  ];

  let result = html;
  const counts = {};

  // Only apply replacements to text nodes, not inside tags or attributes
  // Simple approach: split on HTML tags, normalize text portions
  result = result.replace(/(<[^>]*>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag; // preserve HTML tags as-is
    if (!text) return match;

    let normalized = text;
    for (const { pattern, replacement, label } of replacements) {
      const before = normalized;
      normalized = normalized.replace(pattern, replacement);
      if (normalized !== before) {
        const count = (before.match(pattern) || []).length;
        counts[label] = (counts[label] || 0) + count;
      }
    }
    return normalized;
  });

  if (Object.keys(counts).length > 0) {
    console.log('ATS normalization replacements:');
    for (const [label, count] of Object.entries(counts)) {
      console.log(`  ${label}: ${count}`);
    }
  }

  return result;
}

/**
 * Convert relative font paths in CSS to absolute file:// URLs
 */
function resolveAbsoluteFontPaths(html, baseDir) {
  return html.replace(/url\(['"]?([^'")\s]+\.(?:woff2?|ttf|otf|eot))['"]?\)/gi, (match, fontPath) => {
    if (fontPath.startsWith('http') || fontPath.startsWith('file://') || fontPath.startsWith('data:')) {
      return match;
    }
    const absolutePath = resolve(baseDir, fontPath);
    return `url('file://${absolutePath}')`;
  });
}

/**
 * Estimate page count from PDF binary structure
 */
function estimatePageCount(pdfBuffer) {
  const pdfStr = pdfBuffer.toString('binary');
  const pageMatches = pdfStr.match(/\/Type\s*\/Page\b/g);
  return pageMatches ? pageMatches.length : 1;
}

async function main() {
  let rawHtml = readFileSync(inputPath, 'utf-8');

  // Apply ATS normalization
  rawHtml = normalizeTextForATS(rawHtml);

  // Resolve font paths to absolute file:// URLs
  const inputDir = dirname(inputPath);
  rawHtml = resolveAbsoluteFontPaths(rawHtml, inputDir);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();

    await page.setContent(rawHtml, { waitUntil: 'networkidle' });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    const pdfBuffer = await page.pdf({
      path: outputPath,
      format: format === 'letter' ? 'Letter' : 'A4',
      margin: { top: '0.6in', bottom: '0.6in', left: '0.6in', right: '0.6in' },
      printBackground: true,
    });

    const pageCount = estimatePageCount(Buffer.isBuffer(pdfBuffer) ? pdfBuffer : readFileSync(outputPath));
    const fileSizeKb = Math.round(statSync(outputPath).size / 1024);

    console.log(`PDF generated: ${outputPath}`);
    console.log(`  Format: ${format.toUpperCase()}`);
    console.log(`  Estimated pages: ${pageCount}`);
    console.log(`  File size: ${fileSizeKb} KB`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Error generating PDF:', err.message);
  process.exit(1);
});

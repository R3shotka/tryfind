#!/usr/bin/env node
/**
 * gemini-eval.mjs — Free-tier Gemini job offer evaluator for career-ops
 *
 * Uses Google's Gemini API to evaluate job descriptions using the same
 * A-G scoring framework as the Claude-based modes.
 *
 * Usage:
 *   node gemini-eval.mjs "Job description text here"
 *   node gemini-eval.mjs --file ./jds/my-job.txt
 *   node gemini-eval.mjs --model gemini-2.5-flash "JD text"
 *
 * Requires: GEMINI_API_KEY env var
 * Free tier: 15 RPM / 1M tokens/day (no billing needed)
 * Get key: https://aistudio.google.com/apikey
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config(); // load .env

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Model config ---
// Note: gemini-2.5-flash deprecated 2026-06-17; using gemini-2.5-flash as default
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// --- Parse CLI args ---
const args = process.argv.slice(2);
const fileArgIdx = args.indexOf('--file');
const modelArgIdx = args.indexOf('--model');
const modelOverride = modelArgIdx !== -1 ? args[modelArgIdx + 1] : null;

let jdText = '';
if (fileArgIdx !== -1) {
  const filePath = args[fileArgIdx + 1];
  if (!filePath || !existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  jdText = readFileSync(filePath, 'utf-8');
} else {
  // Find first non-flag argument
  jdText = args.find(a => !a.startsWith('--') && a !== modelOverride) || '';
}

if (!jdText.trim()) {
  console.error('Usage: node gemini-eval.mjs "<JD text>" | --file <path>');
  console.error('Set GEMINI_API_KEY in your .env file first.');
  process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.error('GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey');
  console.error('Then add it to your .env file: GEMINI_API_KEY=your_key_here');
  process.exit(1);
}

// --- Load context files ---
function loadFile(relPath, fallback = '') {
  const fullPath = join(__dirname, relPath);
  if (!existsSync(fullPath)) return fallback;
  return readFileSync(fullPath, 'utf-8');
}

const sharedContext = loadFile('modes/_shared.md');
const ofertaMode = loadFile('modes/oferta.md', loadFile('modes/auto-pipeline.md'));
const cvContent = loadFile('cv.md', '[CV not found — create cv.md with your resume content]');
const profileMd = loadFile('modes/_profile.md', '');
const profileYml = loadFile('config/profile.yml', '');

// --- Build system prompt ---
const systemPrompt = `You are a job offer evaluator assistant using the career-ops framework.

## System Context
${sharedContext}

## User Profile
${profileMd}

## Candidate CV
${cvContent}

## Profile Config (YAML)
${profileYml}

## Instructions
Evaluate the job description provided by the user using the A-G scoring framework described in the system context.

Output format:
1. Blocks A through F with analysis and scores
2. Block G: Legitimacy assessment
3. A machine-readable score summary block at the end:

---SCORE_SUMMARY---
company: <company name>
role: <role title>
score: <global score X.X/5>
archetype: <detected archetype>
legitimacy_tier: <High Confidence|Proceed with Caution|Suspicious>
final_decision: <Apply|Skip|Monitor>
hard_stops: [<list>]
soft_gaps: [<list>]
top_strengths: [<list>]
---END_SUMMARY---`;

// --- Calculate next report number ---
function getNextReportNum() {
  const reportsDir = join(__dirname, 'reports');
  if (!existsSync(reportsDir)) return 1;
  const files = readdirSync(reportsDir).filter(f => /^\d+/.test(f));
  if (files.length === 0) return 1;
  const nums = files.map(f => parseInt(f.match(/^(\d+)/)?.[1] || '0'));
  return Math.max(...nums) + 1;
}

// --- Slugify company name for filename ---
function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

// --- Parse score summary block ---
function parseSummary(text) {
  const match = text.match(/---SCORE_SUMMARY---([\s\S]*?)---END_SUMMARY---/);
  if (!match) return null;
  const lines = match[1].trim().split('\n');
  const summary = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) summary[key.trim()] = rest.join(':').trim();
  }
  return summary;
}

// --- Main ---
async function main() {
  const model = modelOverride || DEFAULT_MODEL;
  console.log(`Using model: ${model}`);
  console.log('Evaluating job description...\n');

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const generativeModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  });

  let result;
  try {
    result = await generativeModel.generateContent(jdText);
  } catch (e) {
    if (e.message?.includes('API_KEY') || e.message?.includes('401')) {
      console.error('Invalid API key. Check your GEMINI_API_KEY in .env');
    } else if (e.message?.includes('429') || e.message?.includes('quota')) {
      console.error('Rate limit hit. Free tier: 15 RPM. Wait a minute and retry.');
    } else if (e.message?.includes('deprecated') || e.message?.includes('404')) {
      console.error(`Model "${model}" may be deprecated or unavailable. Try: GEMINI_MODEL=gemini-1.5-flash`);
    } else {
      console.error('Gemini API error:', e.message);
    }
    process.exit(1);
  }

  const responseText = result.response.text();

  // Parse summary for filename
  const summary = parseSummary(responseText);
  const company = summary?.company ? slugify(summary.company) : 'unknown';
  const today = new Date().toISOString().split('T')[0];
  const reportNum = getNextReportNum();
  const reportName = `${String(reportNum).padStart(3, '0')}-${company}-${today}.md`;
  const reportsDir = join(__dirname, 'reports');

  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, reportName);

  const reportContent = `# Evaluation Report — ${summary?.company || 'Unknown Company'}
<!-- Generated by gemini-eval.mjs | Model: ${model} | Date: ${today} -->

${responseText}
`;

  writeFileSync(reportPath, reportContent);

  console.log(responseText);
  console.log(`\nReport saved: reports/${reportName}`);

  if (summary) {
    console.log(`\nScore: ${summary.score} | Decision: ${summary.final_decision} | Archetype: ${summary.archetype}`);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});

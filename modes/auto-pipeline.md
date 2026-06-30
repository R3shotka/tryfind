# Mode: auto-pipeline — Automatic Job Offer Pipeline

Triggered automatically when the user pastes a job description or URL without specifying a command. Full end-to-end pipeline from JD to tracker entry.

## Trigger Conditions

Auto-trigger when user input is:
- A job posting URL (greenhouse.io, ashby.com, lever.co, linkedin.com/jobs, etc.)
- A pasted block of text that looks like a job description (>200 words with role/requirements/qualifications)
- A file path starting with `local:` or `jds/`

## Step 0 — JD Extraction

Try in order, stop at first success:

1. **Playwright** (preferred): `browser_navigate` → `browser_snapshot` → extract text
   - Works with SPAs, JavaScript-rendered pages
2. **WebFetch** (fallback): Fetch URL as HTML → extract visible text
   - Works with static pages
3. **WebSearch** (last resort): Search `{company} {role} job description` to find cached version
4. **Manual**: If all fail, ask user to paste the JD text directly

**Special cases:**
- LinkedIn: requires login → ask user to paste
- PDF URL: use Read tool directly
- `local:` prefix: read from `jds/{filename}`

## Step 1 — Evaluation (A–G)

Run full evaluation using `modes/_shared.md` framework:

**Block A — Role Summary Table**
| Field | Value |
|-------|-------|
| Company | |
| Role | |
| Archetype | (from _shared.md detection table) |
| Seniority | |
| Location / Remote | |
| Team size | |
| Comp | |
| Domain | |

**Blocks B–F** — Scores 1–5 with analysis
- B: CV Match (30%) — Read cv.md right now, cite specific lines
- C: North Star (25%) — Align to profile.yml target roles
- D: Comp (20%) — WebSearch current market data
- E: Cultural signals (15%) — Company research
- F: Red flags (−10%) — Legitimacy, warning signs

**Block G** — Posting Legitimacy (High Confidence / Proceed with Caution / Suspicious)

**Global score** = weighted average of B–F

## Step 2 — Save Report

Save to `reports/{NNN}-{company-slug}-{YYYY-MM-DD}.md`

Report structure:
```markdown
# {Company} — {Role}
**Score: X.X/5** | **Decision: Apply/Skip/Monitor** | **Archetype: {type}**
**URL:** {original URL}
**Legitimacy:** {tier}

## Block A — Role Summary
{table}

## Block B — CV Match (X/5)
{analysis}

## Block C — North Star (X/5)
{analysis}

## Block D — Compensation (X/5)
{analysis}

## Block E — Cultural Signals (X/5)
{analysis}

## Block F — Red Flags ({+/-X})
{analysis}

## Block G — Legitimacy
{tier + evidence}

## Machine Summary
\`\`\`yaml
company: "{company}"
role: "{role}"
score: {X.X}
legitimacy_tier: "{tier}"
archetype: "{archetype}"
final_decision: "{Apply|Skip|Monitor}"
hard_stops: [{list}]
soft_gaps: [{list}]
top_strengths: [{list}]
risk_level: "{Low|Medium|High}"
confidence: "{Low|Medium|High}"
next_action: "{what to do next}"
\`\`\`
```

## Step 3 — Generate PDF

Check `config/profile.yml` → `cv.output_format`:
- `html` → run `modes/pdf.md` pipeline → `node generate-pdf.mjs`
- `latex` → run `modes/latex.md` pipeline → compile .tex

Skip PDF if score < `auto_pdf_score_threshold` from profile.yml (default: 3.0).
If skipped: add note "PDF not generated — run /career-ops pdf {slug} to create on demand"

## Step 4 — Draft Application Answers (if score ≥ 4.5)

Generate Section G in the report: draft answers for likely application form questions.

**"I'm choosing you" tone framework:**
- Map role requirements to actual experience (cite cv.md lines)
- Mention specific company knowledge (from Step 1 research)
- Provide quantified achievement from cv.md or article-digest.md
- State unique positioning vs. typical candidate for this role
- Honest sourcing: "I found this role via {source}"

**Avoid:**
- "I'm passionate about..."
- "I've always dreamed of..."
- "I would love to..."
- Generic statements that could apply to any company

## Step 5 — Update Tracker

Add row to `data/applications.md` via TSV format:

```
{date}\t{company}\t{role}\t{score}\tEvaluated\t[PDF](output/...)\t[Report](reports/...)
```

Never edit applications.md directly — always use the TSV append mechanism.

## Failure Handling

If a step fails, mark it as pending rather than halting:
- JD extraction fails → ask user for text
- PDF generation fails → note in report header, continue
- Tracker write fails → show TSV row, ask user to add manually

## Output Summary

After completing all steps, show:

```
## Pipeline Complete

Company: {company}
Role: {role}
Score: {X.X}/5 — {Apply|Skip|Monitor}
Archetype: {type}
Legitimacy: {tier}

Report: reports/{filename}
PDF: output/{filename} ✅/❌
Tracker: ✅ Added as #NNN

Next steps:
- {recommendation based on score and decision}
```

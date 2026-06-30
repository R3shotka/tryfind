# career-ops

AI-powered job search pipeline. Evaluates offers, generates tailored CVs, scans portals, tracks applications.

## Usage

`/career-ops [subcommand] [args]`

If no subcommand is provided, show the menu below.

## Routing

Read the corresponding mode file and follow its instructions exactly:

| Subcommand | Mode file | When to use |
|------------|-----------|-------------|
| (none) | — | Show menu |
| `scan` | `modes/scan.md` | Search portals for new offers |
| `pipeline` | `modes/pipeline.md` | Process pending URLs from `data/pipeline.md` |
| `oferta` | `modes/oferta.md` | Evaluate a single job offer (URL or JD text) |
| `ofertas` | `modes/ofertas.md` | Compare and rank multiple offers |
| `pdf` | `modes/pdf.md` | Generate ATS-optimized tailored CV PDF |
| `latex` | `modes/latex.md` | Export CV as LaTeX/Overleaf .tex |
| `deep` | `modes/deep.md` | Deep company research |
| `contacto` | `modes/contacto.md` | LinkedIn outreach — find contacts + draft message |
| `interview-prep` | `modes/interview-prep.md` | Company-specific interview intel |
| `apply` | `modes/apply.md` | Live application assistant (fill forms, never auto-submit) |
| `tracker` | — | Show applications tracker summary |
| `batch` | `modes/batch.md` | Batch process multiple offers in parallel |
| `patterns` | `modes/patterns.md` | Analyze rejection patterns |
| `followup` | `modes/followup.md` | Follow-up cadence tracker |
| `training` | `modes/training.md` | Evaluate a course or certification |
| `project` | `modes/project.md` | Evaluate a portfolio project idea |

## Menu (when no subcommand)

When called with no arguments, display:

```
career-ops — AI Job Search Pipeline

Commands:
  /career-ops scan          Search portals for new .NET/C# offers
  /career-ops pipeline      Process pending URLs from inbox
  /career-ops oferta [url]  Evaluate a job offer
  /career-ops pdf           Generate tailored CV PDF
  /career-ops deep [co]     Deep company research
  /career-ops tracker       Application status overview
  /career-ops followup      Follow-up cadence tracker
  /career-ops patterns      Analyze rejection patterns
  /career-ops apply         Live application assistant
  /career-ops interview-prep Interview preparation
  /career-ops batch         Batch process multiple offers

Tip: Paste any job URL directly and I'll evaluate it automatically.
```

## Auto-pipeline (default when URL or JD is pasted)

If the user pastes a job URL or job description without a subcommand, automatically run the full pipeline:
1. Read `modes/auto-pipeline.md` (or `modes/oferta.md` if auto-pipeline.md is missing)
2. Evaluate the offer
3. Generate tailored CV if score ≥ threshold from `config/profile.yml`
4. Write report to `reports/`
5. Add to tracker via TSV in `batch/tracker-additions/`

## Context files

Always read these before any evaluation:
- `cv.md` — canonical CV
- `config/profile.yml` — candidate profile, compensation, location policy
- `modes/_profile.md` — archetypes, scoring weights, negotiation scripts
- `modes/_shared.md` — shared evaluation framework

## Ethical guardrails

- NEVER auto-submit applications. Always stop before clicking Submit/Apply.
- Recommend against applying if score < 4.0/5 unless user overrides.
- Quality over quantity — fewer, better applications.

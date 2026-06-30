# Career-Ops: AI Job Search Pipeline

Career-Ops is an open-source job search automation system designed by Santiago Ferrer that combines application tracking, offer evaluation, CV generation, and portal scanning into a unified workflow.

## Core Purpose

The system helps candidates evaluate job offers systematically, generate tailored CVs at scale, and manage the entire job search pipeline. It was originally used to process "740+ job offers, generate 100+ tailored CVs, and land a Head of Applied AI role."

## Key Architecture

**Two-layer file structure:**
- **User Layer** (personalization): CV, profile config, application tracker, interview prep notes
- **System Layer** (auto-updatable): Modes, scripts, templates, agents

Critical principle: "When the user asks to customize anything (archetypes, narrative, negotiation scripts), ALWAYS write to `modes/_profile.md` or `config/profile.yml`. NEVER edit `modes/_shared.md` for user-specific content."

## Main Capabilities

- **Pipeline tracking** (`data/applications.md`)
- **Job evaluation** with standardized scoring (Blocks A-F + legitimacy verification)
- **Portal scanning** (`scan.mjs` — zero-token, hits APIs directly)
- **CV generation** in HTML/LaTeX with Playwright PDF export
- **Batch processing** for multiple offers
- **Interview prep** with company-specific intel and STAR story bank
- **Follow-up cadence** calculation and tracking

## Language Support

Multi-language modes available:
- **German** (`modes/de/`) — DACH-specific terms
- **French** (`modes/fr/`) — France/Belgium/Switzerland conventions
- **Japanese** (`modes/ja/`) — Japan employment vocabulary
- **Turkish** (`modes/tr/`) — Turkey market specifics

## Headless / Batch Mode

| CLI | Command | Notes |
|-----|---------|-------|
| Claude Code | `claude -p --dangerously-skip-permissions --append-system-prompt-file batch/batch-prompt.md` | Primary |
| Gemini CLI | `gemini -p` | Alternative |
| Codex | `codex exec` | Alternative |
| OpenCode | `opencode run` | Alternative |
| Qwen | `qwen -p` | Alternative |

## Ethical Guardrails

"This system is designed for quality, not quantity." Key commitments:
- Never submit applications without user review
- Discourage low-fit applications (score <4.0/5)
- Prioritize "fewer, better applications" over mass volume
- Respect recruiter time by only sending high-quality matches

## Onboarding Flow

Six-step setup ensures the system learns about the user before automation:
1. Import/create CV
2. Configure profile (name, location, target roles, compensation)
3. Set up job portals
4. Initialize application tracker
5. Share context (unique strengths, deal-breakers, portfolio links)
6. Enable recurring scans

The system evolves with feedback — after each evaluation, it refines its understanding of fit without polluting system files with user data.

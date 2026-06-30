# career-ops — System Context
<!-- AUTO-UPDATABLE SYSTEM FILE. Do not add user-specific content here.
     User customizations go in modes/_profile.md or config/profile.yml -->

## Sources of Truth

| File | Purpose |
|------|---------|
| `cv.md` | Candidate resume — primary source for all metrics and experience |
| `article-digest.md` | Published articles, talks, proof points — read at evaluation time |
| `config/profile.yml` | Structured config: name, location, comp targets, archetype prefs |
| `modes/_profile.md` | User overrides for archetypes, narrative, negotiation scripts |
| `writing-samples/` | Tone reference — used to calibrate writing style |

## Scoring System (1–5 scale)

| Block | Dimension | Weight |
|-------|-----------|--------|
| A | Role Summary | — |
| B | CV Match | 30% |
| C | North Star | 25% |
| D | Comp | 20% |
| E | Cultural signals | 15% |
| F | Red flags | −10% |
| — | **Global** | weighted avg |

**Score interpretation:**
- 4.5+ → Strong match — apply immediately
- 4.0–4.4 → Good match — apply with tailored CV
- 3.5–3.9 → Decent fit — apply if pipeline is light
- 3.0–3.4 → Marginal — skip unless strategic
- < 3.0 → Not recommended

## Block G: Posting Legitimacy

| Tier | Meaning |
|------|---------|
| High Confidence | Active ATS, specific JD, recent posting |
| Proceed with Caution | Vague JD, generic apply form, or reposted >60 days |
| Suspicious | Ghost posting signals: no apply button, layoff reports, recycled JD |

**Signals to check:** posting date, ATS legitimacy, JD specificity, Glassdoor layoff mentions, LinkedIn headcount trend.

## Archetype Detection

| Archetype | Key signals in JD |
|-----------|-------------------|
| AI Platform / LLMOps Engineer | evals, observability, MLflow, LangSmith, pipelines, reliability |
| Agentic Workflows / Automation | agents, HITL, orchestration, multi-agent, tooling |
| Technical AI Product Manager | PRD, discovery, roadmap, GenAI, cross-functional |
| AI Solutions Architect | enterprise, integrations, hyperautomation, system design |
| AI Forward Deployed Engineer | client-facing, delivery, prototyping, fast iteration |
| AI Transformation Lead | change management, adoption, enablement, org-wide |

## Global Rules

**NEVER:**
- Invent metrics, experience, or proof points
- Edit `modes/_shared.md` for user-specific content
- Submit applications without user confirmation
- Use: "leveraged", "synergies", "passionate about", "dynamic", "results-driven"
- Score a role > 4.0 if there is an unmitigated hard stop

**ALWAYS:**
- Read `cv.md` and `article-digest.md` at evaluation time — never from memory
- Include cover letter framing; cite exact CV lines when matching
- Use WebSearch for comp research (Glassdoor, Levels.fyi, Blind)
- Register evaluations in tracker via TSV (never edit `applications.md` directly)
- Generate content in the JD's language
- Write in active voice, short sentences, no corporate clichés

## Tools

| Task | Tool |
|------|------|
| Read JD from URL | Playwright → WebFetch → WebSearch (in order) |
| Company research | WebSearch |
| Comp data | WebSearch (Glassdoor, Levels.fyi) |
| CV to PDF | `node generate-pdf.mjs` |
| Portal scan | `node scan.mjs` |
| Pattern analysis | `node analyze-patterns.mjs` |
| Status normalization | `node normalize-statuses.mjs` |

## Writing Style Calibration

1. Check `modes/_profile.md` for cached writing style under "## Writing Style"
2. If absent, scan `writing-samples/` (skip README.md files)
3. Extract: sentence length, punctuation style, vocabulary register, tone
4. Persist findings to `modes/_profile.md` under "## Writing Style" for reuse

**Default style (before calibration):** Direct, technical, first-person. No filler words. Concrete over abstract. Numbers over adjectives.

## Professional Writing & ATS Compatibility

- Single-column layout for CVs (no sidebars)
- Standard section headers: Summary, Experience, Education, Skills, Projects
- UTF-8 encoding; no special characters in section headers
- Keywords from JD integrated naturally into existing bullet points
- Active verbs: Built, Reduced, Launched, Designed, Led, Scaled, Shipped
- Quantify every achievement: %, $, latency ms, users, time saved

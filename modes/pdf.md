# Mode: pdf — ATS-Optimized CV PDF Generation

Full pipeline for generating a tailored, ATS-compatible CV PDF from cv.md for a specific job description.

## Pipeline (16 steps)

1. **Read** `cv.md` (source of truth for all content)
2. **Read** `config/profile.yml` for output_format, paper format preference, and candidate details
3. **Extract** 15–20 keywords from the JD (noun phrases, tech terms, role-specific vocabulary)
4. **Detect language** from JD (English/Spanish/German/French/etc.) → generate CV in same language
5. **Detect paper format**: US/Canada → Letter; everywhere else → A4
6. **Detect archetype** from JD using _shared.md Archetype Detection table
7. **Read** `modes/_profile.md` for adaptive framing per archetype
8. **Rewrite professional summary** — inject top 5–8 keywords naturally, 3–4 sentences max
9. **Reorder experience bullets** by relevance to JD (most relevant first within each role)
10. **Select top 3–4 projects** from cv.md that best match JD keywords
11. **Inject keywords** into existing bullets — reformulate, never fabricate
12. **Calculate keyword coverage** (how many of the 15-20 JD keywords appear in final CV)
13. **Check output_format** from profile.yml:
    - `html` → proceed to step 14
    - `latex` → switch to LaTeX mode (see modes/latex.md)
14. **Generate HTML** from template (single-column, ATS-safe structure)
15. **Run** `node generate-pdf.mjs output/cv-{slug}-{date}.html output/cv-{slug}-{date}.pdf`
16. **Report** keyword coverage %, page count, file size

## ATS Compliance Rules

- Single-column layout (NO sidebars, no parallel columns)
- Standard section headers: Summary, Experience, Education, Skills, Projects
- No information in headers/footers (ATS often can't read them)
- All text must be selectable (not rasterized/image)
- UTF-8 encoding
- No tables for layout (use divs/sections)
- No special characters in section headers
- Font must be system-safe or embedded

## Design Specification

**Typography:**
- Headings: Space Grotesk 600–700 weight
- Body: DM Sans 400–500 weight
- Min body font size: 10.5pt

**Colors:**
- Primary: Cyan (#00B4D8 or similar)
- Accent: Purple (#7B2FBE or similar)
- Gradient header line under name

**Layout:**
- 0.6in margins (all sides)
- Single column
- Contact info on one line under name

## Keyword Integration Ethics

ALLOWED — Reformulating existing experience:
- "Built LLM workflows with retrieval" → "Designed RAG pipeline for document Q&A"
- "Reduced API costs" → "Cut inference costs 40% via prompt optimization"

NOT ALLOWED — Fabricating skills:
- Adding "React Native" if candidate has never used it
- Claiming "5 years of Kubernetes" if cv.md doesn't support it

Rule: **Every claim in the PDF must be traceable to cv.md or article-digest.md**

## Optional Canva Workflow

If `canva.design_id` is set in profile.yml:
1. Open Canva design with Playwright
2. Read current text box content and structure
3. Generate replacement content respecting character budgets from profile.yml
4. Apply edits field by field; allow text reflow
5. Export as PDF from Canva

Character budget enforcement: never exceed `font_budget_*` limits from profile.yml.
If content exceeds budget, summarize more aggressively — never overflow text boxes.

## Output Naming

```
output/cv-{candidate-slug}-{company-slug}-{YYYY-MM-DD}.html
output/cv-{candidate-slug}-{company-slug}-{YYYY-MM-DD}.pdf
```

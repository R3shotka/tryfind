# Mode: latex — LaTeX CV Export

Generate an ATS-optimized CV in LaTeX format, tailored to a specific job description. Overleaf-compatible.

## Pipeline

1. **Read** `cv.md` and `config/profile.yml`
2. **Read** JD (from URL or pasted text)
3. **Extract** 15–20 keywords from JD
4. **Detect** JD language and candidate language
5. **Detect** role archetype (from _shared.md Archetype Detection table)
6. **Read** `modes/_profile.md` for adaptive framing
7. **Read** `templates/cv-template.tex` (placeholder syntax: `{{PLACEHOLDER}}`)
8. **Rewrite** professional summary — inject top 5–8 keywords
9. **Reorder** experience bullets by relevance
10. **Select** top 3–4 projects
11. **Apply LaTeX escaping** to all user-supplied content
12. **Substitute** placeholders with escaped content
13. **Write** to `output/cv-{candidate-slug}-{company-slug}-{YYYY-MM-DD}.tex`
14. **Compile** (if compiler available):
    ```bash
    tectonic output/cv-*.tex  # preferred
    # or
    pdflatex output/cv-*.tex  # fallback
    ```

## LaTeX Escaping Rules

| Character | Escaped | Notes |
|-----------|---------|-------|
| `&` | `\&` | Table separators |
| `%` | `\%` | Comments |
| `$` | `\$` | Math mode |
| `#` | `\#` | Parameters |
| `_` | `\_` | Subscripts |
| `{` | `\{` | Grouping |
| `}` | `\}` | Grouping |
| `~` | `\textasciitilde{}` | Non-breaking space |
| `^` | `\textasciicircum{}` | Superscript |
| `\` | `\textbackslash{}` | Backslash |

**Exception:** URLs in `\href{URL}{display}` — the URL argument is NOT escaped; only the display text is.

## Placeholder Syntax

In `templates/cv-template.tex`:
```latex
% Use {{PLACEHOLDER}} syntax
\name{{{NAME}}}
\email{{{EMAIL}}}
{{SUMMARY}}
{{EXPERIENCE}}
{{EDUCATION}}
{{SKILLS}}
{{PROJECTS}}
```

## Content Rewriting Rules

ALLOWED:
- Reformulate existing experience using JD vocabulary
- Reorder bullet points by relevance (most relevant first)
- Summarize multiple bullets into one more impactful bullet

NOT ALLOWED:
- Fabricate skills or experience
- Inflate metrics beyond what cv.md supports
- Add technologies not mentioned in cv.md

## ATS Compliance for LaTeX

```latex
% Required in preamble for ATS compatibility
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\pdfgentounicode=1

% Use only standard CTAN packages (Overleaf-compatible)
% NO custom .sty files, NO XeLaTeX-only packages
```

Standard packages only: `geometry`, `hyperref`, `fontenc`, `inputenc`, `titlesec`, `enumitem`, `multicol` (for skills only), `xcolor`, `parskip`.

## Output

```
output/cv-{candidate-slug}-{company-slug}-{YYYY-MM-DD}.tex
output/cv-{candidate-slug}-{company-slug}-{YYYY-MM-DD}.pdf  (if compiled)
```

If compiler not available: provide the .tex file and instructions for Overleaf upload.

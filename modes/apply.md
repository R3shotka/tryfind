# Mode: apply -- Live Application Assistant

Interactive mode for when the candidate is filling out an application form. Reads what is on screen, loads previous context of the job, and generates personalized responses for each form question.

## Workflow

1. DETECT      -- Read active Chrome tab (screenshot/URL/title)
2. IDENTIFY    -- Extract company + role from the page
3. SEARCH      -- Match against existing reports in reports/
4. LOAD        -- Read full report + Section G (if it exists)
5. COMPARE     -- Does the role on screen match the one evaluated? If changed, notify
6. ANALYZE     -- Identify ALL visible form questions
7. GENERATE    -- For each question, generate a personalized response
8. PRESENT     -- Show formatted responses for copy-paste

## Step 1 -- Detect the job

With Playwright: Take a snapshot. Read title, URL, and visible content.
Without Playwright: Ask the candidate to share a screenshot or paste form questions.

## Step 2 -- Identify and search for context

1. Extract company name and role title from the page
2. Search in `reports/` by company name
3. If match exists, load the full report
4. If no match, offer to run auto-pipeline first

## Step 3 -- Detect changes

If the role on screen differs from the one evaluated, notify and ask to adapt or re-evaluate.

## Step 4 -- Analyze form questions

Identify ALL visible questions:
- Free text fields (cover letter, why this role, etc.)
- Dropdowns (work authorization, source, etc.)
- Yes/No fields (relocation, visa, etc.)
- Salary fields
- Upload fields

## Step 5 -- Generate responses

For each question:
1. Use report context (proof points from blocks, STAR stories)
2. Adapt previous Section G drafts if exist
3. Be specific: reference something from the visible JD
4. Professional tone -- not desperate, not generic

Output format:
## Responses for [Company] -- [Role]

Based on: Report #NNN | Score: X.X/5

---

### 1. [Exact form question]
> [Response ready for copy-paste]

## Step 6 -- Post-apply

If the candidate confirms submission:
1. Update status in applications.md from "Evaluated" to "Applied"
2. Update Section G of the report with final responses
3. Suggest next step: /career-ops followup

## Rules

- NEVER auto-submit anything
- Always show responses for user review before recording as "sent"
- Keep responses concise -- most form fields have character limits

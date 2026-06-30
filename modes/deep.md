# Mode: deep -- Deep Company Research

Run before any application to a role scoring 3.5+/5. Surfaces intel that makes cover letters specific and interviews sharper.

## Inputs

- Company name + role title
- Job posting URL (if available)
- Evaluation report in reports/ (if exists)

## Research Framework

### 1. Product & Tech Stack
- What is the core product? Who is the customer?
- What tech stack do they use? (check job postings, engineering blog, StackShare)
- Do they use .NET / C# anywhere in the stack?
- What databases? (SQL Server, PostgreSQL, other)
- Cloud provider? (Azure, AWS, GCP)

### 2. Engineering Culture
- Remote-first or office-first?
- How do they ship? (deployment cadence, CI/CD practices)
- Do they have an engineering blog? What topics?
- Glassdoor/Blind reviews about engineering culture
- Team size and structure

### 3. Recent Moves (last 6 months)
- Hiring surge or freeze?
- New product launches or pivots?
- Funding rounds or leadership changes?
- News mentions?

### 4. Candidate Angle
Given Matvii's profile (read cv.md + modes/_profile.md):
- Which projects are most relevant to this company?
- What story should lead the application?
- Is the YOLOv8/AI angle relevant here, or focus on pure backend?
- Any obvious red flags or green flags?

### 5. Salary Research
- Levels.fyi, Glassdoor for this role + company
- Remote vs on-site comp difference
- Ukrainian developers' typical range for similar roles

## Output Format

```markdown
## Deep Research: [Company] -- [Role]
Researched: YYYY-MM-DD

### Product Summary
{2-3 sentences}

### Tech Stack
{bullet list}

### Engineering Culture
{key facts}

### Recent News
{last 6 months bullet list}

### Candidate Angle
- Lead with: {project name}
- Frame as: {framing}
- AI angle: relevant / not relevant

### Salary Intel
{comp data with sources}

### Green Flags
{list}

### Red Flags / Questions
{list}
```

## Rules

- Cite every claim with a source
- Do not fabricate Glassdoor ratings
- Keep research focused on what changes the application angle

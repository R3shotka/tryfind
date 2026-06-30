# Mode: interview-prep — Company-Specific Interview Intelligence

When the user asks to prep for an interview at a specific company+role, or when an evaluation scores 4.0+ and the user updates status to `Interview`, run this mode.

## Inputs

1. Company name and role title (required)
2. Evaluation report in `reports/` (if exists)
3. Story bank at `interview-prep/story-bank.md`
4. CV at `cv.md`
5. Profile at `config/profile.yml` + `modes/_profile.md`

## Step 1 — Research

Run WebSearch queries. Extract structured data, not summaries. Cite sources.

Recruiter/HR screen:
- "{company} {role} salary" site:glassdoor.com/Salary
- "{company} interview process site:glassdoor.com"
- "{company} site:teamblind.com" comp negotiation OR offer
- "{company} careers" + "{company} benefits"

Hiring manager:
- "{company} engineering blog"
- "{company}" news OR launch OR roadmap (last 12 months)
- "{company} {role} interview process"

Peer/technical panel:
- "{company} {role} interview questions site:glassdoor.com"
- "{company} {role} interview site:leetcode.com/discuss"
- "{company} interview process site:teamblind.com"

Do NOT fabricate questions. Label inferred questions [inferred from JD].

## Step 2 — Process Overview

## Process Overview
- Rounds: {N} rounds, ~{X} days end-to-end
- Format: {e.g., recruiter screen -> technical phone -> take-home -> onsite}
- Difficulty: {X}/5 (Glassdoor avg, N reviews)
- Positive experience rate: {X}%
- Known quirks: {e.g., "pair programming instead of whiteboard"}
- Sources: {links}

## Step 3 — Round-by-Round Breakdown

For each round:
- Round {N}: {Type}
- Duration: {X} min
- Conducted by: {peer / manager / recruiter}
- What they evaluate: {specific skills or traits}
- Reported questions with sources
- How to prepare: {1-2 concrete actions}

## Step 4 — Likely Questions

Group by audience. Draft candidate-specific answers using cv.md and modes/_profile.md.

For Junior .NET Developer roles, emphasize:
- Technical: C#, ASP.NET Core, EF Core, REST API design, SQL, OOP/SOLID
- AI questions: YOLOv8, ONNX Runtime, Azure deployment
- Behavioral: "Tell me about a project you built from scratch", "How do you handle feedback?"
- Practical: Code review scenarios, debugging approaches

## Step 5 — Story Bank Mapping

| # | Likely question/topic | Best story | Fit |
|---|----------------------|------------|-----|
| 1 | "Walk me through a project" | X-Ray Fracture Detection API | strong |
| 2 | "How did you handle a technical challenge?" | Hospital multi-role system design | strong |
| 3 | "Why .NET?" | Started with academic projects, built real systems | partial |

## Step 6 — Technical Prep Checklist

Based on what the company actually tests, not generic advice:
- [ ] {topic} -- why: "{evidence from research}"

## Output

Save report to `interview-prep/{company-slug}-{role-slug}.md`.

## Rules

- NEVER invent interview questions. Inferred questions must be labeled [inferred from JD].
- NEVER fabricate Glassdoor ratings. If the data is not there, say so.
- Cite everything. Every question, every stat, every claim gets a source or [inferred] tag.

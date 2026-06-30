# Mode: followup — Follow-up Cadence Tracker

Systematic follow-up management for job applications. Tracks cadence, flags overdue contacts, generates outreach drafts.

## Workflow

1. **Execute** `node followup-cadence.mjs` to parse applications and generate JSON

2. **Display dashboard** sorted by urgency:

   ```
   | Company | Role | Status | Days since | Follow-ups | Urgency |
   |---------|------|--------|------------|------------|---------|
   | Acme    | AI PM| Applied| 8          | 0          | URGENT  |
   | BigCo   | SWE  | Applied| 3          | 0          | waiting |
   | Stripe  | PM   | Respon | 1          | 0          | URGENT  |
   ```

   Urgency order: **URGENT** → **OVERDUE** → **waiting** → **COLD**

3. **Generate follow-up drafts** for URGENT and OVERDUE entries only
   - Pull context from evaluation report (if available)
   - Reference specific proof point from cv.md

4. **Present drafts** with: recipient, subject line, body, days-since-application

5. **Record confirmed follow-ups** → append to `data/follow-ups.md`:
   ```
   | Date | Company | Role | Channel | Contact | Notes |
   ```

6. **Summarize** tracking status and ask which drafts were sent

## Cadence Rules

| Status | First follow-up | Subsequent | Cold threshold |
|--------|-----------------|------------|----------------|
| Applied | After 7 days | Every 7 days | 2 attempts |
| Responded | After 1 day | Every 3 days | — |
| Interview | After 1 day (thank-you) | Every 3 days | — |

**COLD**: 2+ follow-ups with no response → suggest closure or new contact approach

## Follow-up Email Standards

**Format:** 3–4 sentences, under 150 words

**Structure:**
1. Reference specific role + application date
2. Add concrete value (proof point, recent achievement, report finding)
3. Soft ask with specific availability window
4. (Optional) Mention recent relevant project or article

**NEVER use:**
- "Just checking in"
- "Touching base"
- "Circling back"
- "Following up on my application"

**Lead with value, not the ask.**

## Example Draft (Applied, 8 days, 0 follow-ups)

```
Subject: AI PM Application — [Specific Thing I Noticed About Your Product]

Hi [Name],

I applied for the AI PM role 8 days ago and wanted to share something
relevant: I just published an analysis of [specific challenge their product 
faces] that maps directly to the roadmap priorities you mentioned in [source].

Brief case study: [1 concrete metric from cv.md or article-digest.md].

Would a 20-minute call this week or next work? I'm flexible on timing.

[Name]
```

## LinkedIn Outreach (alternative channel)

Use when email bounces or no email available:
- Connect request note: 3 sentences max
- InMail: same structure as email, slightly shorter
- Always reference the specific role + application date

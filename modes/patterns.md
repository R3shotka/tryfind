# Mode: patterns — Application Pattern Analysis

Analyze historical application data to identify what's working and what to adjust.

## Workflow

1. **Validate data sufficiency**
   - Run `node analyze-patterns.mjs --self-test` to verify parser works
   - Check that 5+ applications have moved beyond "Evaluated" status
   - If insufficient data: "Keep applying — come back when you have more signal."

2. **Execute analysis**
   ```bash
   node analyze-patterns.mjs --summary
   ```

3. **Parse output** — key sections to surface:
   - Conversion funnel (Evaluated → Applied → Responded → Interview → Offer)
   - Score comparison by outcome (positive vs. negative average scores)
   - Top blockers (geo-restriction, stack mismatch, seniority mismatch)
   - Remote policy breakdown (which remote tiers convert best)
   - Archetype breakdown (which role types get most traction)
   - Recommended score threshold
   - Tech stack gaps in negative outcomes

4. **Generate report** → save to `reports/pattern-analysis-{date}.md`

   Structure:
   ```markdown
   # Pattern Analysis — {date}
   
   ## Funnel
   {table}
   
   ## Score Analysis
   {table}
   
   ## Top Blockers
   {table}
   
   ## Recommendations
   {numbered list}
   ```

5. **Present summary** to user:
   - "Your conversion from Applied → Interview is X%"
   - "Your highest-converting archetype is Y"
   - "Z% of rejected applications had a geo-restriction blocker"
   - Top 1-3 actionable recommendations

6. **Offer to implement recommendations:**
   - Update `portals.yml` to tighten location/title filters?
   - Adjust `auto_pdf_score_threshold` in `profile.yml`?
   - Update `modes/_profile.md` to focus on highest-converting archetype?

## Classification Logic

**Outcome categories:**
- `positive`: Applied, Responded, Interview, Offer
- `negative`: Rejected, Discarded
- `self_filtered`: SKIP
- `pending`: Evaluated (not yet acted on)

**Blocker types:**
- `geo-restriction`: role requires residency/visa candidate doesn't have
- `stack-mismatch`: primary tech stack not in candidate's background
- `seniority-mismatch`: role requires more seniority than candidate has
- `onsite-requirement`: full onsite when candidate needs remote

**Remote tiers:**
- `global remote`: anywhere, worldwide, no restrictions
- `regional remote`: LATAM, Americas, EMEA, specific regions
- `geo-restricted`: US-only, Canada-only, residency required
- `hybrid/onsite`: office-required or relocation-required

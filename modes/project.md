# Mode: project — Portfolio Project Evaluation

Evaluate whether a proposed portfolio project is worth building. 6-dimension scoring matrix.

## Scoring Matrix

| Dimension | Weight | 5 = Optimal | 1 = Minimal value |
|-----------|--------|-------------|-------------------|
| Signal for target roles | 25% | Directly demonstrates JD skill | Not related to any target role |
| Uniqueness | 20% | Solves novel problem; rarely seen | Common tutorial project |
| Demo ability | 20% | Live URL + 2-min walkthrough | Untestable, no demo |
| Metrics potential | 15% | Clear before/after measurement | No quantifiable outcome |
| Time to MVP | 10% | < 1 week solo | > 6 weeks, requires team |
| STAR story potential | 10% | Multiple interview stories | Only basic accomplishment |

**Verdict thresholds:**
- 4.0+ → **BUILD** (with weekly milestones)
- 3.0–3.9 → **PIVOT TO** (modify to increase score)
- < 3.0 → **SKIP** (with better alternative suggested)

## Interview Pack Requirements

Every portfolio project must produce:
1. **One-pager** covering: product summary, architecture decision record, key metrics
2. **Demo** (live URL preferred, recorded walkthrough acceptable)
3. **Postmortem** covering: what worked, what failed, what you'd do differently

## 80/20 Build Plan

**Week 1 — MVP with core metrics**
- Day 1: Define scope + success metric
- Day 2-3: Core implementation
- Day 4: Baseline measurement (before state)
- Day 5: Feature + after measurement
- Day 6-7: Deploy + write one-pager

**Week 2 — Polish + interview materials**
- Day 8-9: Edge cases + error handling
- Day 10: Record demo video (2 min max)
- Day 11-12: Write STAR stories (3 angles minimum)
- Day 13: Add to cv.md and article-digest.md
- Day 14: Practice 2-minute project pitch

## Output Format

```
## Project Evaluation: {Project Name}

**Verdict: BUILD / PIVOT TO / SKIP**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Signal for target roles | X/5 | ... |
| Uniqueness | X/5 | ... |
| Demo ability | X/5 | ... |
| Metrics potential | X/5 | ... |
| Time to MVP | X/5 | ... |
| STAR story potential | X/5 | ... |
| **Weighted total** | **X.X/5** | |

**If BUILD:**
Week 1 milestones: [specific deliverables]
Week 2 milestones: [specific deliverables]
Key metric to track: [measurement approach]

**If PIVOT TO:**
Suggested modification: [what to change to reach 4.0+]

**If SKIP:**
Better alternative: [what to build instead + why]
```

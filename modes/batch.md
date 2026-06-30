# Mode: batch — Headless Batch Processing

Two operational modes for processing multiple job offers without interactive supervision.

## Mode 1: Conductor (--chrome)

The conductor uses a headed browser to navigate portals in real time.

**Roles:**
- **Conductor (Chrome):** Navigates job portals, extracts JDs from DOM, saves to temp files
- **Workers (headless):** Each worker gets a JD file and runs the full auto-pipeline

**Flow:**
1. Conductor opens Chrome via Playwright (visible mode)
2. Navigates to configured portals in `portals.yml`
3. For each job found: extracts JD from DOM → saves to `batch/jds/{id}.txt`
4. Spawns a headless worker for each JD:
   ```bash
   claude -p --dangerously-skip-permissions \
     --append-system-prompt-file batch/batch-prompt.md \
     "Process JD from batch/jds/{id}.txt"
   ```
5. Each worker produces: report `.md`, PDF, tracker TSV, result JSON

## Mode 2: Standalone (batch-runner.sh)

Process URLs already collected in `batch-input.tsv` without a headed browser.

```bash
# Basic run
./batch/batch-runner.sh

# Options
./batch/batch-runner.sh --dry-run           # preview, no writes
./batch/batch-runner.sh --retry-failed      # retry errored jobs
./batch/batch-runner.sh --start-from 42     # resume from job ID 42
./batch/batch-runner.sh --parallel 3        # 3 concurrent workers
./batch/batch-runner.sh --max-retries 2     # retry limit
./batch/batch-runner.sh --min-score 3.5     # only keep if score >= 3.5
./batch/batch-runner.sh --model claude-opus # model override
```

## File Structure

```
batch/
├── batch-input.tsv       # input: id\turl\tcompany\tnotes
├── batch-state.tsv       # state: id\turl\tstatus\tstart\tend\treport_num\tscore\terror
├── batch-runner.sh       # orchestrator script
├── batch-prompt.md       # system prompt injected into each worker
├── logs/                 # per-job logs: {id}.log
└── tracker-additions/    # TSV rows ready to merge: {id}.tsv
```

## State Management

`batch-state.tsv` columns:
```
id | url | status | started_at | ended_at | report_num | score | error | retries
```

Status values: `pending`, `running`, `done`, `failed`, `skipped`

**Resumability:** Re-run → reads state → skips `done` jobs → retries `failed` (if --retry-failed).

**Lock file:** `batch/.lock/` directory prevents simultaneous execution (atomic mkdir).

## Worker Output Per Job

Each headless worker (clean 200K token context) produces:
- `reports/{NNN}-{company}-{date}.md` — full evaluation report
- `output/cv-{slug}-{date}.pdf` — tailored CV PDF (if score >= threshold)
- `batch/tracker-additions/{id}.tsv` — TSV row for applications.md
- `batch/logs/{id}.json` — result metadata (score, archetype, decision)

## At Completion

After all jobs finish, `batch-runner.sh` runs:
1. `node merge-tracker.mjs` — merges all tracker-additions/*.tsv into applications.md
2. `node verify-pipeline.mjs` — validates applications.md integrity

## Limitations

This mode is Claude Code-specific. The `--dangerously-skip-permissions` and `--append-system-prompt-file` flags are not available in other CLIs.

Individual job failures don't cascade — the system logs errors and allows selective retries with `--retry-failed`.

#!/usr/bin/env bash
# batch-runner.sh — Headless batch processor for career-ops
#
# Reads job offers from batch-input.tsv, spawns claude -p workers,
# tracks state in batch-state.tsv for resumability.
#
# Usage:
#   ./batch/batch-runner.sh
#   ./batch/batch-runner.sh --dry-run
#   ./batch/batch-runner.sh --retry-failed
#   ./batch/batch-runner.sh --start-from 42
#   ./batch/batch-runner.sh --parallel 3
#   ./batch/batch-runner.sh --max-retries 2
#   ./batch/batch-runner.sh --min-score 3.5
#   ./batch/batch-runner.sh --model claude-opus
#
# NOTE: This script is Claude Code-specific.
# It uses claude -p with --dangerously-skip-permissions and
# --append-system-prompt-file flags not available in other CLIs.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BATCH_DIR="$SCRIPT_DIR"

INPUT_FILE="$BATCH_DIR/batch-input.tsv"
STATE_FILE="$BATCH_DIR/batch-state.tsv"
PROMPT_FILE="$BATCH_DIR/batch-prompt.md"
LOGS_DIR="$BATCH_DIR/logs"
TRACKER_DIR="$BATCH_DIR/tracker-additions"
LOCK_DIR="$BATCH_DIR/.lock"

DEFAULT_MODEL="claude-opus-4-5"
DEFAULT_MAX_RETRIES=1
DEFAULT_PARALLEL=1
DEFAULT_MIN_SCORE=0

# ── CLI args ──────────────────────────────────────────────────────────────────
DRY_RUN=false
RETRY_FAILED=false
START_FROM=0
PARALLEL=$DEFAULT_PARALLEL
MAX_RETRIES=$DEFAULT_MAX_RETRIES
MIN_SCORE=$DEFAULT_MIN_SCORE
MODEL=$DEFAULT_MODEL

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)        DRY_RUN=true; shift ;;
    --retry-failed)   RETRY_FAILED=true; shift ;;
    --start-from)     START_FROM="$2"; shift 2 ;;
    --parallel)       PARALLEL="$2"; shift 2 ;;
    --max-retries)    MAX_RETRIES="$2"; shift 2 ;;
    --min-score)      MIN_SCORE="$2"; shift 2 ;;
    --model)          MODEL="$2"; shift 2 ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

# ── Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "$LOGS_DIR" "$TRACKER_DIR"

# Lock file (prevents simultaneous execution)
if mkdir "$LOCK_DIR" 2>/dev/null; then
  trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
else
  echo "Another batch-runner.sh is already running ($LOCK_DIR exists). Exiting." >&2
  exit 1
fi

# ── Validation ────────────────────────────────────────────────────────────────
if [[ ! -f "$INPUT_FILE" ]]; then
  echo "batch-input.tsv not found at $INPUT_FILE" >&2
  echo "Create it with columns: id<TAB>url<TAB>company<TAB>notes" >&2
  exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "batch-prompt.md not found at $PROMPT_FILE" >&2
  exit 1
fi

if ! command -v claude &>/dev/null; then
  echo "claude CLI not found. Install Claude Code first." >&2
  exit 1
fi

# ── State management ──────────────────────────────────────────────────────────
STATE_LOCK_DIR="$BATCH_DIR/.state-lock"

acquire_state_lock() {
  while ! mkdir "$STATE_LOCK_DIR" 2>/dev/null; do sleep 0.1; done
}
release_state_lock() {
  rmdir "$STATE_LOCK_DIR" 2>/dev/null || true
}

get_job_state() {
  local id="$1"
  if [[ -f "$STATE_FILE" ]]; then
    awk -F'\t' -v id="$id" '$1 == id { print $3; exit }' "$STATE_FILE"
  fi
}

update_job_state() {
  local id="$1" status="$2" report_num="${3:-}" score="${4:-}" error="${5:-}"
  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  acquire_state_lock
  if [[ -f "$STATE_FILE" ]]; then
    # Update existing row
    local tmp
    tmp=$(mktemp)
    awk -F'\t' -v id="$id" -v status="$status" -v now="$now" \
        -v report_num="$report_num" -v score="$score" -v err="$error" \
        'BEGIN { OFS="\t" }
         $1 == id {
           $3 = status
           if (status == "running" && $4 == "") $4 = now
           if (status ~ /done|failed/) $5 = now
           if (report_num != "") $6 = report_num
           if (score != "") $7 = score
           if (err != "") $8 = err
           if (status == "failed") $9 = ($9 + 1)
         }
         { print }' "$STATE_FILE" > "$tmp"
    mv "$tmp" "$STATE_FILE"
  fi
  release_state_lock
}

init_state() {
  # Initialize state file from input if not exists
  if [[ ! -f "$STATE_FILE" ]]; then
    echo -e "id\turl\tstatus\tstarted_at\tended_at\treport_num\tscore\terror\tretries" > "$STATE_FILE"
    tail -n +2 "$INPUT_FILE" | while IFS=$'\t' read -r id url company notes; do
      echo -e "$id\t$url\tpending\t\t\t\t\t\t0" >> "$STATE_FILE"
    done
  fi
}

# ── Calculate next report number ──────────────────────────────────────────────
get_next_report_num() {
  local reports_dir="$ROOT_DIR/reports"
  if [[ ! -d "$reports_dir" ]]; then
    echo 1
    return
  fi
  local max=0
  for f in "$reports_dir"/[0-9]*.md; do
    [[ -f "$f" ]] || continue
    local num
    num=$(basename "$f" | grep -o '^[0-9]*' || echo 0)
    [[ "$num" -gt "$max" ]] && max=$num
  done
  echo $((max + 1))
}

# ── Process a single job ──────────────────────────────────────────────────────
process_job() {
  local id="$1" url="$2" company="$3" notes="${4:-}"

  local current_state
  current_state=$(get_job_state "$id")

  # Skip completed jobs unless retrying
  if [[ "$current_state" == "done" ]]; then
    echo "  [SKIP] #$id ($company): already done"
    return 0
  fi
  if [[ "$current_state" == "failed" && "$RETRY_FAILED" != "true" ]]; then
    echo "  [SKIP] #$id ($company): failed (use --retry-failed to retry)"
    return 0
  fi

  local retries
  retries=$(awk -F'\t' -v id="$id" '$1 == id { print $9 }' "$STATE_FILE" 2>/dev/null || echo 0)
  if [[ "${retries:-0}" -ge "$MAX_RETRIES" && "$RETRY_FAILED" != "true" ]]; then
    echo "  [SKIP] #$id ($company): max retries reached ($retries/$MAX_RETRIES)"
    return 0
  fi

  local report_num
  report_num=$(get_next_report_num)

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [DRY RUN] Would process #$id ($company) as report #$report_num"
    return 0
  fi

  echo "  [RUN] #$id ($company) → report #$report_num"
  update_job_state "$id" "running"

  local log_file="$LOGS_DIR/${id}.log"
  local prompt
  prompt="Process job URL: $url
Company: $company
Notes: $notes
Target report number: $report_num

Run the full auto-pipeline: extract JD, evaluate A-G, save report, generate PDF if score >= threshold, add to tracker TSV at batch/tracker-additions/${id}.tsv"

  local exit_code=0
  claude -p \
    --dangerously-skip-permissions \
    --append-system-prompt-file "$PROMPT_FILE" \
    --model "$MODEL" \
    "$prompt" > "$log_file" 2>&1 || exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    # Extract score from log
    local score
    score=$(grep -o 'Score: [0-9.]*' "$log_file" | tail -1 | grep -o '[0-9.]*' || echo "")

    # Check min-score gate
    if [[ -n "$score" && -n "$MIN_SCORE" ]]; then
      if awk "BEGIN { exit ($score >= $MIN_SCORE) ? 0 : 1 }"; then
        update_job_state "$id" "done" "$report_num" "$score"
        echo "  [DONE] #$id ($company): score $score (≥ $MIN_SCORE)"
      else
        update_job_state "$id" "done" "$report_num" "$score" "score below min-score threshold"
        echo "  [DONE] #$id ($company): score $score (< $MIN_SCORE, skipped tracker)"
      fi
    else
      update_job_state "$id" "done" "$report_num" "$score"
      echo "  [DONE] #$id ($company)"
    fi
  else
    local error_msg
    error_msg=$(tail -3 "$log_file" | tr '\n' ' ')
    update_job_state "$id" "failed" "$report_num" "" "$error_msg"
    echo "  [FAIL] #$id ($company): exit $exit_code — $error_msg"
    return 1
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
echo ""
echo "career-ops batch-runner"
echo "  Input:    $INPUT_FILE"
echo "  Model:    $MODEL"
echo "  Parallel: $PARALLEL"
echo "  Dry run:  $DRY_RUN"
echo ""

init_state

# Read jobs
declare -a JOB_IDS JOB_URLS JOB_COMPANIES JOB_NOTES

while IFS=$'\t' read -r id url company notes; do
  [[ "$id" == "id" ]] && continue  # skip header
  [[ -z "$id" ]] && continue
  [[ "$id" -lt "$START_FROM" ]] && continue

  JOB_IDS+=("$id")
  JOB_URLS+=("$url")
  JOB_COMPANIES+=("$company")
  JOB_NOTES+=("${notes:-}")
done < "$INPUT_FILE"

echo "Processing ${#JOB_IDS[@]} jobs..."

if [[ "$PARALLEL" -le 1 ]]; then
  # Sequential
  for i in "${!JOB_IDS[@]}"; do
    process_job "${JOB_IDS[$i]}" "${JOB_URLS[$i]}" "${JOB_COMPANIES[$i]}" "${JOB_NOTES[$i]}" || true
  done
else
  # Parallel with job control
  running=0
  for i in "${!JOB_IDS[@]}"; do
    process_job "${JOB_IDS[$i]}" "${JOB_URLS[$i]}" "${JOB_COMPANIES[$i]}" "${JOB_NOTES[$i]}" &
    ((running++))
    if [[ "$running" -ge "$PARALLEL" ]]; then
      wait -n 2>/dev/null || wait
      ((running--))
    fi
  done
  wait
fi

# ── Post-processing ───────────────────────────────────────────────────────────
if [[ "$DRY_RUN" != "true" ]]; then
  echo ""
  echo "Merging tracker additions..."
  if ls "$TRACKER_DIR"/*.tsv &>/dev/null; then
    node "$ROOT_DIR/merge-tracker.mjs" 2>/dev/null || \
      echo "  [WARN] merge-tracker.mjs failed or not found"
  else
    echo "  No tracker additions to merge"
  fi

  echo "Verifying pipeline..."
  node "$ROOT_DIR/verify-pipeline.mjs" 2>/dev/null || \
    echo "  [WARN] verify-pipeline.mjs failed or not found"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "── Batch Summary ──"
if [[ -f "$STATE_FILE" ]]; then
  done_count=$(awk -F'\t' 'NR>1 && $3=="done"' "$STATE_FILE" | wc -l | tr -d ' ')
  failed_count=$(awk -F'\t' 'NR>1 && $3=="failed"' "$STATE_FILE" | wc -l | tr -d ' ')
  pending_count=$(awk -F'\t' 'NR>1 && $3=="pending"' "$STATE_FILE" | wc -l | tr -d ' ')
  echo "  Done:    $done_count"
  echo "  Failed:  $failed_count"
  echo "  Pending: $pending_count"
fi
echo ""

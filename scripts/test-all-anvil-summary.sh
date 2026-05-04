#!/usr/bin/env bash
# If LOGFILE is provided, print test summary from that log file.
# Otherwise run test:all:anvil:no-start, tee to a temp file, then print summary.

summarize() {
  local output="$1"
  echo ""
  echo "========== TEST SUMMARY =========="

  local passed failed skipped
  passed=$(awk '/Ran 1 test suite in/ {sum += $10} END {print sum+0}' "$output")
  failed=$(awk '/Ran 1 test suite in/ {sum += $13} END {print sum+0}' "$output")
  skipped=$(awk '/Ran 1 test suite in/ {sum += $15} END {print sum+0}' "$output")

  echo "  Total tests passed:  ${passed:-0}"
  echo "  Total tests failed:  ${failed:-0}"
  echo "  Total tests skipped: ${skipped:-0}"
  echo "  Scripts (no count):  Protocol, TestSingleReserves, Reserves script, MultiSettle"
  echo "=================================="
}

if [[ -n "$1" && -f "$1" ]]; then
  summarize "$1"
  exit 0
fi

set -e
OUTPUT=$(mktemp)
trap "rm -f $OUTPUT" EXIT

echo "Running full anvil test suite (output also in $OUTPUT)..."
npm run test:all:anvil:no-start 2>&1 | tee "$OUTPUT"
EXIT=${PIPESTATUS[0]}

summarize "$OUTPUT"
exit "$EXIT"

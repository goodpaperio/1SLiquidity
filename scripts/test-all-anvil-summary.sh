#!/usr/bin/env bash
# If LOGFILE is provided, print test summary from that log file.
# Otherwise run test:all:anvil:no-start, tee to a temp file, then print summary.
# Used at end of test:all:anvil so summary runs automatically.

if [[ -n "$1" && -f "$1" ]]; then
  OUTPUT="$1"
  echo ""
  echo "========== TEST SUMMARY =========="
  PASSED=$(grep -oE '[0-9]+ tests passed' "$OUTPUT" | awk '{s+=$1} END {print s+0}')
  FAILED=$(grep -oE '[0-9]+ failed' "$OUTPUT" | awk '{s+=$1} END {print s+0}')
  SKIPPED=$(grep -oE '[0-9]+ skipped' "$OUTPUT" | awk '{s+=$1} END {print s+0}')
  echo "  Total tests passed:  ${PASSED:-0}"
  echo "  Total tests failed:  ${FAILED:-0}"
  echo "  Total tests skipped: ${SKIPPED:-0}"
  echo "  Scripts (no count):  Protocol, TestSingleReserves, Reserves script, MultiSettle"
  echo "=================================="
  exit 0
fi

set -e
OUTPUT=$(mktemp)
trap "rm -f $OUTPUT" EXIT

echo "Running full anvil test suite (output also in $OUTPUT)..."
npm run test:all:anvil:no-start 2>&1 | tee "$OUTPUT"
EXIT=${PIPESTATUS[0]}

echo ""
echo "========== TEST SUMMARY =========="
PASSED=$(grep -oE '[0-9]+ tests passed' "$OUTPUT" | awk '{s+=$1} END {print s+0}')
FAILED=$(grep -oE '[0-9]+ failed' "$OUTPUT" | awk '{s+=$1} END {print s+0}')
SKIPPED=$(grep -oE '[0-9]+ skipped' "$OUTPUT" | awk '{s+=$1} END {print s+0}')
echo "  Total tests passed:  ${PASSED:-0}"
echo "  Total tests failed:  ${FAILED:-0}"
echo "  Total tests skipped: ${SKIPPED:-0}"
echo "  Scripts (no count):  Protocol, TestSingleReserves, Reserves script, MultiSettle"
echo "=================================="

exit "$EXIT"

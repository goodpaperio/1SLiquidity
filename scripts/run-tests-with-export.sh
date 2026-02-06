#!/bin/bash

# Script to run tests and automatically export results
# Usage: ./scripts/run-tests-with-export.sh [test-pattern] [output-format]
# 
# Examples:
# - ./scripts/run-tests-with-export.sh test_PlaceTradeWithUSDCTokens json
# - ./scripts/run-tests-with-export.sh CoreForkTest csv
# - ./scripts/run-tests-with-export.sh "" json  # All tests

set -e

# Parameters
TEST_PATTERN=${1:-"CoreForkTest"}
OUTPUT_FORMAT=${2:-"json"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="test_logs_${TIMESTAMP}.log"

echo "🧪 Running tests with pattern: $TEST_PATTERN"
echo "📊 Output format: $OUTPUT_FORMAT"
echo "📝 Log file: $LOG_FILE"

# Clean up old logs
rm -f test_logs_*.log

# Run tests with log capture
echo "▶️  Starting tests..."
if [ "$TEST_PATTERN" = "" ]; then
    forge test --match-contract CoreForkTest -vv 2>&1 | tee $LOG_FILE
else
    forge test --match-test $TEST_PATTERN -vv 2>&1 | tee $LOG_FILE
fi

# Check if tests produced events
if ! grep -q "TokenTestResult\|TestSummary" $LOG_FILE; then
    echo "⚠️  No test events found in logs"
    echo "💡 Make sure tests properly emit TokenTestResult and TestSummary events"
    exit 1
fi

# Extract results
echo "📤 Extracting results..."
node scripts/extract-test-results.js $LOG_FILE $OUTPUT_FORMAT

# Clean up temporary log file
rm -f $LOG_FILE

echo "✅ Process completed successfully!"
echo ""
echo "💡 To run specific tests:"
echo "   ./scripts/run-tests-with-export.sh test_PlaceTradeWithUSDCTokens json"
echo "   ./scripts/run-tests-with-export.sh test_PlaceTradeWithWETHTokens csv"
echo ""
echo "📁 Result files are created in the root directory"

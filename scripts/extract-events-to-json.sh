#!/bin/bash

# Script to extract and aggregate test summaries with failed tokens list
# Usage: bash extract-events-to-json.sh [output-file] < input-logs

set -e

OUTPUT_FILE=${1:-"test-results-$(date +%Y%m%d_%H%M%S).json"}

echo "📤 Extracting and aggregating test results..."

# Temporary files
TEMP_INPUT=$(mktemp)
TEMP_SUMMARIES=$(mktemp)
TEMP_PARSED=$(mktemp)

cat > "$TEMP_INPUT"

# Get timestamp
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S)

# Extract SUMMARY sections and parse with awk
grep -A 2 "=== SUMMARY for" "$TEMP_INPUT" | grep -v "^--$" | awk '
/=== SUMMARY for/ {
    label = $4
    gsub(/===/, "", label)
    split(label, parts, "_")
    token = parts[1]
    
    getline
    split($0, s, " ")
    success = s[2]
    split(s[4], t, "/")
    total = t[1]
    
    getline
    split($0, f, " ")
    failed = f[2]
    
    print token, total, success, failed
}
' > "$TEMP_PARSED"

# Aggregate results
awk '{
    totals[$1] += $2
    successes[$1] += $3
    failures[$1] += $4
}
END {
    for (t in totals) {
        print t, totals[t], successes[t], failures[t]
    }
}' "$TEMP_PARSED" | sort > "$TEMP_SUMMARIES"

# Extract failed and success tokens from console logs
TEMP_FAILED=$(mktemp)
TEMP_SUCCESS=$(mktemp)

grep "FAILED_TOKEN:" "$TEMP_INPUT" | while IFS= read -r line; do
    # Parse: FAILED_TOKEN:USDC:tokenname:reason
    BASE=$(echo "$line" | cut -d: -f2)
    TOKEN=$(echo "$line" | cut -d: -f3)
    REASON=$(echo "$line" | cut -d: -f4- | sed 's/^[[:space:]]*//')
    echo "$BASE|$TOKEN|$REASON" >> "$TEMP_FAILED"
done

grep "SUCCESS_TOKEN:" "$TEMP_INPUT" | while IFS= read -r line; do
    # Parse: SUCCESS_TOKEN:USDC:tokenname
    BASE=$(echo "$line" | sed 's/.*SUCCESS_TOKEN:\([A-Z]*\):.*/\1/')
    TOKEN=$(echo "$line" | sed 's/.*SUCCESS_TOKEN:[A-Z]*:\([a-z0-9+]*\).*/\1/')
    echo "$BASE $TOKEN" >> "$TEMP_SUCCESS"
done

# Build JSON
cat > "$OUTPUT_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "testResults": [
EOF

FIRST=true
while read -r token total success failed; do
    if [ "$FIRST" = false ]; then
        echo "," >> "$OUTPUT_FILE"
    fi
    FIRST=false
    
    # Get success tokens for this base token
    SUCCESS_LIST=""
    if [ -f "$TEMP_SUCCESS" ]; then
        SUCCESS_LIST=$(grep "^$token " "$TEMP_SUCCESS" 2>/dev/null | awk '{print $2}' | sort -u | awk '{printf "\"%s\",", $0}' | sed 's/,$//')
    fi
    
    # Get failed tokens with reasons
    FAILED_OBJECTS=""
    if [ -f "$TEMP_FAILED" ]; then
        FAILED_OBJECTS=$(grep "^$token|" "$TEMP_FAILED" 2>/dev/null | sort -u -t'|' -k2 | awk -F'|' '{
            gsub(/"/, "\\\"", $3)  # Escape quotes in reason
            printf "{\"token\":\"%s\",\"reason\":\"%s\"},", $2, $3
        }' | sed 's/,$//')
    fi
    
    cat >> "$OUTPUT_FILE" << EOF
    {
      "baseToken": "$token",
      "totalTests": $total,
      "successCount": $success,
      "failureCount": $failed,
      "successTokens": [$SUCCESS_LIST],
      "failedTokens": [$FAILED_OBJECTS]
    }
EOF
done < "$TEMP_SUMMARIES"

# Handle no results
if [ "$FIRST" = true ]; then
    cat >> "$OUTPUT_FILE" << 'EOF'
    {
      "baseToken": "NONE",
      "totalTests": 0,
      "successCount": 0,
      "failureCount": 0,
      "successTokens": [],
      "failedTokens": []
    }
EOF
fi

cat >> "$OUTPUT_FILE" << 'EOF'
  ]
}
EOF

# Cleanup
rm -f "$TEMP_INPUT" "$TEMP_SUMMARIES" "$TEMP_PARSED" "$TEMP_FAILED" "$TEMP_SUCCESS"

echo "✅ Results aggregated and saved to: $OUTPUT_FILE"

# Display summary
if command -v jq &> /dev/null; then
    echo ""
    echo "📊 Aggregated Summary:"
    jq -r '.testResults[] | select(.baseToken != "NONE") | "\(.baseToken): \(.successCount)/\(.totalTests) success (\(if .totalTests > 0 then (.successCount/.totalTests*100|floor) else 0 end)%)" + (if (.successTokens | length) > 0 then "\n   ✅ Success: " + (.successTokens | join(", ")) else "" end) + (if (.failedTokens | length) > 0 then "\n   ❌ Failed:" + (.failedTokens | map("\n      - " + .token + ": " + .reason) | join("")) else "" end)' "$OUTPUT_FILE"
fi
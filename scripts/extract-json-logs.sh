#!/bin/bash

# Simple script to extract JSON logs from Forge tests
# Usage: ./scripts/extract-json-logs.sh [log-file] [output-file]
# 
# Example: forge test --match-test test_PlaceTradeWithUSDCTokens -vv 2>&1 | ./scripts/extract-json-logs.sh - results.json

set -e

INPUT_FILE=${1:-"-"}
OUTPUT_FILE=${2:-"test-results-$(date +%Y%m%d_%H%M%S).json"}

echo "📤 Extracting JSON results from logs..."

# Function to extract JSON from logs
extract_json() {
    local input_source="$1"
    local output_file="$2"
    
    # Create output file with global structure
    echo "{" > "$output_file"
    echo '  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",' >> "$output_file"
    echo '  "testResults": [' >> "$output_file"
    
    local first_result=true
    local in_json=false
    local json_content=""
    
    # Read line by line
    while IFS= read -r line; do
        if [[ "$line" == *"JSON_RESULT_START"* ]]; then
            in_json=true
            json_content=""
            continue
        fi
        
        if [[ "$line" == *"JSON_RESULT_END"* ]]; then
            in_json=false
            
            # Add JSON to output file
            if [ "$first_result" = true ]; then
                first_result=false
            else
                echo "," >> "$output_file"
            fi
            
            echo "$json_content" >> "$output_file"
            continue
        fi
        
        if [ "$in_json" = true ]; then
            json_content+="$line"$'\n'
        fi
    done < <(if [ "$input_source" = "-" ]; then cat; else cat "$input_source"; fi)
    
    # Close JSON structure
    echo "  ]" >> "$output_file"
    echo "}" >> "$output_file"
}

# Extract JSON
extract_json "$INPUT_FILE" "$OUTPUT_FILE"

echo "✅ Results extracted to: $OUTPUT_FILE"

# Display preview
if command -v jq &> /dev/null; then
    echo ""
    echo "📊 Results summary:"
    jq -r '.testResults[] | "\(.baseToken): \(.successCount)/\(.totalTests) success"' "$OUTPUT_FILE"
else
    echo ""
    echo "💡 Install 'jq' for better JSON results display"
    echo "    brew install jq  # on macOS"
fi

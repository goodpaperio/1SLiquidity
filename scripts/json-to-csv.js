#!/usr/bin/env node

const fs = require('fs');

/**
 * Script to convert JSON results to CSV
 * Usage: node scripts/json-to-csv.js input.json [output.csv]
 */

function jsonToCsv(jsonFile, csvFile) {
    try {
        // Read JSON file
        const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
        
        // CSV Headers
        const headers = [
            'baseToken',
            'tokenName', 
            'tokenAddress',
            'success',
            'failureReason'
        ];

        let csv = headers.join(',') + '\n';

        // Convert each result
        for (const testResult of data.testResults) {
            const baseToken = testResult.baseToken;
            
            for (const result of testResult.results) {
                const row = [
                    baseToken,
                    result.tokenName || '',
                    result.tokenAddress || '',
                    result.success ? 'true' : 'false',
                    `"${(result.failureReason || '').replace(/"/g, '""')}"`
                ];
                csv += row.join(',') + '\n';
            }
        }

        // Save CSV
        fs.writeFileSync(csvFile, csv);
        
        console.log(`✅ CSV file created: ${csvFile}`);
        
        // Display statistics
        const totalTests = data.testResults.reduce((sum, tr) => sum + tr.totalTests, 0);
        const totalSuccess = data.testResults.reduce((sum, tr) => sum + tr.successCount, 0);
        const totalFailures = data.testResults.reduce((sum, tr) => sum + tr.failureCount, 0);
        
        console.log(`📊 Global statistics:`);
        console.log(`   Total tests: ${totalTests}`);
        console.log(`   Success: ${totalSuccess} (${((totalSuccess/totalTests)*100).toFixed(1)}%)`);
        console.log(`   Failures: ${totalFailures} (${((totalFailures/totalTests)*100).toFixed(1)}%)`);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Main script
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node scripts/json-to-csv.js input.json [output.csv]');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/json-to-csv.js test-results.json');
        console.log('  node scripts/json-to-csv.js multi-test-results.json results.csv');
        process.exit(1);
    }
    
    const inputFile = args[0];
    const outputFile = args[1] || inputFile.replace('.json', '.csv');
    
    jsonToCsv(inputFile, outputFile);
}

if (require.main === module) {
    main();
}

module.exports = { jsonToCsv };

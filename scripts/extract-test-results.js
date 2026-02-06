#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to extract test results from Forge logs
 * Usage: node scripts/extract-test-results.js [log-file] [output-format]
 * 
 * Examples:
 * - node scripts/extract-test-results.js test.log json
 * - node scripts/extract-test-results.js test.log csv
 * - forge test --match-contract CoreForkTest 2>&1 | node scripts/extract-test-results.js - json
 */

class TestResultsExtractor {
    constructor() {
        this.results = [];
        this.summaries = [];
    }

    /**
     * Extract events from Forge logs
     */
    extractFromLogs(logContent) {
        const lines = logContent.split('\n');
        
        for (const line of lines) {
            // Search for TokenTestResult events
            if (line.includes('TokenTestResult')) {
                const result = this.parseTokenTestResult(line);
                if (result) {
                    this.results.push(result);
                }
            }
            
            // Search for TestSummary events
            if (line.includes('TestSummary')) {
                const summary = this.parseTestSummary(line);
                if (summary) {
                    this.summaries.push(summary);
                }
            }
        }
    }

    /**
     * Parser un événement TokenTestResult
     */
    parseTokenTestResult(line) {
        try {
            // Format typique: "emit TokenTestResult(baseTokenSymbol: "USDC", tokenName: "uni", tokenAddress: 0x..., success: true, failureReason: "")"
            const match = line.match(/TokenTestResult\s*\((.*)\)/);
            if (!match) return null;

            const params = match[1];
            const result = {};

            // Extract baseTokenSymbol
            const baseTokenMatch = params.match(/baseTokenSymbol:\s*"([^"]+)"/);
            if (baseTokenMatch) result.baseTokenSymbol = baseTokenMatch[1];

            // Extraire tokenName
            const tokenNameMatch = params.match(/tokenName:\s*"([^"]+)"/);
            if (tokenNameMatch) result.tokenName = tokenNameMatch[1];

            // Extraire tokenAddress
            const tokenAddressMatch = params.match(/tokenAddress:\s*(0x[a-fA-F0-9]+)/);
            if (tokenAddressMatch) result.tokenAddress = tokenAddressMatch[1];

            // Extraire success
            const successMatch = params.match(/success:\s*(true|false)/);
            if (successMatch) result.success = successMatch[1] === 'true';

            // Extraire failureReason
            const failureReasonMatch = params.match(/failureReason:\s*"([^"]*)"/);
            if (failureReasonMatch) result.failureReason = failureReasonMatch[1];

            return result;
        } catch (error) {
            console.warn('Erreur lors du parsing de TokenTestResult:', error.message);
            return null;
        }
    }

    /**
     * Parser un événement TestSummary
     */
    parseTestSummary(line) {
        try {
            const match = line.match(/TestSummary\s*\((.*)\)/);
            if (!match) return null;

            const params = match[1];
            const summary = {};

            // Extract baseTokenSymbol
            const baseTokenMatch = params.match(/baseTokenSymbol:\s*"([^"]+)"/);
            if (baseTokenMatch) summary.baseTokenSymbol = baseTokenMatch[1];

            // Extraire les nombres
            const totalTestsMatch = params.match(/totalTests:\s*(\d+)/);
            if (totalTestsMatch) summary.totalTests = parseInt(totalTestsMatch[1]);

            const successCountMatch = params.match(/successCount:\s*(\d+)/);
            if (successCountMatch) summary.successCount = parseInt(successCountMatch[1]);

            const failureCountMatch = params.match(/failureCount:\s*(\d+)/);
            if (failureCountMatch) summary.failureCount = parseInt(failureCountMatch[1]);

            return summary;
        } catch (error) {
            console.warn('Erreur lors du parsing de TestSummary:', error.message);
            return null;
        }
    }

    /**
     * Organiser les résultats par base token
     */
    organizeResults() {
        const organized = {};

        for (const result of this.results) {
            const baseToken = result.baseTokenSymbol;
            if (!organized[baseToken]) {
                organized[baseToken] = {
                    baseTokenSymbol: baseToken,
                    summary: this.summaries.find(s => s.baseTokenSymbol === baseToken) || {},
                    results: []
                };
            }
            organized[baseToken].results.push(result);
        }

        return organized;
    }

    /**
     * Générer le JSON
     */
    generateJson() {
        const organized = this.organizeResults();
        
        const output = {
            timestamp: new Date().toISOString(),
            totalTokenGroups: Object.keys(organized).length,
            totalTests: this.results.length,
            totalSuccesses: this.results.filter(r => r.success).length,
            totalFailures: this.results.filter(r => !r.success).length,
            tokenGroups: organized
        };

        return JSON.stringify(output, null, 2);
    }

    /**
     * Générer le CSV
     */
    generateCsv() {
        const headers = [
            'baseTokenSymbol',
            'tokenName', 
            'tokenAddress',
            'success',
            'failureReason'
        ];

        let csv = headers.join(',') + '\n';

        for (const result of this.results) {
            const row = [
                result.baseTokenSymbol || '',
                result.tokenName || '',
                result.tokenAddress || '',
                result.success ? 'true' : 'false',
                `"${(result.failureReason || '').replace(/"/g, '""')}"`
            ];
            csv += row.join(',') + '\n';
        }

        return csv;
    }
}

// Script principal
function main() {
    const args = process.argv.slice(2);
    const inputFile = args[0] || '-';
    const outputFormat = args[1] || 'json';

    if (inputFile === '-') {
        console.log('Lecture depuis stdin...');
    }

    // Lire le contenu
    let logContent;
    try {
        if (inputFile === '-') {
            // Lire depuis stdin
            logContent = require('fs').readFileSync(0, 'utf-8');
        } else {
            logContent = fs.readFileSync(inputFile, 'utf-8');
        }
    } catch (error) {
        console.error('Error reading file:', error.message);
        process.exit(1);
    }

    // Extract results
    const extractor = new TestResultsExtractor();
    extractor.extractFromLogs(logContent);

    if (extractor.results.length === 0) {
        console.warn('No test results found in logs');
        process.exit(0);
    }

    console.log(`${extractor.results.length} test results extracted`);

    // Générer la sortie
    let output;
    let fileName;
    
    if (outputFormat.toLowerCase() === 'csv') {
        output = extractor.generateCsv();
        fileName = `test-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    } else {
        output = extractor.generateJson();
        fileName = `test-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    }

    // Sauvegarder le fichier
    const outputPath = path.join(process.cwd(), fileName);
    fs.writeFileSync(outputPath, output);
    
    console.log(`Résultats sauvegardés dans: ${outputPath}`);
    
    // Afficher un résumé
    const organized = extractor.organizeResults();
    console.log('\n=== RÉSUMÉ ===');
    for (const [baseToken, data] of Object.entries(organized)) {
        const successCount = data.results.filter(r => r.success).length;
        const totalCount = data.results.length;
        console.log(`${baseToken}: ${successCount}/${totalCount} succès`);
    }
}

if (require.main === module) {
    main();
}

module.exports = TestResultsExtractor;

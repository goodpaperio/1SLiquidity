import { testGasCalculations, testSlippageSavings, testSweetSpot } from './trade-calculations';

async function runTests() {
    try {
        // Example gas calculations (kept commented for selective runs)
        // const gasResult = await testGasCalculations(
        //   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        //   '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
        //   '10000'
        // );
        // console.log('Gas Results:', {
        //   botGasLimit: gasResult.botGasLimit.toString(),
        //   streamCount: gasResult.streamCount,
        // });

        console.log('\nTesting sweet spot for USDC/WBTC pair:');
        const sweetSpot = await testSweetSpot(
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
            '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
            '100000' // 100,000 USDC
        );
        console.log('Sweet spot stream count:', sweetSpot);

        // console.log('\nTesting slippage savings for USDC/WBTC pair:');
        // const slippageSavings = await testSlippageSavings(
        //     '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        //     '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
        //     '100000'
        // );
        // console.log('Slippage savings:', slippageSavings);
    } catch (error) {
        console.error('Error running tests:', error);
    }
}

// Run the tests
runTests().catch(console.error);



/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

function makeEvent(path) {
  return {
    httpMethod: 'GET',
    path,
    queryStringParameters: { tokenA: WETH, tokenB: USDC },
    body: null,
  }
}

async function run() {
  const { main: reservesMain } = require('../dist/src/functions/reserves/handler')
  const { main: priceMain } = require('../dist/src/functions/price/handler')

  console.log('RPC_URL:', process.env.RPC_URL ? 'set' : 'missing')
  console.log('REDIS_URL:', process.env.REDIS_URL ? 'set' : 'missing')
  console.log('\n--- /reserves (WETH/USDC) ---')

  const reservesRes = await reservesMain(makeEvent('/reserves'))
  console.log('Status:', reservesRes.statusCode)

  if (reservesRes.statusCode !== 200) {
    console.log('Body:', reservesRes.body)
    process.exit(1)
  }

  const reserves = JSON.parse(reservesRes.body)
  const dexNames = Array.isArray(reserves)
    ? reserves.map((r) => r.dex)
    : reserves.dex
      ? [reserves.dex]
      : Object.keys(reserves)

  console.log('DEX tags:', dexNames)
  const hasBalancerCurve = dexNames.some(
    (d) =>
      String(d).startsWith('balancer') ||
      String(d).startsWith('curve') ||
      d === 'balancer' ||
      d === 'curve'
  )
  if (hasBalancerCurve) {
    console.error('FAIL: Balancer/Curve should be disabled')
    process.exit(1)
  }
  console.log('OK: no balancer/curve in reserves response')

  console.log('\n--- /price (WETH/USDC) ---')
  const priceRes = await priceMain(makeEvent('/price'))
  console.log('Status:', priceRes.statusCode)
  if (priceRes.statusCode !== 200) {
    console.log('Body:', priceRes.body)
    process.exit(1)
  }
  console.log('Price response sample:', priceRes.body.slice(0, 200), '...')
  console.log('\nSmoke test passed.')
}

run().catch((err) => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})

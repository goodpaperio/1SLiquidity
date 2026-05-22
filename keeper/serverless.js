'use strict'

// serverless-offline is ESM with top-level await; loading it during `deploy` breaks on Node 22+.
// Only register it when running `serverless offline`.
const isOffline = process.argv.some((arg) => String(arg).includes('offline'))

/** @type {import('serverless/aws').AWS} */
module.exports = {
  service: 'one-sliquidity-keeper',

  frameworkVersion: '3',

  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    stage: '${opt:stage, \'dev\'}',
    region: 'us-east-1',
    timeout: 90,
    memorySize: 1024,
    httpApi: {
      cors: true,
    },
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      NODE_ENV: '${self:provider.stage}',
      RPC_URL: '${env:RPC_URL, \'fallback-rpc-url\'}',
      CHAIN_ID: '${env:CHAIN_ID, 1}',
      REDIS_HOST: '${env:REDIS_HOST, \'localhost\'}',
      REDIS_PORT: '${env:REDIS_PORT, 6379}',
      REDIS_PASSWORD: '${env:REDIS_PASSWORD, \'\'}',
      REDIS_URL: '${env:REDIS_URL, \'\'}',
    },
  },

  functions: {
    reserves: {
      handler: 'src/functions/reserves/handler.main',
      timeout: 90,
      memorySize: 1024,
      events: [
        { http: { path: 'reserves', method: 'get', cors: true } },
        { http: { path: 'reserves', method: 'post', cors: true } },
        { http: { path: 'reserves', method: 'options', cors: true } },
      ],
    },
    price: {
      handler: 'src/functions/price/handler.main',
      timeout: 90,
      memorySize: 1024,
      events: [
        { http: { path: 'price', method: 'get', cors: true } },
        { http: { path: 'price', method: 'post', cors: true } },
        { http: { path: 'price', method: 'options', cors: true } },
      ],
    },
  },

  plugins: [
    'serverless-webpack',
    'serverless-dotenv-plugin',
    ...(isOffline ? ['serverless-offline'] : []),
  ],

  custom: {
    webpack: {
      webpackConfig: 'webpack.config.js',
      includeModules: true,
      packager: 'npm',
      excludeFiles: [
        'src/**/*.test.js',
        'src/**/*.test.ts',
        'src/**/*.spec.js',
        'src/**/*.spec.ts',
      ],
      keepOutputDirectory: false,
    },
    'serverless-offline': {
      httpPort: 3001,
      lambdaPort: 3002,
      noTimeout: true,
    },
    dotenv: {
      path: '.env',
      include: [
        'RPC_URL',
        'CHAIN_ID',
        'REDIS_HOST',
        'REDIS_PORT',
        'REDIS_PASSWORD',
        'REDIS_URL',
        'BALANCER_SUBGRAPH',
        'GRAPH_API_KEY',
      ],
    },
  },
}

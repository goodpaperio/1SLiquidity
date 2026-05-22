'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

// serverless.yml is the source of truth for config.
// This file exists only to skip serverless-offline during deploy/package/remove:
// serverless-offline is ESM with top-level await and breaks on Node 22+ when
// Serverless require()s all plugins (including during `deploy`).
const isOffline = process.argv.some((arg) => String(arg).includes('offline'))

const configPath = path.join(__dirname, 'serverless.yml')
const config = yaml.load(fs.readFileSync(configPath, 'utf8'))

if (!isOffline && Array.isArray(config.plugins)) {
  config.plugins = config.plugins.filter((plugin) => plugin !== 'serverless-offline')
}

module.exports = config

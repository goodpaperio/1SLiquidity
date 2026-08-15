const fs = require('fs');
const path = require('path');

const botsDir = path.join(__dirname, 'bots');

function listBotIds() {
  if (!fs.existsSync(botsDir)) return [];
  return fs
    .readdirSync(botsDir)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.example.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

const botIds = listBotIds();
const apps = botIds.map((id) => ({
  name: `liquidity-bot-v2-${id}`,
  script: 'dist/index.js',
  cwd: __dirname,
  interpreter: 'node',
  autorestart: true,
  max_restarts: 10,
  env: {
    BOT_ID: id,
    NODE_ENV: 'production',
  },
}));

if (apps.length === 0) {
  apps.push({
    name: 'liquidity-bot-v2-placeholder',
    script: 'dist/index.js',
    cwd: __dirname,
    autorestart: false,
    env: { BOT_ID: 'alpha', NODE_ENV: 'production' },
  });
}

module.exports = { apps };

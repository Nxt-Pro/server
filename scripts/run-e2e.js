#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const { assertSafeE2eEnv, loadE2eEnv } = require('./e2e-env');

const { envFile } = loadE2eEnv({ override: true });
assertSafeE2eEnv();

console.log(`Using e2e env file: ${path.relative(process.cwd(), envFile)}`);

const jestBin = path.join(
  process.cwd(),
  'node_modules',
  'jest',
  'bin',
  'jest.js',
);
const result = spawnSync(
  process.execPath,
  [jestBin, '--config', './test/jest-e2e.json', ...process.argv.slice(2)],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);

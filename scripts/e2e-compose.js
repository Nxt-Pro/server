#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const { resolveE2eEnvFile } = require('./e2e-env');

const envFile = resolveE2eEnvFile();
const composeFile = path.resolve(process.cwd(), 'docker-compose.e2e.yml');
const args = [
  'compose',
  '--env-file',
  envFile,
  '-f',
  composeFile,
  ...process.argv.slice(2),
];

const result = spawnSync('docker', args, {
  cwd: process.cwd(),
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

const fs = require('fs');
const path = require('path');

const DEFAULT_ENV_FILE = '.env.e2e';
const FALLBACK_ENV_FILE = '.env.e2e.example';

function resolveE2eEnvFile() {
  if (process.env.E2E_ENV_FILE) {
    return path.resolve(process.cwd(), process.env.E2E_ENV_FILE);
  }

  const localEnv = path.resolve(process.cwd(), DEFAULT_ENV_FILE);
  if (fs.existsSync(localEnv)) {
    return localEnv;
  }

  return path.resolve(process.cwd(), FALLBACK_ENV_FILE);
}

function parseEnvFile(contents) {
  const parsed = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value.replace(/\\n/g, '\n');
  }

  return parsed;
}

function loadE2eEnv({ override = true } = {}) {
  const envFile = resolveE2eEnvFile();
  if (!fs.existsSync(envFile)) {
    throw new Error(
      `Missing e2e env file: ${envFile}. Copy .env.e2e.example to .env.e2e or set E2E_ENV_FILE.`,
    );
  }

  const parsed = parseEnvFile(fs.readFileSync(envFile, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return { envFile, parsed };
}

function assertSafeE2eEnv() {
  const nodeEnv = process.env.NODE_ENV;
  const dbName = process.env.DB_NAME || '';

  if (nodeEnv !== 'test') {
    throw new Error(
      `Refusing to run e2e tests with NODE_ENV=${nodeEnv || '<unset>'}. Expected NODE_ENV=test.`,
    );
  }

  if (!/(^|[_-])(e2e|test)([_-]|$)/i.test(dbName)) {
    throw new Error(
      `Refusing to run e2e tests against DB_NAME=${dbName || '<unset>'}. Use a database name containing e2e or test.`,
    );
  }

  if (process.env.DB_SSL === 'true') {
    throw new Error('Refusing to run e2e tests with DB_SSL=true.');
  }
}

module.exports = {
  assertSafeE2eEnv,
  loadE2eEnv,
  resolveE2eEnvFile,
};

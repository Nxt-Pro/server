const { execSync } = require('child_process');

const name = process.argv[2];
if (!name) {
  console.error('Migration name required');
  process.exit(1);
}

execSync(
  `ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate src/database/migrations/${name} -d src/config/data-source.config.ts`,
  { stdio: 'inherit' },
);

const { execSync } = require('child_process');

const name = process.argv[2];
if (!name) {
  console.error('Migration name required');
  process.exit(1);
}

execSync(
  `ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:create src/database/migrations/${name}`,
  { stdio: 'inherit' },
);

const { assertSafeE2eEnv, loadE2eEnv } = require('../scripts/e2e-env');

loadE2eEnv({ override: true });
assertSafeE2eEnv();

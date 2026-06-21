# Docker Operations

## What Was Implemented

The server repo now exposes safe Docker Compose npm scripts:

```bash
npm run docker:config
npm run docker:build
npm run docker:up
npm run docker:down
npm run docker:ps
npm run docker:logs
```

The infrastructure scaffold now has operator scripts in its own
`package.json`:

```bash
npm run staging:config
npm run staging:pull
npm run staging:up
npm run staging:down
npm run staging:ps
npm run staging:logs
npm run staging:deploy
```

`staging:deploy` calls `bash scripts/deploy-staging.sh` and is intended for
Linux, macOS, or VPS shells. The direct Docker Compose scripts are the
cross-platform path.

## Why This Strategy

The scripts wrap common, non-destructive Docker commands so operators do not
need to remember long Compose flags. They deliberately avoid migrations, seeds,
volume deletion, and reset flows.

## Configuration

Server scripts run from `server/` and expect:

```text
.env.docker
docker-compose.yml
```

Infrastructure scripts run from `infrastructure/` and expect:

```text
.env.staging
docker-compose.staging.yml
```

Use the corresponding `.env.*.example` files as templates only. Do not commit
real secrets.

## Production-Ready Now

- safe server Compose wrapper scripts;
- safe staging infra Compose wrapper scripts;
- no default volume deletion;
- no migration or seed execution inside lifecycle scripts;
- logs scoped to the `api` service.

## Intentionally Not Implemented

- no Docker reset script;
- no automatic migrations;
- no automatic seeding;
- no production secrets;
- no Kubernetes, Terraform, Ansible, or TLS automation.

## When To Use Direct Docker Compose

Use direct Compose commands when you need a command not represented by npm
scripts, such as one-off migration review:

```bash
docker compose --env-file .env.staging -f docker-compose.staging.yml exec api npm run migration:show
```

Run migrations or seeds only as deliberate operator actions after backups and
environment confirmation.

## Pending Runtime Validation

Docker runtime validation is pending until a safe `.env.docker` or
`.env.staging` exists and Docker is available on the target machine. Do not
claim successful image builds or proxy runtime behavior until those commands are
actually run.

## Known Risks

- `docker:up` and `staging:up` start containers using the local env file.
- `staging:pull` requires registry access to `API_IMAGE`.
- Placeholder secrets in example env files are not safe for real deployments.

## Next Steps

- Validate `npm run docker:config` and `npm run docker:build` with a safe local
  `.env.docker`.
- Validate `npm run staging:config` with a real `.env.staging` or syntax-check
  the example env.
- Add backup and restore runbooks before production data is introduced.

# NxtPro Server Deployment Runbook

This runbook covers the NestJS API server repository. It documents the current
CI/CD, Docker image, local Compose, migration, seed, and health-check flow.

## Current Shape

- Server source lives in this repository.
- `npm run build` emits the API entrypoint at `dist/src/main.js`.
- `npm run start:prod` runs `node dist/src/main.js`.
- Safe Docker Compose lifecycle scripts are exposed through `npm run docker:*`.
- `DB_MIGRATIONS_RUN=false` is the default; API startup does not run migrations
  unless that env var is intentionally set to `true`.
- Local Compose uses `build: .` from this server repo root.
- Future staging/production infra should consume the published image
  `ghcr.io/<owner>/nxtpro-server:<tag>` and should not mount or build from
  `../server`, `../nxtpro-server`, or other source paths.

## Runtime Hardening Docs

- [Caching](runtime/CACHING.md)
- [Media and CDN](runtime/MEDIA_AND_CDN.md)
- [Docker operations](runtime/DOCKER_OPERATIONS.md)

Staging reverse proxy details live in the infra scaffold:
`../infrastructure/docs/NGINX_REVERSE_PROXY.md`.

## Local NPM Flow

```bash
npm ci
npm run typecheck
npm run lint:check
npm run build
npm test
npm run migration:show
```

Run migrations only after review and against the intended database:

```bash
npm run migration:run
```

Seed super admins only as an intentional operator action:

```bash
npm run seed:run
```

`seed:run` creates or activates admin-role accounts and preserves existing
passwords. Do not run it casually against production.

## Local Compose Flow

Prepare local Compose env:

```bash
Copy-Item .env.docker.example .env.docker
```

Validate and build:

```bash
npm run docker:config
npm run docker:build
```

Start, inspect, and stop:

```bash
npm run docker:up
npm run docker:ps
npm run docker:logs
curl http://localhost:3000/api/health
npm run docker:down
```

Local Compose named volumes preserve PostgreSQL data, Redis data, and uploads.
Use `docker compose --env-file .env.docker down -v` only when data loss is
intentional.

## CI Workflow

`.github/workflows/ci.yml` runs on pull requests to `main` and pushes to `main`.
It uses Node 20 and runs:

- `npm ci`
- `npm run typecheck`
- `npm run lint:check`
- `npm run build`
- `npm test`

CI does not run migrations, seeds, deployments, or production-secret-dependent
steps.

## Docker Publish Workflow

`.github/workflows/docker-publish.yml` runs on pushes to `main`, tags matching
`v*.*.*`, and manual dispatch.

It publishes:

```text
ghcr.io/${{ github.repository_owner }}/nxtpro-server
```

Tags include:

- `latest` for `main`;
- short git SHA;
- semver tags for `v*.*.*` releases.

The workflow only builds and pushes the image. It does not deploy to a VPS,
connect over SSH, run migrations, or run seeds.

## Environment Safety

Use `.env.example` for normal server environments and `.env.docker.example` for
local Compose. Do not commit `.env`, `.env.*`, or real secrets.

Production must provide explicit values for database, Redis, JWT, CORS,
frontend URL, public upload URL, SMTP, and OAuth. Firebase currently degrades
with a warning if omitted.

## Health Checks

Public health endpoints:

```bash
curl https://api.example.com/api/health
curl https://api.example.com/api/health/database
curl https://api.example.com/api/health/all
```

For the staging infra scaffold, health checks should go through NGINX on
`NGINX_PUBLISHED_PORT`.

## Not Automated Yet

- No VPS SSH deployment workflow.
- No server-owned TLS automation. The infra scaffold includes HTTP-only NGINX
  for staging reverse proxying.
- No Kubernetes, Terraform, or Ansible.
- No automated backups.
- No production cloud media storage adapter; uploads are local disk or a Docker
  volume until a storage adapter is implemented.

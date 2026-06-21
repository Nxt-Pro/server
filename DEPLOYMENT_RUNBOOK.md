# NxtPro Server Deployment Runbook

This runbook links to the dedicated runtime documents added for production
runtime hardening. It does not claim the stack is fully production-complete.

## Runtime Docs

- [Caching](docs/runtime/CACHING.md)
- [Media and CDN](docs/runtime/MEDIA_AND_CDN.md)
- [Docker operations](docs/runtime/DOCKER_OPERATIONS.md)

## Implemented Runtime State

- Docker Compose scripts exist in `package.json` for config, build, lifecycle,
  status, and logs.
- Media uploads are local-storage backed and served from `/uploads`.
- Media URL generation is centralized and CDN-fronting-ready.
- Venue list lookups use explicit Redis caching with narrow invalidation.

## Provider-Ready But Not Provider-Integrated

- `CDN_BASE_URL` can front `/uploads` when a real CDN is configured.
- No cloud object storage adapter exists yet.
- No CDN upload or purge API exists yet.

## Migration And Seed Safety

Normal Docker scripts do not run migrations or seeds. Keep
`DB_MIGRATIONS_RUN=false` for normal startup.

Review migrations intentionally:

```bash
npm run migration:show
```

Run migrations only after confirming the target environment and backup plan:

```bash
npm run migration:run
```

Run seeds only as an intentional operator action:

```bash
npm run seed:run
```

## Pending Runtime Validation

Docker image build and Compose runtime validation require Docker plus safe local
env files. Do not record these as complete until the commands are actually run.

## Production Gaps

- no TLS automation in the server repo;
- no cloud media storage provider;
- local upload volume is a scaling and durability risk;
- cache metrics are not implemented;
- backup and restore procedures are still needed.

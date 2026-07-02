# Development Seeding

NxtPro includes a development-only seed system for local and Docker testing. It is guarded so it cannot run in production and requires an explicit opt-in.

## Safety Guards

The seed commands require:

- `NODE_ENV !== production`
- `ALLOW_DEV_SEED=true`

The scripts do not use TypeORM `synchronize`, do not drop the database, and only remove rows tied to the known development seed accounts plus `dev-seed-*` media files.

## Commands

Run migrations first:

```sh
npm run migration:run
```

Seed:

```sh
ALLOW_DEV_SEED=true npm run seed:dev
```

Undo:

```sh
ALLOW_DEV_SEED=true npm run seed:dev:undo
```

Reset:

```sh
ALLOW_DEV_SEED=true npm run seed:dev:reset
```

`seed:dev:reset` is local-only. It removes known dev-seed rows/media and then
reseeds; it is not a production wipe command.

Docker:

```sh
cd infrastructure
docker compose --env-file .env.ai -f docker-compose.ai.yml exec api sh -lc 'npm run migration:run'
docker compose --env-file .env.ai -f docker-compose.ai.yml exec api sh -lc 'ALLOW_DEV_SEED=true npm run seed:dev'
docker compose --env-file .env.ai -f docker-compose.ai.yml exec api sh -lc 'ALLOW_DEV_SEED=true npm run seed:dev:undo'
docker compose --env-file .env.ai -f docker-compose.ai.yml exec api sh -lc 'ALLOW_DEV_SEED=true npm run seed:dev:reset'
```

If the API image is stale, rebuild it:

```sh
docker compose --env-file .env.ai -f docker-compose.ai.yml up -d --build api
```

## Accounts

All seeded accounts use:

```text
NxtProDev!2026
```

Admins:

- `amara.okafor@dev.nxtpro.local`
- `julia.martin@dev.nxtpro.local`

Players:

- `tarek.hassan@dev.nxtpro.local`
- `milo.grant@dev.nxtpro.local`
- `leo.fischer@dev.nxtpro.local`
- `samir.okafor@dev.nxtpro.local`
- `diego.alvarez@dev.nxtpro.local`
- `omar.benali@dev.nxtpro.local`
- `noah.reed@dev.nxtpro.local`
- `ethan.brooks@dev.nxtpro.local` (banned visibility fixture)

Scouts:

- `maya.cole@dev.nxtpro.local`
- `nabil.fares@dev.nxtpro.local`
- `ella.sato@dev.nxtpro.local`

After seeding, the script also writes IDs and login data to:

```text
server/.seed-output/dev-accounts.json
```

## Media

The seed uses the monorepo root `assets/` directory when available:

- `assets/pics/avatar*M.jpg` for male profile pictures
- `assets/pics/avatar*F.jpg` for female profile pictures
- non-avatar files in `assets/pics/` for covers, posters, post images, venues, and events
- `assets/videos/*` for seeded reels/highlight videos

Files are copied into the normal local upload folders:

- `server/uploads/images/dev-seed-*`
- `server/uploads/videos/dev-seed-*`

In Docker compose, `../assets` is mounted read-only at `/app/assets`.

Root assets are required. If they are unavailable, the seed fails instead of falling back to generated PNGs or bundled videos. After pulling the compose change, recreate the API container so the new mount is active:

```bash
docker compose --env-file .env.ai -f docker-compose.ai.yml up -d --build --force-recreate api
```

Production-like environments should run migrations deliberately and should not
run dev seed commands. Use `npm run migration:show`, take a database backup,
then run `npm run migration:run` only after confirming the target environment.

Seeded videos intentionally keep `video_thumbnail_url` empty until real thumbnail generation exists, matching normal upload behavior.

## Seeded Data

The dataset includes:

- 13 users
- 2 admins
- 8 players
- 3 scouts
- complete player and scout profiles
- player stats, achievements, and career timeline entries
- 22 posts, with a reel-heavy mix for FYP/highlight testing
- image, multi-image, and video attachments
- likes, comments, bookmarks, and favorites
- active, pending, and rejected player-scout connections
- player-to-player connection examples
- chats, participants, and message histories
- notifications with read and unread examples
- venues, events, and event registrations
- scout notes
- moderation reports and audit logs
- media moderation and video skill analysis examples
- AI skill score job examples
- recommendation exclusion fixtures:
  - scout `maya.cole@dev.nxtpro.local` blocks player `leo.fischer@dev.nxtpro.local`
  - scout `maya.cole@dev.nxtpro.local` mutes player `noah.reed@dev.nxtpro.local`
- account-status visibility fixture:
  - player `ethan.brooks@dev.nxtpro.local` is banned; public/scout feeds, profile discovery, search, profile detail, post detail, and profile videos should hide him, while admin user management can still inspect the account

## Visibility Fixtures

Seeded visibility relationships are deliberately one-way and production-like:

- Maya Cole blocks Leo Fischer. Leo should be hidden from Maya's feeds, media lists, direct post lookups, and recommendations. Leo remains visible to other active users.
- Maya Cole mutes Noah Reed. Noah should be hidden from Maya's feeds and recommendations. Noah remains visible to other active users.
- Ethan Brooks is banned. Ethan should not appear to regular users or scouts in public discovery, search, feeds, post details, comments, or video/profile media. Admin-only user management can still show the banned account for moderation review.

## AI Scoring Gaps

The player profile `skill_scores` intentionally leave gaps for AI scoring tests across `pace`, `passing`, `physical`, and `dribbling`.

- Tarek Hassan: has `passing`, `physical`, `dribbling`; missing `pace`
- Milo Grant: has `pace`, `physical`; missing `passing`, `dribbling`
- Leo Fischer: has `pace`, `passing`, `dribbling`; missing `physical`
- Samir Okafor: has `physical`; missing `pace`, `passing`, `dribbling`
- Diego Alvarez: has `pace`, `dribbling`; missing `passing`, `physical`
- Omar Benali: has `physical`; missing `pace`, `passing`, `dribbling`
- Noah Reed: has `passing`, `physical`; missing `pace`, `dribbling`
- Ethan Brooks: has `pace`, `passing`, `dribbling`; missing `physical`

Other seeded skills, such as `shooting`, `defending`, and goalkeeper-specific scores, remain populated where relevant.

## Smoke Tests

Useful screens and flows:

- logged-out home page, especially Trending This Week and Latest Highlights
- login for player, scout, and admin accounts
- FYP/reels feed
- post details for image, multi-image, and video posts
- player profile posts/media/videos tabs
- AI scoring sheets for missing skills
- scouts list and scout profile
- chats list/detail
- notifications
- events list/detail/registration
- admin reports and audit logs

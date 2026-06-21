# Runtime Caching

## What Was Implemented

NxtPro now has an explicit Redis-backed cache primitive in
`src/common/cache/CacheService`. It is used only by `VenuesService` for
venue list lookups.

Cached service path:

- `GET /api/venues`
- service method: `VenuesService.getVenues`
- cache key prefix: `venues:list:v1:`
- key shape:
  `venues:list:v1:search=<value>:city=<value>:country=<value>:limit=<value>:offset=<value>`
- TTL: `CACHE_TTL`, default `300` seconds

## Why This Strategy

Caching is explicit at service level. No global cache interceptor was added,
because most NxtPro responses include auth, viewer state, private data, or
rapidly changing mutations.

Venue lists are the current safe candidate because the response is not
personalized and does not include viewer-specific flags.

## Configuration

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_TLS`
- `REDIS_DB_CACHE`
- `CACHE_TTL`

If Redis is unavailable, `CacheService` bypasses cache reads/writes for a
short window and lets the database-backed request continue.

## Production-Ready Now

- deterministic cache keys;
- explicit TTL;
- no cached mutations;
- no cached error responses;
- Redis failure does not break the endpoint;
- mutation invalidation for venue create/update/delete.

## Intentionally Not Implemented

- no global cache interceptor;
- no caching for auth, chat, notifications, admin, profiles, FYP,
  bookmarks, likes, connections, or account/settings endpoints;
- no caching for venue detail responses;
- no cache warming.

## Invalidation

Venue create, update, and delete operations call:

```text
deleteByPrefix("venues:list:v1:")
```

This clears cached venue list pages and filtered list variants after admin
mutations.

## How To Operate And Test

Run unit tests:

```bash
npm test -- venues.service.spec.ts
```

Manual smoke test with Redis available:

1. Request `GET /api/venues?city=Cairo&limit=5`.
2. Request it again and confirm the response remains correct.
3. Create, update, or delete a venue as admin.
4. Request the same list and confirm fresh data is returned.

## Known Risks

- Redis cache is best-effort; a Redis outage falls back to database reads.
- Cached values are JSON payloads, not TypeORM entity instances.
- Large numbers of venue-list key variants make invalidation scan more keys.

## Next Steps

- Add metrics for cache hits, misses, and bypasses.
- Consider caching public reference data if similar non-personalized endpoints
  are added.
- Revisit TTLs after staging traffic is observed.

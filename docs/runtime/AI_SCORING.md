# AI Scoring Runtime

NxtPro AI scoring is backend-owned. The mobile app uploads scoring media to the
normal API upload endpoint, submits a scoring request, and receives a queued
job response. BullMQ workers call AI services, persist the result, update the
player profile, and emit a notification.

## Supported Skills

The backend registry lives in `server/src/integrations/ai/skill-support.registry.ts`.

| Skill key   | Display name         | Input                                                                         | AI service endpoint          | Profile field            |
| ----------- | -------------------- | ----------------------------------------------------------------------------- | ---------------------------- | ------------------------ |
| `pace`      | Pace                 | one video plus `heightCm`                                                     | `POST /api/pace/analyze`     | `skill_scores.pace`      |
| `passing`   | Passing              | one video                                                                     | `POST /api/passing/analyze`  | `skill_scores.passing`   |
| `shooting`  | Shooting / Finishing | one video                                                                     | `POST /api/shooting/analyze` | `skill_scores.shooting`  |
| `dribbling` | Dribbling            | slalom video and figure-8 video                                               | `POST /api/dribbling/batch`  | `skill_scores.dribbling` |
| `physical`  | Physical             | high-knees, jump, agility, burpees videos plus archetype image and `heightCm` | `POST /api/physical/batch`   | `skill_scores.physical`  |

Unsupported skills return:

```json
{
  "supported": false,
  "code": "SKILL_NOT_SUPPORTED",
  "message": "this skill is not supported yet"
}
```

Unsupported skills are not enqueued and no fake score is created.

## Queue Flow

1. Client uploads files to `POST /api/upload`.
2. Client calls `POST /api/ai/skills/score`.
3. Backend validates the skill and media slots.
4. Backend creates an `ai_skill_score_jobs` row with `queued` status.
5. Backend enqueues BullMQ job type `skill-scoring` on `skill-analysis`.
6. Worker marks the job `processing`, calls the AI service, validates/mapps the response, then marks `completed` or final `failed`.
7. Successful jobs update `player_profiles.skill_scores` and recompute `player_profiles.ai_score`.
8. Success/failure emits `notification.create` with notification type `skill_score`.

## Status Lifecycle

`queued -> processing -> completed`

`queued -> processing -> failed`

The client can poll `GET /api/ai/skills/jobs/:jobId` or rely on notification
delivery if the app is connected to realtime notifications.

## Environment

```env
AI_SCORING_ENABLED=true
AI_SCORING_QUEUE_ENABLED=true
AI_SKILL_SERVICE_URL=http://ai-skills:8001
AI_RECOMMENDATION_SERVICE_URL=http://ai-recommendation:8002
AI_MODERATION_SERVICE_URL=http://ai-moderation:8003
AI_SERVICE_TIMEOUT_MS=120000
AI_SERVICE_RETRY_ATTEMPTS=3
AI_SCORING_MAX_MEDIA_BYTES=104857600
```

`AI_SERVICE_RETRY_ATTEMPTS` controls BullMQ attempts for AI skill-scoring jobs.
Other queue jobs use `QUEUE_MAX_RETRIES`.

`AI_SCORING_MAX_MEDIA_BYTES` defaults to `104857600` bytes (100 MiB). The API
rejects larger scoring media before enqueueing, and the worker re-checks media
size before loading the file for multipart AI skill requests.

`AI_MODEL_API_KEY` is optional and is forwarded as a bearer token only if set.
Do not put model keys in the mobile app.

Video moderation uses `AI_MODERATION_SERVICE_URL` and calls:

```text
POST ${AI_MODERATION_SERVICE_URL}/moderate-video
Content-Type: application/json
{ "video_url": "https://..." }
```

## Recommendation System

Scouts can call `GET /api/ai/recommendations?k=10`. The backend calls the
Python recommendation service endpoint:

```text
POST ${AI_RECOMMENDATION_SERVICE_URL}/api/recommendations/context
```

The API builds live viewer context and eligible candidate players from Postgres,
then sends that context to the recommendation service. The backend hydrates
returned player IDs from Postgres and drops unknown, inactive, banned, blocked,
or muted players before returning recommendations. Legacy CSV/model endpoints
remain for offline exports and demos.

## Verification

```bash
npm run typecheck
npm run lint:check
npm test -- skill-scoring
```

Docker compose config:

```bash
docker compose -f infrastructure/docker-compose.ai.yml config
```

Health checks:

```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:3000/api/health
```

## Troubleshooting

- `AI scoring is not enabled`: set `AI_SCORING_ENABLED=true`.
- `AI skill service URL is not set`: set `AI_SKILL_SERVICE_URL`.
- `media is too large for AI scoring`: reduce the clip or raise
  `AI_SCORING_MAX_MEDIA_BYTES` intentionally for the environment.
- AI service health fails: confirm model files exist under each module `models/`
  folder and rerun that module's `download_models.py` if needed.
- Job is `failed`: inspect `failure_reason` in `ai_skill_score_jobs`, then retry
  with a clearer/shorter upload.
- No notification appears: confirm in-app notifications are enabled and socket
  delivery is connected; the job status endpoint remains the source of truth.

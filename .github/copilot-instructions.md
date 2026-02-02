Agent, Ask, Edit, Plan all Modes should read the entire file before proceeding.

I think u using metaphors isn't appropriate here, just be direct and to the point.
I'm smart enough to make conclusions, only explain what can't be concluded by me.
I'll provide full feature.txt file, db schema. u should also check 'server' folder,
all what's in it, study what has been done, file structre, features, intentions,
get a view of what can be enhanced, edited, added, removed. so before u proved
the notifications feature work plan, plan any removal, edit, enhancement, addition,
file structure change, logic simplification, code refactor (making it shorter and
easier to understand). acknowledge that my knowledge and skills with ts, nest, jest,
typeorm, postman, bash scripting, different file types, coding and file structre conventions,
working in projects in general is limited. I will also provide u my cv so u have a good
understanding of the capabilities of the person u r dealing with.

NEEDS HANDLING EVERYWHERE
 - Use the HttpError class for global, unified, and controlled error handling instead of nest's built-in exception handlers (found in common/utils). (e.g. replace ForbiddenException, BadRequestException, etc. with their respective handlers)

------------------------------

Chats
 - The chat business logic isn't quite right, plus the entity doesn't cover our needs (a schema issue not your fault). The logic should be that a scout can initiate a chat with any player they want while players can only request a chat with a scout.
  - For a scout initiating a chat: a chat should be automatically created (which is what is currently there).
  - For a player requesting to chat: we notify the scout that player X wants to chat and once they accept we create the chat otherwise we don't create anything.
  - You'll need to know which role is initiating the chat and add to the status column in the entity itself a pending value which will be the default instead of active. If a scout initiates the status is kept active, else the status is pending until the scout accepts.
 - For the real-time messaging (websockets) add it to chats/chats.gateway.ts

------------------------------

Events
 - Registration is a submodule, move anything registration-related to events/submodules/registerations/ where there'll be a controller, service, dtos, etc.
 - In createEvent as you still don't have the user role adding a "TODO:" comment is better to fix them later and not forget about stuff. Since the creator can be a scout or an admin.
 - For getEvents & getOngoingEvents, you should use the EventQueryDto for the query rather than listing all the parameters for safety, security checks, and clean code.
 - !!!! ANY USER CAN APPROVE AN EVENT !!!! you have to check if the user is authorize to do so (is an admin).
 - The participant count logic can cause race conditions, the capacity check and the increment must be atomic to account for them, so no 2 users register for the last place in the same event at the same time.
 - !! UpdateEventDto exposes status and rejectionReason !! Any organizer
    can call PATCH /events/:id and self-approve their own event, completely
    bypassing the approval workflow. Remove both fields from UpdateEventDto.
 - !! updateRegistration has no authorization at all !! There is no
    @CurrentUser() on the controller endpoint and no check in the service.
    Any user can approve or reject any registration. Needs the same admin
    check as approveEvent.
 - cancelRegistration doesn't guard against double-cancellation. If the
    same registration is cancelled twice, participantCount is decremented
    twice. Add an early return if registration.cancelled is already true.
 - registerForEvent duplicate check doesn't account for cancelled
    registrations. A player who cancels can never re-register because the
    old row (cancelled: true) still matches the existing-check query.
    Add `AND cancelled = false` to the query.
 - !! getOngoingEvents query is wrong !! The condition is
    `start_date >= now` which returns upcoming events, not ongoing ones.
    An ongoing event has already started but hasn't ended yet.
    Should be: `start_date <= now AND end_date >= now`.
 - getEvents is paginated but only returns the array. Should return
{ data, total } using getManyAndCount() so the client knows when
there are no more pages to load.

------------------------------

Venues
 - createVenue needs authorization as only admins should be able to create them.
 - getVenues should use a DTO (VenueQueryDto).
 - updateVenue & deleteVenue also need to autheorize the user.
 - updateVenueDto is not used.
 - getVenues is paginated but only returns the array. Should return
{ data, total } using getManyAndCount() so the client knows when
there are no more pages to load.

------------------------------

Extra Notes
 - Move firebase to src/integrations/firebase as it isn't a module in the sense of an endpoint we call.

# ⚽ Graduation Project: Nxtpro (Football Scouting Platform)

## 🧠 Project Context

- **Role:** You are the Senior Lead Architect; I am the Junior Developer (Student).
- **Domain:** A Social Scouting Platform connecting **Players** (Talent) with **Scouts** (Recruiters).
- **Core Entities:**
  - `Users` (Base entity: Player, Scout, or Admin roles).
  - `PlayerProfiles` (Stats, Position, AI Score, Club History).
  - `ScoutProfiles` (Organization, License, Scouting Notes).
  - `Social`: Posts, Likes, Comments, Connections.
- **Environment:**
  - OS: Linux Mint (Lenovo Legion 5).
  - Path: `/media/mahmoud/New Volume/Curriculum/GP/Nxtpro/Project/server`
  - **CRITICAL:** If a file appears missing, check if the drive is mounted (`sudo mount -a`).

---

## 🚦 Mode-Specific Instructions

### 🕵️ @Ask Mode (The Mentor)

- **Context:** I am a student learning NestJS. Explain _why_ a pattern matters for a scalable social platform (e.g., "Why use a Queue for notifications?").
- **Analogy:** Compare code concepts to football or social media logic (e.g., "This Gateway acts like a referee managing live inputs").

### 🤖 @Agent Mode (The Builder)

- **Implementation Standard:**
  - **Arrow Functions:** ALL Service/Gateway methods MUST be arrow functions (`handle = () => {}`) to preserve `this`.
  - **TypeORM:** Use `QueryBuilder` for complex feeds (e.g., "Find players matching Scout criteria"); `Repository` for simple CRUD.
  - **Strict Typing:** Use DTOs validated with `class-validator` for all inputs.
- **Safety:** Always run `npm run lint` after generating new modules.

### 🗺️ @Plan Mode (The Strategist)

- **Architecture:** Ensure strict separation between `Scout` logic and `Player` logic where necessary.
- **Real-Time Strategy:** Prioritize `Socket.IO` for:
  1. **Notifications** (Connection requests, Likes).
  2. **Chat** (Direct messaging between Scouts and Players).
  3. **Live Events** (Tournament updates).

---

## 🛠 Technical Standards

### 1. Database & Schema (Postgres)

- **IDs:** Use `ULID` for all primary keys (as defined in Schema).
- **Enums:** Strictly follow schema enums (e.g., `role: 'player' | 'scout'`, `status: 'pending' | 'accepted'`).
- **Indexing:** Always consider the defined indexes (e.g., `INDEX ON (position, availability_status)` for player search).

### 2. Real-Time (WebSockets)

- **Library:** `@nestjs/platform-socket.io` & `@nestjs/websockets`.
- **Pattern:** Use `EventEmitter2` to decouple the _trigger_ (e.g., "User liked a post") from the _delivery_ (WebSocket Gateway).
- **Auth:** Validate JWT in the WebSocket Handshake (`handleConnection`).

### 3. Git & Workflow

- **Commit Messages:** Use Conventional Commits (e.g., `feat(scout): add bulk message endpoint`, `fix(auth): resolve jwt guard`).


`src/
├── main.ts                           # Application entry point
├── app.module.ts                     # Root module orchestrating all features
│
├── config/                           # Configuration management
│   ├── configuration.ts              # Environment variables loader
│   ├── database.config.ts            # TypeORM configuration
│   ├── redis.config.ts               # Redis/BullMQ configuration
│   ├── firebase.config.ts            # FCM configuration
│   ├── cloudflare.config.ts          # CDN configuration
│   └── ai-services.config.ts         # AI microservices endpoints
│
├── common/                           # Shared utilities across the app
│   ├── decorators/                   # Custom decorators
│   │   ├── roles.decorator.ts        # @Roles('player', 'scout', 'admin')
│   │   ├── current-user.decorator.ts # @CurrentUser() for getting user from request
│   │   └── public.decorator.ts       # @Public() to skip auth
│   │
│   ├── guards/                       # Authorization & access control
│   │   ├── jwt-auth.guard.ts         # JWT authentication guard
│   │   ├── roles.guard.ts            # Role-based access control
│   │   └── ownership.guard.ts        # Resource ownership verification
│   │
│   ├── interceptors/                 # Request/response transformation
│   │   ├── transform.interceptor.ts  # Standardize API responses
│   │   ├── logging.interceptor.ts    # Request/response logging
│   │   └── cache.interceptor.ts      # Redis caching layer
│   │
│   ├── filters/                      # Exception handling
│   │   ├── http-exception.filter.ts  # Global error formatting
│   │   └── typeorm-exception.filter.ts # Database error handling
│   │
│   ├── pipes/                        # Data validation & transformation
│   │   ├── validation.pipe.ts        # Global DTO validation
│   │   └── parse-int.pipe.ts         # Custom parsing pipes
│   │
│   ├── middlewares/                  # Request processing
│   │   ├── logger.middleware.ts      # HTTP request logging
│   │   └── rate-limit.middleware.ts  # Rate limiting logic
│   │
│   ├── interfaces/                   # Shared TypeScript interfaces
│   │   ├── paginated-result.interface.ts
│   │   ├── api-response.interface.ts
│   │   └── jwt-payload.interface.ts
│   │
│   ├── constants/                    # Application constants
│   │   ├── roles.constant.ts         # USER_ROLES enum
│   │   ├── status.constant.ts        # Various status enums
│   │   └── queue-names.constant.ts   # BullMQ queue names
│   │
│   └── utils/                        # Helper functions
│       ├── password.util.ts          # Bcrypt hashing
│       ├── date.util.ts              # Date manipulation
│       └── slug.util.ts              # String utilities
│
├── database/                         # Database layer
│   ├── entities/                     # TypeORM entities (your schema)
│   │   ├── base.entity.ts            # Abstract base with id, created_at, updated_at
│   │   ├── user.entity.ts
│   │   ├── player-profile.entity.ts
│   │   ├── player-stats.entity.ts
│   │   ├── career-timeline.entity.ts
│   │   ├── achievement.entity.ts
│   │   ├── scout-profile.entity.ts
│   │   ├── scout-note.entity.ts
│   │   ├── favorite.entity.ts
│   │   ├── venue.entity.ts
│   │   ├── event.entity.ts
│   │   ├── event-registration.entity.ts
│   │   ├── post.entity.ts
│   │   ├── attachment.entity.ts
│   │   ├── video.entity.ts
│   │   ├── media-moderation.entity.ts
│   │   ├── video-skill-analysis.entity.ts
│   │   ├── like.entity.ts
│   │   ├── comment.entity.ts
│   │   ├── bookmark.entity.ts
│   │   ├── connection.entity.ts
│   │   ├── chat.entity.ts
│   │   ├── message.entity.ts
│   │   ├── report.entity.ts
│   │   ├── block.entity.ts
│   │   ├── mute.entity.ts
│   │   ├── notification.entity.ts
│   │   └── audit-log.entity.ts
│   │
│   ├── migrations/                   # Database migrations
│   │   └── 1234567890-InitialSchema.ts
│   │
│   ├── seeds/                        # Database seeding
│   │   ├── user.seed.ts
│   │   └── venue.seed.ts
│   │
│   └── repositories/                 # Custom repositories (if needed)
│       └── player.repository.ts      # Complex queries beyond TypeORM defaults
│
├── modules/                          # Feature modules (business logic)
│   │
│   ├── auth/                         # Authentication & authorization
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts        # POST /auth/register, /auth/login, /auth/refresh
│   │   ├── auth.service.ts           # JWT generation, password validation
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts       # JWT validation strategy
│   │   │   └── local.strategy.ts     # Email/password strategy
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       ├── login.dto.ts
│   │       └── token-response.dto.ts
│   │
│   ├── users/                        # User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts       # GET/PATCH /users/me, /users/:id
│   │   ├── users.service.ts          # CRUD operations on User entity
│   │   └── dto/
│   │       ├── update-user.dto.ts
│   │       └── user-response.dto.ts
│   │
│   ├── players/                      # Player-specific features
│   │   ├── players.module.ts
│   │   ├── players.controller.ts     # GET /players, /players/:id, /players/featured
│   │   ├── players.service.ts        # Player profile logic, AI scoring coordination
│   │   ├── submodules/
│   │   │   ├── stats/                # Player statistics
│   │   │   │   ├── stats.service.ts
│   │   │   │   └── dto/
│   │   │   ├── timeline/             # Career timeline
│   │   │   │   ├── timeline.controller.ts  # POST /timeline/edit, GET /timeline
│   │   │   │   ├── timeline.service.ts
│   │   │   │   └── dto/
│   │   │   └── achievements/         # Achievements showcase
│   │   │       ├── achievements.controller.ts
│   │   │       ├── achievements.service.ts
│   │   │       └── dto/
│   │   └── dto/
│   │       ├── create-player.dto.ts
│   │       ├── update-player.dto.ts
│   │       ├── player-response.dto.ts
│   │       └── player-filter.dto.ts  # Advanced filtering
│   │
│   ├── scouts/                       # Scout-specific features
│   │   ├── scouts.module.ts
│   │   ├── scouts.controller.ts      # GET /scouts, /scouts/:id
│   │   ├── scouts.service.ts         # Scout profile, verification logic
│   │   ├── submodules/
│   │   │   ├── notes/                # Private scouting notes
│   │   │   │   ├── notes.controller.ts  # POST /scout/note/:player_id
│   │   │   │   ├── notes.service.ts
│   │   │   │   └── dto/
│   │   │   ├── comparison/           # Player comparison tool
│   │   │   │   ├── comparison.controller.ts  # GET /players/compare
│   │   │   │   ├── comparison.service.ts
│   │   │   │   └── dto/
│   │   │   └── bulk-messaging/       # Batch actions
│   │   │       ├── bulk-messaging.controller.ts
│   │   │       ├── bulk-messaging.service.ts
│   │   │       └── dto/
│   │   └── dto/
│   │       ├── create-scout.dto.ts
│   │       └── scout-response.dto.ts
│   │
│   ├── posts/                        # Social feed & content
│   │   ├── posts.module.ts
│   │   ├── posts.controller.ts       # POST /posts, GET /posts/fyp, /posts/highlights
│   │   ├── posts.service.ts          # Post creation, engagement scoring
│   │   ├── submodules/
│   │   │   ├── likes/
│   │   │   │   ├── likes.controller.ts    # POST /posts/:id/like
│   │   │   │   ├── likes.service.ts
│   │   │   │   └── dto/
│   │   │   ├── comments/
│   │   │   │   ├── comments.controller.ts # POST /posts/:id/comment
│   │   │   │   ├── comments.service.ts
│   │   │   │   └── dto/
│   │   │   └── bookmarks/
│   │   │       ├── bookmarks.controller.ts
│   │   │       ├── bookmarks.service.ts
│   │   │       └── dto/
│   │   └── dto/
│   │       ├── create-post.dto.ts
│   │       └── post-response.dto.ts
│   │
│   ├── attachments/                  # Media attachments
│   │   ├── attachments.module.ts
│   │   ├── attachments.service.ts    # Upload to CDN, create attachment records
│   │   └── dto/
│   │       └── upload-response.dto.ts
│   │
│   ├── videos/                       # Video processing & analysis
│   │   ├── videos.module.ts
│   │   ├── videos.service.ts         # Trigger AI video analysis jobs
│   │   └── dto/
│   │       └── video-analysis.dto.ts
│   │
│   ├── connections/                  # Player-Scout connections
│   │   ├── connections.module.ts
│   │   ├── connections.controller.ts # POST /players/:scout_id/connect
│   │   ├── connections.service.ts    # Connection request logic
│   │   └── dto/
│   │       └── connection-response.dto.ts
│   │
│   ├── chats/                        # Direct messaging
│   │   ├── chats.module.ts
│   │   ├── chats.controller.ts       # POST /chat/start, POST /chat/:id/message
│   │   ├── chats.service.ts          # Scout-initiated DMs only
│   │   ├── chats.gateway.ts          # WebSocket for real-time messaging
│   │   └── dto/
│   │       ├── start-chat.dto.ts
│   │       └── send-message.dto.ts
│   │
│   ├── events/                       # Tournaments & trials
│   │   ├── events.module.ts
│   │   ├── events.controller.ts      # GET /events, POST /events
│   │   ├── events.service.ts         # Event creation, registration
│   │   ├── submodules/
│   │   │   └── registrations/
│   │   │       ├── registrations.controller.ts
│   │   │       ├── registrations.service.ts
│   │   │       └── dto/
│   │   └── dto/
│   │       ├── create-event.dto.ts
│   │       └── register-event.dto.ts
│   │
│   ├── venues/                       # Event venues
│   │   ├── venues.module.ts
│   │   ├── venues.controller.ts
│   │   ├── venues.service.ts
│   │   └── dto/
│   │
│   ├── favorites/                    # Save/favorite functionality
│   │   ├── favorites.module.ts
│   │   ├── favorites.controller.ts
│   │   ├── favorites.service.ts      # Polymorphic favorites (players/scouts)
│   │   └── dto/
│   │
│   ├── notifications/                # Notification system
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts # GET /notifications
│   │   ├── notifications.service.ts  # Create & mark as read
│   │   └── dto/
│   │       └── notification-response.dto.ts
│   │
│   ├── reports/                      # Reporting system
│   │   ├── reports.module.ts
│   │   ├── reports.controller.ts     # POST /reports
│   │   ├── reports.service.ts        # Report inappropriate content
│   │   └── dto/
│   │       └── create-report.dto.ts
│   │
│   ├── moderation/                   # Block/Mute functionality
│   │   ├── moderation.module.ts
│   │   ├── moderation.controller.ts  # POST /block, POST /mute
│   │   ├── moderation.service.ts
│   │   └── dto/
│   │
│   ├── search/                       # Advanced search & filtering
│   │   ├── search.module.ts
│   │   ├── search.controller.ts      # GET /search/players, /search/scouts
│   │   ├── search.service.ts         # ElasticSearch integration or DB filters
│   │   └── dto/
│   │       ├── search-players.dto.ts # Position, age, location, etc.
│   │       └── search-results.dto.ts
│   │
│   ├── discovery/                    # FYP & recommendation engine
│   │   ├── discovery.module.ts
│   │   ├── discovery.controller.ts   # GET /discovery/fyp
│   │   ├── discovery.service.ts      # Recommendation algorithm
│   │   └── dto/
│   │
│   └── admin/                        # Admin dashboard & moderation
│       ├── admin.module.ts
│       ├── admin.controller.ts       # GET /admin/reports, POST /admin/ban/:id
│       ├── admin.service.ts          # User management, analytics
│       ├── submodules/
│       │   ├── analytics/
│       │   │   ├── analytics.service.ts
│       │   │   └── dto/
│       │   └── audit/                # Audit logging
│       │       ├── audit.service.ts
│       │       └── dto/
│       └── dto/
│
├── queues/                           # BullMQ job processors
│   ├── queues.module.ts              # Registers all queues & processors
│   │
│   ├── producers/                    # Job publishers (from monolith)
│   │   ├── ai-scoring.producer.ts    # Publish player scoring jobs
│   │   ├── video-analysis.producer.ts # Publish video analysis jobs
│   │   ├── media-moderation.producer.ts # Publish content moderation jobs
│   │   └── notification.producer.ts  # Publish FCM notification jobs
│   │
│   ├── consumers/                    # Job processors
│   │   ├── ai-scoring.processor.ts   # Process AI scoring (calls Python service)
│   │   ├── video-analysis.processor.ts
│   │   ├── media-moderation.processor.ts
│   │   └── notification.processor.ts # Send FCM notifications
│   │
│   └── dto/                          # Job payloads
│       ├── ai-scoring-job.dto.ts
│       └── video-analysis-job.dto.ts
│
├── integrations/                     # External service integrations
│   ├── ai/                           # AI microservices clients
│   │   ├── ai.module.ts
│   │   ├── player-scoring/           # Player AI scoring service
│   │   │   ├── player-scoring.client.ts # HTTP client to Python service
│   │   │   └── dto/
│   │   ├── video-analysis/           # Video skill analysis service
│   │   │   ├── video-analysis.client.ts
│   │   │   └── dto/
│   │   └── content-moderation/       # Media moderation service
│   │       ├── content-moderation.client.ts
│   │       └── dto/
│   │
│   ├── firebase/                     # FCM integration
│   │   ├── firebase.module.ts
│   │   ├── firebase.service.ts       # Send push notifications
│   │   └── dto/
│   │
│   ├── cloudflare/                   # CDN integration
│   │   ├── cloudflare.module.ts
│   │   ├── cloudflare.service.ts     # Upload videos/images
│   │   └── dto/
│   │
│   └── redis/                        # Redis cache service
│       ├── redis.module.ts
│       ├── redis.service.ts          # Caching layer
│       └── dto/
│
├── health/                           # Health checks & monitoring
│   ├── health.module.ts
│   └── health.controller.ts          # GET /health (DB, Redis, queues)
│
└── test/                             # E2E & integration tests
    ├── app.e2e-spec.ts
    └── fixtures/`

desired folder structure
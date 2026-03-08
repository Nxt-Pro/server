## Database Schema Design

### Base (everything extends this)

- id (ULID, PK)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Users (base user entity)

- email (VARCHAR, UNIQUE)
- phone (VARCHAR, NULL)
- password_hash (VARCHAR)
- role (ENUM: 'player', 'scout', 'admin') -- defines profile type
- last_active (TIMESTAMP)
- status (ENUM: 'active', 'suspended', 'banned')

**INDEX ON (email), (role, is_verified), (last_active)**
`INDEX ON (status, last_active) for admin user list`

### PlayerProfiles

- user_id (ULID, FK -> Users.id)
- full_name (VARCHAR)
- date_of_birth (DATE)
- position (VARCHAR)
- secondary_positions (VARCHAR[]) -- array of alternative positions
- height_cm (INTEGER)
- weight_kg (INTEGER)
- nationality (VARCHAR)
- city (VARCHAR)
- country (VARCHAR)
- bio (TEXT)
- profile_picture_url (VARCHAR)
- is_verified (BOOLEAN)
- basic_verified_at (TIMESTAMP, NULL)
- club_verified_at (TIMESTAMP, NULL)
- performance_verified_at (TIMESTAMP, NULL)
- availability_status (ENUM: 'available', 'trialing', 'contracted')
- club_name (VARCHAR)
- preferred_foot (ENUM: 'left', 'right', 'both')
- ai_score (DECIMAL) -- weekly refreshed AI scoring
- total_posts (INTEGER)
- total_likes (INTEGER)
- total_views (INTEGER)
- is_featured (BOOLEAN) -- hero section
- featured_until (TIMESTAMP) -- if currently featured
- profile_completeness (INTEGER) -- percentage

**INDEX ON (user_id), (is_verified, availability_status), (club_name), (city, country)**
`INDEX ON (position, availability_status, ai_score DESC) for find players feature`

### PlayerStats

- player_id (ULID, FK -> PlayerProfiles.id)
- matches_played (INTEGER)
- goals (INTEGER)
- assists (INTEGER)
- yellow_cards (INTEGER)
- red_cards (INTEGER)
- clean_sheets (INTEGER) -- for defenders/GKs
- avg_rating (DECIMAL)
- season_year (INTEGER)

**INDEX ON (player_id, season_year), (avg_rating)**

### CareerTimeline (player-specific)

- player_id (ULID, FK -> PlayerProfiles.id)
- title (VARCHAR) -- "Joined Club X", "Won Tournament Y"
- description (TEXT)
- start_date (DATE)
- end_date (DATE) -- NULL for current
- is_current (BOOLEAN)
- evidence_url (VARCHAR) -- optional proof

**INDEX ON (player_id), (start_date, is_current)**

### Achievements (player-specific)

- player_id (ULID, FK -> PlayerProfiles.id)
- title (VARCHAR)
- description (TEXT)
- year (INTEGER)
- competition_level (ENUM: 'local', 'regional', 'national', 'international')
- evidence_url (VARCHAR)
- verified (BOOLEAN)

**INDEX ON (player_id, year), (competition_level)**

### ScoutProfiles

- user_id (ULID, FK -> Users.id)
- full_name (VARCHAR)
- organization (VARCHAR)
- organization_type (ENUM: 'club', 'agency', 'independent')
- license_number (VARCHAR) -- professional credential
- scouting_positions (VARCHAR[]) -- positions they scout
- years_experience (INTEGER)
- countries_covered (VARCHAR[])
- bio (TEXT)
- profile_picture_url (VARCHAR)
- total_notes (INTEGER)
- verification_status (ENUM: 'pending', 'verified', 'rejected')
- verification_documents (JSONB) -- stored document references
- profile_completeness (INTEGER)

**INDEX ON (user_id), (verification_status), (organization_type)**

### ScoutNotes

- scout_id (ULID, FK -> ScoutProfiles.id)
- player_id (ULID, FK -> PlayerProfiles.id)
- title (VARCHAR)
- content (TEXT)
- is_private (BOOLEAN)

**INDEX ON (scout_id), (player_id), (scout_id, player_id)**

### Favorites

- user_id (ULID, FK -> Users.id)
- favorited_id (ULID) -- player or scout id
- favorited_type (ENUM: 'player', 'scout') -- for favorites filtering
  -- Unique constraint on (user_id, favorited_id)

**INDEX ON (user_id), (favorited_id, favorited_type)**

### Venues

name (VARCHAR)
address (VARCHAR)
city (VARCHAR)
country (VARCHAR)
capacity (INTEGER, NULL)
contact_phone (VARCHAR, NULL)
contact_email (VARCHAR, NULL)
images (VARCHAR[]) -- array of image URLs

**INDEX ON (city, country), (name)**

### Events [fix to match event datils later]

- title (VARCHAR)
- description (TEXT)
- event_type (ENUM: 'tournament', 'trial', 'workshop')
- status (ENUM: 'pending_approval', 'approved', 'rejected')
- venue_id (ULID, FK -> Venues.id)
- start_date (DATE)
- end_date (DATE)
- start_time (TIME)
- end_time (TIME, NULL)
- organizer_id (ULID) -- scout_id or admin_id
- organizer_type (ENUM: 'scout', 'admin')
- positions_targeted (VARCHAR[])
- max_participants (INTEGER, NULL)
- participant_count (INTEGER, default 0)
- cover_image_url (VARCHAR, NULL)
- registration_deadline (DATE, NULL)
- entry_fee (VARCHAR, NULL)
- schedule (JSONB, NULL) -- e.g., [{ day: 'Day 1', events: 'Group Stage' }, ...]
- prizes (JSONB, NULL) -- e.g., ['1st Place: 50,000 EGP + Trophy', ...]
- requirements (JSONB, NULL) -- e.g., ['Age: 16-21', 'Medical certificate', ...]
- approved_by (ULID, NULL, FK -> Users.id)
- approved_at (TIMESTAMP, NULL)

**INDEX ON (organizer_id), (status), (start_date), (city, country)**
`INDEX ON (status, start_date DESC) for admin event approval queue`
`INDEX ON (visibility, status, start_date DESC) for events discovery feed`

### EventRegistrations

- event_id (ULID, FK -> Events.id)
- player_id (ULID, FK -> PlayerProfiles.id)
- status (ENUM: 'pending', 'approved', 'rejected')
- registered_at (TIMESTAMP)
- cancelled (BOOLEAN) -- soft delete if player cancels
- attended (BOOLEAN, DEFAULT FALSE)
  -- Unique constraint on (event_id, player_id)

**INDEX ON (event_id), (player_id), (status)**
`INDEX ON (event_id, player_id) for duplicate registration prevention`
`INDEX ON (player_id, created_at DESC) for player's event history`

### Posts

- user_id (ULID, FK -> Users.id)
- caption (TEXT) -- for full-text search indexing
- is_highlight (BOOLEAN) -- for video highlights section
- engagement_score (DECIMAL) -- for trending ranking
- likes_count (INTEGER)
- comments_count (INTEGER)
- views_count (INTEGER)
- shares_count (INTEGER)
- visibility (ENUM: 'public', 'connections', 'private')
- is_reported (BOOLEAN) -- moderation flag

**INDEX ON (user_id), (visibility), (is_highlight), (engagement_score), (created_at), (user_id, created_at)**
`INDEX ON (visibility, engagement_score DESC, created_at DESC) for global trending/public feed`
`INDEX ON (visibility, is_highlight, created_at DESC) for highlighted reels`

### Attachments

- post_id (ULID, FK -> Posts.id)
- content_type (ENUM: image', 'video') -- for media handling
- url (VARCHAR)
- position (INT) -- to order media items

**INDEX ON (post_id, position)**

### Videos (extends Attachments)

- video_thumbnail_url (VARCHAR, NULL)
- video_duration (INTEGER, NULL) -- video length in seconds

**INDEX ON (id)**

### MediaModeration

- attachment_id (ULID, PK, FK → Attachments.id, ON DELETE CASCADE)
- status (ENUM: 'queued', 'processing', 'completed', 'failed', default 'queued')
- result (JSONB, NULL) -- e.g., { flagged: true, reasons: [...] }
- processed_at (TIMESTAMPTZ, NULL)
- failure_reason (TEXT, NULL)

**INDEX ON (attachment_id), (status)**

### VideoSkillAnalysis

- video_id (ULID, PK, FK → Videos.id, ON DELETE CASCADE)
- status (ENUM: 'queued', 'processing', 'completed', 'failed', default 'queued')
- ai_score (JSONB, NULL) -- e.g., { technical: 85, physical: 70 }
- analysis_version (VARCHAR(20), NULL) -- for model versions comparison
- processed_at (TIMESTAMPTZ, NULL)
- failure_reason (TEXT, NULL)

**INDEX ON (video_id), (status), (analysis_version)**

### Likes

- user_id (ULID, FK -> Users.id)
- post_id (ULID, FK -> Posts.id)
  -- Unique constraint on (user_id, post_id)

**INDEX ON (post_id), (user_id), (user_id, post_id)**

### Comments

- user_id (ULID, FK -> Users.id)
- post_id (ULID, FK -> Posts.id)
- parent_comment (ULID,FK -> Comments.id) -- for nested replies
- content (TEXT)
- is_reported (BOOLEAN) -- moderation flag

**INDEX ON (post_id, created_at DESC), (parent_comment), (user_id)**

### Bookmarks

- user_id (ULID, FK -> Users.id)
- post_id (ULID, FK -> Posts.id)
  -- Unique constraint on (user_id, post_id)

**INDEX ON (post_id), (user_id), (user_id, post_id)**

### Connections

- player_id (ULID, FK -> PlayerProfiles.id)
- scout_id (ULID, FK -> ScoutProfiles.id)
- status (ENUM: 'pending', 'accepted', 'rejected', 'blocked')
- initiated_by (ENUM: 'player', 'scout')
- requested_at (TIMESTAMP)
- responded_at (TIMESTAMP)
  -- Unique constraint on (player_id, scout_id)

**INDEX ON (player_id), (scout_id), (player_id, scout_id)**

### Chats

- scout_id (ULID, FK -> Users.id) -- scout who started (initiator)
- player_id (ULID, FK -> Users.id) -- player being messaged
- status (ENUM: 'active', 'archived', 'blocked')
- unread_count (INTEGER, DEFAULT 0) -- notification count badge
- last_message_at (TIMESTAMP)
- last_message_preview (TEXT)
  -- Unique constraint on (player_id, scout_id)

**INDEX ON (player_id), (scout_id), (player_id, scout_id), (last_message_at DESC)**

### Messages

- chat_id (ULID, FK -> Chats.id)
- sender_id (ULID, FK -> Users.id)
- content (TEXT)
- message_type (ENUM: 'text', 'image', 'file')
- attachment_url (VARCHAR)
- read_at (TIMESTAMP, NULL) -- if null -> not read

**INDEX ON (chat_id), (sender_id), (read_at), (chat_id, created_at DESC)**

### Reports

- reporter_id (ULID, FK -> Users.id)
- reported_user_id (ULID, FK -> Users.id)
- reportable_type (ENUM: 'post', 'comment', 'message', 'user') -- what kind of entity is being reported
- reportable_id (ULID, NULLABLE if reporting just the user) -- the specific
- report_type (ENUM: 'inappropriate_behavior', 'fake_profile', 'scam', 'spam', 'other')
- description (TEXT)
- status (ENUM: 'pending', 'investigating', 'resolved', 'dismissed')
- action_taken (ENUM: 'none', 'warning', 'content_removed', 'user_banned')
- admin_notes (TEXT)

**INDEX ON (reported_user_id), (reportable_type, reportable_id), (status)**

### Blocks

- blocker_id (ULID, FK -> Users.id)
- blocked_id (ULID, FK -> Users.id)
  -- Unique constraint on (blocker_id, blocked_id)

**INDEX ON (blocker_id), (blocked_id), (blocker_id, blocked_id)**

### Mutes (hide content without blocking)

- muter_id (ULID, FK -> Users.id)
- muted_id (ULID, FK -> Users.id)
  -- Unique constraint on (muter_id, muted_id)

**INDEX ON (muter_id), (muted_id), (muter_id, muted_id)**

### Notifications

- user_id (ULID, FK -> Users.id)
- title (VARCHAR)
- message (TEXT)
- type (ENUM: 'like', 'comment', 'message', 'connection_request', 'verification', 'marketing')
- reference_id (ULID) -- ID of related entity
- read_at (TIMESTAMP) -- if null -> not read

**INDEX ON (user_id), (read_at), (type)**
`INDEX ON (user_id, created_at DESC) for the notifications dropdown`

### AuditLog (tracks admin actions for accountability)

- admin_id (ULID, FK -> Users.id)
- action_type (ENUM: 'ban', 'unban', 'verify', 'reject_verification', 'delete_content', 'resolve_report')
- target_id (ULID)
- details (JSONB)
- ip_address (VARCHAR)

**INDEX ON (admin_id), (action_type), (target_id), (created_at), (created_at DESC)**

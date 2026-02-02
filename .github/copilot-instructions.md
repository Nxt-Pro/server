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

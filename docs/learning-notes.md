# NxtPro Developer Notes

Quick references to reproduce and extend the current implementation.

## Conventions

- Use `HttpError` helpers (`badRequest`, `unauthorized`, etc.) instead of Nest exceptions for controlled responses.
- Services/gateways use arrow functions to preserve `this` binding.
- All inputs flow through DTOs with `class-validator` decorators.
- TypeORM repositories for CRUD; transactions + pessimistic locks for contested writes.

## Chats

- Roles: scouts can start chats directly; players request chats with scouts.
- Entities: `chats.status` and `chat_participants.status` include `pending|active|archived|blocked` (default `pending`).
- Flow:
  - Scout starts chat → chat + participants created as `active`.
  - Player requests chat → chat + participants created as `pending`; event `chat.requested` notifies the scout.
  - Scout accepts via `PATCH /chat/:id/accept` → statuses set to `active`; event `chat.accepted` notifies the player.
  - Messages allowed only when chat status is `active`; `chat.message` event pushes real-time updates through `ChatsGateway` (`/chats` namespace, rooms `user:{id}`).

## Events & Registrations

- Events use `EventQueryDto` for list/ongoing queries; responses are paginated `{ data, total }`.
- Ongoing filter: `startDate <= now <= endDate` and `status = approved`.
- Create/update/delete restricted to organizer or admin; approve/reject is admin-only.
- Registrations live under `events/submodules/registrations/` and run inside transactions with pessimistic locks:
  - Duplicate check ignores cancelled rows (`cancelled = false`).
  - Participant count increments/decrements atomically; double-cancel is a no-op.
  - Admin-only updates; players can cancel their own registration.

## Venues

- Admin-only create/update/delete.
- List uses `VenueQueryDto` and returns `{ data, total }` with optional search/city/country filters.

## Notifications

- HTTP endpoints secured via `CurrentUser`; use `HttpError` for auth failures.
- `NotificationsService` listens to `notification.create`, stores DB rows, then sends FCM multicast via `FirebaseService` (under `src/integrations/firebase`).
- Device tokens stored on `User.fcmTokens`; helpers ensure uniqueness and allow removal.

## Firebase Integration

- Located at `src/integrations/firebase/`; global module exports `FirebaseService`.
- Initializes Admin SDK from env vars (`FIREBASE_*`), replacing `\n` in private keys.

## Migrations

- New migration adds `pending` to chat/chat_participant status enums and sets default `pending` (`1770013715785-1770000000002-AddPendingStatusToChatEnums`).
- Commands:
  - Create empty: `npm run migration:create -- <Name>`
  - Generate from entities: `npm run migration:generate -- <Name>`
  - Run: `npm run migration:run`
  - Revert: `npm run migration:revert`

## Testing & Linting

- Lint: `npm run lint`
- Unit tests: `npm test -- --runInBand`
- E2E tests: `npm run test:e2e -- --runInBand`

## Helpful Patterns

- Pagination: use `getManyAndCount()` and return `{ data, total }`.
- Authorization: fetch requester, check role (`admin` or owner) before mutating data.
- Transactions + locks: use `manager.findOne` with `pessimistic_write` and `setLock('pessimistic_read')` to prevent race conditions on counts/duplicates.
- WebSockets: join clients to `user:{id}` rooms; emit events via `EventEmitter2` to decouple triggers from delivery.

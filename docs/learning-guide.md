# NxtPro Walkthrough (Step-by-Step)

Use this as a hands-on cheat sheet to understand and reproduce the current code patterns. Everything here is NestJS + TypeORM + Jest.

## Key Syntax and Concepts

- **HttpError helper**: Centralized errors from `common/utils/http-error.util`. Use e.g. `throw HttpError.badRequest('message')` instead of Nest exceptions so responses stay consistent.
- **DTOs + Validation**: Every request body/query uses a DTO with `class-validator` decorators. Example:
  ```ts
  export class StartChatDto {
    @ValidateIf(o => !o.scoutId)
    @IsString()
    @IsNotEmpty()
    playerId?: string;
  }
  ```
  Rules: optional fields guarded by `ValidateIf`, types by `@IsString`, etc.
- **Services/gateways use arrow methods**: `method = async (...) => {}` keeps `this` bound correctly when passed around (especially to gateways or event listeners).
- **TypeORM basics**:
  - Simple CRUD: `repository.findOne`, `save`, `remove`.
  - QueryBuilder for filters/pagination: `repo.createQueryBuilder('alias').andWhere(...).skip(offset).take(limit).getManyAndCount()`.
  - Transactions with locks (race-free counters): `manager.findOne(Entity, { lock: { mode: 'pessimistic_write' } })` then update counts inside the transaction.

## Feature Logic (what happens)

- **Chats**
  - Roles: scouts can start immediately; players can only request a chat with a scout.
  - New chat status enum: `pending | active | archived | blocked` (default `pending`).
  - Flow: player request emits `chat.requested`; scout accepts via `PATCH /chat/:id/accept` -> status becomes `active`; messages allowed only when `active`; events `chat.message` broadcast via `ChatsGateway` on `/chats` namespace (rooms `user:{id}`).
- **Events**
  - Listing uses `EventQueryDto`; returns `{ data, total }` (pagination friendly).
  - Ongoing filter: `startDate <= now <= endDate` and `status = approved`.
  - Authorization: organizer or admin can update/delete; only admin can approve.
  - Note: registration endpoints live in the `events/submodules/registrations` submodule.
- **Registrations**
  - Transaction + pessimistic locks prevent double-booking.
  - Duplicate check ignores cancelled rows (`cancelled = false`).
  - Double-cancel is ignored; participantCount decrements only once.
  - Admin-only updates; players can cancel their own registration.
- **Venues**
  - Admin-only create/update/delete; uses `VenueQueryDto`; list returns `{ data, total }`.
- **Notifications**
  - HTTP endpoints guard with `CurrentUser`; use `HttpError` for auth failures.
  - `NotificationsService` listens to `notification.create`, saves DB row, then sends FCM via `FirebaseService`.
  - Firebase lives under `src/integrations/firebase`; tokens stored on `User.fcmTokens`.

## Real-Time (WebSockets)

- Gateway: `@WebSocketGateway({ namespace: '/chats', cors: true })`.
- Clients join room `user:{id}` in `handleConnection` using `handshake.auth.userId` (or query).
- Events emitted via `EventEmitter2`:
  - `chat.requested` -> scout gets a request notification.
  - `chat.accepted` -> player notified chat is active.
  - `chat.message` -> recipient gets the message payload.

## Migrations

- Migration added: `1770013715785-1770000000002-AddPendingStatusToChatEnums` updates chat status enums to include `pending` and sets default.
- Commands:
  - Run: `npm run migration:run`
  - Revert latest: `npm run migration:revert`
  - Generate from entities: `npm run migration:generate -- <Name>`
  - Create empty: `npm run migration:create -- <Name>`

## Testing and Linting

- Lint: `npm run lint`
- Unit tests: `npm test -- --runInBand`
- E2E tests: `npm run test:e2e -- --runInBand`

## Reproducing Patterns

1. **Add a validated DTO** for any input.
2. **Fetch requester**, verify role/ownership, and throw `HttpError` on violation.
3. **Wrap contested writes** in a transaction with pessimistic locks.
4. **Emit events** (via `EventEmitter2`) instead of calling gateways directly; gateways listen with `@OnEvent` and push over WebSocket rooms.
5. **Return paginated data** as `{ data, total }` using `getManyAndCount()`.

## Helpful Examples

- Pagination snippet:
  ```ts
  const [data, total] = await qb
    .skip(offset ?? 0)
    .take(limit ?? 20)
    .getManyAndCount();
  return { data, total };
  ```
- Authorization check:
  ```ts
  const user = await this.getUserOrThrow(userId);
  if (user.role !== 'admin') throw HttpError.forbidden('Admins only');
  ```
- Transaction with lock:
  ```ts
  return this.repo.manager.transaction(async manager => {
    const row = await manager.findOne(Entity, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row) throw HttpError.notFound('Missing');
    // mutate & save
    return manager.save(row);
  });
  ```

Use this doc as a map while you read the code. Each section points to patterns already implemented in the repo, so you can mirror them for new features.

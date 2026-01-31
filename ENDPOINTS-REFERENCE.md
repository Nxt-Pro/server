# Quick Reference: Events & Venues API

## 13 Endpoints at a Glance

### Events (8 Endpoints)
```
CREATE EVENT
┌─────────────────────────────────────────────────────────┐
│ POST /api/events                                        │
├─────────────────────────────────────────────────────────┤
│ Body: {                                                  │
│   title: string                                         │
│   description: string                                   │
│   eventType: 'tournament' | 'trial' | 'workshop'       │
│   startDate: ISO string                                │
│   endDate: ISO string                                  │
│   startTime: '10:00:00'                               │
│   venueId?: string                                     │
│ }                                                       │
│                                                         │
│ Returns: Event { id, title, status, organizer, ... }  │
│ Status: 201 Created                                    │
└─────────────────────────────────────────────────────────┘

GET ONGOING EVENTS (Approved, Future Dates)
┌─────────────────────────────────────────────────────────┐
│ GET /api/events/ongoing?limit=10                        │
├─────────────────────────────────────────────────────────┤
│ Query: ?limit=10 (default)                              │
│                                                         │
│ Returns: Event[] sorted by startDate ASC               │
│ Status: 200 OK                                         │
│                                                         │
│ Example Response:                                       │
│ [                                                       │
│   {                                                     │
│     id: "01KG9GH8MY3QF8GGERY2H0QYAT",                 │
│     title: "Football Tournament",                      │
│     status: "approved",                                │
│     startDate: "2026-02-15T10:00:00Z",                │
│     participantCount: 25,                             │
│     maxParticipants: 50,                              │
│     venue: { id: "...", name: "Stadium A" }           │
│   }                                                     │
│ ]                                                       │
└─────────────────────────────────────────────────────────┘

GET ALL EVENTS (With Filters & Pagination)
┌─────────────────────────────────────────────────────────┐
│ GET /api/events                                         │
├─────────────────────────────────────────────────────────┤
│ Query:                                                  │
│   ?eventType=tournament                                │
│   &status=approved                                     │
│   &search=football                                     │
│   &city=Cairo                                          │
│   &country=Egypt                                       │
│   &limit=20 (default)                                  │
│   &offset=0                                            │
│                                                         │
│ Returns: Event[]                                        │
│ Status: 200 OK                                         │
└─────────────────────────────────────────────────────────┘

GET EVENT BY ID
┌─────────────────────────────────────────────────────────┐
│ GET /api/events/:id                                     │
├─────────────────────────────────────────────────────────┤
│ Returns: Event with all relations                       │
│ Status: 200 OK or 404 Not Found                        │
└─────────────────────────────────────────────────────────┘

UPDATE EVENT
┌─────────────────────────────────────────────────────────┐
│ PATCH /api/events/:id                                   │
├─────────────────────────────────────────────────────────┤
│ Auth: Event organizer only                              │
│ Body: Partial<CreateEventDto>                           │
│                                                         │
│ Returns: Updated Event                                  │
│ Status: 200 OK                                         │
│ Errors: 403 Forbidden (not organizer)                  │
│         404 Not Found                                  │
└─────────────────────────────────────────────────────────┘

DELETE EVENT
┌─────────────────────────────────────────────────────────┐
│ DELETE /api/events/:id                                  │
├─────────────────────────────────────────────────────────┤
│ Auth: Event organizer only                              │
│ Returns: { success: true }                              │
│ Status: 200 OK                                         │
│ Errors: 403 Forbidden                                  │
│         404 Not Found                                  │
└─────────────────────────────────────────────────────────┘

APPROVE/REJECT EVENT
┌─────────────────────────────────────────────────────────┐
│ POST /api/events/:id/approve                            │
├─────────────────────────────────────────────────────────┤
│ Auth: Admin only ⚠️ (NOT ENFORCED - BUG)              │
│ Body: {                                                 │
│   approve: boolean,                                    │
│   rejectionReason?: string                             │
│ }                                                       │
│                                                         │
│ Returns: Event with status = 'approved' | 'rejected'   │
│ Status: 200 OK                                         │
│ Errors: 403 Forbidden (not admin) ⚠️                  │
│         404 Not Found                                  │
│         400 Bad Request (not pending_approval)         │
└─────────────────────────────────────────────────────────┘

REGISTER FOR EVENT
┌─────────────────────────────────────────────────────────┐
│ POST /api/events/:id/register                           │
├─────────────────────────────────────────────────────────┤
│ Auth: Player (x-user-id header)                         │
│ Body: {} (empty)                                        │
│                                                         │
│ Returns: EventRegistration {                            │
│   id, event_id, player_id, status: 'pending'           │
│ }                                                       │
│                                                         │
│ Status: 201 Created                                    │
│ Errors:                                                │
│   400 Bad Request - Event not approved                 │
│                  - Event is full                       │
│                  - Already registered ✓ WORKS         │
│                  - Registration deadline passed        │
│   404 Not Found - Event not found                      │
└─────────────────────────────────────────────────────────┘
```

### Additional Event Endpoints (in controller)
```
GET /api/events/:id/registrations    ← List all registrations for event
PATCH /api/events/registrations/:id  ← Update registration status
DELETE /api/events/registrations/:id ← Cancel registration
```

### Venues (5 Endpoints)
```
CREATE VENUE
┌─────────────────────────────────────────────────────────┐
│ POST /api/venues                                        │
├─────────────────────────────────────────────────────────┤
│ Body: {                                                 │
│   name: string (required)                              │
│   address: string (required)                           │
│   city?: string                                        │
│   country?: string                                     │
│   capacity?: number                                    │
│   contact_phone?: string                               │
│   contact_email?: string                               │
│   images?: string[]                                    │
│ }                                                       │
│                                                         │
│ Returns: Venue object                                   │
│ Status: 201 Created                                    │
└─────────────────────────────────────────────────────────┘

GET ALL VENUES (With Filters)
┌─────────────────────────────────────────────────────────┐
│ GET /api/venues                                         │
├─────────────────────────────────────────────────────────┤
│ Query:                                                  │
│   ?search=stadium                                      │
│   &city=Cairo                                          │
│   &country=Egypt                                       │
│   &limit=20                                            │
│   &offset=0                                            │
│                                                         │
│ Returns: Venue[] with pagination                       │
│ Status: 200 OK                                         │
└─────────────────────────────────────────────────────────┘

GET VENUE BY ID
┌─────────────────────────────────────────────────────────┐
│ GET /api/venues/:id                                     │
├─────────────────────────────────────────────────────────┤
│ Returns: Venue with events array                        │
│ Status: 200 OK or 404 Not Found                        │
└─────────────────────────────────────────────────────────┘

UPDATE VENUE
┌─────────────────────────────────────────────────────────┐
│ PATCH /api/venues/:id                                   │
├─────────────────────────────────────────────────────────┤
│ Auth: None ⚠️ (should be admin)                        │
│ Body: Partial<CreateVenueDto>                           │
│                                                         │
│ Returns: Updated Venue                                  │
│ Status: 200 OK                                         │
└─────────────────────────────────────────────────────────┘

DELETE VENUE
┌─────────────────────────────────────────────────────────┐
│ DELETE /api/venues/:id                                  │
├─────────────────────────────────────────────────────────┤
│ Auth: None ⚠️ (should be admin)                        │
│ Returns: { success: true }                              │
│ Status: 200 OK                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Exception Handling Map

```
HTTP Status   Exception                 When Thrown          Example
──────────────────────────────────────────────────────────────────────────
400           BadRequestException       • Event not approved
                                       • Event is full
                                       • Already registered ✓
                                       • Deadline passed
                                       • Invalid state

403           ForbiddenException        • Not the organizer
                                       • Not the registered player
                                       • Not admin ⚠️ (not checked)

404           NotFoundException         • Event not found
                                       • Registration not found
                                       • Venue not found
```

---

## Test Coverage Summary

```
EventsService Tests: 5/5 passing ✓

✓ creates event with defaults
  - Organizer set correctly
  - Status = 'pending_approval'
  - participantCount = 0

✓ gets ongoing events ordered
  - Filters: status='approved', startDate >= NOW
  - Orders: by startDate ASC
  - Limits: to specified count

✓ prevents non-approved registration
  - BadRequestException thrown
  - When event.status != 'approved'

✓ registers player and increments
  - Creates EventRegistration
  - Calls increment() for safety
  - Returns saved registration

✓ throws when registration not found
  - NotFoundException on update

VenuesService Tests: 3/3 passing ✓

✓ creates venue
✓ filters with pagination
✓ throws not found error

Total: 8 tests, 0 failures
```

---

## Authorization Matrix

```
Endpoint                          Required Role      Status
─────────────────────────────────────────────────────────────
POST /api/events                  Scout/Admin        ⚠️ NOT ENFORCED
GET /api/events/ongoing           Public             ✓
GET /api/events                   Public             ✓
GET /api/events/:id               Public             ✓
PATCH /api/events/:id             Event Organizer    ✓
DELETE /api/events/:id            Event Organizer    ✓
POST /api/events/:id/approve      Admin              ⚠️ NOT ENFORCED
POST /api/events/:id/register     Player             ✓

POST /api/venues                  Public             ⚠️ SHOULD BE ADMIN
GET /api/venues                   Public             ✓
GET /api/venues/:id               Public             ✓
PATCH /api/venues/:id             Public             ⚠️ SHOULD BE ADMIN
DELETE /api/venues/:id            Public             ⚠️ SHOULD BE ADMIN
```

---

## Database Optimization

### Indexes Created
```sql
idx_events_organizer_id              -- Search by organizer
idx_events_start_date                -- Filter by date range
idx_events_status_start_date_desc    -- Composite: status + date

idx_venues_city_country              -- Location filtering
idx_venues_name                      -- Full-text search
```

### Query Strategy
```
❌ DON'T:  Load event with relations, modify, save
          ↓ Causes relation nullification bug

✓ DO:     Use increment() for counters
          Use query builder for conditional updates
          Use GREATEST() to prevent negatives
          Load without relations when modifying
```

---

## Concurrent Operation Handling

### Race Condition: Simultaneous Registrations

```
Scenario: 2 players try to register at the same time

Time    Without increment()           With increment()
─────   ─────────────────────────    ──────────────────
T0      Load event (count=0)          Load event (count=0)
T1      Load event (count=0)          Load event (count=0)
T2      Set count=1, save             UPDATE count+1 (atomic)
T3      Set count=1, save             UPDATE count+1 (atomic)
Result: ❌ Count=1 (should be 2)     ✓ Count=2 (correct)
        Bug: Lost update              Fixed with atomic increment
```

### Safeguards Implemented

1. **Duplicate Check**: Query builder with UNIQUE constraint
2. **Atomic Increment**: `increment(field, value)` at DB level
3. **Safe Decrement**: `GREATEST(count-1, 0)` prevents negatives
4. **Capacity Check**: Verify before registration
5. **Deadline Check**: Verify before accepting registration

---

## Type Safety Improvements

```typescript
// ❌ Before
const venue: any = ...
event.venue = venue as any  // Unsafe

// ✅ After
const venue: Venue = ...
event.venue = { id: dto.venueId } as Venue  // Type-safe

// ❌ Before
findOne({ where: { id: Equal(id) } })  // Extra complexity

// ✅ After
findOne({ where: { id: eventId } })  // Direct value, same safety
```

---

## Code Patterns Used

### Safe Relationship Updates
```typescript
// Pattern: Load + Assign ID, don't load full relation
event.venue = { id: dto.venueId } as Venue;  // Safe
await this.eventRepository.save(event);      // Won't null other fields

// vs.

// Anti-pattern: Load full relation
event.venue = await this.venueRepository.findOne(dto.venueId);
await this.eventRepository.save(event);  // Might cause sync issues
```

### Atomic Counters
```typescript
// Pattern: Use database-level increment
await this.eventRepository.increment({ id }, 'participantCount', 1);

// vs.

// Anti-pattern: Load-modify-save
event.participantCount++;
await this.eventRepository.save(event);  // Race condition!
```

### Safe Deletions
```typescript
// Pattern: Use query builder with GREATEST
await this.eventRepository
  .createQueryBuilder()
  .update(Event)
  .set({ participantCount: () => 'GREATEST(participant_count - 1, 0)' })
  .execute();

// vs.

// Anti-pattern: Direct assignment
event.participantCount = Math.max(event.participantCount - 1, 0);
await this.eventRepository.save(event);  // Not atomic
```


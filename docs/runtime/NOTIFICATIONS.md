# Notifications Runtime

NxtPro notification delivery is routed through `NotificationsService` and the
`notification.create` event. Feature modules emit delivery intent; the central
service owns user preferences, in-app persistence, realtime fanout, Firebase
push, generic notification email, safe logging, self-notification suppression,
and best-effort failure handling.

## Channels

- In-app: creates a row in `notifications`, emits `notification.created`, and is
  visible from `GET /api/notifications`.
- Realtime: `ChatsGateway` sends `notification:new` to the authenticated
  `user:{id}` room after the in-app row is created.
- Push: Firebase multicast is attempted only after an in-app notification is
  allowed and saved. Invalid/dead FCM tokens are removed from the user.
- Email: notification emails use a concise generic template from `MailService`
  and are sent only when the payload includes `email.to` and preferences allow
  it. Auth/security emails such as password reset remain direct mail flows.

## Preferences

- `inAppNotifications`: gates in-app rows, realtime, and push.
- `emailNotifications`: gates notification email.
- `chatRequests`: chat request and chat declined notifications.
- `chatMessages`: new chat message notifications.
- `chatAccepted`: accepted chat request notifications.
- `connections`: connection request, accepted, and rejected notifications.
- `postEngagement`: post like/comment/share notifications.
- `eventUpdates`: event approval/update/cancel and registration notifications.
- `verificationUpdates`: verification, report status, and admin account status
  notifications.

`skill_score` currently uses only the global in-app/push preference because
there is no dedicated skill-score preference field.

## Types And References

Canonical types include `chat_request`, `chat_message`, `chat_accepted`,
`connection_request`, `connection_accepted`, `connection_rejected`,
`post_like`, `post_comment`, `post_share`, `event_created`, `event_updated`,
`event_registration`, `verification_status`, `skill_score`, `report_status`,
`admin_action`, and `system`. Legacy rows using `like`, `comment`, `message`,
`verification`, `marketing`, and `new_event` remain supported by the client.

Payloads may include:

- `referenceId`: stable target id for navigation.
- `referenceType`: `post`, `chat`, `profile`, `event`, `report`,
  `skill_score_job`, `connection`, `user`, or `system`.
- `data`: safe scalar metadata. `dedupeKey` is stored here when supplied.

## Dedupe Policy

`NotificationsService` suppresses duplicate delivery when a payload includes a
`dedupeKey` and an existing notification for the same user, type, reference id,
and key already exists. Retry-prone flows use keys for AI skill job
completion/failure, chat request/accept/reject, connection request/status,
event registration/status/cancel, verification/admin/report status, and post
engagement.

No distributed lock is used; the guard is intentionally simple and practical
for normal API retries and worker retries.

## Email Config

Local and Docker can run without SMTP. Missing mail config disables
notification emails safely and logs a warning; notification send failures never
break the primary user action. In strict production-like validation
(`NODE_ENV=production` or `STRICT_EXTERNAL_CONFIG_VALIDATION=true`), SMTP config
is required by the existing external integration validation.

Do not log SMTP secrets. The runtime only logs notification type/user context
and provider errors.

## Firebase Push Config

Local and Docker can run without Firebase Admin credentials. Missing Firebase
config logs a warning and push sends are skipped. Set
`PUSH_NOTIFICATIONS_ENABLED=true` only when real push delivery is expected; in
strict validation mode that flag requires `FIREBASE_PROJECT_ID`,
`FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

Push payloads contain only title/body and safe scalar data. Provider failures do
not break the primary action.

## API Smoke Coverage

`infrastructure/scripts/api-smoke.mjs` verifies:

- notification list and unread count;
- mark-one-read and mark-all-read;
- a real post-comment notification from seeded scout to seeded player;
- sender does not receive a self-notification;
- disabling `postEngagement` suppresses a second post-comment notification.

The smoke does not rely on live Firebase or SMTP.

## Manual Device Checks Still Required

- Android/iOS physical-device push receipt.
- Notification tap navigation.
- Push received while app is backgrounded or killed.
- Chat realtime notification behavior with two devices.
- Account switching after receiving notifications.
- Real SMTP receipt through the configured provider.

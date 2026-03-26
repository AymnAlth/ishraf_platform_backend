# خريطة الـ Endpoints لتطبيق السائق

## Auth

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | تسجيل دخول السائق | login screen | `driver` | لا | `identifier`, `password` | `user`, `tokens` | handle `401/403/429` | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/refresh` | refresh session | auth client | `driver` | لا | `refreshToken` | token pair جديد | retry once | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/logout` | logout | profile/logout | `driver` | لا | `refreshToken` | success | clear local session | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `GET /auth/me` | current user | app bootstrap | `driver` | Bearer | none | current user | confirms role | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/change-password` | change password | password screen | `driver` | Bearer | `currentPassword`, `newPassword` | success | relogin likely needed | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/forgot-password` | start reset | forgot password | عام | لا | `identifier` | success | no token assumption in staging | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/reset-password` | complete reset | reset password | عام | لا | `token`, `newPassword` | success | build full UI flow | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |

## Transport

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /transport/route-assignments/me` | list my recurring route assignments | day bootstrap / route picker | `driver` | Bearer | none | route assignments list | start here before any daily trip action | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips/ensure-daily` | create or reuse daily trip | start-of-day flow | `driver` | Bearer | `routeAssignmentId`, `tripDate`, `tripType` | `created`, `trip` | preferred daily flow; use instead of `POST /transport/trips` | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/trips` | list trips | trips list | `driver` | Bearer | pagination + filters + sort | `items`, `pagination` | backend scopes to driver-owned trips | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/trips/:id` | trip detail | trip detail | `driver` | Bearer | path `id` | `trip`, `latestLocation`, `routeStops`, `eventSummary` | source of truth for detail screen | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/trips/:id/students` | trip roster | trip roster / student picker | `driver` | Bearer | path `id`, optional `search`, `stopId` | `tripId`, `tripStatus`, `students[]` | source of truth for trip students; includes stop coordinates and optional approved home location; do not derive roster from events | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips/:id/start` | start trip | trip action | `driver` | Bearer | path `id` | updated trip state | only valid from `scheduled` | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips/:id/end` | end trip | trip action | `driver` | Bearer | path `id` | updated trip state | only valid from `started` | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips/:id/locations` | post location | tracking screen | `driver` | Bearer | `latitude`, `longitude` | created location | rejected after trip end | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips/:id/events` | create student event | event form | `driver` | Bearer | `studentId`, `eventType`, `stopId?`, `notes?` | created event | `stopId` rules تختلف حسب event type; backend now validates against assignment coverage on the trip date | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/trips/:id/events` | list trip events | trip events tab | `driver` | Bearer | path `id` | events list | useful for timeline/history | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |

## Reporting

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /reporting/transport/summary` | active transport summary | summary screen | `driver` | Bearer | none | `activeTrips[]` with latest location and last student events | driver-scoped in Wave 1 | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |

## Communication

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /communication/recipients` | available recipients | compose/new message | `driver` | Bearer | `page`, `limit`, `search?`, `role?` | `items`, `pagination` | use this endpoint to choose `receiverUserId`; do not rely on manual IDs | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `POST /communication/messages` | send message | compose/conversation | `driver` | Bearer | `receiverUserId`, `messageBody` | created message | any active user | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/inbox` | inbox | inbox | `driver` | Bearer | pagination, `isRead?`, sort | `items`, `pagination`, `unreadCount` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/sent` | sent | sent | `driver` | Bearer | pagination, `receiverUserId?`, sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/conversations/:otherUserId` | conversation | conversation | `driver` | Bearer | path `otherUserId`, pagination | `items`, `pagination` | ascending chronology | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/messages/:messageId/read` | mark message read | inbox/conversation | `driver` | Bearer | path `messageId` | updated state | receiver only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/notifications/me` | my notifications | notifications center | `driver` | Bearer | pagination, `isRead?`, `notificationType?` | `items`, `pagination`, `unreadCount` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/notifications/:notificationId/read` | mark notification read | notifications center | `driver` | Bearer | path `notificationId` | updated state | owner only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/announcements/active` | active announcements | announcements feed | `driver` | Bearer | none | active announcements | role-filtered | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |

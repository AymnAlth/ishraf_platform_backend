# خريطة الـ Endpoints لتطبيق ولي الأمر

## Auth

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | تسجيل دخول ولي الأمر | login screen | `parent` | لا | `identifier`, `password` | `user`, `tokens` | handle `401/403/429` | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/refresh` | refresh session | auth client | `parent` | لا | `refreshToken` | token pair جديد | retry once | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/logout` | logout | profile/logout | `parent` | لا | `refreshToken` | success | clear local session | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `GET /auth/me` | current user | app bootstrap | `parent` | Bearer | none | current user | confirms role | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/change-password` | change password | password screen | `parent` | Bearer | `currentPassword`, `newPassword` | success | relogin likely needed | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/forgot-password` | start reset | forgot password | عام | لا | `identifier` | success | no token assumption in staging | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/reset-password` | complete reset | reset password | عام | لا | `token`, `newPassword` | success | build full UI flow | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |

## Reporting

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /reporting/dashboards/parent/me` | parent dashboard | home screen | `parent` | Bearer | none | `parent`, `children[]`, `latestNotifications[]`, `unreadNotifications` | primary landing endpoint | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/dashboards/parent/me/students/:studentId/profile` | child profile | child profile tab | `parent` | Bearer | path `studentId` | `student`, `parents`, `attendanceSummary`, `behaviorSummary`, `assessmentSummary` | parent-owned only | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary` | child attendance summary | child reports | `parent` | Bearer | path `studentId` | `student`, `attendanceSummary` | parent-owned only | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary` | child assessment summary | child reports | `parent` | Bearer | path `studentId` | `student`, `assessmentSummary.subjects[]` | parent-owned only; no `items[]` | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary` | child behavior summary | child reports | `parent` | Bearer | path `studentId` | `student`, `behaviorSummary` | parent-owned only; no behavior timeline here | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/transport/parent/me/students/:studentId/live-status` | child transport live status | transport tab | `parent` | Bearer | path `studentId` | active trip/live status payload | parent-owned only, no ETA in Wave 1 | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |

## Homework

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /homework/students/:studentId` | child homework list | homework tab | `parent` | Bearer | path `studentId` | `student`, `items` | parent-owned only; non-paginated | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |

## Communication

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /communication/recipients` | available recipients | compose/new message | `parent` | Bearer | `page`, `limit`, `search?`, `role?` | `items`, `pagination` | use this endpoint to choose `receiverUserId` instead of manual IDs | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `POST /communication/messages` | send message | compose/conversation | `parent` | Bearer | `receiverUserId`, `messageBody` | created message | any active user | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/inbox` | inbox | inbox | `parent` | Bearer | pagination, `isRead?`, sort | `items`, `pagination`, `unreadCount` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/sent` | sent | sent | `parent` | Bearer | pagination, `receiverUserId?`, sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/conversations/:otherUserId` | conversation | conversation | `parent` | Bearer | path `otherUserId`, pagination | `items`, `pagination` | chronology ascending by default | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/messages/:messageId/read` | mark message read | inbox/conversation | `parent` | Bearer | path `messageId` | updated state | receiver only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/notifications/me` | my notifications | notifications center | `parent` | Bearer | pagination, `isRead?`, `notificationType?` | `items`, `pagination`, `unreadCount` | includes automation notifications from attendance/behavior/transport | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/notifications/:notificationId/read` | mark notification read | notifications center | `parent` | Bearer | path `notificationId` | updated notification | owner only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/announcements/active` | active announcements | announcements feed | `parent` | Bearer | none | active announcements | role-filtered feed | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |

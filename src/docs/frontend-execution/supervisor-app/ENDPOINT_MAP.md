# خريطة الـ Endpoints لتطبيق المشرف

## Auth

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | تسجيل دخول المشرف | login screen | `supervisor` | لا | `identifier`, `password` | `user`, `tokens` | handle `401/403/429` | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/refresh` | refresh session | auth client | `supervisor` | لا | `refreshToken` | token pair جديد | retry once | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/logout` | logout | profile/logout | `supervisor` | لا | `refreshToken` | success | clear local session | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `GET /auth/me` | current user | app bootstrap | `supervisor` | Bearer | none | current user | confirms role | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/change-password` | change password | password screen | `supervisor` | Bearer | `currentPassword`, `newPassword` | success | relogin likely needed | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/forgot-password` | start reset | forgot password | عام | لا | `identifier` | success | no token assumption in staging | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/reset-password` | complete reset | reset password | عام | لا | `token`, `newPassword` | success | build full UI flow | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |

## Reporting

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /reporting/dashboards/supervisor/me` | supervisor dashboard | home screen | `supervisor` | Bearer | none | dashboard payload for assigned classes/students | primary landing endpoint | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/students/:studentId/profile` | student profile | student detail | `supervisor` | Bearer | path `studentId` | `student`, `parents`, `attendanceSummary`, `behaviorSummary`, `assessmentSummary` | scope-limited; same `studentId` as `/students/:id` | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/students/:studentId/reports/attendance-summary` | attendance summary | reports tab | `supervisor` | Bearer | path `studentId` | `student`, `attendanceSummary` | scope-limited; `200` zero-safe on empty data | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/students/:studentId/reports/assessment-summary` | assessment summary | reports tab | `supervisor` | Bearer | path `studentId` | `student`, `assessmentSummary.subjects[]` | scope-limited; no `items[]` | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/students/:studentId/reports/behavior-summary` | behavior summary | reports tab | `supervisor` | Bearer | path `studentId` | `student`, `behaviorSummary` | scope-limited; use student behavior records endpoint for detailed timeline | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |

## Behavior

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /behavior/categories` | read categories | create/edit record | `supervisor` | Bearer | none | categories list | read-only categories; no `behaviorType` filter in v1 | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `POST /behavior/records` | create behavior record | create form | `supervisor` | Bearer | `studentId`, `behaviorCategoryId`, `academicYearId`, `semesterId`, `behaviorDate`, `description?`, `severity?` | created record | scope-limited; do not send `teacherId/supervisorId` | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `GET /behavior/records` | list behavior records | records list | `supervisor` | Bearer | pagination + filters + sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `GET /behavior/records/:id` | behavior record detail | detail screen | `supervisor` | Bearer | path `id` | record detail | edit source | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `PATCH /behavior/records/:id` | update record | edit form | `supervisor` | Bearer | editable fields | updated record | scope-limited | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `GET /behavior/students/:studentId/records` | student behavior timeline | student detail | `supervisor` | Bearer | path `studentId` | `student`, `summary`, `records` | non-paginated; detailed companion for behavior summary | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |

## Attendance

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /attendance/sessions` | list sessions | sessions list | `supervisor` | Bearer | pagination + filters + sort | `items`, `pagination` | supervisor read/update only; no root `/attendance` endpoint | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `GET /attendance/sessions/:id` | session detail | session detail | `supervisor` | Bearer | path `id` | session + roster | read-only session body | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `PATCH /attendance/records/:attendanceId` | update one record | attendance correction | `supervisor` | Bearer | `status`, `notes?` | updated record | no create session privilege | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |

## Communication

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /communication/recipients` | available recipients | compose/new message | `supervisor` | Bearer | `page`, `limit`, `search?`, `role?` | `items`, `pagination` | use this endpoint to choose `receiverUserId` instead of manual IDs | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `POST /communication/messages` | send message | compose/conversation | `supervisor` | Bearer | `receiverUserId`, `messageBody` | created message | any active user | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/inbox` | inbox | inbox | `supervisor` | Bearer | pagination, `isRead?`, sort | `items`, `pagination`, `unreadCount` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/sent` | sent | sent | `supervisor` | Bearer | pagination, `receiverUserId?`, sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/conversations/:otherUserId` | conversation | conversation | `supervisor` | Bearer | path `otherUserId`, pagination | `items`, `pagination` | ascending chronology | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/messages/:messageId/read` | mark message read | inbox/conversation | `supervisor` | Bearer | path `messageId` | updated state | receiver only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/notifications/me` | my notifications | notifications | `supervisor` | Bearer | pagination, `isRead?`, `notificationType?` | `items`, `pagination`, `unreadCount` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/notifications/:notificationId/read` | mark notification read | notifications | `supervisor` | Bearer | path `notificationId` | updated state | owner only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/announcements/active` | active announcements | announcements feed | `supervisor` | Bearer | none | active announcements | role-filtered | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |

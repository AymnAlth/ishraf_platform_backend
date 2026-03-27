# خريطة الـ Endpoints للوحة الإدارة

## Auth

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | login | شاشة الدخول | `admin` | لا | `identifier`, `password` | `user`, `tokens` | عالج `401/403/429` | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/refresh` | refresh session | auth client | `admin` | لا | `refreshToken` | token pair جديد | retry once only | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/logout` | logout | profile menu | `admin` | لا | `refreshToken` | success | امسح session محليًا دائمًا | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `GET /auth/me` | current user | app bootstrap | `admin` | Bearer | لا شيء | current user | confirms role | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/change-password` | change password | password screen | `admin` | Bearer | `currentPassword`, `newPassword` | success | بعد النجاح توقّع login جديد | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/forgot-password` | start reset flow | forgot password | عام | لا | `identifier` | success | لا تعتمد على `resetToken` في staging | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/reset-password` | complete reset | reset password | عام | لا | `token`, `newPassword` | success | UI جاهز حتى لو كانت آلية التسليم تشغيلية | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |

## Users

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /users` | create user | create user form | `admin` | Bearer | `fullName`, `email`, `phone`, `role`, `password`, role profile fields | created user | duplicate email/phone -> `409` | `API_REFERENCE.md`, `src/modules/users/routes/users.routes.ts` |
| `GET /users` | list users | users list | `admin` | Bearer | `page`, `limit`, `sortBy`, `sortOrder`, `role`, `isActive` | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/users/routes/users.routes.ts` |
| `GET /users/:id` | user detail | user detail | `admin` | Bearer | path `id` | user detail | detail/edit source | `API_REFERENCE.md`, `src/modules/users/routes/users.routes.ts` |
| `PATCH /users/:id` | update user | edit form | `admin` | Bearer | editable fields | updated user | لا تفترض update شامل لكل شيء من شاشة واحدة | `API_REFERENCE.md`, `src/modules/users/routes/users.routes.ts` |
| `PATCH /users/:id/status` | activate/deactivate | list/detail actions | `admin` | Bearer | `isActive` | updated status | استخدم dialog تأكيد | `API_REFERENCE.md`, `src/modules/users/routes/users.routes.ts` |

## Academic Structure

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /academic-structure/academic-years` | create academic year | years form | `admin` | Bearer | `yearName`, `startDate`, `endDate` | created year | date constraints قد تفشل | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/academic-years` | list academic years | years list | `admin` | Bearer | none | years list | selector source | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/academic-years/:id` | year detail | year detail | `admin` | Bearer | path `id` | year detail | edit source | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `PATCH /academic-structure/academic-years/:id` | update year | edit year | `admin` | Bearer | editable fields | updated year | راعِ active year rules | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `PATCH /academic-structure/academic-years/:id/activate` | activate year | year actions | `admin` | Bearer | path `id` | activated year | مهم نظاميًا | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `POST /academic-structure/academic-years/:academicYearId/semesters` | create semester | semesters form | `admin` | Bearer | `semesterName`, dates | created semester | مرتبط بسنة محددة | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/academic-years/:academicYearId/semesters` | list semesters | semesters list | `admin` | Bearer | path `academicYearId` | semesters list | ضمن year detail | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `PATCH /academic-structure/semesters/:id` | update semester | edit semester | `admin` | Bearer | editable fields | updated semester | يؤثر على reporting period | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `POST /academic-structure/grade-levels` | create grade level | grade levels form | `admin` | Bearer | `gradeLevelName` | created grade level | master data | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/grade-levels` | list grade levels | grade levels list | `admin` | Bearer | none | grade levels list | selector source | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `POST /academic-structure/classes` | create class | classes form | `admin` | Bearer | `className`, `gradeLevelId`, `academicYearId` | created class | depends on grade/year | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/classes` | list classes | classes list | `admin` | Bearer | domain filters | classes list | used across many screens | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/classes/:id` | class detail | class detail | `admin` | Bearer | path `id` | class detail | before assignments | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `POST /academic-structure/subjects` | create subject | subjects form | `admin` | Bearer | `subjectName` وغيرها | created subject | create master subject only; semester availability is handled by `subject-offerings` | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/subjects` | list subjects | subjects list | `admin` | Bearer | none | subjects list | selector source | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/subjects/:id` | subject detail | subject detail | `admin` | Bearer | path `id` | subject detail | optional detail screen | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `POST /academic-structure/subject-offerings` | create subject offering | semester subject activation form | `admin` | Bearer | `subjectId`, `semesterId`, `isActive?` | created subject offering | use after subject creation when the subject should be available in a semester | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/subject-offerings` | list subject offerings | semester subject availability list | `admin` | Bearer | `academicYearId?`, `semesterId?`, `gradeLevelId?`, `subjectId?`, `isActive?` | subject offerings list | canonical semester-aware subject surface | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/subject-offerings/:id` | subject offering detail | offering detail | `admin` | Bearer | path `id` | subject offering detail | use when editing activation state | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `PATCH /academic-structure/subject-offerings/:id` | update subject offering | offering status action | `admin` | Bearer | `isActive` | updated subject offering | current round supports activation state only | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `POST /academic-structure/teacher-assignments` | assign teacher | assignment form | `admin` | Bearer | `teacherId`, `classId`, `subjectId`, `academicYearId` | created assignment | foundation لتطبيق المعلم | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/teacher-assignments` | list teacher assignments | assignments list | `admin` | Bearer | filters العملية | assignments list | admin oversight | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `POST /academic-structure/supervisor-assignments` | assign supervisor | assignment form | `admin` | Bearer | `supervisorId`, `classId`, `academicYearId` | created assignment | foundation لتطبيق المشرف | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |
| `GET /academic-structure/supervisor-assignments` | list supervisor assignments | assignments list | `admin` | Bearer | filters العملية | assignments list | admin oversight | `API_REFERENCE.md`, `src/modules/academic-structure/routes/academic-structure.routes.ts` |

## Students

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /students` | create student | create student form | `admin` | Bearer | student identity + class/year + academic number | created student | duplicate academic number -> `409` | `API_REFERENCE.md`, `src/modules/students/routes/students.routes.ts` |
| `GET /students` | list students | students list | `admin` | Bearer | `page`, `limit`, `sortBy`, `sortOrder`, `classId`, `academicYearId`, `status`, `gender` | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/students/routes/students.routes.ts` |
| `GET /students/:id` | student detail | student detail | `admin` | Bearer | path `id` | student detail | basis for profile page | `API_REFERENCE.md`, `src/modules/students/routes/students.routes.ts` |
| `PATCH /students/:id` | update student | edit student | `admin` | Bearer | editable fields | updated student | class/year changes affect downstream modules | `API_REFERENCE.md`, `src/modules/students/routes/students.routes.ts` |
| `POST /students/:id/parents` | link parent | parent linking form | `admin` | Bearer | `parentId`, `relationType`, `isPrimary?` | created link | prefer `users.id` from `/users?role=parent`; backend also accepts `parents.id`; duplicate link -> `409` | `API_REFERENCE.md`, `src/modules/students/routes/students.routes.ts` |
| `GET /students/:id/parents` | list linked parents | parents tab | `admin` | Bearer | path `id` | parents list | required in student detail | `API_REFERENCE.md`, `src/modules/students/routes/students.routes.ts` |
| `PATCH /students/:studentId/parents/:parentId/primary` | set primary parent | parent actions | `admin` | Bearer | path params | updated linkage | `parentId` may be the parent `users.id` from `/users?role=parent` or the stored `parents.id`; prefer `users.id` in admin UI | `API_REFERENCE.md`, `src/modules/students/routes/students.routes.ts` |
| `POST /students/:id/promotions` | promote student | promotion form | `admin` | Bearer | target class/year | promotion result | needs confirmation | `API_REFERENCE.md`, `src/modules/students/routes/students.routes.ts` |

## Attendance

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /attendance/sessions` | create session | create session form | `admin` | Bearer | `classId`, `subjectId`, `academicYearId`, `semesterId`, `sessionDate`, `periodNo`, `teacherId` | created session | no root `/attendance` endpoint; duplicate session handled as conflict; subject must have active offering for the selected semester | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `GET /attendance/sessions` | list sessions | sessions list | `admin` | Bearer | pagination + filters + sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `GET /attendance/sessions/:id` | session detail | session detail | `admin` | Bearer | path `id` | session + roster | before mark/update | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `PUT /attendance/sessions/:id/records` | bulk save records | mark attendance screen | `admin` | Bearer | `records[] = { studentId, status, notes? }` | saved result | full roster snapshot required; absent triggers automation | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `PATCH /attendance/records/:attendanceId` | update one record | detail action | `admin` | Bearer | `status`, `notes?` | updated record | may trigger absent automation | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |

## Assessments

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /assessments/types` | create assessment type | types form | `admin` | Bearer | `typeName` وغيرها | created type | admin-only | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `GET /assessments/types` | list assessment types | selectors | `admin` | Bearer | none | types list | used in create assessment | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `POST /assessments` | create assessment | create assessment | `admin` | Bearer | class/subject/type/title/date/max score | created assessment | depends on academic structure; subject must have active offering for the selected semester | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `GET /assessments` | list assessments | assessments list | `admin` | Bearer | pagination + filters + sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `GET /assessments/:id` | assessment detail | detail screen | `admin` | Bearer | path `id` | detail | score entry source | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `GET /assessments/:id/scores` | read scores | scores screen | `admin` | Bearer | path `id` | scores list | roster-aware view | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `PUT /assessments/:id/scores` | bulk save scores | score entry | `admin` | Bearer | array of student scores | saved scores | duplicate grade conflicts must surface | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `PATCH /assessments/scores/:studentAssessmentId` | update one score | row action | `admin` | Bearer | editable score fields | updated score | row-level edit | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |

## Behavior

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /behavior/categories` | create category | categories form | `admin` | Bearer | `code`, `name`, `behaviorType`, `defaultSeverity`, `isActive?` | created category | no category update/deactivate public API in v1 | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `GET /behavior/categories` | list categories | categories list | `admin` | Bearer | none | categories list | selector source; no `behaviorType` filter in v1 | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `POST /behavior/records` | create record | create record form | `admin` | Bearer | `studentId`, `behaviorCategoryId`, `academicYearId`, `semesterId`, `behaviorDate`, `description?`, `severity?`, one of `teacherId/supervisorId` | created record | no root `/behavior` endpoint; negative category triggers notifications | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `GET /behavior/records` | list records | records list | `admin` | Bearer | pagination + filters + sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `GET /behavior/records/:id` | record detail | detail screen | `admin` | Bearer | path `id` | record detail | detail/edit source | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `PATCH /behavior/records/:id` | update record | edit form | `admin` | Bearer | editable fields | updated record | category change may trigger automation | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `GET /behavior/students/:studentId/records` | student behavior timeline | student detail tab | `admin` | Bearer | path `studentId` | `student`, `summary`, `records` | non-paginated; same `studentId` as `/students/:id` | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |

## Transport

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /transport/buses` | create bus | buses form | `admin` | Bearer | `plateNumber`, `driverId?`, `capacity`, `status?` | created bus | send `driverId` as the selected driver `users.id` from `/users?role=driver`; legacy `drivers.id` still works; duplicate plate -> `409` | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/buses` | list buses | buses list | `admin` | Bearer | none | buses list | master data | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/routes` | create route | routes form | `admin` | Bearer | `routeName`, `startPoint`, `endPoint`, `estimatedDurationMinutes?`, `isActive?` | created route | unique route naming | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/routes` | list routes | routes list | `admin` | Bearer | none | routes list | selector source | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/routes/:routeId/stops` | create stop | route stops form | `admin` | Bearer | `stopName`, `latitude`, `longitude`, `stopOrder` | created stop | stop order uniqueness matters | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/routes/:routeId/stops` | list stops | route detail | `admin` | Bearer | path `routeId` | stops list | no pagination in v1 | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/assignments` | create student transport assignment | assignment form | `admin` | Bearer | `studentId`, `routeId`, `stopId`, `startDate`, `endDate?` | created assignment | one active assignment only | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `PATCH /transport/assignments/:id/deactivate` | deactivate assignment | assignment actions | `admin` | Bearer | optional `endDate` | updated assignment | no general edit flow in v1 | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/assignments/active` | list active assignments | active assignments screen | `admin` | Bearer | none | active assignments list | operational oversight screen | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/route-assignments` | create recurring route assignment | route assignment form | `admin` | Bearer | `busId`, `routeId`, `startDate`, `endDate?` | created route assignment | use this for recurring bus-to-route setup | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/route-assignments` | list recurring route assignments | route assignments list | `admin` | Bearer | none | route assignments list | new primary transport setup surface | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `PATCH /transport/route-assignments/:id/deactivate` | deactivate recurring route assignment | route assignment actions | `admin` | Bearer | optional `endDate` | updated route assignment | keeps history instead of deleting | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/students/:studentId/home-location` | read student home location | student transport tab | `admin` | Bearer | path `studentId` | `student`, `homeLocation` | reference-only transport layer | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `PUT /transport/students/:studentId/home-location` | save student home location | student transport tab | `admin` | Bearer | `addressLabel?`, `addressText?`, `latitude`, `longitude`, `status?`, `notes?` | `student`, `homeLocation` | admin-managed in this round | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `DELETE /transport/students/:studentId/home-location` | delete student home location | student transport tab | `admin` | Bearer | path `studentId` | `student`, `homeLocation=null` | remove only if truly obsolete | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips` | create trip | manual/exception trip form | `admin` | Bearer | `busId`, `routeId`, `tripDate`, `tripType` | created trip | keep as fallback; no longer the preferred daily flow | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/trips` | list trips | trips list | `admin` | Bearer | pagination + filters + sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/trips/:id` | trip detail | trip detail screen | `admin` | Bearer | path `id` | `trip`, `latestLocation`, `routeStops`, `eventSummary` | source of truth for trip view | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/trips/:id/students` | trip roster | trip detail / manual ops | `admin` | Bearer | path `id`, optional `search`, `stopId` | `tripId`, `tripStatus`, `students[]` | source of truth for trip students; includes stop coordinates and optional approved home location | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips/:id/start` | start trip | trip action | `admin` | Bearer | path `id` | updated trip state | triggers parent notifications | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips/:id/end` | end trip | trip action | `admin` | Bearer | path `id` | updated trip state | no more locations after end | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips/:id/locations` | post location | tracking panel | `admin` | Bearer | `latitude`, `longitude` | created location | mostly driver flow, admin can inspect/use | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `POST /transport/trips/:id/events` | post trip student event | event panel | `admin` | Bearer | `studentId`, `eventType`, `stopId?`, `notes?` | created event | now validates against assignment coverage on the trip date itself | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |
| `GET /transport/trips/:id/events` | list trip events | trip events tab | `admin` | Bearer | path `id` | events list | use with trip detail | `API_REFERENCE.md`, `src/modules/transport/routes/transport.routes.ts` |

## Communication

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /communication/recipients` | available recipients | compose/new message | `admin` | Bearer | `page`, `limit`, `search?`, `role?` | `items`, `pagination` | use as recipient picker instead of manual `receiverUserId` entry | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `POST /communication/messages` | send direct message | compose/conversation | `admin` | Bearer | `receiverUserId`, `messageBody` | created message | any active user | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/inbox` | inbox | inbox screen | `admin` | Bearer | pagination, `isRead?`, sort | `items`, `pagination`, `unreadCount` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/sent` | sent | sent screen | `admin` | Bearer | pagination, `receiverUserId?`, sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/conversations/:otherUserId` | conversation | conversation view | `admin` | Bearer | path `otherUserId`, pagination | `items`, `pagination` | default `sentAt asc` | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/messages/:messageId/read` | mark message read | inbox/conversation | `admin` | Bearer | path `messageId` | updated state | receiver only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `POST /communication/announcements` | create announcement | announcement form | `admin` | Bearer | `title`, `content`, `targetRole?`, `expiresAt?` | created announcement | admin-only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/announcements` | list all announcements | admin announcement list | `admin` | Bearer | none | announcements list | includes expired items | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/announcements/active` | active announcement feed | shared preview/feed | `admin` | Bearer | none | active announcements | role-filtered but admin can read | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `POST /communication/notifications` | create manual notification | manual notification form | `admin` | Bearer | `userId`, `title`, `message`, `notificationType`, `referenceType?`, `referenceId?` | created notification | admin-only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/notifications/me` | my notifications | notification center | `admin` | Bearer | pagination, `isRead?`, `notificationType?` | `items`, `pagination`, `unreadCount` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/notifications/:notificationId/read` | mark notification read | notification center | `admin` | Bearer | path `notificationId` | updated state | owner only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |

## Reporting

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /reporting/students/:studentId/profile` | full student profile | student reporting screen | `admin` | Bearer | path `studentId` | `student`, `parents`, `attendanceSummary`, `behaviorSummary`, `assessmentSummary` | same `studentId` as `/students/:id`; shared contract with teacher/supervisor | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/students/:studentId/reports/attendance-summary` | attendance summary | student reports tab | `admin` | Bearer | path `studentId` | `student`, `attendanceSummary` | `200` zero-safe when no attendance data yet | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/students/:studentId/reports/assessment-summary` | assessment summary | student reports tab | `admin` | Bearer | path `studentId` | `student`, `assessmentSummary.subjects[]` | no `items[]`; use for charts/tables | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/students/:studentId/reports/behavior-summary` | behavior summary | student reports tab | `admin` | Bearer | path `studentId` | `student`, `behaviorSummary` | no `records[]`; use `/behavior/students/:studentId/records` for timeline | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/dashboards/admin/me` | admin dashboard | dashboard home | `admin` | Bearer | none | `summary`, `recentStudents`, `recentAnnouncements`, `activeTrips` | primary landing endpoint | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |
| `GET /reporting/transport/summary` | transport summary | transport summary page | `admin` | Bearer | none | `activeTrips[]` with latest location and recent events | admin and driver only | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |

## Homework

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /homework` | create homework | homework form | `admin` | Bearer | homework scope + title/content/due date | created homework | admin and teacher manage; subject must have active offering for the selected semester | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |
| `GET /homework` | list homework | homework list | `admin` | Bearer | pagination + filters | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |
| `GET /homework/:id` | homework detail | homework detail | `admin` | Bearer | path `id` | homework detail | detail source | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |
| `PUT /homework/:id/submissions` | update submission state | submission management | `admin` | Bearer | submission update payload | updated submission | suitable for admin intervention | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |
| `GET /homework/students/:studentId` | student homework list | student homework tab | `admin` | Bearer | path `studentId` | `student`, `items` | non-paginated; same `studentId` as `/students/:id` | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |

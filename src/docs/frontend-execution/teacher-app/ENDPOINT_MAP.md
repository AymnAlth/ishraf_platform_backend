# خريطة الـ Endpoints لتطبيق المعلم

## Auth

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | تسجيل دخول المعلم | login screen | `teacher` | لا | `identifier`, `password` | `user`, `tokens` | handle `401/403/429` | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/refresh` | تدوير session | auth client | `teacher` | لا | `refreshToken` | new token pair | retry once | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/logout` | إنهاء session | profile/logout | `teacher` | لا | `refreshToken` | success message | clear local session always | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `GET /auth/me` | user bootstrap | app startup | `teacher` | Bearer | none | current user | confirms role | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/change-password` | تغيير كلمة المرور | profile/password | `teacher` | Bearer | `currentPassword`, `newPassword` | success message | likely requires relogin | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/forgot-password` | بدء reset | forgot password | عام | لا | `identifier` | success message | no reset token assumption in staging | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |
| `POST /auth/reset-password` | إكمال reset | reset password | عام | لا | `token`, `newPassword` | success message | build full UI flow | `API_REFERENCE.md`, `src/modules/auth/routes/auth.routes.ts` |

## Reporting

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /reporting/dashboards/teacher/me` | teacher dashboard | home screen | `teacher` | Bearer | none | `teacher`, `assignments`, `recentAttendanceSessions`, `recentAssessments`, `recentBehaviorRecords` | primary landing endpoint | `API_REFERENCE.md`, `src/modules/reporting/routes/reporting.routes.ts` |

## Attendance

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /attendance/sessions` | إنشاء جلسة حضور | create session screen | `teacher` | Bearer | `classId`, `subjectId`, `academicYearId`, `semesterId`, `sessionDate`, `periodNo` | created session | ownership enforced by backend; no root `/attendance` endpoint | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `GET /attendance/sessions` | قائمة الجلسات | sessions list | `teacher` | Bearer | pagination + filters + sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `GET /attendance/sessions/:id` | تفاصيل الجلسة | session detail | `teacher` | Bearer | path `id` | session + roster | use before bulk save | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `PUT /attendance/sessions/:id/records` | حفظ سجلات الحضور | mark attendance | `teacher` | Bearer | `records[] = { studentId, status, notes? }` | saved result | full roster snapshot required; absent triggers notifications automatically | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |
| `PATCH /attendance/records/:attendanceId` | تعديل سجل مفرد | attendance detail | `teacher` | Bearer | `status`, `notes?` | updated record | still ownership-scoped | `API_REFERENCE.md`, `src/modules/attendance/routes/attendance.routes.ts` |

## Assessments

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /assessments/types` | قراءة أنواع التقييم | create assessment form | `teacher` | Bearer | none | assessment types | teacher can read only | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `POST /assessments` | إنشاء تقييم | create assessment screen | `teacher` | Bearer | class/subject/type/title/date/max score fields | created assessment | ownership enforced | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `GET /assessments` | قائمة التقييمات | assessments list | `teacher` | Bearer | pagination + filters + sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `GET /assessments/:id` | تفاصيل تقييم | assessment detail | `teacher` | Bearer | path `id` | assessment detail | use before score entry | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `GET /assessments/:id/scores` | قراءة الدرجات | scores screen | `teacher` | Bearer | path `id` | scores list | roster-aware screen | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `PUT /assessments/:id/scores` | حفظ درجات batch | score entry | `teacher` | Bearer | array of student scores | saved scores result | duplicate/conflict handling مهم | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |
| `PATCH /assessments/scores/:studentAssessmentId` | تعديل درجة مفردة | score edit | `teacher` | Bearer | updated score fields | updated score | use as row action | `API_REFERENCE.md`, `src/modules/assessments/routes/assessments.routes.ts` |

## Behavior

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /behavior/categories` | قراءة الفئات السلوكية | create/edit record | `teacher` | Bearer | none | categories list | read-only for teacher; no `behaviorType` filter in v1 | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `POST /behavior/records` | إنشاء سجل سلوكي | create behavior form | `teacher` | Bearer | `studentId`, `behaviorCategoryId`, `academicYearId`, `semesterId`, `behaviorDate`, `description?`, `severity?` | created record | negative categories trigger notifications; do not send `teacherId/supervisorId` | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `GET /behavior/records` | قائمة السجلات | records list | `teacher` | Bearer | pagination + filters + sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `GET /behavior/records/:id` | تفاصيل سجل | behavior detail | `teacher` | Bearer | path `id` | record detail | useful before edit | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |
| `PATCH /behavior/records/:id` | تعديل سجل | edit behavior | `teacher` | Bearer | editable fields | updated record | still scope-limited | `API_REFERENCE.md`, `src/modules/behavior/routes/behavior.routes.ts` |

## Homework

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /homework` | إنشاء واجب | create homework | `teacher` | Bearer | homework scope + title/content/due date | created homework | teacher/admin manage | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |
| `GET /homework` | قائمة الواجبات | homework list | `teacher` | Bearer | pagination + filters | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |
| `GET /homework/:id` | تفاصيل واجب | homework detail | `teacher` | Bearer | path `id` | homework detail | show submissions context | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |
| `PUT /homework/:id/submissions` | تحديث submission state | submission management | `teacher` | Bearer | submission update payload | updated result | ownership matters | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |
| `GET /homework/students/:studentId` | واجبات طالب | student homework view | `teacher` | Bearer | path `studentId` | `student`, `items` | non-paginated; usable when opening student-level context | `API_REFERENCE.md`, `src/modules/homework/routes/homework.routes.ts` |

## Communication

| Method + Path | Purpose | Used In | Role | Required Auth | Important Request Fields | Important Response Fields | Frontend Notes / Constraints | Source Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /communication/recipients` | available recipients | compose/new message | `teacher` | Bearer | `page`, `limit`, `search?`, `role?` | `items`, `pagination` | use this endpoint to choose `receiverUserId` instead of manual IDs | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `POST /communication/messages` | إرسال رسالة | compose/conversation | `teacher` | Bearer | `receiverUserId`, `messageBody` | created message | any active user | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/inbox` | الوارد | inbox | `teacher` | Bearer | pagination, `isRead?`, sort | `items`, `pagination`, `unreadCount` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/sent` | الصادر | sent | `teacher` | Bearer | pagination, `receiverUserId?`, sort | `items`, `pagination` | paginated | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/messages/conversations/:otherUserId` | محادثة ثنائية | conversation | `teacher` | Bearer | path `otherUserId`, pagination | `items`, `pagination` | default ascending chronology | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/messages/:messageId/read` | تعليم رسالة كمقروءة | inbox/conversation | `teacher` | Bearer | path `messageId` | updated state | receiver only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/notifications/me` | إشعاراتي | notifications screen | `teacher` | Bearer | pagination, `isRead?`, `notificationType?` | `items`, `pagination`, `unreadCount` | includes automation notifications relevant to role | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `PATCH /communication/notifications/:notificationId/read` | تعليم إشعار كمقروء | notifications screen | `teacher` | Bearer | path `notificationId` | updated notification | owner only | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |
| `GET /communication/announcements/active` | الإعلانات النشطة | announcements feed | `teacher` | Bearer | none | active announcements | role-filtered feed | `API_REFERENCE.md`, `src/modules/communication/routes/communication.routes.ts` |

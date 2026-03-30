# Residual Backend Dependencies / Prioritized Backlog

Generated at: 2026-03-29T00:00:00.000Z

## Executive Summary

هذه الوثيقة تغلق مرحلة إعادة الهيكلة الحالية من منظور الاعتماديات الخلفية المتبقية.

الحالة التشغيلية الحالية مثبتة كالتالي:
- [ACCEPTANCE_GATES_REPORT.md](./ACCEPTANCE_GATES_REPORT.md): `pass`
- [LIVE_ACCEPTANCE_AUDIT.md](./LIVE_ACCEPTANCE_AUDIT.md): `pass`
- [READ_ROUTE_STABILITY_AUDIT.md](./READ_ROUTE_STABILITY_AUDIT.md): `42 pass / 0 fail / 0 skipped`
- [OPERATIONAL_ACCEPTANCE_AUDIT.md](./OPERATIONAL_ACCEPTANCE_AUDIT.md): `12 pass / 0 fail / 0 skipped`

النتيجة المهمة:
- لا يوجد حاليًا **backend blocker** يمنع المسارات الإدارية الحرجة من العمل.
- الاعتماد الهيكلي الأخير المتعلق بـ `teacherId/supervisorId` أُغلق رسميًا من جهة الباك بتاريخ `2026-03-29` وتم اعتماده في الفرونت على `users.id` فقط.
- أسطح `Admin Preview / Monitoring` أُغلقت رسميًا من جهة الباك والفرونت بتاريخ `2026-03-29` عبر `admin-preview endpoints` الإدارية الآمنة.
- أسطح `Admin Preview / Monitoring` أصبحت أيضًا **live-verified** بتاريخ `2026-03-29` عبر سيناريو `monitoring.parent-preview`.
- `Communication Phase 1` أُغلق رسميًا وأصبح **live-verified** بتاريخ `2026-03-29` عبر:
  - `communication.compose`
  - `communication.reporting-context-compose`
  - `communication.monitoring-parent-compose`
- ما تبقى الآن يقتصر على:
  - drift توثيقي/تنفيذي
  - وفرص product/oversight لاحقة

## Scope and Sources

مصادر الحقيقة المستخدمة هنا:
- `Public-Doc/docs/API_REFERENCE.md`
- `Public-Doc/docs/openapi/ishraf-platform.openapi.json`
- `Public-Doc/docs/postman/ishraf-platform.postman_collection.json`
- `Public-Doc/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md`
- `Public-Doc/docs/frontend-execution/admin-dashboard/LIVE_ACCEPTANCE_AUDIT.md`
- `Public-Doc/docs/frontend-execution/admin-dashboard/READ_ROUTE_STABILITY_AUDIT.md`
- `Public-Doc/docs/frontend-execution/admin-dashboard/OPERATIONAL_ACCEPTANCE_AUDIT.md`
- التنفيذ الحالي داخل `admin-dashboard/src`

مهم:
- هذه الوثيقة لا تعيد فتح عناصر تم حلها فعليًا في الفرونت أو العقد.
- لا تعتمد على التخمين أو على “قد يكون” دون أثر موثق أو سلوك خلفي صريح.

## Closed and No Longer Residual

هذه عناصر كانت gaps في مراحل سابقة ولم تعد backlog قائمًا الآن:

### Closed: driver resolution for bus creation

- العقد الحالي يدعم إرسال `driverId` على أنه `users.id` من `GET /users?role=driver`.
- الباك يحلها داخليًا إلى `drivers.id`.
- الفرونت يرسل `selectedUser.id` مباشرة في [BusesPage.tsx](/d:/Project-R/ishraf_platform_admin_dashboard/admin-dashboard/src/features/transport/BusesPage.tsx).

المرجع:
- `API_REFERENCE.md`
- `OpenAPI`
- `Postman`

### Closed: parent linking burden

- `POST /students/:id/parents` و`PATCH /students/:studentId/parents/:parentId/primary`
  يقبلان `parentId` على أنه `users.id` من `/users?role=parent`.
- الباك يحل القيمة داخليًا إلى `parents.id`.
- لم يعد هناك burden يدوي على المستخدم في ربط أولياء الأمور.

### Closed: recipients directory gap

- compose flows في التواصل تعتمد الآن على `GET /communication/recipients`.
- لم يعد `/users` بديلًا عامًا داخل compose flow.

### Closed: communication phase 1 contextual composer rollout

- مساحة `Communication` أصبحت تعتمد على unified composer واحد بدل modals متفرقة.
- launchers السياقية أصبحت موجودة في:
  - `user detail`
  - `student detail`
  - `monitoring`
  - `reporting`
- وعند الإطلاق من سياق طالب، يمرر النظام:
  - `referenceType = student`
  - `referenceId = student.id`
  بشكل تلقائي ومقفل.
- تم إثبات هذا حيًا في:
  - [COMMUNICATION_PHASE1_COMPLETION_REVIEW.md](./COMMUNICATION_PHASE1_COMPLETION_REVIEW.md)

### Closed: academic detail read gap

- detail reads الأكاديمية (`academic year`, `class`, `subject`, `subject offering`) أصبحت مستثمرة داخل panels والسياق المقروء في صفحات الإعداد الأكاديمي.

### Closed: teacher / supervisor user-id resolver gap

- العقد الحالي أصبح يقبل:
  - `teacherId = users.id` القادم من `GET /users?role=teacher`
  - `supervisorId = users.id` القادم من `GET /users?role=supervisor`
- ما زال يقبل `teachers.id / supervisors.id` القديمة للتوافق الخلفي
- لكن المسار الرسمي للفرونت أصبح:
  - `users.id` فقط
- وقد تم اعتماد هذا المسار فعليًا في:
  - `teacher assignments`
  - `supervisor assignments`
  - `attendance`
  - `assessments`
  - `behavior`
  - `homework`
  - selectors/filters المشتقة من assignment graph

الأسطح المتأثرة التي أُغلقت بهذه المواءمة:
- `POST /academic-structure/teacher-assignments`
- `POST /academic-structure/supervisor-assignments`
- `POST /attendance/sessions`
- `POST /assessments`
- `POST /behavior/records`
- `POST /homework`
- filters التي تمرر `teacherId / supervisorId` عند تفعيلها من admin UI

المرجع:
- [BACKEND_REQUEST_TEACHER_SUPERVISOR_USERID_RESOLVER.md](./BACKEND_REQUEST_TEACHER_SUPERVISOR_USERID_RESOLVER.md)
- `API_REFERENCE.md`
- `OpenAPI`
- `Postman`

### Closed: seed credential documentation drift

- الاعتماد المرجعي لحسابات الـ seed أصبح موحدًا في:
  - [STAGING_FRONTEND_SEED.md](/d:/Project-R/ishraf_platform_backend/src/docs/STAGING_FRONTEND_SEED.md)
- وتم تحديث:
  - [API_REFERENCE.md](/d:/Project-R/ishraf_platform_backend/src/docs/API_REFERENCE.md)
  - [README.md](/d:/Project-R/ishraf_platform_backend/src/docs/frontend-execution/admin-dashboard/README.md)
  للإحالة إلى هذا المرجع نفسه بدل ترك بيانات قديمة أو متضاربة داخل الأمثلة.
- الحالة الحالية للبيئة المستضافة بعد reset `2026-03-30` هي:
  - الأدمن الأساسي المحفوظ: `mod87521@gmail.com`
  - حسابات roles الدنيا فقط
  - لا توجد dataset أكاديمية أو تشغيلية seeded
- كلمات المرور المرجعية الحالية:
  - teacher/parent/supervisor: `SeedDev123!`
  - driver: `SeedDriver123!`

### Closed: live acceptance environment readiness instrumentation

- أصبح هناك preflight رسمي قبل التشغيل الحي في:
  - `npm.cmd run audit:admin:live-readiness`
- ويولد التقارير التالية:
  - [LIVE_ACCEPTANCE_ENVIRONMENT_READINESS.md](/d:/Project-R/ishraf_platform_admin_dashboard/Public-Doc/docs/frontend-execution/admin-dashboard/LIVE_ACCEPTANCE_ENVIRONMENT_READINESS.md)
  - `admin-dashboard/.playwright-cli/live-acceptance-readiness.json`
- هذا preflight يغطي صراحة:
  - reachability of `/login`
  - backend `/health`
  - backend `/health/ready`
  - توفر `ISHRAF_LOGIN_IDENTIFIER / ISHRAF_LOGIN_PASSWORD`
  - نجاح `POST /api/v1/auth/login`
  - قابلية تشغيل Playwright/Chromium
- وبالتالي لم يعد `skipped-env-unavailable` في live acceptance غامضًا أو مضللًا؛ بل أصبح مسبوقًا بتقرير readiness يحدد السبب التنفيذي بدقة.
- وعند التشغيل خارج البيئة المقيدة، مرّ `live acceptance` كاملًا بنجاح.

### Closed: admin preview / monitoring surfaces

- route `/monitoring` أصبح يعتمد الآن على:
  - `GET /reporting/admin-preview/parents/{parentUserId}/dashboard`
  - `GET /reporting/admin-preview/parents/{parentUserId}/students/{studentId}/profile`
  - `GET /reporting/admin-preview/parents/{parentUserId}/students/{studentId}/reports/attendance-summary`
  - `GET /reporting/admin-preview/parents/{parentUserId}/students/{studentId}/reports/assessment-summary`
  - `GET /reporting/admin-preview/parents/{parentUserId}/students/{studentId}/reports/behavior-summary`
  - `GET /reporting/admin-preview/parents/{parentUserId}/students/{studentId}/transport/live-status`
  - `GET /reporting/admin-preview/teachers/{teacherUserId}/dashboard`
  - `GET /reporting/admin-preview/supervisors/{supervisorUserId}/dashboard`
- المعرفات المستخدمة في هذا المسار أصبحت:
  - `parentUserId = users.id`
  - `teacherUserId = users.id`
  - `supervisorUserId = users.id`
- لم يعد هناك `local aggregation` لبيانات:
  - `parent`
  - `teacher`
  - `supervisor`
- entry points الحالية من:
  - `users list`
  - `user detail`
  - `student detail`
  بقيت تعمل، لكنها الآن تحل إلى preview رسمي من الباك.
- هذا المسار أُغلق أيضًا من منظور القبول الحي في:
  - [ADMIN_PREVIEW_MONITORING_COMPLETION_REVIEW.md](./ADMIN_PREVIEW_MONITORING_COMPLETION_REVIEW.md)

## Residual Backend Dependencies

### 1. Communication multi-target delivery

available backend surfaces today:
- `POST /communication/messages`
- `POST /communication/notifications`
- `POST /communication/announcements`

current limitation:
- direct messages = single recipient only
- manual notifications = single recipient only
- announcements = single role or all users only

frontend status:
- `Phase 1` is implemented, contract-aligned, and live-verified
- multi-target UI remains intentionally locked
- no local loop fallback is used in the browser

required backend expansion:
- [BACKEND_REQUEST_COMMUNICATION_MULTI_TARGET.md](./BACKEND_REQUEST_COMMUNICATION_MULTI_TARGET.md)

value:
- less operator repetition
- enterprise broadcast workflows
- lower communication burden on admins

status:
- backend request documented and ready for review
- not a blocker for current single-target runtime

### 2. Driver daily workflow simulation

available backend surfaces:
- `GET /transport/route-assignments/me`
- `POST /transport/trips/ensure-daily`

value:
- support tooling
- operations simulation

status:
- خارج runtime admin الأساسي الآن
- يمكن تأجيله دون أثر على low-friction admin UX الحالي

## Prioritized Backlog

| Priority | Item | Type | Current Impact | Recommended Action |
| --- | --- | --- | --- | --- |
| Medium | Communication multi-target delivery | backend product contract | يمنع فقط التوسعة متعددة الأشخاص/الأدوار، ولا يكسر المسار الحالي | اعتماد العقود المقترحة ثم فتح Phase 2 UI |
| Low | Driver daily workflow simulation from admin | product opportunity | لا يؤثر على low-friction admin runtime | backlog عمليات لاحق |

## What Is Explicitly Not a Current Blocker

- لا توجد runtime regressions في التشغيل الحي الحالي.
- لا توجد contract mismatches تمنع happy paths الإدارية الأساسية.
- لا توجد selector burdens يدوية متبقية مفروضة على المستخدم النهائي في:
  - `student`
  - `parent`
  - `driver`
  - `subject offering`
  - `transport stop`
  - `communication recipient`

## Closure Decision

من منظور هذه الموجة:
- **frontend admin system is operationally coherent and acceptance-passing**
- وما تبقى من الباك إند هو backlog محدد ومحدود، لا يبرر إيقاف التنفيذ الحالي

الترتيب الصحيح من الآن:
1. الحفاظ على حالة `pass` الحالية
2. عدم إعادة فتح flows مستقرة
3. استخدام readiness preflight قبل كل rerun حي
4. التعامل مع بقية العناصر كتحسينات product/support وليس ككسور runtime

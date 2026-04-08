# Ishraf Platform Backend API Reference

هذا الملف هو المرجع البشري المختصر الحالي للباك إند.  
المصدر التنفيذي الأدق للعقود هو:

- `src/modules/*/{routes,controller,service,dto,validator,types}`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`

إذا تعارض أي نص في هذا الملف مع الكود، فالكود هو الحقيقة.

حالة المزامنة الحالية (Project-wide docs audit):

- تاريخ التدقيق: `2026-04-08`
- عدد endpoints الحية: `163` (يشمل `/health` و`/health/ready`)
- تغطية التوثيق:
  - `src/docs/openapi/ishraf-platform.openapi.json` = `163/163`
  - `src/docs/postman/ishraf-platform.postman_collection.json` = `163/163`

## Base URLs

```text
Hosted API:  https://ishraf-platform-backend-staging.onrender.com/api/v1
Hosted Root: https://ishraf-platform-backend-staging.onrender.com
Local API:   http://localhost:4000/api/v1
Local Root:  http://localhost:4000
```

المساران الوحيدان خارج `/api/v1`:

- `GET /health`
- `GET /health/ready`

## القواعد العامة

- كل المسارات تحت `/api/v1` ما عدا health.
- الاستجابات تستخدم envelope موحدة:
  - success: `success=true`, `message`, `data`
  - error: `success=false`, `message`, `errors[]`
- كل المعرفات في JSON تظهر كسلاسل نصية رقمية، حتى لو كانت مفاتيح تسلسلية في قاعدة البيانات.
- في السطوح الحديثة الخاصة بالمعلمين والمشرفين والسائقين وأولياء الأمور، المرجع المعتمد هو `users.id` وليس profile ids.
- السطوح التشغيلية اليومية المرتبطة بالدراسة تعمل بمفهوم `Active Academic Context`.
- لا يوجد surface عامة للحذف في معظم الموديولات؛ كثير من السلوك domain-driven أو يعتمد على `patch/deactivate`.
- `promotions` ليست موديول API مستقلًا في الحالة الحالية.
- `automation` منطق داخلي داعم وليس surface HTTP مستقلة.

## المصادقة والجلسات

المسارات العامة:

- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/refresh`
- `POST /auth/logout`

المسارات المحمية للمستخدم النشط:

- `POST /auth/change-password`
- `GET /auth/me`

قواعد تشغيلية:

- الوصول المحمي يستخدم `Authorization: Bearer <accessToken>`.
- `forgot-password` و`reset-password` و`login` محكومة rate limiting داخل التطبيق.
- `refresh` و`logout` يعملان على refresh tokens المخزنة في قاعدة البيانات.

## Users

الموديول: `src/modules/users`

الصلاحية: `admin` فقط

المسارات:

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/status`

السلوك:

- الإنشاء والتحديث يغطّيان user base record والـ role profile المرتبط عند الحاجة.
- الموديول يدير أدوار: `admin`, `teacher`, `supervisor`, `parent`, `driver`.

## Academic Structure

الموديول: `src/modules/academic-structure`

الصلاحية: `admin` فقط

### Active Academic Context

- `GET /academic-structure/context/active`
- `PATCH /academic-structure/context/active`

### Academic Years / Semesters

- `POST /academic-structure/academic-years`
- `GET /academic-structure/academic-years`
- `GET /academic-structure/academic-years/:id`
- `PATCH /academic-structure/academic-years/:id`
- `PATCH /academic-structure/academic-years/:id/activate`
- `POST /academic-structure/academic-years/:academicYearId/semesters`
- `GET /academic-structure/academic-years/:academicYearId/semesters`
- `PATCH /academic-structure/semesters/:id`

### Grade Levels / Classes / Subjects

- `POST /academic-structure/grade-levels`
- `GET /academic-structure/grade-levels`
- `POST /academic-structure/classes`
- `GET /academic-structure/classes`
- `GET /academic-structure/classes/:id`
- `PATCH /academic-structure/classes/:id`
- `POST /academic-structure/subjects`
- `GET /academic-structure/subjects`
- `GET /academic-structure/subjects/:id`
- `PATCH /academic-structure/subjects/:id`

### Subject Offerings / Staff Assignments

- `POST /academic-structure/subject-offerings`
- `GET /academic-structure/subject-offerings`
- `GET /academic-structure/subject-offerings/:id`
- `PATCH /academic-structure/subject-offerings/:id`
- `POST /academic-structure/teacher-assignments`
- `GET /academic-structure/teacher-assignments`
- `GET /academic-structure/teacher-assignments/:id`
- `PATCH /academic-structure/teacher-assignments/:id`
- `POST /academic-structure/supervisor-assignments`
- `GET /academic-structure/supervisor-assignments`
- `GET /academic-structure/supervisor-assignments/:id`
- `PATCH /academic-structure/supervisor-assignments/:id`

قواعد تشغيلية:

- يوجد سنة دراسية نشطة واحدة وفصل دراسي نشط واحد كسياق تشغيلي.
- تفعيل سنة أو فصل يتم من هذا الموديول فقط.
- المواد `subjects` هي master data، بينما `subject-offerings` هي طبقة التفعيل semester-aware.

## Students

الموديول: `src/modules/students`

الصلاحية: `admin` فقط

المسارات:

- `POST /students`
- `GET /students`
- `GET /students/:id`
- `PATCH /students/:id`
- `GET /students/academic-enrollments`
- `POST /students/academic-enrollments/bulk`
- `PATCH /students/academic-enrollments/:enrollmentId`
- `POST /students/:id/academic-enrollments`
- `GET /students/:id/academic-enrollments`
- `POST /students/:id/parents`
- `GET /students/:id/parents`
- `PATCH /students/:studentId/parents/:parentId/primary`
- `POST /students/:id/promotions`

قواعد تشغيلية:

- الحالة الأكاديمية الانتقالية المعتمدة هي `student_academic_enrollments`.
- ما زال `POST /students/:id/promotions` موجودًا، لكنه يعمل داخل نموذج الترقية الحالي ولا يمثل موديولًا مستقلاً.
- روابط أولياء الأمور تعتمد `users.id` وتدعم primary parent.

## System Settings

الموديول: `src/modules/system-settings`

الصلاحية: `admin` فقط

المسارات:

- `GET /system-settings`
- `GET /system-settings/:group`
- `PATCH /system-settings/:group`
- `GET /system-settings/audit`
- `GET /system-settings/integrations/status`

قواعد تشغيلية:

- هذه الخطوة `global-only` ولا تحتوي أي scoping خاص بمدرسة أو tenant.
- قاعدة التخزين هي `overrides only`; defaults تبقى في الكود.
- المجموعات المنفذة حاليًا:
  - `pushNotifications`
  - `transportMaps`
  - `analytics`
  - `imports`
- `PATCH /system-settings/:group` body تكون group-specific ويجب أن تحتوي:
  - `reason`
  - `values`
- إذا كانت القيمة المرسلة تساوي default، يحذف الباك أي override موجودة بدل تخزين row زائدة.
- `GET /system-settings/audit` تعيد سجلًا append-only لتغييرات الإعدادات.
- `GET /system-settings/integrations/status` تعيد:
  - `featureEnabled`
  - `pendingOutboxCount`
  - `failedOutboxCount`
- `transportMaps.etaProvider` هو اختيار إداري عام للمزوّد المفضل بين `mapbox` و`google`.
- default الحالي لـ `transportMaps.etaProvider` هو `mapbox` لحماية الميزانية.
- `transportMaps.etaDerivedEstimateEnabled` يحدد ما إذا كان الباك يحسب ETA محليًا بين دورات تحديث المزود الخارجي.
- runtime provider selection فعّال في الدفعة الحالية عبر `transportMaps.etaProvider`، مع `mapbox` كخيار افتراضي.
- المستهلكون الأحياء حاليًا:
  - `imports.schoolOnboardingEnabled` لتعطيل أو تفعيل school onboarding import
  - `pushNotifications.fcmEnabled` و`pushNotifications.transportRealtimeEnabled` لتفعيل FCM/realtime transport
  - `transportMaps.etaProvider` و`transportMaps.etaDerivedEstimateEnabled` كجزء من admin control plane التشغيلي للخرائط والـ ETA
- إذا كانت `imports.schoolOnboardingEnabled = false`:
  - ترفض school onboarding endpoints بـ `409 FEATURE_DISABLED`
- إذا كانت `pushNotifications.transportRealtimeEnabled = false`:
  - `GET /transport/realtime-token` ترفض بـ `409 FEATURE_DISABLED`

## Attendance
الموديول: `src/modules/attendance`

الصلاحيات:

- `admin`, `teacher`: إنشاء الجلسات
- `admin`, `teacher`, `supervisor`: الوصول للجلسات وتحديث السجلات

المسارات:

- `POST /attendance/sessions`
- `GET /attendance/sessions`
- `GET /attendance/sessions/:id`
- `PUT /attendance/sessions/:id/records`
- `PATCH /attendance/records/:attendanceId`

قواعد تشغيلية:

- الجلسات وسجلات الحضور سطوح يومية active-context-first.
- supervisors لا ينشئون الجلسات لكن يمكنهم الوصول والتحديث حسب القيود الموجودة في الخدمة.

## Assessments

الموديول: `src/modules/assessments`

الصلاحيات:

- `admin`: إدارة الأنواع
- `admin`, `teacher`: قراءة الأنواع وإدارة التقييمات والدرجات

المسارات:

- `POST /assessments/types`
- `GET /assessments/types`
- `POST /assessments`
- `GET /assessments`
- `GET /assessments/:id`
- `GET /assessments/:id/scores`
- `PUT /assessments/:id/scores`
- `PATCH /assessments/scores/:studentAssessmentId`

قواعد تشغيلية:

- إنشاء التقييمات ودرجات الطلاب يعمل على roster class/subject فعلي.
- teacher-created assessments لا ترسل `teacherId`; admin-created assessments قد تحتاجه حسب القواعد الحالية.

## Behavior

الموديول: `src/modules/behavior`

الصلاحيات:

- `admin`: إدارة الفئات
- `admin`, `teacher`, `supervisor`: قراءة الفئات وإدارة السجلات

المسارات:

- `POST /behavior/categories`
- `GET /behavior/categories`
- `POST /behavior/records`
- `GET /behavior/records`
- `GET /behavior/records/:id`
- `PATCH /behavior/records/:id`
- `GET /behavior/students/:studentId/records`

قواعد تشغيلية:

- السجلات السلبية قد تنتج automation notifications داخليًا.
- صلاحيات الوصول للسجل نفسه تخضع لملكية المعلم/المشرف أو صلاحية admin.

## Homework

الموديول: `src/modules/homework`

الصلاحيات:

- `admin`, `teacher`: إدارة الواجبات وقراءتها
- `admin`, `teacher`, `parent`: واجبات الطالب

المسارات:

- `POST /homework`
- `GET /homework`
- `GET /homework/:id`
- `PUT /homework/:id/submissions`
- `GET /homework/students/:studentId`

قواعد تشغيلية:

- homework surfaces يومية وتعمل مع active context.
- parent يستطيع قراءة student homework فقط، لا إنشاء الواجب أو حفظ submissions.

## Transport

الموديول: `src/modules/transport`

الصلاحيات:

- `admin`: static data, assignments, route assignments, home locations, transport monitoring
- `admin`, `driver`: trips access/operations
- `driver`: `GET /transport/route-assignments/me`
- `admin`, `parent`, `driver`: `GET /transport/realtime-token`
- `parent`: `GET /transport/trips/:tripId/live-status`

المسارات:

- `POST /transport/buses`
- `GET /transport/buses`
- `POST /transport/routes`
- `GET /transport/routes`
- `POST /transport/routes/:routeId/stops`
- `GET /transport/routes/:routeId/stops`
- `POST /transport/assignments`
- `PATCH /transport/assignments/:id/deactivate`
- `GET /transport/assignments/active`
- `POST /transport/route-assignments`
- `GET /transport/route-assignments`
- `GET /transport/route-assignments/me`
- `PATCH /transport/route-assignments/:id/deactivate`
- `GET /transport/realtime-token`
- `POST /transport/trips`
- `POST /transport/trips/ensure-daily`
- `GET /transport/trips`
- `GET /transport/trips/:id`
- `GET /transport/trips/:id/eta`
- `GET /transport/trips/:id/students`
- `POST /transport/trips/:id/start`
- `POST /transport/trips/:id/end`
- `POST /transport/trips/:id/locations`
- `POST /transport/trips/:id/events`
- `GET /transport/trips/:id/events`
- `POST /transport/trips/:tripId/stops/:stopId/attendance`
- `GET /transport/trips/:tripId/live-status`
- `GET /transport/trips/:tripId/summary`
- `GET /transport/students/:studentId/home-location`
- `PUT /transport/students/:studentId/home-location`
- `DELETE /transport/students/:studentId/home-location`

قواعد تشغيلية:

- `tripStatus` التشغيلي يشمل: `scheduled`, `started`, `ended`, `completed`, `cancelled`.
- driver references في الطبقات الحديثة تعتمد `users.id`.
- `GET /transport/realtime-token?tripId=...` لا تحمل GPS نفسها؛ بل تصدر Firebase custom token للوصول المباشر إلى RTDB.
- القرار access-based:
  - `driver` المالك للرحلة يحصل على `write`
  - `parent` المرتبط فعليًا برحلة الطالب يحصل على `read`
  - `admin` يحصل على `read`
- إذا كانت `pushNotifications.transportRealtimeEnabled = false` يعود `409 FEATURE_DISABLED`.
- إذا لم تكن أسرار Firebase مضبوطة في env يعود `409 INTEGRATION_NOT_CONFIGURED`.
- REST/PostgreSQL تبقيان مصدر الحقيقة لحالة الرحلة وأحداث الركوب/الإنزال.
- GPS عالية التردد لا تمر عبر الباك بعد إصدار token؛ الاتصال الحي يذهب مباشرة إلى Firebase RTDB.
- مسار RTDB الحي:
  - `/transport/live-trips/{tripId}/latestLocation`
- `GET /transport/trips/:id/eta` يعيد Snapshot ETA محسوبة داخل الباك (provider snapshot أو derived estimate) وليست قناة GPS live.
- `GET /transport/trips/:tripId/live-status` يعيد payload موحدًا لولي الأمر:
  - `tripStatus`
  - `firebaseRtdbPath`
  - `myStopSnapshot`
  - `routePolyline`
- `POST /transport/trips/:tripId/stops/:stopId/attendance`:
  - body: `attendances: [{ studentId, status: present|absent, notes? }]`
  - duplicate `studentId` مرفوض
  - إذا كانت `tripType=pickup` فـ `present -> boarded`
  - إذا كانت `tripType=dropoff` فـ `present -> dropped_off`
  - `absent -> absent`
  - يغلق stop snapshot، وإذا اكتملت كل المحطات تتحول الرحلة تلقائيًا إلى `completed`.
- `GET /transport/trips/:tripId/summary`:
  - admin-only
  - متاح فقط عند `tripStatus=completed`
  - غير ذلك يعود `409` بكود:
    - `TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS`
- `POST /transport/trips/:id/start`, `POST /transport/trips/:id/end`, و`POST /transport/trips/:id/events` تكتب الحقيقة في PostgreSQL أولًا ثم تنشئ FCM wake-up work داخل `integration_outbox` عندما تكون feature flags مفعلة.

## Communication

الموديول: `src/modules/communication`

الصلاحيات:

- كل user نشط: device registry, الرسائل، announcements feed, notifications me
- `admin`: bulk messages, announcements management, notifications creation/bulk

المسارات:

- `POST /communication/devices`
- `PATCH /communication/devices/:deviceId`
- `DELETE /communication/devices/:deviceId`
- `GET /communication/recipients`
- `POST /communication/messages`
- `POST /communication/messages/bulk`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`
- `POST /communication/announcements`
- `GET /communication/announcements`
- `GET /communication/announcements/active`
- `POST /communication/notifications`
- `POST /communication/notifications/bulk`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`

قواعد تشغيلية:

- `POST /communication/devices` تسجل أو تعيد ربط token الجهاز بالمستخدم الحالي داخل transaction واحدة.
- provider المدعوم في هذه المرحلة هو `fcm` فقط.
- subscription المدعومة في هذه المرحلة هي `transportRealtime` فقط.
- endpoints الأجهزة ownership-scoped:
  - المستخدم يحدث أو يلغي تسجيل أجهزته هو فقط
  - admin لا يدير أجهزة الآخرين من هذه السطوح
- device registration تبقى متاحة حتى لو `pushNotifications.fcmEnabled = false` حتى تسمح بالتهيئة قبل التفعيل.
- bulk endpoints admin-only.
- bulk messages تمنع self-targeting.
- announcements تدعم `targetRoles[]` مع إبقاء `targetRole` كحقل توافق.
- لا يوجد group thread surface؛ direct multi-target ينشئ one-to-one copies.
- FCM push هنا wake-up channel فقط؛ التطبيق يعيد قراءة REST الحالية بعد وصول الإشارة.

## Reporting

الموديول: `src/modules/reporting`

الصلاحيات:

- `admin`, `teacher`, `supervisor`: student-scoped staff reports
- `admin`: admin preview surfaces + admin dashboard
- `parent`: parent dashboard + linked student reports + transport live status
- `teacher`: teacher dashboard
- `supervisor`: supervisor dashboard
- `admin`, `driver`: transport summary

المسارات:

- `GET /reporting/students/:studentId/profile`
- `GET /reporting/students/:studentId/reports/attendance-summary`
- `GET /reporting/students/:studentId/reports/assessment-summary`
- `GET /reporting/students/:studentId/reports/behavior-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/dashboard`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/profile`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status`
- `GET /reporting/admin-preview/teachers/:teacherUserId/dashboard`
- `GET /reporting/admin-preview/supervisors/:supervisorUserId/dashboard`
- `GET /reporting/dashboards/parent/me`
- `GET /reporting/dashboards/parent/me/students/:studentId/profile`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary`
- `GET /reporting/dashboards/teacher/me`
- `GET /reporting/dashboards/supervisor/me`
- `GET /reporting/dashboards/admin/me`
- `GET /reporting/transport/summary`
- `GET /reporting/transport/parent/me/students/:studentId/live-status`

قواعد تشغيلية:

- معظم reporting surfaces تعتمد active period الحالي.
- parent surfaces مقيدة بالطلاب المرتبطين فعليًا بولي الأمر.
- admin preview surfaces read-only إدارية ولا تعدل بيانات.

## Admin Imports

الموديول: `src/modules/admin-imports`

الصلاحية: `admin` فقط

المسارات:

- `POST /admin-imports/school-onboarding/dry-run`
- `POST /admin-imports/school-onboarding/apply`
- `GET /admin-imports/school-onboarding/history`
- `GET /admin-imports/school-onboarding/history/:importId`

قواعد تشغيلية:

- المسار مخصص لـ school onboarding فقط.
- `v1` تعتمد `structured workbook payload`، لا `raw file upload`.
- `apply` تعتمد على `dryRunId` من dry-run ناجحة.
- semantics: `all-or-nothing`, `create-only`, `idempotent retry`, وimport history محفوظ.

## الملفات المرجعية المعيارية

- OpenAPI master: `src/docs/openapi/ishraf-platform.openapi.json`
- OpenAPI auth subset: `src/docs/openapi/auth.openapi.json`
- Postman master: `src/docs/postman/ishraf-platform.postman_collection.json`
- Postman auth subset: `src/docs/postman/auth.postman_collection.json`
- Postman staging environment: `src/docs/postman/ishraf-platform.staging.postman_environment.json`
- Frontend execution docs: `src/docs/frontend-execution/README.md`




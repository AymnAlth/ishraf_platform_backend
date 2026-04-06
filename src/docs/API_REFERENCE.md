# Ishraf Platform Backend API Reference

هذا الملف هو المرجع البشري المختصر الحالي للباك إند.  
المصدر التنفيذي الأدق للعقود هو:

- `src/modules/*/{routes,controller,service,dto,validator,types}`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`

إذا تعارض أي نص في هذا الملف مع الكود، فالكود هو الحقيقة.

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

- `admin`: static data, assignments, route assignments, home locations
- `admin`, `driver`: trips access/operations
- `driver`: `GET /transport/route-assignments/me`

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
- `POST /transport/trips`
- `POST /transport/trips/ensure-daily`
- `GET /transport/trips`
- `GET /transport/trips/:id`
- `GET /transport/trips/:id/students`
- `POST /transport/trips/:id/start`
- `POST /transport/trips/:id/end`
- `POST /transport/trips/:id/locations`
- `POST /transport/trips/:id/events`
- `GET /transport/trips/:id/events`
- `GET /transport/students/:studentId/home-location`
- `PUT /transport/students/:studentId/home-location`
- `DELETE /transport/students/:studentId/home-location`

قواعد تشغيلية:

- driver references في الطبقات الحديثة تعتمد `users.id`.
- السطوح التشغيلية الخاصة بالرحلات live وتخضع لملكية route assignment/trip.

## Communication

الموديول: `src/modules/communication`

الصلاحيات:

- كل user نشط: الرسائل، announcements feed, notifications me
- `admin`: bulk messages, announcements management, notifications creation/bulk

المسارات:

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

- bulk endpoints admin-only.
- bulk messages تمنع self-targeting.
- announcements تدعم `targetRoles[]` مع إبقاء `targetRole` كحقل توافق.
- لا يوجد group thread surface؛ direct multi-target ينشئ one-to-one copies.

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

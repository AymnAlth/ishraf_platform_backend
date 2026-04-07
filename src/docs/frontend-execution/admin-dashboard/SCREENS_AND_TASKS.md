# Admin Dashboard Screens And Tasks

## 1. Session and bootstrap

1. login
2. hydrate current user with `GET /auth/me`
3. check readiness through `/health` and `/health/ready`
4. load `GET /academic-structure/context/active`
5. load `GET /reporting/dashboards/admin/me`

قاعدة:

- إذا كانت السطوح اليومية جزءًا من الشاشة، اقرأ `active context` قبل أي attendance/assessments/behavior/homework/reporting يومية.

## 2. User management

1. list users by role
2. create or update user
3. use `PATCH /users/:id/status` للتفعيل/التعطيل
4. خذ `users.id` من هذه surfaces عند الربط مع:
   - teachers
   - supervisors
   - drivers
   - parents

## 3. Academic setup

الترتيب المؤسسي:

1. create/review academic years
2. create/review semesters
3. set active context
4. manage grade levels
5. manage classes
6. manage subjects
7. manage subject offerings
8. manage teacher assignments
9. manage supervisor assignments

قاعدة:

- لا تنتقل إلى surfaces التشغيل اليومية قبل ضبط `Active Academic Context`.

## 4. Student lifecycle

1. create student
2. link parent
3. inspect student detail
4. manage academic enrollments
5. use promotions when needed

قاعدة:

- enrollment planning يتم عبر enrollments/promotions surfaces، وليس عبر تغيير UI assumptions على `students.class_id`.

## 5. Daily operations

### 5.1 Attendance

1. حمّل classes, subjects, teachers
2. أنشئ session عبر `POST /attendance/sessions`
3. افتح `GET /attendance/sessions/:id`
4. احفظ roster كاملة عبر `PUT /attendance/sessions/:id/records`
5. استخدم `PATCH /attendance/records/:attendanceId` للتعديل الفردي فقط

قواعد:

- admin يجب أن ترسل `teacherId`.
- يمكن إغفال `academicYearId` و`semesterId`; الباك يحلهما من active context.
- إذا أُرسلتا، يجب أن تطابقا السياق النشط.

### 5.2 Assessments

1. حمّل assessment types, classes, subjects, teachers
2. أنشئ assessment عبر `POST /assessments`
3. افتح `GET /assessments/:id/scores`
4. احفظ الدرجات عبر `PUT /assessments/:id/scores`
5. استخدم `PATCH /assessments/scores/:studentAssessmentId` للتعديل الفردي

قواعد:

- admin يجب أن ترسل `teacherId`.
- scores لا تقبل طلابًا خارج roster الاختبار.

### 5.3 Behavior

1. حمّل behavior categories
2. أنشئ behavior record
3. راجع timeline أو detail
4. عدل السجل عند الحاجة

### 5.4 Homework

1. حمّل classes, subjects, teachers
2. أنشئ homework
3. افتح detail/roster
4. احفظ submissions عبر `PUT /homework/:id/submissions`

قواعد:

- admin يجب أن ترسل `teacherId`.
- submissions لا تقبل طلابًا خارج roster الواجب.

## 6. System settings control plane

1. افتح `GET /system-settings`
2. اعرض groups الأربع الحالية:
   - `pushNotifications`
   - `transportMaps`
   - `analytics`
   - `imports`
3. عند فتح group detail استخدم `GET /system-settings/:group`
4. عند حفظ التعديل أرسل `PATCH /system-settings/:group` مع:
   - `reason`
   - `values`
5. بعد الحفظ:
   - أعد تحميل group نفسها
   - أو أعد تحميل `GET /system-settings`
6. استخدم `GET /system-settings/audit` لعرض trace التغييرات
7. استخدم `GET /system-settings/integrations/status` لعرض feature flags + outbox counts للتكاملات الخارجية

قاعدة:

- هذه screens ليست part of daily operations؛ هي control plane إدارية عامة.

قاعدة مهمة للـ onboarding:

- إذا عطل admin القيمة `imports.schoolOnboardingEnabled`
  - يجب أن تتوقف UI الخاصة بـ school onboarding import
  - لأن كل endpoints الخاصة بها سترجع `409 FEATURE_DISABLED`

## 7. Transport administration

### 7.1 Static management

1. manage buses
2. manage routes
3. manage route stops
4. manage student transport assignments
5. manage route assignments
6. maintain student home locations

### 7.2 Live operations

1. create trip manually أو استخدم `ensure-daily`
2. inspect detail and roster
3. start trip
4. stream locations or student events when needed
5. end trip

قاعدة:

- الرحلات live operations قد تستخدمها الإدارة للمراقبة أو التدخل، لكن التطبيق الأساسي لها هو driver flow.

## 8. Communication center

1. resolve recipients
2. send direct messages
3. use bulk messages / bulk notifications عندما تكون العملية متعددة الأهداف
4. publish announcements
5. read inbox/sent/notifications

## 9. Monitoring and reporting

1. use admin dashboard for summary
2. use admin preview parent/teacher/supervisor routes للمراقبة read-only
3. use student-scoped reporting routes للتحقيق في طالب محدد

## 10. School onboarding import

1. frontend local parse/validation
2. optionally read `GET /system-settings/imports` أو rely on previous control-plane screen state للتأكد أن `schoolOnboardingEnabled = true`
3. `POST /admin-imports/school-onboarding/dry-run`
4. اعرض:
   - `status`
   - `canApply`
   - `issues`
   - `summary`
   - `entityPlanCounts`
5. لا تسمح بـ `apply` إلا إذا كانت dry-run صالحة
6. `POST /admin-imports/school-onboarding/apply` باستخدام `dryRunId`
7. استخدم `history` لعرض attempts السابقة أو reopen التفاصيل

قاعدة:

- إذا رجعت endpoints import بـ `409 FEATURE_DISABLED`:
  - لا تحاول retry loop
  - اعرض أن feature أُغلقت من `System Settings > imports`

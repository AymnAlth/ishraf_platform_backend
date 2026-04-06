# Admin Dashboard Endpoint Map

## 1. Session bootstrap

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

## 2. Dashboard and readiness

- `GET /health`
- `GET /health/ready`
- `GET /reporting/dashboards/admin/me`
- `GET /academic-structure/context/active`

ملاحظات:

- `/health` و`/health/ready` خارج `/api/v1`.
- لوحة الإدارة يجب أن تقرأ `GET /academic-structure/context/active` مبكرًا، لأن السطوح اليومية تعتمد عليه.

## 3. User administration

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/status`

ملاحظات:

- استخدم `GET /users` لاختيار:
  - المعلمين
  - المشرفين
  - السائقين
  - أولياء الأمور
- عند ربط surfaces الحديثة:
  - أرسل `users.id`
  - لا تبنِ الفرونت على profile ids

## 4. Academic context and structure

- `GET /academic-structure/context/active`
- `PATCH /academic-structure/context/active`
- `POST /academic-structure/academic-years`
- `GET /academic-structure/academic-years`
- `GET /academic-structure/academic-years/:id`
- `PATCH /academic-structure/academic-years/:id`
- `PATCH /academic-structure/academic-years/:id/activate`
- `POST /academic-structure/academic-years/:academicYearId/semesters`
- `GET /academic-structure/academic-years/:academicYearId/semesters`
- `PATCH /academic-structure/semesters/:id`
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

ملاحظات:

- `PATCH /academic-structure/context/active` هو surface التشغيل الرسمي لتبديل السنة/الفصل النشطين.
- `subjects` هي master data على مستوى المرحلة.
- `subject-offerings` هي طبقة التفعيل داخل الفصل.
- `teacher-assignments` و`supervisor-assignments` تقبل identifiers الحديثة من طبقة المستخدمين.

## 5. Student administration

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

ملاحظات:

- `student_academic_enrollments` هي النموذج الأكاديمي الانتقالي الصحيح، لا تعتمد على `students.class_id` وحدها في UI الجديدة.
- `parentId` في surfaces الربط قد يقبل user id أو legacy profile id للتوافق، لكن الواجهة الجديدة يجب أن تستخدم `users.id`.

## 6. Daily academic operations

### 6.1 قواعد تشغيلية مشتركة

- هذه السطوح تعتمد `Active Academic Context`.
- `academicYearId` و`semesterId`:
  - يمكن إغفالهما
  - الباك يحلهما من السياق النشط
  - إذا أُرسلتا، يجب أن تطابقا السياق النشط
- إذا لم يكن السياق مهيأ:
  - سيعود `409 ACADEMIC_CONTEXT_NOT_CONFIGURED`

### 6.2 teacherId rule للوحة الإدارة

في `attendance`, `assessments`, `homework`:

- admin-created request: `teacherId` مطلوب
- أرسل `teacherId` من `GET /users?role=teacher`
- لا تعتمد على profile ids في UI الجديدة

### 6.3 Attendance

Relevant enum:

| Enum | Values |
| --- | --- |
| `ATTENDANCE_STATUS` | `present`, `absent`, `late`, `excused` |

Endpoints:

- `POST /attendance/sessions`
- `GET /attendance/sessions`
- `GET /attendance/sessions/:id`
- `PUT /attendance/sessions/:id/records`
- `PATCH /attendance/records/:attendanceId`

Domain errors:

| Code | المعنى |
| --- | --- |
| `ACADEMIC_CONTEXT_NOT_CONFIGURED` | لا توجد سنة/فصل نشطان |
| `ACTIVE_ACADEMIC_YEAR_ONLY` | `academicYearId` المرسلة لا تطابق السنة النشطة |
| `ACTIVE_SEMESTER_ONLY` | `semesterId` المرسلة لا تطابق الفصل النشط |
| `TEACHER_ID_REQUIRED` | admin أنشأ session بدون `teacherId` |
| `CLASS_YEAR_MISMATCH` | الصف لا ينتمي إلى السنة الأكاديمية المختارة |
| `SEMESTER_YEAR_MISMATCH` | الفصل لا ينتمي إلى السنة الأكاديمية المختارة |
| `SUBJECT_GRADE_LEVEL_MISMATCH` | المادة لا تتبع نفس مرحلة الصف |
| `SUBJECT_NOT_OFFERED_IN_SEMESTER` | المادة غير مفعلة في الفصل المحدد |
| `ATTENDANCE_DUPLICATE_STUDENT` | payload الحضور تحتوي نفس الطالب أكثر من مرة |
| `ATTENDANCE_ROSTER_STUDENT_MISSING` | payload لا تحتوي كل roster كاملة |
| `ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED` | payload تحتوي طالبًا خارج roster الجلسة |

قواعد خاصة:

- `PUT /attendance/sessions/:id/records` تتطلب full snapshot للـ roster: كل طالب active في الجلسة يجب أن يظهر مرة واحدة بالضبط.

### 6.4 Assessments

Endpoints:

- `POST /assessments/types`
- `GET /assessments/types`
- `POST /assessments`
- `GET /assessments`
- `GET /assessments/:id`
- `GET /assessments/:id/scores`
- `PUT /assessments/:id/scores`
- `PATCH /assessments/scores/:studentAssessmentId`

Domain errors:

| Code | المعنى |
| --- | --- |
| `ACADEMIC_CONTEXT_NOT_CONFIGURED` | لا توجد سنة/فصل نشطان |
| `ACTIVE_ACADEMIC_YEAR_ONLY` | `academicYearId` لا تطابق السنة النشطة |
| `ACTIVE_SEMESTER_ONLY` | `semesterId` لا يطابق الفصل النشط |
| `TEACHER_ID_REQUIRED` | admin أنشأ assessment بدون `teacherId` |
| `CLASS_YEAR_MISMATCH` | الصف لا ينتمي إلى السنة الأكاديمية المختارة |
| `SEMESTER_YEAR_MISMATCH` | الفصل لا ينتمي إلى السنة الأكاديمية المختارة |
| `SUBJECT_GRADE_LEVEL_MISMATCH` | المادة لا تتبع نفس مرحلة الصف |
| `SUBJECT_NOT_OFFERED_IN_SEMESTER` | المادة غير مفعلة في الفصل |
| `ASSESSMENT_SCORE_EXCEEDS_MAX_SCORE` | score أكبر من `maxScore` |
| `STUDENT_ASSESSMENT_DUPLICATE_STUDENT` | الطالب تكرر داخل payload الدرجات |
| `STUDENT_ASSESSMENT_STUDENT_NOT_ALLOWED` | الطالب لا ينتمي إلى roster الاختبار |

قواعد خاصة:

- admin-created assessment يجب أن يرسل `teacherId`.
- `PUT /assessments/:id/scores` لا تتطلب full snapshot لكل الطلاب، لكنها ترفض أي طالب خارج roster الاختبار.

### 6.5 Behavior

Endpoints:

- `POST /behavior/categories`
- `GET /behavior/categories`
- `POST /behavior/records`
- `GET /behavior/records`
- `GET /behavior/records/:id`
- `PATCH /behavior/records/:id`
- `GET /behavior/students/:studentId/records`

ملاحظات:

- behavior أيضًا surface تشغيلية مرتبطة بالسياق النشط.
- إذا أرسلت `academicYearId` أو `semesterId` في إنشاء السجل، يجب أن تطابقا السياق النشط.

### 6.6 Homework

Relevant enum:

| Enum | Values |
| --- | --- |
| `HOMEWORK_SUBMISSION_STATUS` | `submitted`, `not_submitted`, `late` |

Endpoints:

- `POST /homework`
- `GET /homework`
- `GET /homework/:id`
- `PUT /homework/:id/submissions`
- `GET /homework/students/:studentId`

Domain errors:

| Code | المعنى |
| --- | --- |
| `ACADEMIC_CONTEXT_NOT_CONFIGURED` | لا توجد سنة/فصل نشطان |
| `ACTIVE_ACADEMIC_YEAR_ONLY` | `academicYearId` لا تطابق السنة النشطة |
| `ACTIVE_SEMESTER_ONLY` | `semesterId` لا يطابق الفصل النشط |
| `TEACHER_ID_REQUIRED` | admin أنشأ homework بدون `teacherId` |
| `CLASS_YEAR_MISMATCH` | الصف لا ينتمي إلى السنة الأكاديمية المختارة |
| `SEMESTER_YEAR_MISMATCH` | الفصل لا ينتمي إلى السنة الأكاديمية المختارة |
| `SUBJECT_GRADE_LEVEL_MISMATCH` | المادة لا تتبع نفس مرحلة الصف |
| `SUBJECT_NOT_OFFERED_IN_SEMESTER` | المادة غير مفعلة في الفصل |
| `HOMEWORK_SUBMISSION_DUPLICATE_STUDENT` | الطالب تكرر داخل payload التسليمات |
| `HOMEWORK_SUBMISSION_STUDENT_NOT_ALLOWED` | الطالب لا ينتمي إلى roster الواجب |

قواعد خاصة:

- admin-created homework يجب أن ترسل `teacherId`.
- `PUT /homework/:id/submissions` لا تقبل طلابًا خارج roster الواجب.

## 7. Transport administration and live operations

### 7.1 Transport enums

| Enum | Values |
| --- | --- |
| `BUS_STATUS` | `active`, `inactive`, `maintenance` |
| `TRIP_TYPE` | `pickup`, `dropoff` |
| `TRIP_STATUS` | `scheduled`, `started`, `ended`, `cancelled` |
| `TRIP_STUDENT_EVENT_TYPE` | `boarded`, `dropped_off`, `absent` |
| `HOME_LOCATION_STATUS` | `pending`, `approved`, `rejected` |

### 7.2 Admin-only transport management

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
- `PATCH /transport/route-assignments/:id/deactivate`
- `GET /transport/students/:studentId/home-location`
- `PUT /transport/students/:studentId/home-location`
- `DELETE /transport/students/:studentId/home-location`

### 7.3 Live trip operations available to admin and driver

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

قواعد خاصة:

- `ensure-daily` هو المسار المفضل لإنشاء/إعادة استخدام رحلة يومية دون duplications.
- `homeLocation` لا يظهر في roster السائق إلا إذا كان `status = approved`.

Transport domain errors:

| Code | المعنى |
| --- | --- |
| `BUS_STOP_ROUTE_MISMATCH` | stop لا تتبع route المحددة |
| `INVALID_TRANSPORT_ROUTE_ASSIGNMENT_DATE_RANGE` | `endDate` قبل `startDate` |
| `TRANSPORT_ROUTE_ASSIGNMENT_NOT_ACTIVE_FOR_TRIP_DATE` | route assignment غير فعالة في تاريخ الرحلة |
| `TRIP_STATUS_START_INVALID` | محاولة start لرحلة ليست `scheduled` |
| `TRIP_STATUS_END_INVALID` | محاولة end لرحلة ليست `started` |
| `TRIP_LOCATION_STATUS_INVALID` | location لا تسجل إلا أثناء `started` |
| `TRIP_EVENT_STATUS_INVALID` | event لا يسجل إلا أثناء `started` أو `ended` |
| `TRIP_EVENT_STOP_REQUIRED` | `stopId` مطلوب لـ `boarded` و`dropped_off` |
| `TRIP_EVENT_STOP_NOT_ALLOWED` | `stopId` ممنوع مع `absent` |
| `STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND` | الطالب لا يملك assignment تغطي تاريخ الرحلة |
| `TRIP_STUDENT_ROUTE_MISMATCH` | route assignment الخاصة بالطالب لا تطابق route الرحلة |
| `TRIP_EVENT_STOP_ROUTE_MISMATCH` | stop المرسلة لا تتبع route الرحلة |

## 8. Communication

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

ملاحظات:

- `bulk messages` و`bulk notifications` هي authoritative backend surfaces.
- لا تنفذ loops من الفرونت بدلها.

## 9. Reporting and monitoring

- `GET /reporting/dashboards/admin/me`
- `GET /reporting/admin-preview/parents/:parentUserId/dashboard`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/profile`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status`
- `GET /reporting/admin-preview/teachers/:teacherUserId/dashboard`
- `GET /reporting/admin-preview/supervisors/:supervisorUserId/dashboard`
- `GET /reporting/students/:studentId/profile`
- `GET /reporting/students/:studentId/reports/attendance-summary`
- `GET /reporting/students/:studentId/reports/assessment-summary`
- `GET /reporting/students/:studentId/reports/behavior-summary`
- `GET /reporting/transport/summary`

ملاحظات:

- `admin-preview` surfaces read-only.
- `parentUserId`, `teacherUserId`, `supervisorUserId` في preview routes هي `users.id`.

## 10. School onboarding import

- `POST /admin-imports/school-onboarding/dry-run`
- `POST /admin-imports/school-onboarding/apply`
- `GET /admin-imports/school-onboarding/history`
- `GET /admin-imports/school-onboarding/history/:importId`

التسلسل الرسمي:

1. frontend local parse/validation
2. `dry-run`
3. قراءة `status`, `canApply`, `issues`, `summary`, `entityPlanCounts`
4. `apply` باستخدام `dryRunId`
5. استخدام `history` لإعادة فتح dry-run/apply السابقة

حقول محورية:

| Field | المعنى |
| --- | --- |
| `status` | `validated`, `rejected`, أو `applied` حسب المرحلة |
| `canApply` | هل dry-run صالحة للانتقال إلى apply |
| `alreadyApplied` | apply أُعيد استدعاؤها على dryRun مطبقة مسبقًا |

ملاحظات:

- `apply` لا تعيد إرسال workbook كاملة.
- `apply` تتطلب `dryRunId` لعملية dry-run ناجحة.
- v1 `create-only` ولا تنفذ sync أو update أو delete.

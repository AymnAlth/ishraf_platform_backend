# Teacher App Backend Contract (Code-Truth, Detailed)

آخر مزامنة مع الكود: `2026-04-16`

الدور المستهدف: `teacher`

## 1) نطاق التطبيق

تطبيق المعلم يعتمد على:

1. `auth` للجلسة.
2. `reporting` (لوحة المعلم + تقارير الطالب).
3. `attendance` (إنشاء جلسة + حفظ/تعديل سجلات).
4. `assessments` (إنشاء التقييم + إدارة الدرجات).
5. `behavior` (إنشاء/تحديث سجلات السلوك).
6. `homework` (إنشاء الواجب + حفظ التسليمات).
7. `communication` (رسائل مباشرة + إشعارات + announcements active + device registry).
8. `analytics` (قراءة class overview للصفوف المعيّنة + feedback على snapshots المنشورة).

## 2) قواعد تشغيل إلزامية

1. Active Academic Context يحكم attendance/assessments/behavior/homework/reporting.
2. في create flows للمعلم:
   - `teacherId` ممنوع في:
     - `POST /assessments`
     - `POST /homework`
   - الخادم يستنتج معرّف المعلم من الجلسة.
3. حفظ الحضور (`PUT /attendance/sessions/:id/records`) يعمل بمنطق full snapshot:
   - يجب إرسال كل roster مرة واحدة لكل طالب.
   - لا يسمح بتكرار `studentId`.
4. حفظ الدرجات/تسليمات الواجب:
   - يمنع إدخال طالب خارج roster الفعلية.
5. ownership gates:
   - المعلم يصل فقط للصفوف/الطلاب المرتبطين بتكليفات المعلم في السنة النشطة.
6. analytics class overview:
   - `GET /analytics/classes/:classId/overview`
   - يعمل فقط إذا كان المعلم معيّنًا على الصف في السنة النشطة.
7. feedback analytics:
   - `POST /analytics/snapshots/:snapshotId/feedback`
   - لا يقبل snapshots غير `approved` لغير `admin`.

## 3) الأخطاء التي يجب أن يفهمها UX

### أخطاء السياق الدراسي
- `ACADEMIC_CONTEXT_NOT_CONFIGURED` (`409`)
- `ACTIVE_ACADEMIC_YEAR_ONLY` (`400`)
- `ACTIVE_SEMESTER_ONLY` (`400`)

### أخطاء المواد/الفصول
- `CLASS_YEAR_MISMATCH`
- `SEMESTER_YEAR_MISMATCH`
- `SUBJECT_GRADE_LEVEL_MISMATCH`
- `SUBJECT_NOT_OFFERED_IN_SEMESTER`

### أخطاء attendance
- `ATTENDANCE_DUPLICATE_STUDENT`
- `ATTENDANCE_ROSTER_STUDENT_MISSING`
- `ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED`

### أخطاء assessments/homework
- `TEACHER_ID_NOT_ALLOWED`
- `ASSESSMENT_SCORE_EXCEEDS_MAX_SCORE`
- `STUDENT_ASSESSMENT_STUDENT_NOT_ALLOWED`
- `HOMEWORK_SUBMISSION_DUPLICATE_STUDENT`
- `HOMEWORK_SUBMISSION_STUDENT_NOT_ALLOWED`

### أخطاء behavior
- `BEHAVIOR_CATEGORY_INACTIVE`
- `STUDENT_YEAR_MISMATCH`
- `BEHAVIOR_ACTOR_NOT_ALLOWED`

## 4) عقود الطلب الحرجة (المفاتيح الفعلية)

### Attendance
- `POST /attendance/sessions`:
  - `classId`, `subjectId`, `sessionDate`, `periodNo`
  - optional: `academicYearId`, `semesterId`, `title`, `notes`, `teacherId`
- `PUT /attendance/sessions/:id/records`:
  - `records[]`:
    - `studentId`
    - `status` = `present|absent|late|excused`
    - `notes?`
- `PATCH /attendance/records/:attendanceId`:
  - `status?`, `notes?` (واحد على الأقل)

### Assessments
- `POST /assessments`:
  - `assessmentTypeId`, `classId`, `subjectId`, `title`, `maxScore`, `assessmentDate`
  - optional: `teacherId`, `academicYearId`, `semesterId`, `description`, `weight`, `isPublished`
- `PUT /assessments/:id/scores`:
  - `records[]`: `studentId`, `score`, `remarks?`
- `PATCH /assessments/scores/:studentAssessmentId`:
  - `score?`, `remarks?`

### Behavior
- `POST /behavior/records`:
  - `studentId`, `behaviorCategoryId`, `behaviorDate`
  - optional: `academicYearId`, `semesterId`, `description`, `severity`, `teacherId`, `supervisorId`
- `PATCH /behavior/records/:id`:
  - optional: `behaviorCategoryId`, `academicYearId`, `semesterId`, `description`, `severity`, `behaviorDate`

### Homework
- `POST /homework`:
  - `classId`, `subjectId`, `title`, `assignedDate`, `dueDate`
  - optional: `teacherId`, `academicYearId`, `semesterId`, `description`
- `PUT /homework/:id/submissions`:
  - `records[]`:
    - `studentId`
    - `status` = `submitted|not_submitted|late`
    - `submittedAt?`
    - `notes?`

### Communication
- `POST /communication/devices`:
  - `providerKey`, `platform`, `appId`, `deviceToken`, `subscriptions[]`, `deviceName?`
- `PATCH /communication/devices/:deviceId`:
  - `deviceToken?`, `deviceName?`, `subscriptions?`
- `POST /communication/messages`:
  - `receiverUserId`, `messageBody`

### Analytics
- `GET /analytics/classes/:classId/overview`
- `POST /analytics/snapshots/:snapshotId/feedback`:
  - `rating?`
  - `feedbackText?`
  - واحد منهما على الأقل

## 5) ما لا يملكه المعلم

1. كل مسارات الإدارة:
   - `/users/*`
   - `/academic-structure/*`
   - `/students/*`
   - `/system-settings/*`
   - `/admin-imports/*`
2. communication admin surfaces:
   - `POST /communication/messages/bulk`
   - `POST /communication/announcements`
   - `POST /communication/notifications`
   - `POST /communication/notifications/bulk`
3. analytics admin surfaces:
   - كل `POST /analytics/jobs/*`
   - `POST /analytics/snapshots/:snapshotId/review`
   - `GET /analytics/teachers/:teacherId/compliance-summary`
   - `GET /analytics/admin/operational-digest`
   - `GET /analytics/transport/routes/:routeId/anomalies`

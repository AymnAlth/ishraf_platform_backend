# Teacher App QA And Acceptance (Code-Truth, Detailed)

## 1) Session and Role

1. login + me:
   - `POST /auth/login` ثم `GET /auth/me`
   - يجب أن يرجع role = `teacher`.
2. access token expiry:
   - أول `401` => `POST /auth/refresh` مرة واحدة ثم retry.

## 2) Attendance Scenarios

1. create session happy path:
   - `POST /attendance/sessions` => `201`.
2. full snapshot save:
   - `PUT /attendance/sessions/:id/records` مع roster كاملة => `200`.
3. duplicate student in records:
   - يجب رفضه بـ `ATTENDANCE_DUPLICATE_STUDENT`.
4. missing student from roster:
   - `ATTENDANCE_ROSTER_STUDENT_MISSING`.
5. extra student خارج roster:
   - `ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED`.

## 3) Assessments Scenarios

1. create assessment as teacher:
   - إرسال `teacherId` يجب أن يفشل بـ `TEACHER_ID_NOT_ALLOWED`.
2. save scores with valid roster:
   - `PUT /assessments/:id/scores` => `200`.
3. score > maxScore:
   - `ASSESSMENT_SCORE_EXCEEDS_MAX_SCORE`.
4. student خارج roster:
   - `STUDENT_ASSESSMENT_STUDENT_NOT_ALLOWED`.

## 4) Behavior Scenarios

1. create behavior record valid:
   - `POST /behavior/records` => `201`.
2. inactive category:
   - `BEHAVIOR_CATEGORY_INACTIVE`.
3. student-year mismatch:
   - `STUDENT_YEAR_MISMATCH`.
4. إرسال `teacherId` أو `supervisorId` من المعلم:
   - `BEHAVIOR_ACTOR_NOT_ALLOWED`.

## 5) Homework Scenarios

1. create homework as teacher:
   - وجود `teacherId` في الطلب يجب أن يرفض بـ `TEACHER_ID_NOT_ALLOWED`.
2. dueDate earlier than assignedDate:
   - validation failure (`400`).
3. duplicate student in submissions:
   - `HOMEWORK_SUBMISSION_DUPLICATE_STUDENT`.
4. student خارج roster:
   - `HOMEWORK_SUBMISSION_STUDENT_NOT_ALLOWED`.

## 6) Reporting Ownership

1. `GET /reporting/students/:studentId/*` داخل scope المعلم => `200`.
2. طالب خارج assignment => `403`.

## 7) Communication Baseline

1. device lifecycle:
   - register/update/delete يعمل بدون أخطاء.
2. direct messaging:
   - `POST /communication/messages` => `201`.
3. inbox/sent/notifications pagination:
   - تعمل مع query `page/limit` وتحديث read state.

## 8) Context Consistency

1. عند غياب السياق الدراسي:
   - `409 ACADEMIC_CONTEXT_NOT_CONFIGURED`.
2. عند mismatch في year/semester:
   - `ACTIVE_ACADEMIC_YEAR_ONLY` أو `ACTIVE_SEMESTER_ONLY`.

## 9) Analytics

1. `GET /analytics/classes/:classId/overview`:
   - داخل assignment + snapshot approved => `200`
   - خارج assignment => `403`
2. إذا لم توجد snapshot منشورة بعد:
   - `404`
   - الواجهة يجب أن تعرض empty-state وليس خطأ تقنيًا عامًا.
3. `POST /analytics/snapshots/:snapshotId/feedback`:
   - يقبل `rating` أو `feedbackText` أو الاثنين.
   - يرفض الطلب الفارغ (`400`).
   - يرفض snapshot غير منشورة (`403`) لغير admin.

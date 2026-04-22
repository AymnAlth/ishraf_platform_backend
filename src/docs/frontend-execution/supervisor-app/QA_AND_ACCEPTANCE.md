# Supervisor App QA And Acceptance (Code-Truth, Detailed)

## 1) Session and Access

1. login + me:
   - role يجب أن يكون `supervisor`.
2. refresh:
   - عند `401` يتم `POST /auth/refresh` مرة واحدة ثم retry.

## 2) Attendance Supervision

1. read session list/detail ضمن scope:
   - `GET /attendance/sessions`, `GET /attendance/sessions/:id` => `200`.
2. save/patch attendance ضمن scope:
   - `PUT /attendance/sessions/:id/records`
   - `PATCH /attendance/records/:attendanceId`
3. forbidden create:
   - `POST /attendance/sessions` يجب أن يفشل (`403`).
4. full-snapshot constraints:
   - duplicate/missing/out-of-roster students يجب أن تُرفض بأكواد attendance roster.

## 3) Behavior

1. create/read/update behavior within scope:
   - success paths `200/201`.
2. inactive category:
   - `BEHAVIOR_CATEGORY_INACTIVE`.
3. student out of active year:
   - `STUDENT_YEAR_MISMATCH`.
4. actor ids not allowed for supervisor:
   - `BEHAVIOR_ACTOR_NOT_ALLOWED` عند تمرير `teacherId/supervisorId`.

## 4) Reporting Ownership

1. `GET /reporting/students/:studentId/*`:
   - داخل assignment => `200`.
   - خارج assignment => `403`.

## 5) Communication Baseline

1. device register/update/delete تعمل.
2. direct messaging + inbox/sent/conversation تعمل.
3. notifications list + mark-read تعمل.

## 6) Context Consistency

1. `409 ACADEMIC_CONTEXT_NOT_CONFIGURED` يجب أن تظهر كحالة تشغيلية.
2. `ACTIVE_ACADEMIC_YEAR_ONLY` و`ACTIVE_SEMESTER_ONLY` يجب أن تُعرض كرسالة context mismatch.

## 7) Regression Guard

1. لا تظهر أي UI entry لأسطح غير مسموحة:
   - assessments/homework management
   - admin modules
   - attendance create session

## 8) Analytics

1. `GET /analytics/classes/:classId/overview`:
   - داخل assignment + snapshot approved => `200`
   - خارج assignment => `403`
2. إذا لم توجد snapshot منشورة بعد:
   - `404`
   - الواجهة تعرض empty-state تشغيلية.
3. `POST /analytics/snapshots/:snapshotId/feedback`:
   - يقبل `rating` أو `feedbackText` أو الاثنين.
   - يرفض snapshot غير منشورة (`403`) لغير admin.

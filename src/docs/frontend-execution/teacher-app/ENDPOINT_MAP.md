# Teacher App Endpoint Map

## 1. Session

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

## 2. Teacher dashboard

- `GET /reporting/dashboards/teacher/me`

## 3. Active academic context rule

هذه القاعدة تنطبق على attendance, assessments, behavior, homework, والتقارير اليومية:

- يمكن إغفال `academicYearId` و`semesterId`
- الباك يحلهما من السياق النشط
- إذا أُرسلتا، يجب أن تطابقا السياق النشط

Relevant errors:

| Code | المعنى |
| --- | --- |
| `ACADEMIC_CONTEXT_NOT_CONFIGURED` | لا توجد سنة/فصل نشطان |
| `ACTIVE_ACADEMIC_YEAR_ONLY` | `academicYearId` لا تطابق السنة النشطة |
| `ACTIVE_SEMESTER_ONLY` | `semesterId` لا يطابق الفصل النشط |

## 4. Attendance

- `POST /attendance/sessions`
- `GET /attendance/sessions`
- `GET /attendance/sessions/:id`
- `PUT /attendance/sessions/:id/records`
- `PATCH /attendance/records/:attendanceId`

Teacher payload rules:

- teacher-created attendance session:
  - يجب ألا ترسل `teacherId`
  - المعلم يُحل من الجلسة
- `PUT /attendance/sessions/:id/records`:
  - يتطلب roster كاملة
  - كل طالب active يجب أن يظهر مرة واحدة بالضبط

Domain errors:

| Code | المعنى |
| --- | --- |
| `CLASS_YEAR_MISMATCH` | الصف لا ينتمي إلى السنة المحددة |
| `SEMESTER_YEAR_MISMATCH` | الفصل لا ينتمي إلى السنة المحددة |
| `SUBJECT_GRADE_LEVEL_MISMATCH` | المادة لا تتبع نفس مرحلة الصف |
| `SUBJECT_NOT_OFFERED_IN_SEMESTER` | المادة غير مفعلة في الفصل |
| `ATTENDANCE_DUPLICATE_STUDENT` | الطالب مكرر داخل payload |
| `ATTENDANCE_ROSTER_STUDENT_MISSING` | طالب roster مفقود من payload |
| `ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED` | payload تحتوي طالبًا خارج roster الجلسة |

## 5. Assessments

- `GET /assessments/types`
- `POST /assessments`
- `GET /assessments`
- `GET /assessments/:id`
- `GET /assessments/:id/scores`
- `PUT /assessments/:id/scores`
- `PATCH /assessments/scores/:studentAssessmentId`

Teacher payload rules:

- teacher-created assessment:
  - `teacherId` ممنوع
  - إذا أُرسلت سيعود `TEACHER_ID_NOT_ALLOWED`
- `PUT /assessments/:id/scores`:
  - لا يتطلب full snapshot
  - لكنه يرفض أي طالب خارج roster

Domain errors:

| Code | المعنى |
| --- | --- |
| `TEACHER_ID_NOT_ALLOWED` | المعلم أرسل `teacherId` في create assessment |
| `CLASS_YEAR_MISMATCH` | الصف لا ينتمي إلى السنة المحددة |
| `SEMESTER_YEAR_MISMATCH` | الفصل لا ينتمي إلى السنة المحددة |
| `SUBJECT_GRADE_LEVEL_MISMATCH` | المادة لا تتبع نفس مرحلة الصف |
| `SUBJECT_NOT_OFFERED_IN_SEMESTER` | المادة غير مفعلة في الفصل |
| `ASSESSMENT_SCORE_EXCEEDS_MAX_SCORE` | score أكبر من `maxScore` |
| `STUDENT_ASSESSMENT_DUPLICATE_STUDENT` | الطالب مكرر داخل payload الدرجات |
| `STUDENT_ASSESSMENT_STUDENT_NOT_ALLOWED` | الطالب لا ينتمي إلى roster الاختبار |

## 6. Behavior

- `GET /behavior/categories`
- `POST /behavior/records`
- `GET /behavior/records`
- `GET /behavior/records/:id`
- `PATCH /behavior/records/:id`
- `GET /behavior/students/:studentId/records`

ملاحظات:

- behavior record ترتبط بالسياق الأكاديمي النشط.
- الوصول إلى سجلات behavior محكوم بملكية teacher assignment على الصف/السنة.

## 7. Homework

- `POST /homework`
- `GET /homework`
- `GET /homework/:id`
- `PUT /homework/:id/submissions`
- `GET /homework/students/:studentId`

Teacher payload rules:

- teacher-created homework:
  - `teacherId` ممنوع
  - إذا أُرسلت سيعود `TEACHER_ID_NOT_ALLOWED`
- `PUT /homework/:id/submissions`:
  - لا تقبل طلابًا خارج roster الواجب

Domain errors:

| Code | المعنى |
| --- | --- |
| `TEACHER_ID_NOT_ALLOWED` | المعلم أرسل `teacherId` في create homework |
| `CLASS_YEAR_MISMATCH` | الصف لا ينتمي إلى السنة المحددة |
| `SEMESTER_YEAR_MISMATCH` | الفصل لا ينتمي إلى السنة المحددة |
| `SUBJECT_GRADE_LEVEL_MISMATCH` | المادة لا تتبع نفس مرحلة الصف |
| `SUBJECT_NOT_OFFERED_IN_SEMESTER` | المادة غير مفعلة في الفصل |
| `HOMEWORK_SUBMISSION_DUPLICATE_STUDENT` | الطالب مكرر داخل payload التسليمات |
| `HOMEWORK_SUBMISSION_STUDENT_NOT_ALLOWED` | الطالب لا ينتمي إلى roster الواجب |

## 8. Student reporting

- `GET /reporting/students/:studentId/profile`
- `GET /reporting/students/:studentId/reports/attendance-summary`
- `GET /reporting/students/:studentId/reports/assessment-summary`
- `GET /reporting/students/:studentId/reports/behavior-summary`

ملاحظات:

- الوصول ليس عامًا.
- المعلم لا يرى إلا الطالب الذي يملك له assignment على صفه/سنته.

## 9. Communication

- `GET /communication/recipients`
- `POST /communication/messages`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`
- `GET /communication/announcements/active`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`

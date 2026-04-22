# Teacher App Screens And Tasks (Execution Playbook)

## 1) Session Boot

1. `POST /auth/login`
2. `GET /auth/me` للتأكد أن الدور `teacher`.
3. `GET /reporting/dashboards/teacher/me` لتهيئة dashboard.
4. فعّل refresh strategy باستخدام `POST /auth/refresh`.

## 2) Dashboard + Student Drilldown

1. من dashboard اختر الطالب.
2. اطلب بالتتابع:
   - `GET /reporting/students/:studentId/profile`
   - `GET /reporting/students/:studentId/reports/attendance-summary`
   - `GET /reporting/students/:studentId/reports/assessment-summary`
   - `GET /reporting/students/:studentId/reports/behavior-summary`
3. إذا عاد `403` فهذا ownership denial وليس مشكلة rendering.

## 3) Attendance Screen Flow

1. Create session:
   - `POST /attendance/sessions`
2. List/search:
   - `GET /attendance/sessions` (filters + pagination)
3. Open detail:
   - `GET /attendance/sessions/:id`
4. Save full roster snapshot:
   - `PUT /attendance/sessions/:id/records`
5. تعديل فردي:
   - `PATCH /attendance/records/:attendanceId`

قواعد UX:

1. payload الحضور يجب أن يحتوي كل الطلاب مرة واحدة.
2. duplicate `studentId` يجب منعه من الواجهة قبل الإرسال.
3. عند `ATTENDANCE_ROSTER_STUDENT_MISSING` أو `ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED` اعرض رسالة تدل على ضرورة مزامنة roster.

## 4) Assessments Screen Flow

1. load types:
   - `GET /assessments/types`
2. create assessment:
   - `POST /assessments`
3. list:
   - `GET /assessments`
4. detail:
   - `GET /assessments/:id`
5. scores roster:
   - `GET /assessments/:id/scores`
6. save all scores:
   - `PUT /assessments/:id/scores`
7. patch one score:
   - `PATCH /assessments/scores/:studentAssessmentId`

قواعد UX:

1. لا ترسل `teacherId` في create assessment كمعلم.
2. امنع إدخال score أكبر من `maxScore` في الواجهة.
3. عند `STUDENT_ASSESSMENT_STUDENT_NOT_ALLOWED` أعد مزامنة roster من endpoint scores قبل إعادة الإرسال.

## 5) Behavior Screen Flow

1. load categories:
   - `GET /behavior/categories`
2. create record:
   - `POST /behavior/records`
3. list:
   - `GET /behavior/records`
4. detail:
   - `GET /behavior/records/:id`
5. update:
   - `PATCH /behavior/records/:id`
6. student timeline:
   - `GET /behavior/students/:studentId/records`

قواعد UX:

1. لا ترسل `teacherId/supervisorId` من واجهة المعلم.
2. عند `BEHAVIOR_CATEGORY_INACTIVE` اطلب تحديث categories من جديد.

## 6) Homework Screen Flow

1. create homework:
   - `POST /homework`
2. list:
   - `GET /homework`
3. detail:
   - `GET /homework/:id`
4. save submissions:
   - `PUT /homework/:id/submissions`
5. student view:
   - `GET /homework/students/:studentId`

قواعد UX:

1. لا ترسل `teacherId` في create homework.
2. تحقق أن `dueDate >= assignedDate`.
3. عند `HOMEWORK_SUBMISSION_STUDENT_NOT_ALLOWED` أعد تحميل detail roster قبل إعادة الحفظ.

## 7) Communication Screen Flow

1. register device:
   - `POST /communication/devices`
2. update/remove device:
   - `PATCH /communication/devices/:deviceId`
   - `DELETE /communication/devices/:deviceId`
3. recipients:
   - `GET /communication/recipients`
4. send message:
   - `POST /communication/messages`
5. inbox/sent/conversation:
   - `GET /communication/messages/inbox`
   - `GET /communication/messages/sent`
   - `GET /communication/messages/conversations/:otherUserId`
6. mark read:
   - `PATCH /communication/messages/:messageId/read`
   - `PATCH /communication/notifications/:notificationId/read`
7. announcements + notifications:
   - `GET /communication/announcements/active`
   - `GET /communication/notifications/me`

## 8) Class Analytics Screen Flow

1. من قائمة الصفوف المرتبطة بالمعلم اختر `classId`.
2. اطلب:
   - `GET /analytics/classes/:classId/overview`
3. اعرض:
   - `snapshot.reviewStatus`
   - `snapshot.publishedAt`
   - `analysisMode`
   - `computedAt`
   - `class`
   - `insight.summary`
   - `insight.recommendedActions`
4. feedback:
   - `POST /analytics/snapshots/:snapshotId/feedback`

قواعد UX:

1. لا تنشئ jobs من التطبيق.
2. إذا لم توجد snapshot منشورة بعد، اعرض empty-state تشغيلية.
3. أي `403` هنا يعني أن الصف خارج assignment أو أن snapshot غير ضمن صلاحية المعلم.

## 9) Active Context Rule

1. إذا لم تُرسل `academicYearId/semesterId` سيحلها الخادم من active context.
2. إذا أرسلتها من الشاشة يجب أن تطابق القيم النشطة.
3. عند `409 ACADEMIC_CONTEXT_NOT_CONFIGURED`:
   - اعرض شاشة تشغيلية واضحة بدل generic error.

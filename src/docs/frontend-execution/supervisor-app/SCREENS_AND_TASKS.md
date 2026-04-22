# Supervisor App Screens And Tasks (Execution Playbook)

## 1) Session Boot

1. `POST /auth/login`
2. `GET /auth/me` للتأكد من role `supervisor`.
3. `GET /reporting/dashboards/supervisor/me` لتهيئة الشاشات.
4. فعّل refresh strategy (`POST /auth/refresh`) عند انتهاء access token.

## 2) Attendance Supervision Flow

1. list sessions:
   - `GET /attendance/sessions`
2. open session:
   - `GET /attendance/sessions/:id`
3. save roster:
   - `PUT /attendance/sessions/:id/records`
4. patch one attendance record:
   - `PATCH /attendance/records/:attendanceId`

قواعد UX:

1. لا تعرض زر إنشاء جلسة حضور للمشرف (`POST /attendance/sessions` غير مسموح).
2. حفظ records يجب أن يبقى full snapshot للروستر.
3. عند `403` أو roster mismatch codes، أعد تحميل session detail قبل المحاولة التالية.

## 3) Behavior Flow

1. load categories:
   - `GET /behavior/categories`
2. create:
   - `POST /behavior/records`
3. list/detail:
   - `GET /behavior/records`
   - `GET /behavior/records/:id`
4. update:
   - `PATCH /behavior/records/:id`
5. student timeline:
   - `GET /behavior/students/:studentId/records`

قواعد UX:

1. لا ترسل `teacherId` أو `supervisorId` من التطبيق.
2. عند `BEHAVIOR_CATEGORY_INACTIVE` حدّث categories تلقائيًا.
3. عند `STUDENT_YEAR_MISMATCH` أعرض رسالة أن الطالب خارج العام الدراسي النشط.

## 4) Student Reporting Flow

1. profile:
   - `GET /reporting/students/:studentId/profile`
2. attendance summary:
   - `GET /reporting/students/:studentId/reports/attendance-summary`
3. assessment summary:
   - `GET /reporting/students/:studentId/reports/assessment-summary`
4. behavior summary:
   - `GET /reporting/students/:studentId/reports/behavior-summary`

قاعدة UX:

1. أي `403` هنا ownership denial، وليس "طالب غير موجود" من منظور المستخدم.

## 5) Communication Flow

1. device lifecycle:
   - `POST /communication/devices`
   - `PATCH /communication/devices/:deviceId`
   - `DELETE /communication/devices/:deviceId`
2. messaging:
   - `GET /communication/recipients`
   - `POST /communication/messages`
   - `GET /communication/messages/inbox`
   - `GET /communication/messages/sent`
   - `GET /communication/messages/conversations/:otherUserId`
   - `PATCH /communication/messages/:messageId/read`
3. announcements + notifications:
   - `GET /communication/announcements/active`
   - `GET /communication/notifications/me`
   - `PATCH /communication/notifications/:notificationId/read`

## 6) Class Analytics Flow

1. من قائمة الصفوف داخل supervisor scope اختر `classId`.
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

1. لا تحاول تشغيل jobs من التطبيق.
2. إذا لم توجد snapshot منشورة بعد، اعرض empty-state تشغيلية.
3. `403` هنا يعني assignment scope violation أو snapshot غير متاحة للمشرف.

## 7) Context Handling

1. عند `409 ACADEMIC_CONTEXT_NOT_CONFIGURED`:
   - أعرض حالة تشغيلية واضحة بدل قائمة فارغة.
2. عند `ACTIVE_ACADEMIC_YEAR_ONLY` أو `ACTIVE_SEMESTER_ONLY`:
   - نفّذ re-sync للسياق ثم أعد الطلب.

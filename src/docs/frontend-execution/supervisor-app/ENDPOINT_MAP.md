# Supervisor App Endpoint Map (Code-Truth, Endpoint-by-Endpoint)

كل المسارات أدناه تحت `/api/v1` ما لم يُذكر غير ذلك.

## 1) Auth

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | بدء الجلسة | `identifier`, `password` |
| `GET` | `/auth/me` | قراءة هوية الجلسة | Bearer token |
| `POST` | `/auth/refresh` | تدوير access token | `refreshToken` |
| `POST` | `/auth/logout` | إنهاء الجلسة | `refreshToken` |
| `POST` | `/auth/change-password` | تغيير كلمة المرور | `currentPassword`, `newPassword` |

## 2) Reporting

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `GET` | `/reporting/dashboards/supervisor/me` | لوحة المشرف | بدون body |
| `GET` | `/reporting/students/:studentId/profile` | ملف الطالب | path `studentId` |
| `GET` | `/reporting/students/:studentId/reports/attendance-summary` | تقرير الحضور | path `studentId` |
| `GET` | `/reporting/students/:studentId/reports/assessment-summary` | تقرير التقييمات | path `studentId` |
| `GET` | `/reporting/students/:studentId/reports/behavior-summary` | تقرير السلوك | path `studentId` |

## 3) Attendance (Supervisor Scope)

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `GET` | `/attendance/sessions` | قائمة الجلسات | query: `page`, `limit`, `sortBy`, `sortOrder`, filters: `classId`, `subjectId`, `teacherId`, `academicYearId`, `semesterId`, `sessionDate`, `dateFrom`, `dateTo` |
| `GET` | `/attendance/sessions/:id` | تفاصيل الجلسة + roster | path `id` |
| `PUT` | `/attendance/sessions/:id/records` | حفظ roster الحضور | `records[]` with `studentId`, `status`, `notes?` |
| `PATCH` | `/attendance/records/:attendanceId` | تعديل سجل حضور فردي | `status?`, `notes?` |

## 4) Behavior

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `GET` | `/behavior/categories` | فئات السلوك | بدون body |
| `POST` | `/behavior/records` | إنشاء سجل سلوك | `studentId`, `behaviorCategoryId`, `behaviorDate`, optional: `academicYearId`, `semesterId`, `description`, `severity`, `teacherId`, `supervisorId` |
| `GET` | `/behavior/records` | قائمة السجلات | query: `page`, `limit`, `sortBy`, `sortOrder`, filters: `studentId`, `behaviorCategoryId`, `behaviorType`, `academicYearId`, `semesterId`, `teacherId`, `supervisorId`, `behaviorDate`, `dateFrom`, `dateTo` |
| `GET` | `/behavior/records/:id` | تفاصيل سجل | path `id` |
| `PATCH` | `/behavior/records/:id` | تعديل سجل | optional: `behaviorCategoryId`, `academicYearId`, `semesterId`, `description`, `severity`, `behaviorDate` |
| `GET` | `/behavior/students/:studentId/records` | سجل الطالب السلوكي | path `studentId` |

## 5) Communication

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `POST` | `/communication/devices` | تسجيل جهاز FCM | `providerKey`, `platform`, `appId`, `deviceToken`, `subscriptions[]`, `deviceName?` |
| `PATCH` | `/communication/devices/:deviceId` | تحديث جهاز | `deviceToken?`, `deviceName?`, `subscriptions?` |
| `DELETE` | `/communication/devices/:deviceId` | إلغاء تسجيل جهاز | path `deviceId` |
| `GET` | `/communication/recipients` | البحث عن مستلمين | query: `page`, `limit`, `search?`, `role?` |
| `POST` | `/communication/messages` | إرسال رسالة مباشرة | `receiverUserId`, `messageBody` |
| `GET` | `/communication/messages/inbox` | inbox | query paginated + `isRead?` |
| `GET` | `/communication/messages/sent` | sent | query paginated + `receiverUserId?` |
| `GET` | `/communication/messages/conversations/:otherUserId` | thread | path `otherUserId`, query paginated |
| `PATCH` | `/communication/messages/:messageId/read` | mark message read | path `messageId` |
| `GET` | `/communication/announcements/active` | الإعلانات النشطة | بدون body |
| `GET` | `/communication/notifications/me` | إشعاراتي | query paginated + `isRead?`, `notificationType?` |
| `PATCH` | `/communication/notifications/:notificationId/read` | mark notification read | path `notificationId` |

## 6) Analytics

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `GET` | `/analytics/classes/:classId/overview` | قراءة class overview للصف المعيّن | path `classId` |
| `POST` | `/analytics/snapshots/:snapshotId/feedback` | إرسال feedback على snapshot منشورة | `rating?`, `feedbackText?` |

قواعد تشغيل:

1. المشرف لا يطلق jobs analytics.
2. المشرف لا يرى إلا snapshots المنشورة.
3. `GET /analytics/classes/:classId/overview` يرفض `403` إذا كان الصف خارج supervisor assignments.

## 7) أخطاء متوقعة

1. `409 ACADEMIC_CONTEXT_NOT_CONFIGURED`.
2. `400 ACTIVE_ACADEMIC_YEAR_ONLY` أو `ACTIVE_SEMESTER_ONLY`.
3. `403` عند خروج الطالب/الجلسة عن نطاق supervisor assignments.
4. `BEHAVIOR_ACTOR_NOT_ALLOWED` عند تمرير `teacherId/supervisorId` في behavior create.

## 8) Non-Allowed (Supervisor)

1. `POST /attendance/sessions` غير مسموح.
2. لا يملك assessments/homework management endpoints.
3. لا يملك admin modules:
   - `/users/*`
   - `/academic-structure/*`
   - `/students/*`
   - `/system-settings/*`
   - `/admin-imports/*`

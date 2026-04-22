# Teacher App Endpoint Map (Code-Truth, Endpoint-by-Endpoint)

كل المسارات أدناه تحت `/api/v1` ما لم يُذكر غير ذلك.

## 1) Auth

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | بدء الجلسة | `identifier`, `password` |
| `GET` | `/auth/me` | قراءة هوية الجلسة | Bearer token |
| `POST` | `/auth/refresh` | تدوير access token | `refreshToken` |
| `POST` | `/auth/logout` | إنهاء جلسة refresh | `refreshToken` |
| `POST` | `/auth/change-password` | تغيير كلمة المرور | `currentPassword`, `newPassword` |

## 2) Reporting

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `GET` | `/reporting/dashboards/teacher/me` | لوحة المعلم | بدون body |
| `GET` | `/reporting/students/:studentId/profile` | ملف الطالب | path `studentId` |
| `GET` | `/reporting/students/:studentId/reports/attendance-summary` | تقرير الحضور | path `studentId` |
| `GET` | `/reporting/students/:studentId/reports/assessment-summary` | تقرير الدرجات | path `studentId` |
| `GET` | `/reporting/students/:studentId/reports/behavior-summary` | تقرير السلوك | path `studentId` |

## 3) Attendance

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `POST` | `/attendance/sessions` | إنشاء جلسة حضور | `classId`, `subjectId`, `sessionDate`, `periodNo`, optional: `academicYearId`, `semesterId`, `title`, `notes`, `teacherId` |
| `GET` | `/attendance/sessions` | قائمة الجلسات | query: `page`, `limit`, `sortBy`, `sortOrder`, filters: `classId`, `subjectId`, `teacherId`, `academicYearId`, `semesterId`, `sessionDate`, `dateFrom`, `dateTo` |
| `GET` | `/attendance/sessions/:id` | تفاصيل الجلسة + roster | path `id` |
| `PUT` | `/attendance/sessions/:id/records` | حفظ الحضور الكامل للروستر | `records[]` with `studentId`, `status`, `notes?` |
| `PATCH` | `/attendance/records/:attendanceId` | تعديل سجل فردي | `status?`, `notes?` |

## 4) Assessments

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `GET` | `/assessments/types` | أنواع التقييم | بدون body |
| `POST` | `/assessments` | إنشاء تقييم | `assessmentTypeId`, `classId`, `subjectId`, `title`, `maxScore`, `assessmentDate`, optional: `teacherId`, `academicYearId`, `semesterId`, `description`, `weight`, `isPublished` |
| `GET` | `/assessments` | قائمة التقييمات | query: `page`, `limit`, `sortBy`, `sortOrder`, filters: `assessmentTypeId`, `classId`, `subjectId`, `teacherId`, `academicYearId`, `semesterId`, `assessmentDate`, `dateFrom`, `dateTo`, `isPublished` |
| `GET` | `/assessments/:id` | تفاصيل تقييم | path `id` |
| `GET` | `/assessments/:id/scores` | roster الدرجات | path `id` |
| `PUT` | `/assessments/:id/scores` | حفظ درجات كاملة | `records[]` with `studentId`, `score`, `remarks?` |
| `PATCH` | `/assessments/scores/:studentAssessmentId` | تعديل درجة فردية | `score?`, `remarks?` |

## 5) Behavior

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `GET` | `/behavior/categories` | فئات السلوك | بدون body |
| `POST` | `/behavior/records` | إنشاء سجل سلوك | `studentId`, `behaviorCategoryId`, `behaviorDate`, optional: `academicYearId`, `semesterId`, `description`, `severity`, `teacherId`, `supervisorId` |
| `GET` | `/behavior/records` | قائمة سجلات السلوك | query: `page`, `limit`, `sortBy`, `sortOrder`, filters: `studentId`, `behaviorCategoryId`, `behaviorType`, `academicYearId`, `semesterId`, `teacherId`, `supervisorId`, `behaviorDate`, `dateFrom`, `dateTo` |
| `GET` | `/behavior/records/:id` | تفاصيل سجل سلوك | path `id` |
| `PATCH` | `/behavior/records/:id` | تعديل سجل سلوك | optional: `behaviorCategoryId`, `academicYearId`, `semesterId`, `description`, `severity`, `behaviorDate` |
| `GET` | `/behavior/students/:studentId/records` | سجل سلوك الطالب | path `studentId` |

## 6) Homework

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `POST` | `/homework` | إنشاء واجب | `classId`, `subjectId`, `title`, `assignedDate`, `dueDate`, optional: `teacherId`, `academicYearId`, `semesterId`, `description` |
| `GET` | `/homework` | قائمة الواجبات | query: `page`, `limit`, `sortBy`, `sortOrder`, filters: `classId`, `subjectId`, `teacherId`, `academicYearId`, `semesterId`, `assignedDate`, `dueDate`, `dateFrom`, `dateTo` |
| `GET` | `/homework/:id` | تفاصيل واجب + roster | path `id` |
| `PUT` | `/homework/:id/submissions` | حفظ تسليمات الطلاب | `records[]` with `studentId`, `status`, `submittedAt?`, `notes?` |
| `GET` | `/homework/students/:studentId` | واجبات طالب | path `studentId` |

## 7) Communication

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `POST` | `/communication/devices` | تسجيل جهاز FCM | `providerKey`, `platform`, `appId`, `deviceToken`, `subscriptions[]`, `deviceName?` |
| `PATCH` | `/communication/devices/:deviceId` | تحديث الجهاز | `deviceToken?`, `deviceName?`, `subscriptions?` |
| `DELETE` | `/communication/devices/:deviceId` | إلغاء تسجيل الجهاز | path `deviceId` |
| `GET` | `/communication/recipients` | البحث عن مستلمين | query: `page`, `limit`, `search?`, `role?` |
| `POST` | `/communication/messages` | إرسال رسالة مباشرة | `receiverUserId`, `messageBody` |
| `GET` | `/communication/messages/inbox` | صندوق الوارد | query paginated + `isRead?` |
| `GET` | `/communication/messages/sent` | الرسائل المرسلة | query paginated + `receiverUserId?` |
| `GET` | `/communication/messages/conversations/:otherUserId` | محادثة مع مستخدم | path `otherUserId`, query paginated |
| `PATCH` | `/communication/messages/:messageId/read` | تعليم الرسالة كمقروءة | path `messageId` |
| `GET` | `/communication/announcements/active` | الإعلانات النشطة | بدون body |
| `GET` | `/communication/notifications/me` | إشعاراتي | query paginated + `isRead?`, `notificationType?` |
| `PATCH` | `/communication/notifications/:notificationId/read` | تعليم الإشعار كمقروء | path `notificationId` |

## 8) Analytics

| Method | Path | Purpose | Contract |
| --- | --- | --- | --- |
| `GET` | `/analytics/classes/:classId/overview` | قراءة class overview للصف المعيّن | path `classId` |
| `POST` | `/analytics/snapshots/:snapshotId/feedback` | إرسال feedback على snapshot منشورة | `rating?`, `feedbackText?` |

قواعد تشغيل:

1. المعلم لا يطلق jobs analytics.
2. المعلم لا يرى إلا snapshots المنشورة.
3. `GET /analytics/classes/:classId/overview` يرفض `403` إذا كان الصف خارج teacher assignments.

## 9) قواعد أخطاء متوقعة

1. `409 ACADEMIC_CONTEXT_NOT_CONFIGURED` عند غياب السنة/الفصل النشط.
2. `400 ACTIVE_ACADEMIC_YEAR_ONLY` أو `ACTIVE_SEMESTER_ONLY` عند mismatch في context.
3. `TEACHER_ID_NOT_ALLOWED` في create flows الخاصة بالمعلم.
4. `403` عند محاولة الوصول لطلاب/صفوف خارج assignment.

## 10) Non-Allowed (Teacher)

1. كل مسارات الإدارة:
   - `/users/*`
   - `/academic-structure/*`
   - `/students/*`
   - `/system-settings/*`
   - `/admin-imports/*`
2. communication admin-only:
   - `POST /communication/messages/bulk`
   - `POST /communication/announcements`
   - `POST /communication/notifications`
   - `POST /communication/notifications/bulk`

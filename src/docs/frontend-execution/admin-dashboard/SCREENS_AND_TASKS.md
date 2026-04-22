# Admin Dashboard Screens And Tasks (Code-Truth)

## 1. Bootstrap

1. Login (`POST /auth/login`).
2. Hydrate session (`GET /auth/me`).
3. Read health/ready status.
4. Load active academic context.
5. Load admin dashboard summary.

## 2. Active Context management

1. اقرأ `GET /academic-structure/context/active`.
2. عند تغيير السنة/الفصل:
   - نفذ `PATCH /academic-structure/context/active`.
3. بعد النجاح:
   - أعد تحميل الشاشات اليومية (attendance/assessments/behavior/homework/reporting).

## 3. System Settings Control Plane

1. اعرض كل المجموعات (`GET /system-settings`).
2. افتح `transportMaps` (`GET /system-settings/transportMaps`).
3. افتح `analytics` (`GET /system-settings/analytics`).
3. عدل القيم:
   - `etaProvider`
   - `etaDerivedEstimateEnabled`
   - `googleMapsEtaEnabled`
   - refresh/deviation thresholds
4. عدل قيم analytics عند الحاجة:
   - `aiAnalyticsEnabled`
   - `primaryProvider`
   - `fallbackProvider`
   - `scheduledRecomputeEnabled`
   - `scheduledRecomputeIntervalMinutes`
   - `scheduledRecomputeMaxSubjectsPerTarget`
   - `scheduledTargets`
   - `autonomousDispatchEnabled`
   - `autonomousDispatchActorUserId`
   - `retentionCleanupEnabled`
   - retention windows
5. احفظ (`PATCH /system-settings/:group`) مع `reason`.
6. راقب:
   - `GET /system-settings/audit`
   - `GET /system-settings/integrations/status`

## 4. Daily Academics

1. Attendance:
   - create session
   - save records
2. Assessments:
   - create assessment
   - save scores
3. Behavior:
   - create/update records
4. Homework:
   - create homework
   - save submissions

قاعدة تشغيل:

- أي تضارب مع active context يجب أن يعالج برسائل واضحة.

## 5. Transport operations

1. إدارة static entities:
   - buses/routes/stops/assignments.
2. Trip lifecycle:
   - create/ensure/list/start/end/locations/events.
3. Stop attendance:
   - `POST /transport/trips/:tripId/stops/:stopId/attendance`
   - يغلق المحطة.
   - قد ينهي الرحلة تلقائيًا إلى `completed`.
4. ETA/read:
   - `GET /transport/trips/:id/eta`
5. Summary analytics:
   - `GET /transport/trips/:tripId/summary`
   - إذا الرحلة ليست `completed`:
     - backend يرجع `409 TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS`
     - Suggested Toast:
       - `الرحلة لا تزال قائمة، سيظهر الملخص النهائي فور اكتمال كافة المحطات.`

## 6. Live monitoring split

1. realtime token:
   - `GET /transport/realtime-token?tripId=...`
2. listen RTDB path:
   - `/transport/live-trips/{tripId}/latestLocation`
3. keep ETA from REST snapshots.

## 7. Communication center

1. register device (FCM token binding).
2. manage announcements/notifications/messages.
3. read inbox/feed and mark as read.

## 8. AI Analytics operations

1. لا تبدأ من شاشات القراءة قبل تفعيل:
   - `analytics.aiAnalyticsEnabled=true`
2. لإنشاء jobs الفردية:
   - `POST /analytics/jobs/student-risk`
   - `POST /analytics/jobs/teacher-compliance`
   - `POST /analytics/jobs/admin-operational-digest`
   - `POST /analytics/jobs/class-overview`
   - `POST /analytics/jobs/transport-route-anomalies`
3. لإعادة الحساب المؤسسية:
   - `POST /analytics/jobs/recompute`
   - `POST /analytics/jobs/scheduled-dispatch`
4. لمتابعة التنفيذ:
   - `GET /analytics/jobs/:jobId`
5. لقراءة النتائج:
   - `GET /analytics/students/:studentId/risk-summary`
   - `GET /analytics/teachers/:teacherId/compliance-summary`
   - `GET /analytics/admin/operational-digest`
   - `GET /analytics/classes/:classId/overview`
   - `GET /analytics/transport/routes/:routeId/anomalies`
6. لمراجعة النتيجة قبل نشرها:
   - `POST /analytics/snapshots/:snapshotId/review`
   - `action = approve | reject`
7. feedback:
   - `GET /analytics/snapshots/:snapshotId/feedback`
   - `POST /analytics/snapshots/:snapshotId/feedback`
8. صيانة التشغيل:
   - `POST /analytics/jobs/retention-cleanup`

قواعد UX:

- snapshot draft تبقى داخلية للإدارة.
- approval هو لحظة النشر للأسطح غير الإدارية.
- إذا كان job موجودًا `pending/processing` لنفـس natural key، قد يعيد backend job reused بدل إنشاء جديد.
- لا تنتظر الواجهة completion داخل نفس request؛ هذه jobs غير متزامنة.

## 9. Imports flow

1. Dry-run onboarding import.
2. Review results.
3. Apply import.
4. Track history/details.

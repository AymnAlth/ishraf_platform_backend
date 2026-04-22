# Admin Dashboard QA And Acceptance (Code-Truth)

## 1. Access + bootstrap

- admin login succeeds.
- `GET /auth/me` يرجع role = `admin`.
- غير admin يحصل `403` على modules الإدارية.

## 2. Active context behavior

- قراءة/تحديث context تعمل عبر `academic-structure/context/active`.
- daily surfaces تُظهر خطأ واضح عند:
  - `ACADEMIC_CONTEXT_NOT_CONFIGURED` (409)
  - `ACTIVE_ACADEMIC_YEAR_ONLY` (400)
  - `ACTIVE_SEMESTER_ONLY` (400)

## 3. System settings transportMaps + analytics

- `GET /system-settings/transportMaps` يرجع المفاتيح الخمسة الفعلية.
- `PATCH /system-settings/transportMaps` يقبل update جزئي مع `reason`.
- `GET /system-settings/analytics` يرجع مفاتيح analytics الفعلية كاملة.
- `PATCH /system-settings/analytics`:
  - يرفض `primaryProvider=fallbackProvider`.
  - يقبل update جزئي مع `reason`.
- audit logs تُحدث بعد أي تغيير فعلي.

## 4. Transport summary

- `GET /transport/trips/:tripId/summary`:
  - `200` فقط عند `tripStatus=completed`.
  - وإلا `409` مع:
    - `code: TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS`.
- response keys المتوقعة:
  - `scheduledStartTime` (حاليًا `null`)
  - `actualStartTime`
  - `actualEndTime`
  - `startDelayMinutes` (حاليًا `null`)
  - `attendance.totalStudents/presentCount/absentCount`

## 5. Attendance per stop

- `POST /transport/trips/:tripId/stops/:stopId/attendance`:
  - يرفض duplicate `studentId`.
  - يرفض stop غير متطابق مع route.
  - يرفض طالب بدون assignment مطابق.
  - يغلق stop snapshot عند النجاح.
  - إذا كانت آخر محطة => الرحلة تصبح `completed`.

## 6. Realtime split validation

- `GET /transport/realtime-token` يعطي bootstrap data.
- RTDB path المستخدم:
  - `/transport/live-trips/{tripId}/latestLocation`
- ETA لا تُقرأ من RTDB بل من REST snapshot.

## 7. Communication + imports

- admin يملك bulk surfaces:
  - `messages/bulk`
  - `notifications/bulk`
- admin-imports flow (dry-run/apply/history/details) يعمل بصلاحية admin فقط.

## 8. AI Analytics

- عندما `analytics.aiAnalyticsEnabled=false`:
  - إنشاء jobs التحليلية يرفض `409`.
- `POST /analytics/jobs/student-risk|teacher-compliance|admin-operational-digest|class-overview|transport-route-anomalies`:
  - يعيد `201` عند الإنشاء الفعلي.
  - قد يعيد `200` عند إعادة استخدام job pending موجودة.
- `POST /analytics/jobs/recompute`:
  - يعيد breakdown + created/reused counts.
- `POST /analytics/jobs/scheduled-dispatch`:
  - يرفض `409` إذا `scheduledRecomputeEnabled=false`.
- `POST /analytics/snapshots/:snapshotId/review`:
  - `approve` يجعل snapshot منشورة.
  - اعتماد snapshot جديدة لنفس subject/context يجب أن يجعل القديمة `superseded`.
- `POST /analytics/jobs/retention-cleanup`:
  - يرفض `409` إذا `retentionCleanupEnabled=false`.
- `GET /analytics/snapshots/:snapshotId/feedback`:
  - admin-only.

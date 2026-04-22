# Admin Dashboard Backend Contract (Code-Truth)

الدور المستهدف: `admin`

هذا الدليل يشرح ما يمكن للوحة الإدارة تنفيذه فعليًا في الكود الحالي.

## 1. نطاق الإدارة

الإدارة تملك كامل الوصول إلى:

- `users`
- `academic-structure`
- `students`
- `system-settings`
- `admin-imports`

وتملك أيضًا تشغيل daily modules:

- `attendance`
- `assessments`
- `behavior`
- `homework`
- `transport`
- `communication`
- `reporting`

## 2. قواعد تشغيل مؤثرة

- Active Academic Context هو المرجع اليومي للبيانات الدراسية.
- `system-settings` هي control plane إدارية فقط.
- `analytics` الآن جزء من control plane الإداري والتشغيلي، وليس تقريرًا static فقط.
- transport analytics endpoint:
  - `GET /transport/trips/:tripId/summary`
  - متاح فقط عندما الرحلة `completed`.
- attendance per stop يمكن أن يغلق المحطة ويُنهي الرحلة تلقائيًا.

## 3. transportMaps settings (effective keys)

ضمن `system-settings` group = `transportMaps`:

- `etaProvider`: `mapbox | google`
- `etaDerivedEstimateEnabled`: `boolean`
- `googleMapsEtaEnabled`: `boolean`
- `etaProviderRefreshIntervalSeconds`: `number`
- `etaProviderDeviationThresholdMeters`: `number`

## 4. analytics settings (effective keys)

ضمن `system-settings` group = `analytics`:

- `aiAnalyticsEnabled`: `boolean`
- `primaryProvider`: `openai | groq`
- `fallbackProvider`: `openai | groq`
- `scheduledRecomputeEnabled`: `boolean`
- `scheduledRecomputeIntervalMinutes`: `number`
- `scheduledRecomputeMaxSubjectsPerTarget`: `number`
- `scheduledTargets`: `student_risk_summary[] | teacher_compliance_summary[] | admin_operational_digest[] | class_overview[] | transport_route_anomaly_summary[]`
- `autonomousDispatchEnabled`: `boolean`
- `autonomousDispatchActorUserId`: `string | null`
- `retentionCleanupEnabled`: `boolean`
- `obsoleteSnapshotRetentionDays`: `number`
- `jobRetentionDays`: `number`
- `schedulerRunRetentionDays`: `number`

قواعد إلزامية:

- `primaryProvider` و`fallbackProvider` يجب أن يكونا مختلفين.
- الواجهة لا تستدعي `OpenAI` أو `Groq` مباشرة؛ هذه القيم backend-only.

## 5. AI Analytics من منظور الإدارة

- الإدارة هي الجهة الوحيدة التي:
  - تطلق analytics jobs
  - تشغّل recompute/scheduled dispatch/retention cleanup
  - تعتمد أو ترفض snapshots
  - تقرأ feedback الكامل
- lifecycle الفعلي:
  1. تفعيل `system-settings.analytics`
  2. إطلاق job أو dispatch
  3. backend يمررها عبر `integration_outbox`
  4. worker يبني snapshot
  5. الإدارة تراجع snapshot
  6. بعد `approve` تصبح متاحة للأسطح غير الإدارية

## 6. Firebase/Maps من منظور الإدارة

- `GET /transport/realtime-token` يعطي bootstrap auth فقط.
- live GPS يقرأ من RTDB path:
  - `/transport/live-trips/{tripId}/latestLocation`
- ETA تبقى snapshot عبر REST (`/transport/trips/:id/eta`).
- لا يوجد maps API call مباشر من الواجهة لحساب ETA.

## 7. Trip status semantics

status المستخدمة في النقل:

- `scheduled`
- `started`
- `ended`
- `completed`
- `cancelled`

مهم:

- `completed` قد يحدث تلقائيًا بعد إغلاق آخر محطة عبر attendance endpoint.

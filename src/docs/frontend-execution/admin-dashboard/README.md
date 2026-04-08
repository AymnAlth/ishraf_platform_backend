# Admin Dashboard Backend Contract

الدور المستهدف: `admin`

هذا الدليل يصف عقود الإدارة كما هي مطبقة فعليًا في الباك الحالي، خصوصًا:

- إعدادات النظام المتقدمة (`system-settings`)
- منظومة النقل (ETA / attendance / trip summary)
- التكامل الهجين مع Firebase (`RTDB + FCM`)

## النطاق

لوحة الإدارة تملك صلاحية كاملة على:

- `users`
- `academic-structure`
- `students`
- `system-settings`
- `admin-imports`

وتستهلك تشغيليًا أيضًا:

- `attendance`
- `assessments`
- `behavior`
- `homework`
- `transport`
- `communication`
- `reporting`

## القواعد الحاكمة

- `system-settings` هي control plane إدارية `global-only` و`admin-only`.
- مجموعة `transportMaps` تحتوي القيم التشغيلية الحية التالية:
  - `etaProvider`: `mapbox | google` (default: `mapbox`)
  - `etaDerivedEstimateEnabled`: `boolean` (default: `true`)
  - `googleMapsEtaEnabled`
  - `etaProviderRefreshIntervalSeconds`
  - `etaProviderDeviationThresholdMeters`
- `transportMaps.etaProvider` يؤثر فعليًا على runtime provider selection.
- ETA في النقل هي **Backend Snapshot** وليست stream GPS مباشر.
- GPS live يقرأ من Firebase RTDB بعد bootstrap عبر `GET /transport/realtime-token`.
- في الرحلات، الحالة `completed` فعالة وتستخدم في analytics.

## Transport من منظور الإدارة

- الإدارة تستطيع تشغيل endpoints التشغيلية للرحلة (policy `operateTrips`):
  - start/end/location/events
  - attendance per stop
- endpoint الملخص الإداري:
  - `GET /transport/trips/:tripId/summary`
  - يرجع `409` مع الكود `TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS` إذا الرحلة غير مكتملة.
- endpoint الحي الخاص بالوالد (`/transport/trips/:tripId/live-status`) ليس endpoint إدارة.

## Firebase / FCM من منظور الإدارة

- `GET /transport/realtime-token` يعطي bootstrap token فقط.
- بيانات GPS الحية تُقرأ مباشرة من RTDB path:
  - `/transport/live-trips/{tripId}/latestLocation`
- إشعارات الاقتراب/الوصول تُدار async عبر `integration_outbox` و`pushNotifications`.

## الملفات المرتبطة

- `ENDPOINT_MAP.md`
- `SCREENS_AND_TASKS.md`
- `QA_AND_ACCEPTANCE.md`

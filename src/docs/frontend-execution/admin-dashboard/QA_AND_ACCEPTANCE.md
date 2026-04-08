# Admin Dashboard QA And Acceptance

## Bootstrap and access

- admin login works and `GET /auth/me` returns role `admin`.
- `/health` and `/health/ready` load successfully.
- non-admin tokens receive `403` on admin-only management surfaces.

## Active academic context

- `GET /academic-structure/context/active` loads before daily operations.
- `PATCH /academic-structure/context/active` updates context correctly.
- daily academic flows return `409 ACADEMIC_CONTEXT_NOT_CONFIGURED` when context is missing.

## System settings (advanced transport controls)

- `GET /system-settings` includes group `transportMaps`.
- `GET /system-settings/:group` for `transportMaps` returns keys:
  - `etaProvider`
  - `etaDerivedEstimateEnabled`
  - `googleMapsEtaEnabled`
  - `etaProviderRefreshIntervalSeconds`
  - `etaProviderDeviationThresholdMeters`
- `etaProvider` accepts only `mapbox | google`.
- `etaDerivedEstimateEnabled` default is `true`.
- `PATCH /system-settings/transportMaps` updates effective values and audit trail.

## Transport summary for completed trips

- `GET /transport/trips/:tripId/summary` returns `200` for `tripStatus=completed`.
- response includes:
  - `scheduledStartTime: null`
  - `actualStartTime`
  - `actualEndTime`
  - `startDelayMinutes: null`
  - `attendance.totalStudents/presentCount/absentCount`
- same endpoint returns `409` when trip is not completed with:
  - `code: TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS`
  - suggested UX toast:
    - `الرحلة لا تزال قائمة، سيظهر الملخص النهائي فور اكتمال كافة المحطات.`

## Stop attendance from admin operations

- `POST /transport/trips/:tripId/stops/:stopId/attendance` accepts:
  - `attendances: [{ studentId, status: present|absent, notes? }]`
- duplicate `studentId` in same request is rejected.
- stop mismatch or assignment mismatch returns domain validation errors.
- successful submission closes stop snapshot and can finalize trip to `completed`.

## Firebase hybrid flow checks

- `GET /transport/realtime-token?tripId=...` returns bootstrap payload only.
- RTDB live GPS path is used directly by frontend:
  - `/transport/live-trips/{tripId}/latestLocation`
- ETA is read from REST snapshot endpoints, not RTDB.

## Communication and device registry

- admin can register/update/delete own FCM device.
- device registration remains available even if `fcmEnabled=false`.
- messaging/announcements/notifications endpoints work with admin scope.

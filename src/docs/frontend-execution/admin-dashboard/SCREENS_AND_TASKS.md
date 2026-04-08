# Admin Dashboard Screens And Tasks

## 1. Bootstrap

1. Login (`POST /auth/login`).
2. Load current user (`GET /auth/me`).
3. Check readiness (`/health`, `/health/ready`).
4. Load active context (`GET /academic-structure/context/active`).
5. Load admin dashboard (`GET /reporting/dashboards/admin/me`).

## 2. System settings screen

1. Load all groups (`GET /system-settings`).
2. Open `transportMaps` details (`GET /system-settings/transportMaps`).
3. Edit advanced ETA controls:
   - `etaProvider`
   - `etaDerivedEstimateEnabled`
   - `googleMapsEtaEnabled`
   - refresh interval + deviation threshold
4. Save with reason (`PATCH /system-settings/transportMaps`).
5. Refresh group + audit/history views.

## 3. Transport operations screen (admin tooling)

1. List or create trips (`GET/POST /transport/trips`).
2. Run trip lifecycle (`start/end/locations/events`).
3. Submit stop attendance:
   - `POST /transport/trips/:tripId/stops/:stopId/attendance`
   - send batch `attendances[]`.
4. Inspect ETA snapshot (`GET /transport/trips/:id/eta`).
5. Load summary after completion:
   - `GET /transport/trips/:tripId/summary`
   - if trip not completed, handle `409 TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS`.
   - suggested toast message:
     - `الرحلة لا تزال قائمة، سيظهر الملخص النهائي فور اكتمال كافة المحطات.`

## 4. Monitoring screens

1. Use `GET /transport/realtime-token?tripId=...` to bootstrap Firebase read access.
2. Read live GPS from RTDB path:
   - `/transport/live-trips/{tripId}/latestLocation`
3. Keep ETA and analytics from REST endpoints (`eta`, `summary`, reporting).

## 5. Admin import flow

1. Dry-run (`POST /admin-imports/school-onboarding/dry-run`).
2. Review issues/plan.
3. Apply (`POST /admin-imports/school-onboarding/apply`).
4. Track history (`GET /admin-imports/school-onboarding/history`).

## 6. Communication center

1. Register admin device (`POST /communication/devices`).
2. Send direct/bulk messages and notifications.
3. Read inbox/announcements/notification feed.

# Admin Dashboard Endpoint Map

## 1. Session and bootstrap

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /health`
- `GET /health/ready`
- `GET /academic-structure/context/active`
- `GET /reporting/dashboards/admin/me`

## 2. User administration

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/status`

## 3. Academic structure

- `GET /academic-structure/context/active`
- `PATCH /academic-structure/context/active`
- `POST /academic-structure/academic-years`
- `GET /academic-structure/academic-years`
- `GET /academic-structure/academic-years/:id`
- `PATCH /academic-structure/academic-years/:id`
- `PATCH /academic-structure/academic-years/:id/activate`
- `POST /academic-structure/academic-years/:academicYearId/semesters`
- `GET /academic-structure/academic-years/:academicYearId/semesters`
- `PATCH /academic-structure/semesters/:id`
- `POST /academic-structure/grade-levels`
- `GET /academic-structure/grade-levels`
- `POST /academic-structure/classes`
- `GET /academic-structure/classes`
- `GET /academic-structure/classes/:id`
- `PATCH /academic-structure/classes/:id`
- `POST /academic-structure/subjects`
- `GET /academic-structure/subjects`
- `GET /academic-structure/subjects/:id`
- `PATCH /academic-structure/subjects/:id`
- `POST /academic-structure/subject-offerings`
- `GET /academic-structure/subject-offerings`
- `GET /academic-structure/subject-offerings/:id`
- `PATCH /academic-structure/subject-offerings/:id`
- `POST /academic-structure/teacher-assignments`
- `GET /academic-structure/teacher-assignments`
- `GET /academic-structure/teacher-assignments/:id`
- `PATCH /academic-structure/teacher-assignments/:id`
- `POST /academic-structure/supervisor-assignments`
- `GET /academic-structure/supervisor-assignments`
- `GET /academic-structure/supervisor-assignments/:id`
- `PATCH /academic-structure/supervisor-assignments/:id`

## 4. Students

- `POST /students`
- `GET /students`
- `GET /students/:id`
- `PATCH /students/:id`
- `GET /students/academic-enrollments`
- `POST /students/academic-enrollments/bulk`
- `PATCH /students/academic-enrollments/:enrollmentId`
- `POST /students/:id/academic-enrollments`
- `GET /students/:id/academic-enrollments`
- `POST /students/:id/parents`
- `GET /students/:id/parents`
- `PATCH /students/:studentId/parents/:parentId/primary`
- `POST /students/:id/promotions`

## 5. System Settings Control Plane

- `GET /system-settings`
- `GET /system-settings/:group`
- `PATCH /system-settings/:group`
- `GET /system-settings/audit`
- `GET /system-settings/integrations/status`

### 5.1 `transportMaps` keys

- `etaProvider`: `mapbox | google`
- `etaDerivedEstimateEnabled`: `boolean`
- `googleMapsEtaEnabled`: `boolean`
- `etaProviderRefreshIntervalSeconds`: `number`
- `etaProviderDeviationThresholdMeters`: `number`

## 6. Daily academic operations

- Attendance:
  - `POST /attendance/sessions`
  - `GET /attendance/sessions`
  - `GET /attendance/sessions/:id`
  - `PUT /attendance/sessions/:id/records`
  - `PATCH /attendance/records/:attendanceId`
- Assessments:
  - `POST /assessments/types`
  - `GET /assessments/types`
  - `POST /assessments`
  - `GET /assessments`
  - `GET /assessments/:id`
  - `GET /assessments/:id/scores`
  - `PUT /assessments/:id/scores`
  - `PATCH /assessments/scores/:studentAssessmentId`
- Behavior:
  - `POST /behavior/categories`
  - `GET /behavior/categories`
  - `POST /behavior/records`
  - `GET /behavior/records`
  - `GET /behavior/records/:id`
  - `PATCH /behavior/records/:id`
  - `GET /behavior/students/:studentId/records`
- Homework:
  - `POST /homework`
  - `GET /homework`
  - `GET /homework/:id`
  - `PUT /homework/:id/submissions`
  - `GET /homework/students/:studentId`

## 7. Transport

### 7.1 Static management

- `POST /transport/buses`
- `GET /transport/buses`
- `POST /transport/routes`
- `GET /transport/routes`
- `POST /transport/routes/:routeId/stops`
- `GET /transport/routes/:routeId/stops`
- `POST /transport/assignments`
- `PATCH /transport/assignments/:id/deactivate`
- `GET /transport/assignments/active`
- `POST /transport/route-assignments`
- `GET /transport/route-assignments`
- `PATCH /transport/route-assignments/:id/deactivate`
- `GET /transport/students/:studentId/home-location`
- `PUT /transport/students/:studentId/home-location`
- `DELETE /transport/students/:studentId/home-location`

### 7.2 Trip operations and analytics

- `GET /transport/realtime-token`
- `POST /transport/trips`
- `POST /transport/trips/ensure-daily`
- `GET /transport/trips`
- `GET /transport/trips/:id`
- `GET /transport/trips/:id/eta`
- `GET /transport/trips/:id/students`
- `POST /transport/trips/:id/start`
- `POST /transport/trips/:id/end`
- `POST /transport/trips/:id/locations`
- `POST /transport/trips/:id/events`
- `GET /transport/trips/:id/events`
- `POST /transport/trips/:tripId/stops/:stopId/attendance`
- `GET /transport/trips/:tripId/summary`
- `GET /reporting/transport/summary`

### 7.3 Attendance and summary semantics

- Attendance endpoint records per-student status and auto-closes the stop snapshot.
- If all stops become completed, trip status auto-transitions to `completed`.
- `GET /transport/trips/:tripId/summary` is admin-only and requires `tripStatus = completed`.
- If not completed, backend returns `409` with:
  - `code: TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS`

## 8. Communication

- `POST /communication/devices`
- `PATCH /communication/devices/:deviceId`
- `DELETE /communication/devices/:deviceId`
- `GET /communication/recipients`
- `POST /communication/messages`
- `POST /communication/messages/bulk`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`
- `POST /communication/announcements`
- `GET /communication/announcements`
- `GET /communication/announcements/active`
- `POST /communication/notifications`
- `POST /communication/notifications/bulk`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`

## 9. Reporting and admin preview

- `GET /reporting/students/:studentId/profile`
- `GET /reporting/students/:studentId/reports/attendance-summary`
- `GET /reporting/students/:studentId/reports/assessment-summary`
- `GET /reporting/students/:studentId/reports/behavior-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/dashboard`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/profile`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status`
- `GET /reporting/admin-preview/teachers/:teacherUserId/dashboard`
- `GET /reporting/admin-preview/supervisors/:supervisorUserId/dashboard`

## 10. Admin imports

- `POST /admin-imports/school-onboarding/dry-run`
- `POST /admin-imports/school-onboarding/apply`
- `GET /admin-imports/school-onboarding/history`
- `GET /admin-imports/school-onboarding/history/:importId`

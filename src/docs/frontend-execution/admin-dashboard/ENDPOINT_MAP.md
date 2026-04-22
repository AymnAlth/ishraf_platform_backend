# Admin Dashboard Endpoint Map (Code-Truth)

كل المسارات هنا تحت `/api/v1` ما لم يُذكر غير ذلك.

## 1. Session + Health

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /health` (root)
- `GET /health/ready` (root)

## 2. Users (admin-only)

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/status`

## 3. Academic Structure (admin-only)

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

## 4. Students (admin-only)

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

## 5. System Settings (admin-only)

- `GET /system-settings`
- `GET /system-settings/:group`
- `PATCH /system-settings/:group`
- `GET /system-settings/audit`
- `GET /system-settings/integrations/status`

## 6. Daily Academics

## Attendance

- `POST /attendance/sessions`
- `GET /attendance/sessions`
- `GET /attendance/sessions/:id`
- `PUT /attendance/sessions/:id/records`
- `PATCH /attendance/records/:attendanceId`

## Assessments

- `POST /assessments/types`
- `GET /assessments/types`
- `POST /assessments`
- `GET /assessments`
- `GET /assessments/:id`
- `GET /assessments/:id/scores`
- `PUT /assessments/:id/scores`
- `PATCH /assessments/scores/:studentAssessmentId`

## Behavior

- `POST /behavior/categories`
- `GET /behavior/categories`
- `POST /behavior/records`
- `GET /behavior/records`
- `GET /behavior/records/:id`
- `PATCH /behavior/records/:id`
- `GET /behavior/students/:studentId/records`

## Homework

- `POST /homework`
- `GET /homework`
- `GET /homework/:id`
- `PUT /homework/:id/submissions`
- `GET /homework/students/:studentId`

## 7. Transport

## Static + assignments

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

## Trips + realtime + ETA

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

## 9. Reporting

- `GET /reporting/dashboards/admin/me`
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
- `GET /reporting/transport/summary`

## 10. AI Analytics (admin-only control plane)

## Jobs

- `POST /analytics/jobs/student-risk`
- `POST /analytics/jobs/teacher-compliance`
- `POST /analytics/jobs/admin-operational-digest`
- `POST /analytics/jobs/class-overview`
- `POST /analytics/jobs/transport-route-anomalies`
- `POST /analytics/jobs/scheduled-dispatch`
- `POST /analytics/jobs/recompute`
- `POST /analytics/jobs/retention-cleanup`
- `GET /analytics/jobs/:jobId`

## Snapshots

- `POST /analytics/snapshots/:snapshotId/review`
- `POST /analytics/snapshots/:snapshotId/feedback`
- `GET /analytics/snapshots/:snapshotId/feedback`

## Read surfaces

- `GET /analytics/students/:studentId/risk-summary`
- `GET /analytics/teachers/:teacherId/compliance-summary`
- `GET /analytics/admin/operational-digest`
- `GET /analytics/classes/:classId/overview`
- `GET /analytics/transport/routes/:routeId/anomalies`

## 11. Admin Imports (admin-only)

- `POST /admin-imports/school-onboarding/dry-run`
- `POST /admin-imports/school-onboarding/apply`
- `GET /admin-imports/school-onboarding/history`
- `GET /admin-imports/school-onboarding/history/:importId`

# OpenAPI / Postman Audit

- Audit date: 2026-03-30
- Runtime endpoint count: 146
- Runtime changes during this reconciliation: 10 new endpoint(s)

## Coverage Summary

| Artifact | Before | After |
| --- | --- | --- |
| Master OpenAPI | 140/146 | 146/146 |
| Master Postman | 140/146 | 146/146 |
| Auth OpenAPI | 7/7 | 7/7 |
| Auth Postman | 7/7 | 7/7 |

## Per-Module Coverage

| Module | Actual | OpenAPI Before | Postman Before | OpenAPI After | Postman After |
| --- | --- | --- | --- | --- | --- |
| Health | 2 | 2/2 | 2/2 | 2/2 | 2/2 |
| Auth | 7 | 7/7 | 7/7 | 7/7 | 7/7 |
| Users | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Academic Structure | 32 | 26/32 | 26/32 | 32/32 | 32/32 |
| Students | 13 | 13/13 | 13/13 | 13/13 | 13/13 |
| Attendance | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Assessments | 8 | 8/8 | 8/8 | 8/8 | 8/8 |
| Behavior | 7 | 7/7 | 7/7 | 7/7 | 7/7 |
| Transport | 26 | 26/26 | 26/26 | 26/26 | 26/26 |
| Communication | 14 | 14/14 | 14/14 | 14/14 | 14/14 |
| Homework | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Reporting | 22 | 22/22 | 22/22 | 22/22 | 22/22 |

## [NEW] Runtime Endpoints Added In This Pass

- `GET /reporting/admin-preview/parents/:parentUserId/dashboard`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/profile`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary`
- `GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status`
- `GET /reporting/admin-preview/teachers/:teacherUserId/dashboard`
- `GET /reporting/admin-preview/supervisors/:supervisorUserId/dashboard`
- `POST /communication/messages/bulk`
- `POST /communication/notifications/bulk`

## Runtime Endpoints Missing From Master OpenAPI Before This Update

- `PATCH /academic-structure/classes/:id`
- `PATCH /academic-structure/subjects/:id`
- `GET /academic-structure/supervisor-assignments/:id`
- `PATCH /academic-structure/supervisor-assignments/:id`
- `GET /academic-structure/teacher-assignments/:id`
- `PATCH /academic-structure/teacher-assignments/:id`

## Views, Events, Targets Alignment

### SQL Views Referenced
- `vw_active_announcements`
- `vw_active_student_bus_assignments`
- `vw_active_trip_live_status`
- `vw_admin_dashboard_summary`
- `vw_announcement_details`
- `vw_assessment_details`
- `vw_attendance_details`
- `vw_behavior_details`
- `vw_class_attendance_summary`
- `vw_class_students`
- `vw_homework_details`
- `vw_homework_submission_details`
- `vw_latest_trip_location`
- `vw_message_details`
- `vw_notification_details`
- `vw_route_stops`
- `vw_student_assessment_details`
- `vw_student_assessment_summary`
- `vw_student_attendance_summary`
- `vw_student_behavior_summary`
- `vw_student_primary_parent`
- `vw_student_profiles`
- `vw_trip_details`
- `vw_trip_student_event_details`
- `vw_user_inbox_summary`
- `vw_user_notification_summary`

### Automation Events Documented
- `attendance_absent`
- `behavior_negative`
- `transport_trip_started`
- `transport_student_dropped_off`

### Target / Event Fields Documented
- `communication.announcements.targetRole`
- `communication.announcements.targetRoles`
- `communication.notifications.notificationType`
- `behavior.categories.behaviorType`
- `transport.trip-events.eventType`

## Reconciliation Notes

- `/health` and `/health/ready` now use root-level servers instead of inheriting `/api/v1`.
- The auth subset now covers all 7 live auth routes, including forgot-password and reset-password.
- IDs in the auth subset were normalized to numeric-string ids instead of UUID assumptions.
- The new admin-preview monitoring endpoints are marked with `[NEW]`-style audit visibility through this report and are documented as admin-only, read-only, and `users.id`-based surfaces.
- Communication Phase 2 is now documented with admin-only bulk message and bulk notification delivery, plus additive `targetRoles[]` support for announcements.

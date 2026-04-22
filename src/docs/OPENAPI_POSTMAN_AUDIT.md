# OpenAPI / Postman Audit

- Audit date: 2026-04-23
- Runtime endpoint count: 180
- Scope: root health endpoints plus every router registered in `src/app/module-registry.ts`

## Coverage Summary

| Artifact | Before | After |
| --- | --- | --- |
| Master OpenAPI | 163/180 | 180/180 |
| Master Postman | 163/180 | 180/180 |
| Auth OpenAPI | 7/7 | 7/7 |
| Auth Postman | 7/7 | 7/7 |

## Per-Module Coverage

| Module | Actual | OpenAPI Before | Postman Before | OpenAPI After | Postman After |
| --- | --- | --- | --- | --- | --- |
| Health | 2 | 2/2 | 2/2 | 2/2 | 2/2 |
| Auth | 7 | 7/7 | 7/7 | 7/7 | 7/7 |
| Users | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Academic Structure | 32 | 32/32 | 32/32 | 32/32 | 32/32 |
| Students | 13 | 13/13 | 13/13 | 13/13 | 13/13 |
| System Settings | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Attendance | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Assessments | 8 | 8/8 | 8/8 | 8/8 | 8/8 |
| Behavior | 7 | 7/7 | 7/7 | 7/7 | 7/7 |
| Transport | 31 | 31/31 | 31/31 | 31/31 | 31/31 |
| Communication | 17 | 17/17 | 17/17 | 17/17 | 17/17 |
| Admin Imports | 4 | 4/4 | 4/4 | 4/4 | 4/4 |
| Homework | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Reporting | 22 | 22/22 | 22/22 | 22/22 | 22/22 |

## Runtime Endpoints Missing From Master OpenAPI Before This Update

- `GET /analytics/admin/operational-digest`
- `GET /analytics/classes/:classId/overview`
- `GET /analytics/jobs/:jobId`
- `POST /analytics/jobs/admin-operational-digest`
- `POST /analytics/jobs/class-overview`
- `POST /analytics/jobs/recompute`
- `POST /analytics/jobs/retention-cleanup`
- `POST /analytics/jobs/scheduled-dispatch`
- `POST /analytics/jobs/student-risk`
- `POST /analytics/jobs/teacher-compliance`
- `POST /analytics/jobs/transport-route-anomalies`
- `GET /analytics/snapshots/:snapshotId/feedback`
- `POST /analytics/snapshots/:snapshotId/feedback`
- `POST /analytics/snapshots/:snapshotId/review`
- `GET /analytics/students/:studentId/risk-summary`
- `GET /analytics/teachers/:teacherId/compliance-summary`
- `GET /analytics/transport/routes/:routeId/anomalies`

## Route Extraction Rules

- Runtime routes are extracted from the registered route files defined in `scripts/reconcile-openapi-postman.mjs`.
- `/health` and `/health/ready` are documented as root-level servers outside `/api/v1`.
- The auth subset documents only the live auth router surface.
- Manual schema examples inside the reconciliation script must stay aligned with validators, DTOs, and mappers in `src/modules`.

## Views, Events, Targets Alignment

### SQL Views Referenced
- `vw_active_academic_context`
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

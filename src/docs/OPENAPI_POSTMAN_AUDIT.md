# OpenAPI / Postman Audit

- Audit date: 2026-04-08
- Runtime endpoint count: 163
- Scope: root health endpoints plus every router registered in `src/app/module-registry.ts`

## Coverage Summary

| Artifact | Before | After |
| --- | --- | --- |
| Master OpenAPI | 163/163 | 163/163 |
| Master Postman | 160/163 | 163/163 |
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
| Transport | 31 | 31/31 | 28/31 | 31/31 | 31/31 |
| Communication | 17 | 17/17 | 17/17 | 17/17 | 17/17 |
| Admin Imports | 4 | 4/4 | 4/4 | 4/4 | 4/4 |
| Homework | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Reporting | 22 | 22/22 | 22/22 | 22/22 | 22/22 |

## Runtime Endpoints Missing From Master OpenAPI Before This Update

- none

## Runtime Endpoints Missing From Master Postman Before This Update

- `GET /transport/trips/:tripId/live-status`
- `GET /transport/trips/:tripId/summary`
- `POST /transport/trips/:tripId/stops/:stopId/attendance`

## Route Extraction Rules

- Runtime routes are extracted from root health endpoints and route files referenced by `src/app/module-registry.ts`.
- `/health` and `/health/ready` are documented as root-level servers outside `/api/v1`.
- The auth subset documents only the live auth router surface.
- Manual schema/examples in OpenAPI/Postman must stay aligned with validators, DTOs, mappers, and policy middlewares in `src/modules`.

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

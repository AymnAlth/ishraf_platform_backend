# OpenAPI / Postman Audit

- Audit date: 2026-03-27
- Runtime endpoint count: 123
- Runtime changes during this reconciliation: 4 new endpoint(s)

## Coverage Summary

| Artifact | Before | After |
| --- | --- | --- |
| Master OpenAPI | 123/123 | 123/123 |
| Master Postman | 123/123 | 123/123 |
| Auth OpenAPI | 7/7 | 7/7 |
| Auth Postman | 7/7 | 7/7 |

## Per-Module Coverage

| Module | Actual | OpenAPI Before | Postman Before | OpenAPI After | Postman After |
| --- | --- | --- | --- | --- | --- |
| Health | 2 | 2/2 | 2/2 | 2/2 | 2/2 |
| Auth | 7 | 7/7 | 7/7 | 7/7 | 7/7 |
| Users | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Academic Structure | 24 | 24/24 | 24/24 | 24/24 | 24/24 |
| Students | 8 | 8/8 | 8/8 | 8/8 | 8/8 |
| Attendance | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Assessments | 8 | 8/8 | 8/8 | 8/8 | 8/8 |
| Behavior | 7 | 7/7 | 7/7 | 7/7 | 7/7 |
| Transport | 26 | 26/26 | 26/26 | 26/26 | 26/26 |
| Communication | 12 | 12/12 | 12/12 | 12/12 | 12/12 |
| Homework | 5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Reporting | 14 | 14/14 | 14/14 | 14/14 | 14/14 |

## [NEW] Runtime Endpoints Added In This Pass

- `POST /academic-structure/subject-offerings`
- `GET /academic-structure/subject-offerings`
- `GET /academic-structure/subject-offerings/:id`
- `PATCH /academic-structure/subject-offerings/:id`

## Runtime Endpoints Missing From Master OpenAPI Before This Update

- none

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
- `communication.notifications.notificationType`
- `behavior.categories.behaviorType`
- `transport.trip-events.eventType`

## Reconciliation Notes

- `/health` and `/health/ready` now use root-level servers instead of inheriting `/api/v1`.
- The auth subset now covers all 7 live auth routes, including forgot-password and reset-password.
- IDs in the auth subset were normalized to numeric-string ids instead of UUID assumptions.
- The new subject-offering endpoints are marked with `[NEW]` inside OpenAPI and Postman so admin frontend teams can spot the semester-aware academic change quickly.

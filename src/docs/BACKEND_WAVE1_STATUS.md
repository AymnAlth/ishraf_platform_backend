# Backend Wave 1 Status

This file is the backend-authoritative reference before the first frontend wave starts. If older academic documents disagree with the current codebase, the code and this file are the source of truth for Wave 1.

## Architecture Decision

- Current architecture: `modular monolith`
- This is an intentional Wave 1 release decision, not a microservices split
- Domain boundaries are enforced through modules, services, repositories, ownership helpers, reporting, and automation layers

## Canonical Data Model Decisions

These points resolve the old-document vs implementation mismatch:

- Attendance is not modeled as a single operational table anymore
  - Canonical model: `attendance_sessions` + `attendance`
- Exams and grades are not the primary assessment model anymore
  - Canonical model: `assessment_types` + `assessments` + `student_assessments`
- Behavior does not store category semantics inline only
  - Canonical model: `behavior_categories` + `behavior_records`
- Transport operations are not reduced to a single trip entity
  - Canonical model: `trips` + `bus_location_history` + `trip_student_events`
- The current backend also includes higher-order operational layers:
  - `reporting`
  - `automation`
  - `profile resolution`
  - `ownership enforcement`

## Ready Backend Modules

The following backend modules are ready or close enough for frontend Wave 1:

- `auth`
- `users`
- `academic-structure`
- `students`
- `attendance`
- `assessments`
- `behavior`
- `transport`
- `communication`
- `reporting`
- `homework`

## Frontend-Ready Surfaces By Role

### Admin

- auth login / refresh / me / change-password / forgot-password / reset-password
- user management
- academic structure management
- student management
- attendance management
- assessments management
- behavior management
- transport management
- communication admin flows
- admin dashboard
- reporting student profile and summary endpoints
- homework management

### Teacher

- teacher dashboard
- attendance session creation, listing, detail, bulk save, single update
- assessment creation, listing, detail, bulk scores, single score update
- behavior record creation, listing, update within allowed scope
- homework creation, listing, detail, submissions
- communication inbox, sent, conversation, notifications

### Parent

- parent dashboard
- parent-owned child profile access
- parent-owned child attendance summary
- parent-owned child assessment summary
- parent-owned child behavior summary
- parent notifications and messages
- parent-owned transport live status
- parent-owned student homework read surface

### Supervisor

- behavior operations within allowed scope
- attendance read/update within allowed scope
- supervisor dashboard
- student reporting access for assigned classes

### Driver

- transport trip flows within current ownership enforcement
- transport summary scoped to driver-owned trips
- communication notifications/messages allowed for the role

## Gaps Closed Before Frontend Wave 1

These frontend blockers are now closed in the backend:

- `Homework Module`
- parent-owned student detail/report surfaces
- parent transport live status endpoint
- supervisor dashboard
- forgot/reset password flows
- login rate limiting
- test database bootstrap/reset strategy
- cross-module notifications automation
- security/runtime hardening for staging deploy
- Render + Neon deployment assets and env templates

## Public Wave 1 Endpoints Added For Frontend

### Auth recovery

- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

### Runtime health

- `GET /health`
- `GET /health/ready`

### Homework

- `POST /api/v1/homework`
- `GET /api/v1/homework`
- `GET /api/v1/homework/:id`
- `PUT /api/v1/homework/:id/submissions`
- `GET /api/v1/homework/students/:studentId`

### Parent-owned reporting

- `GET /api/v1/reporting/dashboards/parent/me`
- `GET /api/v1/reporting/dashboards/parent/me/students/:studentId/profile`
- `GET /api/v1/reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary`
- `GET /api/v1/reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary`
- `GET /api/v1/reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary`

### Supervisor dashboard

- `GET /api/v1/reporting/dashboards/supervisor/me`

### Parent transport

- `GET /api/v1/reporting/transport/parent/me/students/:studentId/live-status`

## Not In Wave 1

These are explicitly deferred and are not blockers for frontend Wave 1:

- Firebase Realtime Database
- FCM push notifications
- Google Maps / ETA / stop proximity logic
- AI analytics / prediction / recommendations
- 2FA
- advanced system settings
- microservices split
- CSV import unless school onboarding pressure makes it necessary later

## Operational Notes For Frontend

- All `id` values are returned as `string`
- All responses use the same envelope: `success`, `message`, `data` or `errors`
- Paginated list endpoints return:
  - `data.items`
  - `data.pagination`
- Some feeds also include `unreadCount`
- Parent access is ownership-based and should never assume unrestricted `studentId` access
- Real ETA is not part of Wave 1; parent transport live status is based on the current assignment, active trip, last known location, and recent trip events
- auth login, forgot-password, and reset-password are rate-limited
- in hosted staging, forgot-password responses must not assume `resetToken` is returned
- hosted staging target is Render + Neon, documented in `src/docs/DEPLOY_RENDER_NEON.md`

## Recommended Frontend Start Order

1. Admin dashboard and admin auth flows
2. User, academic-structure, and student management
3. Daily operational screens: attendance, assessments, behavior, homework
4. Parent dashboard and parent app flows
5. Teacher dashboard and teacher app flows
6. Driver transport flows and transport visibility surfaces

## Documentation Sources

- Human reference: `src/docs/API_REFERENCE.md`
- OpenAPI: `src/docs/openapi/ishraf-platform.openapi.json`
- Postman: `src/docs/postman/ishraf-platform.postman_collection.json`
- Deployment: `src/docs/DEPLOY_RENDER_NEON.md`
- Legacy alignment: `src/docs/LEGACY_DOC_ALIGNMENT.md`
- This file: Wave 1 backend handoff and source-of-truth alignment document

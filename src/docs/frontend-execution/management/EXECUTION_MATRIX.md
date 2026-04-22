# Frontend Execution Matrix (Code-Truth)

Sync baseline: `2026-04-16`

- Runtime API surface: `161` endpoint تحت `/api/v1`
- Root health:
  - `GET /health`
  - `GET /health/ready`

## Role Matrix

| Consumer | Primary Role | Core Modules | Write Surfaces | Read Surfaces |
| --- | --- | --- | --- | --- |
| Admin Dashboard | `admin` | users, academic-structure, students, attendance, assessments, behavior, homework, transport, communication, reporting, system-settings, admin-imports | كل surfaces الإدارية والتشغيلية | كل surfaces الإدارية والرقابية |
| Teacher App | `teacher` | attendance, assessments, behavior, homework, reporting, communication | attendance create/save, assessments create/save, behavior records, homework create/save, direct messages | dashboard, student reports, announcements(active), notifications |
| Supervisor App | `supervisor` | attendance, behavior, reporting, communication | attendance update only, behavior records, direct messages | dashboard, student reports ضمن ownership, announcements(active), notifications |
| Parent App | `parent` | reporting, transport, homework, communication | direct messages, device registry, mark-read | parent dashboard + child reports + live status + announcements + notifications |
| Driver App | `driver` | transport, reporting, communication | trip operations, locations, trip events, stop attendance, direct messages, device registry | route-assignments/me, trips, eta, transport summary, announcements(active), notifications |

## Role-policy highlights

- `admin`:
  - الوحيد المسموح له `system-settings`, `users`, `academic-structure`, `students`, `admin-imports`.
- `teacher`:
  - لا يملك `users/academic-structure/students/system-settings/admin-imports`.
- `supervisor`:
  - لا يملك create attendance session.
  - لا يملك assessments/homework management endpoints.
- `parent`:
  - لا يملك transport operations.
  - يملك `GET /transport/trips/:tripId/live-status` بشرط ownership.
- `driver`:
  - يملك transport operations مع ownership checks.
  - يملك `GET /reporting/transport/summary`.

## Critical shared rules

- Active Academic Context يحكم daily academics.
- Live GPS source = RTDB.
- ETA/business source = REST snapshots.
- Trip summary admin endpoint:
  - `GET /transport/trips/:tripId/summary`
  - متاح فقط عند `tripStatus=completed`
  - وإلا `409 TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS`.

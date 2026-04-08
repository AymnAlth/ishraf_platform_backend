# Frontend Execution Matrix

Sync baseline: `2026-04-08` (project-wide backend docs audit, 163 live endpoints documented)

| Consumer | Primary Role | Core Modules | Write Surfaces | Read Surfaces |
| --- | --- | --- | --- | --- |
| Admin Dashboard | `admin` | users, academic-structure, students, attendance, assessments, behavior, homework, transport, communication, reporting, admin-imports | معظم السطوح الإدارية والتشغيلية | كل السطوح الإدارية والرقابية |
| Teacher App | `teacher` | attendance, assessments, behavior, homework, reporting, communication | attendance, assessments, behavior, homework, direct messages | dashboard, reports, announcements, notifications |
| Supervisor App | `supervisor` | attendance, behavior, reporting, communication | attendance records, behavior records, direct messages | dashboard, student summaries, announcements, notifications |
| Parent App | `parent` | reporting, homework, communication, transport | direct messages فقط | dashboard, linked student reports, active announcements, notifications, transport live status, student homework |
| Driver App | `driver` | transport, reporting, communication | trip operations, trip locations, trip events, direct messages | route assignments me, trips, transport summary, announcements, notifications |

## Notes

- `admin-imports` مخصصة لـ admin dashboard فقط.
- `users`, `academic-structure`, و`students` surfaces إدارية بحتة.
- `communication` ليست admin-only بالكامل؛ فقط bulk/announcement management/notification management هي admin-only.
- daily academic surfaces تعمل مع active context الحالي.
- parent live tracking الأساسي: `GET /transport/trips/:tripId/live-status`.
- admin trip analytics الأساسي: `GET /transport/trips/:tripId/summary` (after `completed` only).
- driver/admin stop closure surface: `POST /transport/trips/:tripId/stops/:stopId/attendance`.

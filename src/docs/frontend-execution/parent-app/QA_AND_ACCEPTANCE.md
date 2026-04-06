# Parent App QA And Acceptance

## Happy paths

- parent login succeeds
- parent dashboard returns linked children only
- per-student profile and summary routes succeed for linked students
- transport live status route succeeds for linked students
- `GET /homework/students/:studentId` works for linked students
- messaging, announcements, notifications work

## Expected linkage denials

- parent cannot access staff dashboards
- parent cannot access admin-only modules
- parent cannot create attendance/assessments/behavior/homework/admin imports
- parent cannot read reports for non-linked students
- transport live status for a non-linked student is denied

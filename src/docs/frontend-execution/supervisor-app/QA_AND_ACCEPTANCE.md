# Supervisor App QA And Acceptance

## Happy paths

- supervisor login succeeds
- supervisor dashboard loads
- supervisor can list/get attendance sessions within accessible scope
- supervisor can update attendance records within supervised class-year scope
- behavior create/list/update routes succeed for accessible students
- student reporting surfaces load for accessible students
- messaging, announcements, notifications work

## Expected denials

- supervisor cannot create attendance sessions
- supervisor cannot access admin-only modules
- supervisor cannot access teacher-only dashboard
- supervisor cannot manage announcements or bulk communication endpoints
- supervisor cannot read reports for students outside supervised class-year assignments

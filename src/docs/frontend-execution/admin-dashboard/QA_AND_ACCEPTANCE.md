# Admin Dashboard QA And Acceptance

## Auth and bootstrap

- admin can login and call `GET /auth/me`
- readiness checks load successfully
- dashboard loads only after bootstrap completes

## Active context

- `GET /academic-structure/context/active` loads during bootstrap
- `PATCH /academic-structure/context/active` works for admin only
- daily academic surfaces:
  - accept omitted `academicYearId` and `semesterId`
  - reject mismatching ids with validation errors
  - return `409 ACADEMIC_CONTEXT_NOT_CONFIGURED` when active context is missing

## Daily operations

- admin-created attendance session requires `teacherId`
- admin-created assessment requires `teacherId`
- admin-created homework requires `teacherId`
- attendance roster save fails when:
  - a student is duplicated
  - a roster student is missing
  - a foreign student is included
- assessment score save fails when:
  - a score exceeds `maxScore`
  - a student is duplicated
  - a foreign student is included
- homework submission save fails when:
  - a student is duplicated
  - a foreign student is included

## Transport

- admin-only transport management surfaces work
- trip live operations are reachable by admin
- transport domain errors are surfaced correctly for invalid state/date/route/stop combinations
- home locations with `approved` state are the only ones that should be considered driver-visible in roster semantics

## Reporting

- admin dashboard returns successfully
- admin preview parent/teacher/supervisor routes are read-only and reachable
- student profile and per-student summaries load

## School onboarding import

- `dry-run` returns structured result with `status`, `canApply`, `summary`, and `issues`
- `apply` rejects missing or invalid `dryRunId`
- repeated apply on the same successful dry-run returns `alreadyApplied=true`
- history list/detail are readable by admin

## Negative acceptance

- non-admin tokens receive `403` on admin-only surfaces
- frontend does not need loops to simulate:
  - bulk communication
  - school onboarding import

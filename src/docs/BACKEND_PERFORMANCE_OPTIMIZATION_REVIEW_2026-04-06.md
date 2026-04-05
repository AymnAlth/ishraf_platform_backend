# Backend Performance Optimization Review

Generated: `2026-04-06 Asia/Aden`

## Purpose
This document captures the backend performance work completed after commit `982867c` and reviews whether any of those changes alter frontend-facing contracts.

Scope:
- Backend code and database only
- No frontend source edits
- No API contract redesign
- No security weakening for auth

## Contract Review
### Final judgment
The recent performance changes do **not** change frontend request contracts.

### Why this is true
- No route files were changed.
- No controller files were changed.
- No validator files were changed.
- No request/response DTO files were changed.
- No `API_REFERENCE.md`, `OpenAPI`, or `Postman` contract files were modified for these waves.
- The changes were limited to:
  - repositories
  - services
  - internal helper types
  - request-scoped memoization
  - internal performance audit tooling
  - targeted database indexes
  - tests

### What did change
- Internal query shape
- Internal write-path orchestration
- Internal memoization
- Internal audit tooling
- Database indexes

### What did not change
- Endpoint paths
- HTTP methods
- Authentication/authorization behavior
- Request payload shapes
- Response payload shapes
- Error contract semantics

## Verification Evidence
The following checks passed after the performance waves:

- `pnpm.cmd build`
- `pnpm.cmd test:unit` -> `276 passed`
- `pnpm.cmd test:integration` -> `94 passed`
- `pnpm.cmd test:integration:perf`
- `pnpm.cmd test:integration:perf:sql`

The integration suite is the strongest contract-level proof here because it exercises the real endpoints end-to-end with the existing frontend-facing API behavior.

## Performance Waves
### Wave 1: Measurement and Request-Scoped Infrastructure
Goal:
- Stop guessing
- Measure real slow routes and real slow SQL

Changes:
- Added endpoint-level performance audit:
  - `src/common/services/request-performance-audit.service.ts`
  - `src/common/middlewares/request-logger.middleware.ts`
  - `src/scripts/audit-endpoint-performance.ts`
  - `package.json` -> `test:integration:perf`
- Added SQL-level performance audit:
  - `src/common/services/query-performance-audit.service.ts`
  - `src/common/services/request-execution-context.service.ts`
  - `src/common/middlewares/request-execution-context.middleware.ts`
  - `src/database/db.ts`
  - `src/scripts/audit-query-performance.ts`
  - `package.json` -> `test:integration:perf:sql`
- Added request-scoped memoization infrastructure:
  - `src/common/services/request-memo.service.ts`
  - `src/common/middlewares/request-memo.middleware.ts`
  - `src/app/app.ts`

Decisions:
- Use `AsyncLocalStorage` instead of external cache.
- Keep audit tooling opt-in through environment flags.
- Persist audit output under `.tmp/` only.
- Avoid any API-facing behavior change.

Impact:
- Enabled route-level and SQL-level evidence for every next decision.
- Reduced duplicated lookups within the same request when memoization is used.

### Wave 2: Reporting N+1 Collapse and Set-Based Writes
Goal:
- Remove real hot-path waste before adding more infrastructure

Changes:
- Reporting parent/admin-preview parent/supervisor dashboards no longer fetch attendance/assessment/behavior summary per student individually.
- Bulk summary reads were introduced in:
  - `src/modules/reporting/repository/reporting.repository.ts`
  - `src/modules/reporting/service/reporting.service.ts`
- Bulk writes moved away from row-by-row loops in:
  - `src/modules/attendance/repository/attendance.repository.ts`
  - `src/modules/assessments/repository/assessments.repository.ts`
  - `src/modules/homework/repository/homework.repository.ts`
- Request-scoped memoization was applied to:
  - `src/common/services/active-academic-context.service.ts`
  - `src/common/services/profile-resolution.service.ts`
  - consuming services in attendance, assessments, behavior, transport, reporting
- Added targeted indexes:
  - `src/database/migrations/1731500000000_hot_path_performance_indexes.js`

Decisions:
- Fix query shape before adding more indexes.
- Keep dashboards contract-stable while changing only the read strategy.
- Use set-based SQL instead of per-row round-trips for hot bulk writes.

Impact:
- `reporting` stopped being the top daily bottleneck.
- The slowest daily routes moved toward write paths instead of dashboards.

### Wave 3: Attendance and Assessments Write-Path Collapse
Goal:
- Reduce unnecessary rereads after successful bulk upserts

Changes:
- `saveSessionAttendance` now:
  - reads session + roster once
  - bulk upserts records
  - merges results in memory
  - derives counts in memory
  - does not reread session + roster after the write
- `saveAssessmentScores` now:
  - reads assessment + roster once
  - bulk upserts scores
  - merges results in memory
  - derives counts and averages in memory
  - does not reread assessment + roster after the write
- Related files:
  - `src/modules/attendance/service/attendance.service.ts`
  - `src/modules/attendance/types/attendance.types.ts`
  - `src/modules/assessments/service/assessments.service.ts`
  - `src/modules/assessments/types/assessments.types.ts`

Decisions:
- Preserve response shape exactly.
- Avoid post-write rereads when the response can be deterministically rebuilt from the already-fetched roster and the `RETURNING` rows.

Measured impact:
- `PUT /api/v1/attendance/sessions/:id/records`
  - before: `p95 ≈ 55.81ms`
  - after this wave: `p95 ≈ 42.59ms`
- `PUT /api/v1/assessments/:id/scores`
  - before: `p95 ≈ 48.97ms`
  - after this wave: `p95 ≈ 27.66ms`

### Wave 4: Hot Roster Direct Lookups
Goal:
- Remove unnecessary dependence on heavier roster views for the hottest daily write surfaces

Changes:
- Attendance and assessments roster queries were rewritten to read directly from:
  - `student_academic_enrollments`
  - `students`
  - `attendance`
  - `student_assessments`
- Added targeted roster indexes:
  - `src/database/migrations/1731510000000_hot_roster_lookup_indexes.js`
- Updated migration smoke tests accordingly.

Decisions:
- Use direct base-table joins for the hottest roster paths only.
- Keep broader views available elsewhere where they are not the measured bottleneck.

Impact:
- Attendance and assessment roster reads became materially cheaper.
- Both hot write routes dropped out of the slowest-route cluster in later audits.

### Wave 5: Direct Detail Queries and Teacher Dashboard Query Tightening
Goal:
- Remove global aggregates and view-heavy detail reads from frequent operational flows

Changes:
- Replaced several detail queries with targeted direct-table queries or lateral aggregates in:
  - `src/modules/attendance/repository/attendance.repository.ts`
  - `src/modules/assessments/repository/assessments.repository.ts`
  - `src/modules/homework/repository/homework.repository.ts`
  - `src/modules/reporting/repository/reporting.repository.ts`
- Added regression tests to prevent falling back to heavier view/global-aggregate patterns:
  - `tests/unit/attendance.repository.test.ts`
  - `tests/unit/assessments.repository.test.ts`
  - `tests/unit/homework.repository.test.ts`
  - `tests/unit/reporting.repository.test.ts`

Decisions:
- Optimize only the measured detail paths instead of rewriting whole modules.
- Use correlated/lateral aggregates when the request targets one entity, not a full list.

Measured impact:
- Teacher dashboard assessment query:
  - before: `~13.64ms`
  - after: `~4.37ms`
- Admin preview teacher dashboard assessment query:
  - before: `~20.10ms`
  - after: `~6.65ms`
- Homework heavy detail paths improved materially:
  - `POST /homework` from `~13.29ms` to `~3.61ms avg`
  - `GET /homework/:id` from `~11.34ms` to `~4.25ms`
  - `PUT /homework/:id/submissions` from `~9.32ms` to `~3.45ms avg`

### Wave 6: Reporting Student Profile and Behavior Direct Reads
Goal:
- Target the next confirmed hotspots after earlier waves

Changes:
- Replaced behavior reads built on heavy views with direct base-table joins in:
  - `src/modules/behavior/repository/behavior.repository.ts`
- Replaced single-student reporting summary reads with targeted base-table aggregates in:
  - `src/modules/reporting/repository/reporting.repository.ts`
- Teacher/supervisor recent behavior slices also moved away from `vw_behavior_details`.
- Added behavior hot-path indexes:
  - `src/database/migrations/1731520000000_behavior_hot_path_indexes.js`
- Added regression coverage:
  - `tests/unit/behavior.repository.test.ts`
  - `tests/unit/reporting.repository.test.ts`

Decisions:
- Keep bulk dashboard summary methods stable where they were not the measured bottleneck.
- Optimize only the single-student profile and behavior hot paths that the audits surfaced.
- Use direct joins and scoped aggregates instead of generalized reporting views.

Current measured state after this wave:
- `GET /api/v1/reporting/students/:studentId/profile`
  - `p95 ≈ 41.29ms`
- `POST /api/v1/behavior/records`
  - `p95 ≈ 18.64ms`

Current SQL audit interpretation:
- The remaining cost in `student profile` is now the actual summary aggregation work itself, not a heavy reporting view.
- The remaining cost in `behavior create` is mainly:
  - the post-insert detail read
  - the student reference lookup
- This is a better and more predictable cost profile than the previous generalized view-based path.

## Files Affected
### Core instrumentation
- `package.json`
- `src/app/app.ts`
- `src/database/db.ts`
- `src/common/middlewares/request-logger.middleware.ts`
- `src/common/middlewares/request-execution-context.middleware.ts`
- `src/common/middlewares/request-memo.middleware.ts`
- `src/common/services/request-performance-audit.service.ts`
- `src/common/services/query-performance-audit.service.ts`
- `src/common/services/request-execution-context.service.ts`
- `src/common/services/request-memo.service.ts`
- `src/common/services/active-academic-context.service.ts`
- `src/common/services/profile-resolution.service.ts`

### Operational modules
- `src/modules/reporting/repository/reporting.repository.ts`
- `src/modules/reporting/service/reporting.service.ts`
- `src/modules/attendance/repository/attendance.repository.ts`
- `src/modules/attendance/service/attendance.service.ts`
- `src/modules/attendance/types/attendance.types.ts`
- `src/modules/assessments/repository/assessments.repository.ts`
- `src/modules/assessments/service/assessments.service.ts`
- `src/modules/assessments/types/assessments.types.ts`
- `src/modules/homework/repository/homework.repository.ts`
- `src/modules/behavior/repository/behavior.repository.ts`
- `src/modules/behavior/service/behavior.service.ts`
- `src/modules/transport/service/transport.service.ts`

### Performance migrations
- `src/database/migrations/1731500000000_hot_path_performance_indexes.js`
- `src/database/migrations/1731510000000_hot_roster_lookup_indexes.js`
- `src/database/migrations/1731520000000_behavior_hot_path_indexes.js`

### Verification
- `tests/integration/integration.test.ts`
- `tests/integration/migrations/migrations.integration.ts`
- `tests/unit/attendance.service.test.ts`
- `tests/unit/assessments.service.test.ts`
- `tests/unit/behavior.service.test.ts`
- `tests/unit/reporting.service.test.ts`
- `tests/unit/transport.service.test.ts`
- `tests/unit/common/profile-resolution.service.test.ts`
- `tests/unit/attendance.repository.test.ts`
- `tests/unit/assessments.repository.test.ts`
- `tests/unit/homework.repository.test.ts`
- `tests/unit/behavior.repository.test.ts`
- `tests/unit/reporting.repository.test.ts`

## Explicit Frontend Safety Statement
From the frontend perspective, these performance waves are safe because:

- Existing request payloads are unchanged.
- Existing response fields are unchanged.
- Existing endpoint URLs and methods are unchanged.
- Existing validation behavior is unchanged.
- Existing authorization rules are unchanged.
- Existing error semantics are unchanged.

The frontend may only observe:
- lower latency
- different internal execution timing
- unchanged business outputs

## Remaining Hotspots
The current top slow routes are no longer the daily operational routes targeted by these waves.

Current remaining hotspots:
- `POST /api/v1/admin-imports/school-onboarding/apply`
- `POST /api/v1/admin-imports/school-onboarding/dry-run`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/change-password`

These are not part of the current wave for explicit reasons:
- import paths are not daily hot paths
- auth cost is partly intentional because of `bcrypt`

## Deliberately Rejected Ideas
These ideas were intentionally not implemented:

- lowering `bcrypt` cost
- introducing Redis
- adding an async queue
- rewriting public contracts
- rewriting every reporting/behavior path blindly
- adding speculative indexes without measured query evidence

## Recommended Next Step
Before any push, the current backend performance branch is in a reviewable state.

If further optimization is required after this:
- target `admin-imports` only if onboarding throughput matters operationally
- target auth only if security policy explicitly allows revisiting bcrypt cost

Otherwise, the current recommendation is:
- keep these changes
- push them as a dedicated performance batch
- apply the three performance migrations together


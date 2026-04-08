# Driver App QA And Acceptance

## Happy paths

- `GET /transport/route-assignments/me` returns only driver-owned assignments.
- `POST /transport/trips/ensure-daily` creates or reuses daily trip correctly.
- start -> locations -> events flow works for owned trip.
- `GET /transport/trips/:id/students` returns trip-date roster and last event projection.
- `GET /transport/trips/:id/eta` returns provider-neutral calculation mode.
- `GET /transport/realtime-token?tripId=...` returns write-capable bootstrap payload for owned trip.

## Stop attendance flow

- `POST /transport/trips/:tripId/stops/:stopId/attendance` accepts valid batch.
- for `pickup`, `present` is persisted as `boarded`.
- for `dropoff`, `present` is persisted as `dropped_off`.
- `absent` persists as `absent`.
- successful attendance closes stop snapshot.
- if this is last open stop, trip transitions to `completed`.

## Expected validation failures

- trip not `started` -> `TRIP_STOP_ATTENDANCE_STATUS_INVALID`.
- stop outside route -> `TRIP_ATTENDANCE_STOP_ROUTE_MISMATCH`.
- student assignment not on trip date -> `STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND`.
- student assignment route mismatch -> `TRIP_STUDENT_ROUTE_MISMATCH`.
- student assignment stop mismatch -> `TRIP_ATTENDANCE_STOP_ASSIGNMENT_MISMATCH`.
- stop snapshot missing -> `TRIP_STOP_ETA_SNAPSHOT_NOT_FOUND`.
- duplicate `studentId` in one request -> validation error.

## Expected denials

- driver cannot access admin static management surfaces.
- driver cannot access admin trip summary endpoint.
- driver cannot access other driver trips (ownership check).

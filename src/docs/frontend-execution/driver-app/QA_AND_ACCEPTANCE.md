# Driver App QA And Acceptance

## Happy paths

- driver login succeeds
- `GET /transport/route-assignments/me` returns only current driver's assignments
- `POST /transport/trips/ensure-daily` creates or reuses the correct trip
- trip list/detail/roster succeed within driver ownership scope
- trip can move from `scheduled` to `started`
- locations can be recorded only after trip start
- trip can move from `started` to `ended`
- student events can be recorded during `started` and `ended`
- transport summary is reachable for driver
- messaging, announcements, notifications work

## Expected validation failures

- starting a non-scheduled trip returns `TRIP_STATUS_START_INVALID`
- ending a non-started trip returns `TRIP_STATUS_END_INVALID`
- posting location before start returns `TRIP_LOCATION_STATUS_INVALID`
- posting event in invalid trip state returns `TRIP_EVENT_STATUS_INVALID`
- `boarded` or `dropped_off` without `stopId` returns `TRIP_EVENT_STOP_REQUIRED`
- `absent` with `stopId` returns `TRIP_EVENT_STOP_NOT_ALLOWED`
- using an inactive route assignment for `ensure-daily` returns `TRANSPORT_ROUTE_ASSIGNMENT_NOT_ACTIVE_FOR_TRIP_DATE`
- recording an event for a student without trip-date assignment returns `STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND`
- recording an event for a student assigned to another route returns `TRIP_STUDENT_ROUTE_MISMATCH`
- recording an event with a stop outside the trip route returns `TRIP_EVENT_STOP_ROUTE_MISMATCH`

## Expected denials

- driver cannot access admin-only transport management surfaces
- driver cannot access academic admin modules
- driver cannot access staff or parent dashboards
- driver cannot access trips or route assignments owned by another driver

# Parent App QA And Acceptance

## Happy paths

- parent login succeeds.
- `GET /reporting/dashboards/parent/me` returns linked children only.
- linked student report endpoints return data correctly.
- `GET /transport/trips/:tripId/live-status` returns:
  - `tripStatus`
  - `firebaseRtdbPath`
  - `myStopSnapshot`
  - `routePolyline`
- `GET /transport/realtime-token?tripId=...` succeeds when parent is linked to that trip.

## Live tracking correctness

- RTDB path in response equals:
  - `/transport/live-trips/{tripId}/latestLocation`
- parent app uses RTDB for live bus movement.
- parent app uses REST snapshot for ETA and stop-state flags.
- `myStopSnapshot` contains `approachingNotified` and `arrivedNotified`.

## Ownership and denials

- non-linked parent calling `GET /transport/trips/:tripId/live-status` gets `403`.
- parent cannot call admin-only transport summary endpoint.
- parent cannot access non-linked student reporting surfaces.

## FCM proximity events

- approaching notification contains Arabic title/body and `bus_approaching`.
- arrived notification contains Arabic title/body and `bus_arrived`.
- multi-student notifications show aggregated names (not first-student only).
- payload data includes `tripId`, `routeId`, `studentIds[]`, and `notificationType`.

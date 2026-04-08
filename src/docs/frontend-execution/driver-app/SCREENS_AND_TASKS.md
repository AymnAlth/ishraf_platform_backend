# Driver App Screens And Tasks

## 1. Start of day

1. Login.
2. Load `GET /transport/route-assignments/me`.
3. Select assignment and call `POST /transport/trips/ensure-daily`.
4. Open trip detail/roster.

## 2. Live trip screen

1. Start trip (`POST /transport/trips/:id/start`).
2. Request realtime token (`GET /transport/realtime-token?tripId=...`).
3. Stream GPS to RTDB path:
   - `/transport/live-trips/{tripId}/latestLocation`
4. Keep periodic backend location writes when required:
   - `POST /transport/trips/:id/locations`
5. Read ETA cards from:
   - `GET /transport/trips/:id/eta`

## 3. Stop attendance screen

1. Identify current stop.
2. Submit one batch:
   - `POST /transport/trips/:tripId/stops/:stopId/attendance`
3. Send `attendances[]` for students at that stop.
4. Show backend result:
   - `stopCompleted`
   - `tripCompleted`
   - `tripStatus`
5. If `tripCompleted=true`, stop live operations for that trip.

## 4. Student event screen

1. For ad-hoc event logging use `POST /transport/trips/:id/events`.
2. Respect stop rules:
   - `boarded/dropped_off` require `stopId`
   - `absent` forbids `stopId`

## 5. End of trip

1. Manual end is still available:
   - `POST /transport/trips/:id/end`
2. Automatic completion can already happen after attendance closes all stops.
3. Business rule:
   - if `tripStatus = completed` (auto), hide or disable the manual `End Trip` button to prevent state conflicts.

## 6. Operational communication

1. Use inbox/conversation endpoints for coordination.
2. Use notification feed for operational alerts.

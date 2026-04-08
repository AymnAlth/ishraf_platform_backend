# Parent App Endpoint Map

## 1. Session

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

## 2. Parent dashboards and student reports

- `GET /reporting/dashboards/parent/me`
- `GET /reporting/dashboards/parent/me/students/:studentId/profile`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary`
- `GET /reporting/transport/parent/me/students/:studentId/live-status` (supporting surface)

## 3. Main transport live-tracking flow

- `GET /transport/trips/:tripId/live-status` (primary endpoint)
- `GET /transport/realtime-token?tripId=...` (Firebase bootstrap)

### Live-tracking split

- GPS live stream:
  - read RTDB path `/transport/live-trips/{tripId}/latestLocation`
- ETA and notifications state:
  - read from `GET /transport/trips/:tripId/live-status`
  - use `myStopSnapshot` fields for ETA cards and approach/arrival UI state.

## 4. Homework

- `GET /homework/students/:studentId`

## 5. Communication

- `GET /communication/recipients`
- `POST /communication/messages`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`
- `GET /communication/announcements/active`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`

## 6. Proximity notifications payload reference

### 6.1 Approaching event

- `event_type`: `fcm.transport.bus_approaching`
- `data.eventType`: `bus_approaching`
- `data.notificationType`: `transport_bus_approaching`
- `data.studentIds`: `string[]`
- `referenceType`: `trip_stop`
- `referenceId`: `{tripId}:{stopId}`

### 6.2 Arrived event

- `event_type`: `fcm.transport.bus_arrived`
- `data.eventType`: `bus_arrived`
- `data.notificationType`: `transport_bus_arrived`
- `data.studentIds`: `string[]`
- `referenceType`: `trip_stop`
- `referenceId`: `{tripId}:{stopId}`

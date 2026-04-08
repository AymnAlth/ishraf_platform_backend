# Driver App Endpoint Map

## 1. Session

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

## 2. Route assignments

- `GET /transport/route-assignments/me`

## 3. Trip lifecycle

- `POST /transport/trips/ensure-daily`
- `POST /transport/trips`
- `GET /transport/trips`
- `GET /transport/trips/:id`
- `POST /transport/trips/:id/start`
- `POST /transport/trips/:id/locations`
- `POST /transport/trips/:id/events`
- `GET /transport/trips/:id/events`
- `POST /transport/trips/:id/end`

### State semantics

```text
scheduled -> started -> ended
started/ended -> completed (automatic after all stop attendance is closed)
```

## 4. Roster, ETA, realtime

- `GET /transport/trips/:id/students`
- `GET /transport/trips/:id/eta`
- `GET /transport/realtime-token?tripId=...`

### Realtime split

- Live GPS: Firebase RTDB path `/transport/live-trips/{tripId}/latestLocation`
- ETA: REST snapshot from `/transport/trips/:id/eta`

## 5. Stop attendance (Batch 5)

- `POST /transport/trips/:tripId/stops/:stopId/attendance`

### Request body

```json
{
  "attendances": [
    { "studentId": "1", "status": "present", "notes": null },
    { "studentId": "2", "status": "absent" }
  ]
}
```

### Validation and behavior

- `attendances` required and non-empty.
- duplicate `studentId` in same payload is rejected.
- trip must be `started`.
- stop must belong to trip route.
- each student must be assigned to same trip date + same stop.
- after success:
  - stop snapshot closed
  - trip may auto-finalize to `completed`.

## 6. Reporting and communication

- `GET /reporting/transport/summary`
- `GET /communication/recipients`
- `POST /communication/messages`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`
- `GET /communication/announcements/active`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`

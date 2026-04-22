# Driver App Screens And Tasks (Code-Truth)

## 1. Start of day

1. Login.
2. Load `GET /transport/route-assignments/me`.
3. Use `POST /transport/trips/ensure-daily`.
4. Open trip detail + roster.

## 2. Trip execution

1. Start trip (`POST /transport/trips/:id/start`).
2. Request realtime token.
3. Connect RTDB for live location channel.
4. Send locations (`POST /transport/trips/:id/locations`) أثناء الرحلة.
5. Read ETA cards من `GET /transport/trips/:id/eta`.

## 3. Stop attendance

1. عند كل محطة:
   - `POST /transport/trips/:tripId/stops/:stopId/attendance`
2. body:

```json
{
  "attendances": [
    { "studentId": "1", "status": "present", "notes": null },
    { "studentId": "2", "status": "absent" }
  ]
}
```

3. راقب response:
   - `stopCompleted`
   - `tripCompleted`
   - `tripStatus`

## 4. End trip behavior

1. manual end endpoint:
   - `POST /transport/trips/:id/end`
2. auto-complete:
   - عند اكتمال كل المحطات عبر attendance.
3. UX rule:
   - إذا `tripStatus=completed` => hide/disable زر `End Trip`.

## 5. Optional event logging

- `POST /transport/trips/:id/events`
- قواعد:
  - `boarded/dropped_off` تتطلب `stopId`
  - `absent` يمنع `stopId`

## 6. Communication

1. Direct messaging.
2. Inbox/sent/conversation.
3. Notifications and announcements feed.

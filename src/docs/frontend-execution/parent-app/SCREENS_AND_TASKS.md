# Parent App Screens And Tasks

## 1. Parent home screen

1. Login.
2. Load `GET /reporting/dashboards/parent/me`.
3. Render linked children.

## 2. Child details screen

1. Open child profile and report endpoints.
2. Show attendance/assessment/behavior summaries.
3. Show homework list for selected child.

## 3. Live trip screen (primary integration)

1. Resolve target `tripId` من سطوح التقارير/التتبع.
2. Call `GET /transport/trips/:tripId/live-status`.
3. Use response fields:
   - `tripStatus`
   - `myStopSnapshot`
   - `routePolyline`
   - `firebaseRtdbPath`
4. Call `GET /transport/realtime-token?tripId=...`.
5. Use Firebase token and start listening to RTDB:
   - `/transport/live-trips/{tripId}/latestLocation`

## 4. Notification UX

1. On FCM receive:
   - `bus_approaching`
   - `bus_arrived`
2. Display incoming Arabic message as-is from backend.
3. Use `data.tripId` and `data.studentIds` for deep-link routing to trip/child screens.

## 5. Communication screens

1. Recipients lookup.
2. Direct messaging.
3. Inbox/sent/conversation.
4. Active announcements and notifications feed.

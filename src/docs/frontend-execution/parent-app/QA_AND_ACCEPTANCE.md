# Parent App QA And Acceptance

## 1) Session And Role

### Case 1: successful login
- Given parent credentials are valid.
- When `POST /auth/login` succeeds.
- Then app stores tokens and calls `GET /auth/me`.
- And role must be `parent`.

### Case 2: expired access token
- Given API call returns `401`.
- When app performs one `POST /auth/refresh`.
- Then original request retries once.
- And if second failure occurs, user is logged out to login screen.

## 2) Parent Dashboard And Reports

### Case 3: dashboard data
- `GET /reporting/dashboards/parent/me` returns only linked children.
- Each child card renders summaries from payload only.
- `unreadNotifications` appears in badge correctly.

### Case 4: active context missing
- If backend returns `409` with `ACADEMIC_CONTEXT_NOT_CONFIGURED`.
- App shows operational message instead of generic error.

### Case 5: ownership guard
- Accessing student report endpoint for non-linked student returns `403`.
- App must show access denied state and stop retries.

## 3) Live Tracking Contract

### Case 6: live-status happy path
- `GET /transport/trips/:tripId/live-status` returns:
- `tripStatus`
- `firebaseRtdbPath`
- `myStopSnapshot` (nullable)
- `routePolyline` (nullable)
- App renders gracefully when either nullable field is `null`.

### Case 7: RTDB bootstrap
- `GET /transport/realtime-token?tripId=...` succeeds for linked parent.
- Response `path` equals `/transport/live-trips/{tripId}/latestLocation`.
- App subscribes to RTDB for marker movement only.

### Case 8: transport split correctness
- ETA card uses REST snapshot fields only.
- Bus marker position uses RTDB stream only.
- No local ETA math on frontend.

### Case 9: live ownership denial
- Non-linked parent calling trip live-status gets `403`.
- UI returns to safe state with clear message.

### Case 10: realtime integration conflicts
- `409 FEATURE_DISABLED` and `409 INTEGRATION_NOT_CONFIGURED` are handled.
- UI hides realtime stream controls and keeps REST info if available.

## 4) FCM Contract

### Case 11: approaching event
- App receives `notification.title/body` Arabic text.
- `data.eventType = bus_approaching`.
- `data.notificationType = transport_bus_approaching`.

### Case 12: arrived event
- App receives `data.eventType = bus_arrived`.
- `data.notificationType = transport_bus_arrived`.

### Case 13: student ids parsing
- `data.studentIds` arrives as CSV string (example: `"501,502"`).
- Parser converts it to array before deep-link logic.

### Case 14: aggregated names integrity
- Notification body for multi-student stop includes multiple names.
- Body is not limited to first student only.

## 5) Communication And Device Registry

### Case 15: device lifecycle
- `POST /communication/devices` succeeds with `subscriptions=["transportRealtime"]`.
- `PATCH /communication/devices/:deviceId` updates token/deviceName/subscriptions.
- `DELETE /communication/devices/:deviceId` deactivates registration.

### Case 16: notification center
- `GET /communication/notifications/me` paginates correctly.
- `PATCH /communication/notifications/:notificationId/read` updates read state.

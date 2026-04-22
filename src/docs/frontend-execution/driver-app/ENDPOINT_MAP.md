# Driver App Endpoint Map (Code-Truth, Detailed)

كل المسارات تحت `/api/v1`.

## 1) Auth

| Method | Path | Purpose | Request | Response (core) | Notes |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/auth/login` | بدء الجلسة | `identifier`, `password` | `user`, `tokens` | عام (public). |
| `GET` | `/auth/me` | قراءة هوية الجلسة | Bearer | user profile | role يجب أن يكون `driver`. |
| `POST` | `/auth/refresh` | تدوير access token | `refreshToken` | tokens جديدة | عام (public). |
| `POST` | `/auth/logout` | إبطال refresh token | `refreshToken` | `data=null` | عام (public). |
| `POST` | `/auth/change-password` | تغيير كلمة المرور | `currentPassword`, `newPassword` | `data=null` | يتطلب user نشط. |

## 2) Transport — Driver Surfaces

### 2.1 Route assignment bootstrap

| Method | Path | Purpose | Request | Response (core) | أخطاء متوقعة |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/transport/route-assignments/me` | جلب route assignments الخاصة بالسائق | Bearer | `routeAssignmentId`, `bus`, `driver`, `route`, `startDate/endDate`, `isActive` | `401`, `403` |

### 2.2 Trip lifecycle and execution

| Method | Path | Purpose | Request | Response (core) | أخطاء/قواعد |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/transport/trips` | إنشاء رحلة يدويًا | `CreateTripRequest` (`busId`,`routeId`,`tripDate`,`tripType`) | trip list item | يتطلب ownership/operation scope للسائق. |
| `POST` | `/transport/trips/ensure-daily` | إنشاء/إعادة استخدام رحلة اليوم | `EnsureDailyTripRequest` | `{ created, trip }` | `TRANSPORT_ROUTE_ASSIGNMENT_NOT_ACTIVE_FOR_TRIP_DATE` عند assignment غير صالح للتاريخ. |
| `GET` | `/transport/trips` | قائمة الرحلات | query: `page,limit,sortBy,sortOrder,busId,routeId,tripType,tripStatus,tripDate,dateFrom,dateTo` | paginated `items[]` | ownership applied للسائق. |
| `GET` | `/transport/trips/:id` | تفاصيل الرحلة | path `id` | `{ trip, latestLocation, routeStops, eventSummary }` | `403` عند عدم ملكية الرحلة. |
| `POST` | `/transport/trips/:id/start` | بدء الرحلة | path `id` | trip list item | يتطلب `scheduled` وإلا `TRIP_STATUS_START_INVALID`. |
| `POST` | `/transport/trips/:id/end` | إنهاء يدوي | path `id` | trip list item | يتطلب `started` وإلا `TRIP_STATUS_END_INVALID`. |
| `POST` | `/transport/trips/:id/locations` | تسجيل نقطة موقع | `RecordTripLocationRequest` | `{ latitude, longitude, recordedAt }` | يتطلب `started` وإلا `TRIP_LOCATION_STATUS_INVALID`. |
| `GET` | `/transport/trips/:id/eta` | قراءة ETA snapshot | path `id` | `{ tripStatus, routePolyline, etaSummary, remainingStops, computedAt }` | provider-neutral (`provider_snapshot/derived_estimate`). |
| `GET` | `/transport/trips/:id/students` | roster الرحلة | query optional: `search,stopId` | `{ tripId, tripStatus, students[] }` | `homeLocation` تظهر فقط إذا approved. |
| `POST` | `/transport/trips/:id/events` | event يدوي لطالب | `CreateTripStudentEventRequest` | trip student event row | `TRIP_EVENT_STATUS_INVALID`, `TRIP_EVENT_STOP_ROUTE_MISMATCH`, `TRIP_STUDENT_ROUTE_MISMATCH`. |
| `GET` | `/transport/trips/:id/events` | قائمة events | path `id` | `TripStudentEvent[]` | ownership enforced. |
| `POST` | `/transport/trips/:tripId/stops/:stopId/attendance` | attendance محطة وإغلاقها | `RecordTripStopAttendanceRequest` | `{ tripStatus, stopCompleted, tripCompleted, recordedEvents[] }` | `TRIP_STOP_ATTENDANCE_STATUS_INVALID`, `TRIP_ATTENDANCE_STOP_ROUTE_MISMATCH`, `TRIP_ATTENDANCE_STOP_ASSIGNMENT_MISMATCH`, `TRIP_STOP_ETA_SNAPSHOT_NOT_FOUND`. |

### 2.3 Realtime bootstrap

| Method | Path | Purpose | Request | Response (core) | أخطاء حاسمة |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/transport/realtime-token` | إصدار Firebase token للرحلة | query `tripId` | `customToken,databaseUrl,path,tripId,access,refreshAfterSeconds` | `409 FEATURE_DISABLED`, `409 INTEGRATION_NOT_CONFIGURED`, `403` ownership |

## 3) Reporting

| Method | Path | Purpose | Request | Response (core) |
| --- | --- | --- | --- | --- |
| `GET` | `/reporting/transport/summary` | transport summary سريع | Bearer | summary + activeTrips |

## 4) Communication (Driver-Allowed)

| Method | Path | Purpose | Request | Response (core) |
| --- | --- | --- | --- | --- |
| `POST` | `/communication/devices` | تسجيل جهاز FCM | `RegisterCommunicationDeviceRequest` | communication device |
| `PATCH` | `/communication/devices/:deviceId` | تحديث جهاز | `UpdateCommunicationDeviceRequest` | communication device |
| `DELETE` | `/communication/devices/:deviceId` | إلغاء تسجيل جهاز | path `deviceId` | unregistered device |
| `GET` | `/communication/recipients` | قائمة مستلمين متاحين | query `page,limit,search,role` | paginated recipients |
| `POST` | `/communication/messages` | إرسال رسالة مباشرة | `SendMessageRequest` | message |
| `GET` | `/communication/messages/inbox` | inbox | paginated query | paginated messages + `unreadCount` |
| `GET` | `/communication/messages/sent` | sent | paginated query | paginated messages |
| `GET` | `/communication/messages/conversations/:otherUserId` | thread مع مستخدم | paginated query | paginated messages |
| `PATCH` | `/communication/messages/:messageId/read` | mark read message | path | message |
| `GET` | `/communication/announcements/active` | active announcements | Bearer | announcements[] |
| `GET` | `/communication/notifications/me` | notifications feed | paginated query | paginated notifications + `unreadCount` |
| `PATCH` | `/communication/notifications/:notificationId/read` | mark read notification | path | notification |

## 5) Non-Allowed (Driver)

1. `GET /transport/trips/:tripId/summary` (admin-only).
2. transport static/admin setup:
- `/transport/buses*`
- `/transport/routes*`
- `/transport/assignments*`
- `/transport/route-assignments` (admin list/create/deactivate, عدا `/me`).
3. كل admin management modules:
- `/users/*`, `/academic-structure/*`, `/students/*`, `/system-settings/*`, `/admin-imports/*`.

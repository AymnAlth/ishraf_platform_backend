# Driver App Endpoint Map

## 1. Session

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

## 2. Route assignments

- `GET /transport/route-assignments/me`

قواعد:

- هذه surface السائق الأساسية لاكتشاف المسارات المتاحة له.
- تعيد assignments الخاصة بالسائق الحالي فقط.

## 3. Trip state machine

```text
scheduled -> started -> ended

cancelled
  قيمة enum موجودة
  لكنها ليست transition موثقة عبر route مستقلة في السطح الحالي
```

قواعد transitions:

- `POST /transport/trips/:id/start`
  - مسموح فقط عندما `tripStatus = scheduled`
- `POST /transport/trips/:id/end`
  - مسموح فقط عندما `tripStatus = started`
- `POST /transport/trips/:id/locations`
  - مسموح فقط عندما `tripStatus = started`
- `POST /transport/trips/:id/events`
  - مسموح فقط عندما `tripStatus = started` أو `ended`

## 4. Trips

- `POST /transport/trips`
- `POST /transport/trips/ensure-daily`
- `GET /transport/trips`
- `GET /transport/trips/:id`
- `GET /transport/trips/:id/students`
- `POST /transport/trips/:id/start`
- `POST /transport/trips/:id/end`
- `POST /transport/trips/:id/locations`
- `POST /transport/trips/:id/events`
- `GET /transport/trips/:id/events`

### 4.1 Preferred create flow

- استخدم `POST /transport/trips/ensure-daily` كـ primary driver flow
- `POST /transport/trips` تبقى fallback أقدم

`ensure-daily` rules:

- تعتمد `routeAssignmentId`
- route assignment يجب أن:
  - تكون مملوكة للسائق الحالي
  - تكون active
  - وتغطي `tripDate`

إذا كانت الرحلة موجودة أصلًا لنفس:

- `busId`
- `routeId`
- `tripDate`
- `tripType`

فسيعود `created=false` بدل duplication.

### 4.2 Ownership rules

- `GET /transport/route-assignments/me` يعرض assignments السائق فقط
- `GET /transport/trips`
- `GET /transport/trips/:id`
- `GET /transport/trips/:id/students`
- `POST /transport/trips/:id/start`
- `POST /transport/trips/:id/end`
- `POST /transport/trips/:id/locations`
- `POST /transport/trips/:id/events`
- `GET /transport/trips/:id/events`

كلها ownership-scoped. السائق لا يصل إلى موارد سائق آخر.

### 4.3 Trip roster response concept

`GET /transport/trips/:id/students` يعيد لكل طالب:

- stop assignment
- stop coordinates
- approved home location عند وجودها
- `lastEventType`
- `lastEventTime`
- `lastEventStopId`

### 4.4 Trip detail response concept

`GET /transport/trips/:id` يعيد:

- trip الأساسية
- route stops
- latest location
- event summary

## 5. Student event rule table

| `eventType` | `stopId` rule |
| --- | --- |
| `boarded` | required |
| `dropped_off` | required |
| `absent` | forbidden |

## 6. Driver-facing transport domain errors

| Code | المعنى |
| --- | --- |
| `TRIP_STATUS_START_INVALID` | محاولة start لرحلة ليست `scheduled` |
| `TRIP_STATUS_END_INVALID` | محاولة end لرحلة ليست `started` |
| `TRIP_LOCATION_STATUS_INVALID` | location لا تسجل إلا عندما تكون الرحلة `started` |
| `TRIP_EVENT_STATUS_INVALID` | student events لا تسجل إلا عندما تكون الرحلة `started` أو `ended` |
| `TRIP_EVENT_STOP_REQUIRED` | `stopId` مطلوب لـ `boarded` و`dropped_off` |
| `TRIP_EVENT_STOP_NOT_ALLOWED` | `stopId` ممنوع مع `absent` |
| `TRANSPORT_ROUTE_ASSIGNMENT_NOT_ACTIVE_FOR_TRIP_DATE` | route assignment غير فعالة في تاريخ الرحلة |
| `STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND` | الطالب لا يملك transport assignment تغطي تاريخ الرحلة |
| `TRIP_STUDENT_ROUTE_MISMATCH` | route assignment الخاصة بالطالب لا تطابق route الرحلة |
| `TRIP_EVENT_STOP_ROUTE_MISMATCH` | stop لا تتبع route الرحلة |

## 7. Reporting

- `GET /reporting/transport/summary`

ملاحظات:

- هذه surface summary مشتركة بين admin وdriver.
- ليست بديلًا عن trip detail أو roster.

## 8. Communication

- `GET /communication/recipients`
- `POST /communication/messages`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`
- `GET /communication/announcements/active`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`

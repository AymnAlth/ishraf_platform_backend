# Parent App Backend Contract

الدور المستهدف: `parent`

هذا الدليل يركّز على تتبع رحلة الطالب من منظور ولي الأمر، مع الفصل الواضح بين:

- **GPS live** عبر Firebase RTDB
- **ETA snapshot** عبر REST من الباك

## النطاق

- `transport` (live-status + realtime-token)
- `reporting` (parent dashboards and linked-student surfaces)
- `homework`
- `communication`
- `auth`

## القواعد المؤثرة

- كل surfaces الطالبية تعتمد parent-student linkage الفعلي.
- endpoint التتبع الحي الرئيسي في هذه المرحلة:
  - `GET /transport/trips/:tripId/live-status`
- هذا endpoint يعيد:
  - `tripStatus`
  - `firebaseRtdbPath`
  - `myStopSnapshot`
  - `routePolyline`
- إذا الوالد غير مرتبط بالرحلة يرجع `403`.

## Live status payload concept

- `firebaseRtdbPath` دائمًا بصيغة:
  - `/transport/live-trips/{tripId}/latestLocation`
- `myStopSnapshot` يمثل محطة الوالد الأقرب النشطة فقط (حسب stopOrder):
  - `remainingDistanceMeters`
  - `remainingDurationSeconds`
  - `approachingNotified`
  - `arrivedNotified`
  - `isCompleted`
  - `etaAt`
  - `updatedAt`
  - بيانات المحطة (`stopId`, `stopName`, `stopOrder`)
- `routePolyline` يأتي من ETA read model أو `null`.

## FCM proximity alerts (as implemented)

- approaching:
  - `event_type`: `fcm.transport.bus_approaching`
  - `title`: `اقتراب الحافلة`
  - body (single):
    - `حافلة الطالب [الاسم] تقترب من المحطة، ستصل خلال دقائق.`
  - body (multi):
    - `حافلة الطلاب [أسماء مفصولة بفاصلة عربية] تقترب من المحطة، ستصل خلال دقائق.`
- arrived:
  - `event_type`: `fcm.transport.bus_arrived`
  - `title`: `وصول الحافلة`
  - body (single):
    - `الحافلة بالخارج في انتظار الطالب [الاسم].`
  - body (multi):
    - `الحافلة بالخارج في انتظار الطلاب [اسم1 و اسم2].`

## Full SDK inbound payload (mobile)

هذا مثال payload كما تستقبله تطبيقات الموبايل عند وصول Push (FCM):

```json
{
  "messageId": "0:1730000000000000%example",
  "from": "1234567890",
  "notification": {
    "title": "وصول الحافلة",
    "body": "الحافلة بالخارج في انتظار الطلاب أحمد و سارة."
  },
  "data": {
    "eventType": "bus_arrived",
    "notificationType": "transport_bus_arrived",
    "tripId": "1201",
    "routeId": "31",
    "studentIds": "[\"501\",\"502\"]",
    "referenceType": "trip_stop",
    "referenceId": "1201:7"
  }
}
```

قواعد القراءة في التطبيق:

- `notification`:
  - يستخدم للـ banner/system notification (title/body الجاهز للعرض).
- `data`:
  - يستخدم للمنطق البرمجي (routing, deep link, state update).

العلاقة بين الحدث الداخلي في الباك والـ payload القادم للهاتف:

- `integration_outbox.event_type = fcm.transport.bus_approaching` -> `data.eventType = bus_approaching`
- `integration_outbox.event_type = fcm.transport.bus_arrived` -> `data.eventType = bus_arrived`

## Outbox/Firebase payload structure

العقدة الداخلية (integration_outbox) لكل ولي أمر:

- `provider_key`: `pushNotifications`
- `subscriptionKey`: `transportRealtime`
- `referenceType`: `trip_stop`
- `referenceId`: `{tripId}:{stopId}`
- `data`:
  - `eventType`: `bus_approaching | bus_arrived`
  - `tripId`
  - `routeId`
  - `studentIds[]`
  - `notificationType`:
    - `transport_bus_approaching` أو `transport_bus_arrived`
- `idempotency_key`:
  - `fcm:fcm.transport.bus_approaching:trip:{tripId}:stop:{stopId}:parent:{parentUserId}`
  - `fcm:fcm.transport.bus_arrived:trip:{tripId}:stop:{stopId}:parent:{parentUserId}`

> ملاحظة: التطبيق يستقبل `title/body/data` من FCM. `idempotency_key` جزء تشغيلي داخلي في outbox.

# Driver App Backend Contract

الدور المستهدف: `driver`

هذا الدليل يشرح سطوح التشغيل اليومية للسائق في النقل، مع التركيز على:

- دورة الرحلة
- حضور الطلاب على مستوى المحطة
- فصل GPS live (Firebase RTDB) عن ETA snapshot (REST)

## النطاق

- `transport` (ownership-scoped)
- `reporting/transport/summary`
- `communication`
- `auth`

## Enums التشغيلية

| Enum | Values |
| --- | --- |
| `TRIP_TYPE` | `pickup`, `dropoff` |
| `TRIP_STATUS` | `scheduled`, `started`, `ended`, `completed`, `cancelled` |
| `TRIP_STUDENT_EVENT_TYPE` | `boarded`, `dropped_off`, `absent` |
| `TRIP_STOP_ATTENDANCE_STATUS` | `present`, `absent` |

## القواعد المؤثرة

- كل trip endpoints للسائق ownership-scoped.
- `ensure-daily` هو المسار المفضل لبناء رحلة اليوم بدون duplication.
- تسجيل المواقع `POST /transport/trips/:id/locations` مسموح فقط عند `tripStatus=started`.
- حضور المحطة يتم عبر:
  - `POST /transport/trips/:tripId/stops/:stopId/attendance`
- بعد attendance ناجح:
  - تغلق المحطة (`is_completed=true`)
  - وإذا اكتملت كل المحطات تصبح الرحلة `completed` تلقائيًا.

## Hybrid live model

- GPS live:
  - Bootstrap token: `GET /transport/realtime-token?tripId=...`
  - RTDB path: `/transport/live-trips/{tripId}/latestLocation`
- ETA:
  - `GET /transport/trips/:id/eta`
  - backend snapshot فقط (`provider_snapshot` أو `derived_estimate`)

## Attendance mapping by trip type

- `status=present`:
  - `pickup -> boarded`
  - `dropoff -> dropped_off`
- `status=absent`:
  - always `absent`

## FCM inbound payload reference (SDK)

استخدم نفس قاعدة الفصل بين `notification` و`data` في أي إشعار يصل للتطبيق:

```json
{
  "messageId": "0:1730000000000000%example",
  "from": "1234567890",
  "notification": {
    "title": "اقتراب الحافلة",
    "body": "حافلة الطلاب أحمد، سارة تقترب من المحطة، ستصل خلال دقائق."
  },
  "data": {
    "eventType": "bus_approaching",
    "notificationType": "transport_bus_approaching",
    "tripId": "1201",
    "routeId": "31",
    "studentIds": "[\"501\",\"502\"]",
    "referenceType": "trip_stop",
    "referenceId": "1201:7"
  }
}
```

العلاقة بين الحدث الداخلي والـ data field:

- `integration_outbox.event_type = fcm.transport.bus_approaching` -> `data.eventType = bus_approaching`
- `integration_outbox.event_type = fcm.transport.bus_arrived` -> `data.eventType = bus_arrived`

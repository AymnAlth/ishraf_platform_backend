# Supervisor App Backend Contract

الدور المستهدف: `supervisor`

هذا المجلد يوضح surfaces المشرف مع التركيز على ownership والقواعد التشغيلية، وليس مجرد listing للمسارات.

حالة التزامن: `2026-04-08` (project-wide audit)

## النطاق

- attendance
- behavior
- reporting
- communication
- auth

## القواعد المؤثرة

- المشرف لا ينشئ attendance sessions.
- المشرف يستطيع update attendance records داخل الصفوف/السنوات التي هو مكلّف بها.
- student reporting access ليس عامًا؛ يخضع `assertSupervisorAssignedToClassYear`.
- السطوح اليومية التي تعتمد السنة/الفصل النشطين تتأثر بـ `Active Academic Context`.

## Enums المهمة

| Enum | Values |
| --- | --- |
| `ATTENDANCE_STATUS` | `present`, `absent`, `late`, `excused` |

## FCM inbound payload reference (SDK)

عند استقبال إشعار Push في التطبيق، اعتمد القراءة التالية:

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

قاعدة التعامل:

- `notification`: للعرض المباشر (banner/system notification).
- `data`: للمنطق البرمجي داخل التطبيق (routing/state).

تطابق event names:

- `integration_outbox.event_type = fcm.transport.bus_approaching` -> `data.eventType = bus_approaching`
- `integration_outbox.event_type = fcm.transport.bus_arrived` -> `data.eventType = bus_arrived`

## دورة الاستخدام

- `ENDPOINT_MAP.md`: خريطة العقود والصلاحيات وقيود الملكية.
- `SCREENS_AND_TASKS.md`: التسلسل التنفيذي اليومي من login إلى الإشراف والمتابعة.
- `QA_AND_ACCEPTANCE.md`: معايير القبول والرفض المتوقعة.

# Driver App Backend Contract (Code-Truth, Detailed)

آخر مزامنة: `2026-04-16`

الدور المستهدف: `driver`

## 1) نطاق التطبيق

السائق يستهلك فقط:
- `auth` للجلسة
- `transport` للتشغيل الميداني
- `reporting/transport/summary` للمتابعة السريعة
- `communication` للرسائل والإشعارات

## 2) قواعد تشغيل الرحلة

1. حالات الرحلة المتوقعة في الواجهة:
- `scheduled`
- `started`
- `ended`
- `completed`
- `cancelled`
2. التحول التلقائي الحرج:
- بعد attendance وإغلاق آخر محطة: الرحلة تتحول إلى `completed` تلقائيًا.
3. قاعدة UX إلزامية:
- إذا `tripStatus=completed` في أي response، اخفِ/عطّل زر `End Trip`.

## 3) قاعدة القناتين (Live GPS vs ETA)

1. حركة الحافلة live:
- المصدر: Firebase RTDB
- bootstrap: `GET /transport/realtime-token?tripId=...`
- path: `/transport/live-trips/{tripId}/latestLocation`
2. ETA:
- المصدر: `GET /transport/trips/:id/eta`
- لا تحسب ETA محليًا في التطبيق.

## 4) Attendance Mapping (Server-Locked)

في `POST /transport/trips/:tripId/stops/:stopId/attendance`:
- `present + pickup => boarded`
- `present + dropoff => dropped_off`
- `absent => absent`

response مفاتيح حاسمة:
- `stopCompleted`
- `tripCompleted`
- `tripStatus`

## 5) عقود FCM المهمة لتطبيق السائق

السائق عادة ليس المستهدف الرئيسي لتنبيهات proximity، لكن parser موحّد:

```json
{
  "notification": {
    "title": "وصول الحافلة",
    "body": "الحافلة بالخارج في انتظار الطلاب أحمد و سارة."
  },
  "data": {
    "eventType": "bus_arrived",
    "notificationType": "transport_bus_arrived",
    "tripId": "1201",
    "routeId": "31",
    "studentIds": "501,502"
  }
}
```

قواعد parsing:
1. `notification` للعرض.
2. `data` للمنطق.
3. `event_type` الداخلي في outbox لا يُستخدم مباشرة داخل SDK.
4. `studentIds` تصل CSV string وتحتاج parse.

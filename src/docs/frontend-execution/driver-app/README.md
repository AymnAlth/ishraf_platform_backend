# Driver App Backend Contract

الدور المستهدف: `driver`

هذا المجلد يشرح منطق النقل الذي يحتاجه تطبيق السائق قبل المسارات. السائق لا يدير كل transport module؛ بل يستهلك جزءًا تشغيليًا محكومًا بالملكية والحالة.

## النطاق

- transport
- reporting transport summary
- communication
- auth

## Enums المهمة

| Enum | Values |
| --- | --- |
| `BUS_STATUS` | `active`, `inactive`, `maintenance` |
| `TRIP_TYPE` | `pickup`, `dropoff` |
| `TRIP_STATUS` | `scheduled`, `started`, `ended`, `cancelled` |
| `TRIP_STUDENT_EVENT_TYPE` | `boarded`, `dropped_off`, `absent` |
| `HOME_LOCATION_STATUS` | `pending`, `approved`, `rejected` |

## القواعد المؤثرة

- السائق لا يرى كل route assignments؛ فقط `GET /transport/route-assignments/me`.
- السائق لا يرى كل الرحلات؛ list/detail/roster/start/end/location/event كلها ownership-scoped.
- `ensure-daily` هي surface التشغيل المفضلة لإنشاء أو إعادة استخدام رحلة اليوم.
- `homeLocation` لا تدخل في roster السائق إلا إذا كانت `approved`.

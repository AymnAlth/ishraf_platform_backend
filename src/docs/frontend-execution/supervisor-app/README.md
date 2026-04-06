# Supervisor App Backend Contract

الدور المستهدف: `supervisor`

هذا المجلد يوضح surfaces المشرف مع التركيز على ownership والقواعد التشغيلية، وليس مجرد listing للمسارات.

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

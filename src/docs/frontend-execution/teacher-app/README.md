# Teacher App Backend Contract

الدور المستهدف: `teacher`

هذا المجلد يشرح السطوح التي يستهلكها تطبيق المعلم من الباك الحالي مع التركيز على المنطق التشغيلي، لا مجرد المسارات.

## النطاق

- attendance
- assessments
- behavior
- homework
- reporting
- communication
- auth

## القواعد المؤثرة

- السطوح اليومية تعمل داخل `Active Academic Context`.
- في `attendance`, `assessments`, `homework`:
  - teacher-created requests يجب ألا ترسل `teacherId`
  - الباك يحل المعلم من الجلسة الحالية
- attendance save تستخدم full snapshot للـ roster.
- assessments/homework submission saves لا تقبل طلابًا خارج roster.
- reporting على الطلاب ليس عامًا؛ المعلم يرى فقط الطلاب المرتبطين بتكليفه في السنة النشطة.

## Enums المهمة

| Enum | Values |
| --- | --- |
| `ATTENDANCE_STATUS` | `present`, `absent`, `late`, `excused` |
| `HOMEWORK_SUBMISSION_STATUS` | `submitted`, `not_submitted`, `late` |

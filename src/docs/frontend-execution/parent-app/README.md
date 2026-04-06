# Parent App Backend Contract

الدور المستهدف: `parent`

هذا المجلد يشرح surfaces ولي الأمر من زاوية linkage والقراءة الفعلية للطالب المرتبط، لا من زاوية listing route فقط.

## النطاق

- reporting
- homework
- communication
- transport live status
- auth

## القواعد المؤثرة

- كل surfaces الطالبية هنا مرتبطة فقط بالطلاب linked فعليًا بولي الأمر.
- الباك قد يعيد:
  - `403` عندما لا يسمح الدور أو الملكية
  - أو `404` عندما لا يكون الطالب مرئيًا ضمن linkage الحالية
- dashboard وprofile وtransport live-status هي responses مركبة، وليست row tables بسيطة.

## Response concepts المهمة

- `GET /reporting/dashboards/parent/me`
  - يعيد parent dashboard مع children[] والملخصات والإشعارات
- `GET /reporting/dashboards/parent/me/students/:studentId/profile`
  - يعيد student profile مع parents وsummaries
- `GET /reporting/transport/parent/me/students/:studentId/live-status`
  - يعيد:
    - `student`
    - `assignment`
    - `activeTrip`
    - وداخل `activeTrip`:
      - `latestLocation`
      - `latestEvents`

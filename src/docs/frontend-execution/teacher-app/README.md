# دليل تنفيذ تطبيق المعلم

هذا الدليل مخصص لفريق بناء تطبيق المعلم.

## الهدف

تمكين المعلم من تنفيذ العمل اليومي داخل الصف عبر:

- dashboard
- attendance
- assessments
- behavior
- homework
- communication

## المستخدم المستهدف

- `teacher`

## رابط العمل

- `https://ishraf-platform-backend-staging.onrender.com`
- `https://ishraf-platform-backend-staging.onrender.com/api/v1`

## داخل النطاق

- شاشات المعلم اليومية المرتبطة مباشرة بالصف والمادة والتواصل
- الشاشات المبنية على teacher-owned assignments الحالية

## خارج النطاق

- user management
- academic structure management
- transport admin screens
- parent-only or admin-only reporting surfaces
- Firebase / FCM / ETA / AI analytics

## المستندات المصدر

- `src/docs/BACKEND_WAVE1_STATUS.md`
- `src/docs/API_REFERENCE.md`
- `src/modules/attendance/routes/attendance.routes.ts`
- `src/modules/assessments/routes/assessments.routes.ts`
- `src/modules/behavior/routes/behavior.routes.ts`
- `src/modules/homework/routes/homework.routes.ts`
- `src/modules/communication/routes/communication.routes.ts`
- `src/modules/reporting/routes/reporting.routes.ts`
- [شاشات ومهام التطبيق](./SCREENS_AND_TASKS.md)
- [خريطة الـ endpoints](./ENDPOINT_MAP.md)
- [التحقق والقبول](./QA_AND_ACCEPTANCE.md)

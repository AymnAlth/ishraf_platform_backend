# دليل تنفيذ تطبيق المشرف

هذا الدليل مخصص لفريق بناء تطبيق المشرف.

## الهدف

تمكين المشرف من متابعة الصفوف المسندة إليه عبر:

- supervisor dashboard
- attendance oversight
- behavior operations
- student reporting access
- communication

## المستخدم المستهدف

- `supervisor`

## رابط العمل

- `https://ishraf-platform-backend-staging.onrender.com`
- `https://ishraf-platform-backend-staging.onrender.com/api/v1`

## داخل النطاق

- الشاشات المرتبطة بالصفوف المسندة للمشرف
- student reporting access ضمن scope التوزيعات
- behavior وattendance surfaces التي يملك الوصول إليها

## خارج النطاق

- admin-only master data management
- create attendance session كعملية مستقلة
- transport operations
- realtime / maps / analytics

## المستندات المصدر

- `src/docs/BACKEND_WAVE1_STATUS.md`
- `src/docs/API_REFERENCE.md`
- `src/modules/reporting/routes/reporting.routes.ts`
- `src/modules/attendance/routes/attendance.routes.ts`
- `src/modules/behavior/routes/behavior.routes.ts`
- `src/modules/communication/routes/communication.routes.ts`
- [شاشات ومهام التطبيق](./SCREENS_AND_TASKS.md)
- [خريطة الـ endpoints](./ENDPOINT_MAP.md)
- [التحقق والقبول](./QA_AND_ACCEPTANCE.md)

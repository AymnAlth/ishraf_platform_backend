# دليل تنفيذ تطبيق ولي الأمر

هذا الدليل مخصص لفريق بناء تطبيق ولي الأمر.

## الهدف

تمكين ولي الأمر من متابعة:

- أبنائه المرتبطين بحسابه
- التقارير المختصرة
- الواجبات
- النقل
- الرسائل والإشعارات والإعلانات

## المستخدم المستهدف

- `parent`

## رابط العمل

- `https://ishraf-platform-backend-staging.onrender.com`
- `https://ishraf-platform-backend-staging.onrender.com/api/v1`

## داخل النطاق

- parent dashboard
- child detail surfaces المملوكة لولي الأمر
- child reports
- child homework
- live transport status
- messages / notifications / announcements

## خارج النطاق

- أي وصول عام إلى طلاب غير مرتبطين
- إدارة المستخدمين أو الهيكل الأكاديمي
- realtime/Firebase/ETA
- AI analytics

## المستندات المصدر

- `src/docs/BACKEND_WAVE1_STATUS.md`
- `src/docs/API_REFERENCE.md`
- `src/modules/reporting/routes/reporting.routes.ts`
- `src/modules/homework/routes/homework.routes.ts`
- `src/modules/communication/routes/communication.routes.ts`
- [شاشات ومهام التطبيق](./SCREENS_AND_TASKS.md)
- [خريطة الـ endpoints](./ENDPOINT_MAP.md)
- [التحقق والقبول](./QA_AND_ACCEPTANCE.md)

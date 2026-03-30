# دليل تنفيذ لوحة الإدارة

هذا الدليل مخصص لفريق بناء لوحة تحكم الإدارة.

## الهدف

بناء لوحة مركزية تدير:

- المستخدمين
- الهيكل الأكاديمي
- الطلاب وربط أولياء الأمور
- العمليات اليومية
- النقل
- التواصل
- التقارير
- الواجبات

## المستخدم المستهدف

- `admin`

## رابط العمل

- `https://ishraf-platform-backend-staging.onrender.com`
- `https://ishraf-platform-backend-staging.onrender.com/api/v1`

## ملاحظة عن البيئة الحالية

- البيئة المستضافة الحالية تحتوي فقط على حسابات الوصول الدنيا الموثقة في `src/docs/STAGING_FRONTEND_SEED.md`
- لا توجد الآن بيانات أكاديمية أو تشغيلية جاهزة مسبقًا على staging
- أي قوائم تشغيلية أو dashboards قد تعود فارغة إلى أن تُنشأ البيانات من داخل النظام

## داخل النطاق

- كل شاشات الإدارة التشغيلية المذكورة في `Wave 1`
- جميع مسارات الإدارة الجاهزة في الباك الحالي
- الربط مع الـ dashboards والتقارير والإشعارات اليدوية

## خارج النطاق

- Firebase / FCM / realtime transport
- Google Maps / ETA
- AI analytics
- 2FA
- advanced system settings
- CSV import إذا لم يعد مطلوبًا تشغيليًا

## المستندات المصدر

- `src/docs/BACKEND_WAVE1_STATUS.md`
- `src/docs/API_REFERENCE.md`
- `src/docs/LEGACY_DOC_ALIGNMENT.md`
- `src/docs/transport/admin-dashboard-transport-handoff.md`
- `src/modules/*/routes/*.routes.ts`
- [شاشات ومهام لوحة الإدارة](./SCREENS_AND_TASKS.md)
- [خريطة الـ endpoints](./ENDPOINT_MAP.md)
- [مذكرة مواءمة العقود الإدارية](./ATTENDANCE_BEHAVIOR_ROUTE_ALIGNMENT.md)
- [التحقق والقبول](./QA_AND_ACCEPTANCE.md)

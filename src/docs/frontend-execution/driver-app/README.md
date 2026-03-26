# دليل تنفيذ تطبيق السائق

هذا الدليل مخصص لفريق بناء تطبيق السائق.

## الهدف

تمكين السائق من تنفيذ التشغيل اليومي للرحلات عبر:

- trip list/detail
- trip roster
- start / end trip
- location updates
- trip student events
- transport summary
- communication + recipients directory

## المستخدم المستهدف

- `driver`

## رابط العمل

- `https://ishraf-platform-backend-staging.onrender.com`
- `https://ishraf-platform-backend-staging.onrender.com/api/v1`

## داخل النطاق

- الرحلات المملوكة للسائق ضمن ownership enforcement الحالي
- tracking وstudent events عبر polling/API calls
- roster الطلاب لكل رحلة عبر endpoint مستقل
- اختيار المستلمين عبر endpoint رسمي بدل الإدخال اليدوي
- communication surfaces العامة للدور

## خارج النطاق

- Firebase / realtime transport
- Google Maps / ETA
- stop proximity alerts
- admin transport setup

## المستندات المصدر

- `src/docs/BACKEND_WAVE1_STATUS.md`
- `src/docs/API_REFERENCE.md`
- `src/docs/transport/driver-app-transport-handoff.md`
- `src/modules/transport/routes/transport.routes.ts`
- `src/modules/reporting/routes/reporting.routes.ts`
- `src/modules/communication/routes/communication.routes.ts`
- [شاشات ومهام التطبيق](./SCREENS_AND_TASKS.md)
- [خريطة الـ endpoints](./ENDPOINT_MAP.md)
- [التحقق والقبول](./QA_AND_ACCEPTANCE.md)

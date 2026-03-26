# حزمة التوجيه التنفيذية للفرونت إند

هذه الحزمة هي مرجع التنفيذ العملي لفرق الفرونت إند ولوحة الإدارة قبل بدء `Wave 1`.

الهدف منها:

- تأكيد أن الباك إند مكتمل فعليًا لمرحلة `Wave 1`
- توجيه فرق التنفيذ حسب الدور والتطبيق
- ربط كل شاشة وكل مهمة بالـ endpoints الجاهزة
- تقليل العودة المتكررة إلى الوثائق القديمة عند اتخاذ قرارات تنفيذية

## روابط التشغيل الحالية

- Public root URL: `https://ishraf-platform-backend-staging.onrender.com`
- Public API base URL: `https://ishraf-platform-backend-staging.onrender.com/api/v1`

## ترتيب القراءة الموصى به

1. [تأكيد حالة الباك](./BACKEND_STATUS_CONFIRMATION.md)
2. [القواعد المشتركة للفرونت](./shared/COMMON_FRONTEND_RULES.md)
3. [قواعد المصادقة والجلسات](./shared/AUTH_AND_SESSION_RULES.md)
4. [تسلسل التنفيذ بين الفرق](./shared/DELIVERY_SEQUENCE.md)
5. [مصفوفة التنفيذ الإدارية](./management/EXECUTION_MATRIX.md)
6. أدلة كل تطبيق أو لوحة بحسب الفريق:
   - [لوحة الإدارة](./admin-dashboard/README.md)
   - [تطبيق المعلم](./teacher-app/README.md)
   - [تطبيق ولي الأمر](./parent-app/README.md)
   - [تطبيق المشرف](./supervisor-app/README.md)
   - [تطبيق السائق](./driver-app/README.md)

مذكرة تشخيص ومواءمة مهمة مرتبطة بلوحة الإدارة:

- [مواءمة عقود Attendance وBehavior وAdmin Reporting](./admin-dashboard/ATTENDANCE_BEHAVIOR_ROUTE_ALIGNMENT.md)

مذكرات handoff نهائية مرتبطة بالنقل:

- [Transport Handoff للوحة الإدارة](../transport/admin-dashboard-transport-handoff.md)
- [Transport Handoff لتطبيق السائق](../transport/driver-app-transport-handoff.md)

## المرجع التنفيذي المعتمد

عند التعارض بين الوثائق، يكون ترتيب المرجعية كالتالي:

1. الكود الحالي
2. `src/docs/BACKEND_WAVE1_STATUS.md`
3. `OpenAPI/Postman`
4. `src/docs/API_REFERENCE.md`
5. الوثائق القديمة

مهم:

- `OpenAPI/Postman` هما المرجع الكامل الدقيق لكل endpoint حي
- `API_REFERENCE.md` هو المرجع البشري التشغيلي المنسجم معهما

## ملفات المصدر التي بُنيت عليها هذه الحزمة

- `src/docs/BACKEND_WAVE1_STATUS.md`
- `src/docs/API_REFERENCE.md`
- `src/docs/LEGACY_DOC_ALIGNMENT.md`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`
- `src/app/module-registry.ts`
- `src/modules/*/routes/*.routes.ts`
- `الفصل الرابع منسق معا المخططات 3224321a94a1807698e5ced26c554f64.md`

## ما الذي لا تغطيه هذه الحزمة

هذه الحزمة لا تعيد تعريف العقود التقنية منخفضة المستوى سطرًا بسطر. لذلك:

- لا تعتمد عليها بدل `OpenAPI` عند الحاجة إلى schema دقيقة
- لا تعتمد عليها بدل `API_REFERENCE.md` عند الحاجة إلى أمثلة request/response مطولة
- لا تعتمد على الوثائق الأكاديمية القديمة كمرجع تشغيل مباشر

## المخرجات المستهدفة من فرق الفرونت

- لوحة إدارة تشغيلية كاملة
- تطبيق معلم
- تطبيق ولي أمر
- تطبيق مشرف
- تطبيق سائق

كل هذه الأسطح مبنية على الباك الحالي الجاهز، وما تبقى بعد `Wave 1` موثق صراحة في [تأكيد حالة الباك](./BACKEND_STATUS_CONFIRMATION.md).

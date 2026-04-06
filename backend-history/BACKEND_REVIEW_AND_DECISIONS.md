# مراجعة الباك إند والقرارات المعتمدة

تاريخ التحديث: `2026-04-06`

هذا الملف لم يعد مرجع تشغيل يومي. تم تحويله إلى سجل قرار مؤرشف يوضح أين وصل المشروع فعليًا.

## القرار النهائي الحالي

الباك إند تجاوز baseline الأولى وأصبح جاهزًا للدخول في المرحلة التالية من التوسعة.

## الأدلة من الكود

- [src/app/module-registry.ts](/d:/Project-R/ishraf_platform_backend/src/app/module-registry.ts) يسجل `12` موديولًا عامًا.
- [src/database/migrations](/d:/Project-R/ishraf_platform_backend/src/database/migrations) يحتوي `10` migrations فعلية، منها:
  - `transport alignment`
  - `subject offerings`
  - `communication multi-target`
  - `active academic context and enrollments`
  - `school onboarding import runs`
  - `hot path performance indexes`
- `admin-imports` موجودة فعليًا كـ module عام في:
  - [src/modules/admin-imports/routes/admin-imports.routes.ts](/d:/Project-R/ishraf_platform_backend/src/modules/admin-imports/routes/admin-imports.routes.ts)
- `Active Academic Context` موجودة فعليًا في:
  - [src/common/services/active-academic-context.service.ts](/d:/Project-R/ishraf_platform_backend/src/common/services/active-academic-context.service.ts)
  - [src/modules/academic-structure/routes/academic-structure.routes.ts](/d:/Project-R/ishraf_platform_backend/src/modules/academic-structure/routes/academic-structure.routes.ts)
- `student_academic_enrollments` موجودة فعليًا عبر:
  - [src/modules/students/service/students.service.ts](/d:/Project-R/ishraf_platform_backend/src/modules/students/service/students.service.ts)
  - [1731300000000_active_academic_context_and_enrollments.js](/d:/Project-R/ishraf_platform_backend/src/database/migrations/1731300000000_active_academic_context_and_enrollments.js)

## ما أُغلق فعليًا

- الأساس العام لـ `Wave 1`
- توحيد النقل على نموذج route assignment + trip operations
- دعم `subject offerings`
- تشغيل `active context`
- تحويل الطلاب إلى نموذج enrollment انتقالي مؤسسي
- bulk communication
- admin preview reporting
- school onboarding import
- hardening وتحسين الأداء للمسارات الساخنة

## ما بقي للمرحلة التالية

هذه العناصر أصبحت توسعات فوق أساس جاهز، وليست تصحيحًا لنقص جوهري:

- `Firebase / FCM / realtime transport`
- `Google Maps / ETA`
- `AI analytics`
- `2FA`
- `advanced system settings`
- `CSV import` إذا عاد مطلوبًا

## عناصر ليست blocker

- `promotions` ليست موديول API عام مستقلًا حتى الآن.
- `automation` ما زالت خدمة داخلية.

## الحكم التنفيذي

يمكن البدء في المرحلة التالية الآن دون الحاجة إلى إغلاق Feature Foundation إضافية في الباك أولًا.


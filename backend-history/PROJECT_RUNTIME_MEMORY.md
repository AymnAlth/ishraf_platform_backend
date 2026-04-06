# Project Runtime Memory

تاريخ التحديث: `2026-04-06`

هذا الملف أصبح نسخة مؤرشفة موجزة لقواعد التشغيل العامة للمشروع.

## مصادر الحقيقة الحالية

الأولوية الحقيقية الآن هي:

1. `src/modules/*`
2. `src/common/services/*`
3. `src/database/migrations/*`
4. `tests/integration/integration.test.ts`
5. `tests/unit/*`

الملفات الوصفية خارج ذلك ليست مصدر حقيقة أعلى من الكود.

## ثوابت المشروع الحالية

- المعمارية الحالية: `modular monolith`
- لا يوجد split إلى microservices
- `users.id` هو المرجع العام الحديث للأسطح الجديدة
- `Active Academic Context` هو السياق التشغيلي اليومي
- `subjects` هي master data
- `subject-offerings` هي طبقة semester-aware
- `student_academic_enrollments` هي النموذج الأكاديمي الانتقالي الصحيح
- النقل يعمل على:
  - `routes`
  - `route assignments`
  - `student assignments`
  - `trips`
  - `trip student events`

## الوضع التشغيلي

- المشروع اجتاز build
- المشروع اجتاز unit tests
- المشروع اجتاز integration tests
- المشروع اجتاز موجات تحسين الأداء الأخيرة دون كسر العقود

## ما الذي تغيّر عن الذاكرة القديمة

- لم نعد في مرحلة baseline فقط.
- لم تعد الوثائق القديمة التي تشير إلى `Wave 1` وحدها تصف كل النظام الحالي.
- المرحلة التالية أصبحت توسعة قدرات، لا استكمال أساس.


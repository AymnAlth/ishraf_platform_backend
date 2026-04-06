# خطة التوسعة المؤسسية التالية

تاريخ التحديث: `2026-04-06`

هذا الملف هو مرجع المرحلة التالية بعد اكتمال الأساس الحالي للباك إند.

## شرط الدخول

تم تحقيق شرط الدخول لهذه المرحلة فعليًا.

الأساس الذي أصبح موجودًا في الكود:

- هوية ومصادقة مستقرة في `auth`
- إدارة مستخدمين مستقرة في `users`
- هيكل أكاديمي مؤسسي في `academic-structure`
- تشغيل يومي مقيد بـ `Active Academic Context`
- نقل تشغيلي موحد في `transport`
- تقارير تشغيلية وإدارية في `reporting`
- قنوات تواصل مباشرة وجماعية في `communication`
- onboarding import مؤسسي في `admin-imports`

## المرحلة التالية المعتمدة

1. `advanced system settings`
2. `2FA`
3. `Firebase / FCM / realtime transport`
4. `Google Maps / ETA`
5. `AI analytics`
6. `CSV import` إذا عاد مطلوبًا تشغيليًا

## الترتيب الموصى به

الترتيب الأكثر أمانًا فوق البنية الحالية:

1. `advanced system settings`
2. `2FA`
3. `Firebase / FCM / realtime transport`
4. `Google Maps / ETA`
5. `AI analytics`
6. `CSV import` عند الحاجة التشغيلية فقط

## لماذا هذا الترتيب

- `system settings` ستصبح control plane للخصائص والسياسات الجديدة.
- `2FA` تبني فوق `auth` الحالية دون فتح realtime أولًا.
- `FCM/realtime` و`Maps/ETA` يعتمدان على نموذج النقل الحالي، لا على إعادة اختراعه.
- `AI analytics` يجب أن تأتي بعد تثبيت الإشعارات والخرائط والسياق التشغيلي.
- `CSV import` ليست أولوية إذا كانت `School Onboarding Import` تغطي الحاجة الحالية.

## ما لا يجب إعادة فتحه

- لا نعيد تصميم `Wave 1`.
- لا نعيد النقاش حول `Active Academic Context`.
- لا نعيد النقاش حول `subject offerings`.
- لا نعيد هيكلة النقل الأساسية.
- لا نعود إلى `students.class_id` كنموذج نهائي للحالة الأكاديمية.


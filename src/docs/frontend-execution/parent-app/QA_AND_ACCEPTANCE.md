# التحقق والقبول لتطبيق ولي الأمر

## Happy Paths

- parent login ثم dashboard load
- dashboard يعرض الأبناء المرتبطين فقط
- child profile/reports تعمل لكل ابن مرتبط
- homework list يظهر للابن المحدد
- transport live status يظهر عند وجود رحلة/تعيين نشط
- messages / notifications / announcements تعمل

## Ownership / Negative Cases

- parent لا يستطيع الوصول إلى child غير مرتبط به
- أي `studentId` غير مملوك يجب أن يعيد `403/404`
- parent لا يستخدم `/reporting/students/:studentId/*` العامة

## Empty States

- لا يوجد أبناء مرتبطون
- لا توجد تقارير بعد
- لا توجد واجبات
- لا توجد رحلة نقل نشطة
- لا توجد رسائل أو إشعارات

## Auth / Session Cases

- refresh success/failure
- `429` على login/forgot/reset
- change-password ثم relogin

## UX Cases

- التنقل بين عدة أبناء دون فقدان السياق
- إبراز unread notifications
- عرض رسائل واضحة عندما لا توجد بيانات تشغيلية بعد

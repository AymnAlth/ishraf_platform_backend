# التحقق والقبول لتطبيق المشرف

## Happy Paths

- supervisor login ثم dashboard load
- dashboard يعرض الصفوف التابعة له
- behavior list/create/update تعمل داخل النطاق
- attendance sessions list/detail تعمل
- update attendance record يعمل ضمن النطاق
- student reports تعمل للطلاب داخل الصفوف التابعة
- communication surfaces تعمل

## Negative / Scope Cases

- supervisor لا يستطيع الوصول إلى admin-only endpoints
- supervisor لا يستطيع create attendance session
- supervisor لا يصل إلى student/report/session خارج الصفوف المسندة

## Empty States

- لا توجد صفوف مسندة
- لا توجد سجلات سلوكية بعد
- لا توجد sessions
- لا توجد تقارير بعد
- لا توجد رسائل أو إشعارات

## Auth / Session Cases

- refresh success/failure
- `429` على login/forgot/reset
- change-password then relogin

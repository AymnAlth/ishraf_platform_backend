# التحقق والقبول لتطبيق السائق

## Happy Paths

- driver login ثم trips list load
- trip detail تظهر بشكل صحيح
- trip roster يظهر كل طلاب الرحلة حتى قبل تسجيل أي event لهم
- start trip ينجح من الحالة الصحيحة
- location updates تنجح أثناء الرحلة
- boarded / dropped_off / absent events تعمل
- available recipients تحمل قائمة صالحة قبل الإرسال
- events list وtransport summary يعرضان البيانات الصحيحة
- communication surfaces تعمل

## Ownership / Negative Cases

- driver لا يرى رحلات غيره
- driver لا يبدأ أو ينهي رحلة لا تخصه
- driver لا يرسل location أو event على رحلة لا تخصه
- location بعد انتهاء الرحلة يجب أن تُرفض

## Empty States

- لا توجد رحلات
- لا توجد رحلة نشطة
- الرحلة موجودة لكن roster الطلاب فارغ
- لا توجد أحداث طلاب بعد
- لا توجد recipients مطابقة للبحث
- لا توجد رسائل أو إشعارات

## Auth / Session Cases

- refresh success/failure
- `429` على login/forgot/reset
- change-password then relogin

## Operational Cases

- التعامل مع انقطاع الشبكة أثناء location posting
- إعادة المحاولة اليدوية أو التلقائية بشكل محافظ
- إظهار state واضح عند رفض transition أو event invalid
- عدم استخدام events list كمصدر roster

# التحقق والقبول للوحة الإدارة

## Current Staging Data State

- البيئة المستضافة الحالية بعد reset تحتوي فقط على حسابات الدخول الدنيا
- لا توجد بيانات أكاديمية أو تشغيلية جاهزة مسبقًا
- لذلك empty states في:
  - dashboard lists
  - academic lists
  - student/reporting surfaces
  - transport
  - communication
  تعتبر سلوكًا صحيحًا حاليًا إلى أن تُنشأ البيانات من داخل النظام

## Happy Paths

- admin يستطيع login ثم الوصول إلى shell اللوحة
- dashboard يعرض summary وقوائم مختصرة بدون أخطاء
- create/list/edit user تعمل بنجاح
- academic structure flows تعمل بالترتيب الصحيح
- create student ثم link parent ثم set primary ثم promote تعمل
- attendance session يمكن إنشاؤها ثم حفظ records ثم تعديل سجل فردي
- assessment type ثم assessment ثم scores تعمل
- behavior categories ثم records تعمل
- transport setup ثم assignments ثم trips تعمل
- communication admin flows تعمل
- reporting student profile/reports تعمل
- homework create/list/detail/update تعمل

## Negative / Authorization Cases

- أي مستخدم غير `admin` يُمنع من أسطح الإدارة الحصرية
- parent أو teacher لا يستطيعان دخول `/users/*`
- parent أو teacher لا يستطيعان إدارة `academic-structure`
- conflicts مثل duplicate email أو academic number تظهر كرسائل واضحة

## Ownership / Domain Cases

- تعيين parent مكرر لنفس الطالب يجب أن يُرفض
- attendance session مكررة لنفس السياق يجب أن تُرفض
- assessment score مكرر لنفس الطالب في نفس التقييم يجب أن يُرفض
- transport assignment الثاني النشط لنفس الطالب يجب أن يُرفض
- route stop التي لا تطابق route يجب أن تُرفض

## Empty States

- قوائم users/students/trips/homework/announcements قد تعود فارغة ويجب عرض empty state واضح
- reporting summaries قد تعود zero-safe وليست أخطاء
- student reporting وstudent homework وstudent behavior لا يجب أن تفسر empty data على أنها `404`
- transport summary قد لا يحتوي active trips

## Pagination / Filtering Cases

- users list
- students list
- attendance sessions list
- assessments list
- behavior records list
- transport trips list
- communication inbox/sent/notifications
- homework list

## Auth / Session Handling

- refresh success يعيد المستخدم إلى العمل دون فقدان السياق
- refresh failure يعيد إلى login
- login / forgot-password / reset-password قد تعيد `429`
- change-password يجب أن يعالج session invalidation بشكل سليم
- ميّزوا بوضوح بين:
  - `401` توثيق مفقود أو منتهي
  - `403` عدم صلاحية
  - `404` route أو مورد أساسي غير موجود
  - `200` مع empty state عندما لا توجد بيانات مرتبطة بعد

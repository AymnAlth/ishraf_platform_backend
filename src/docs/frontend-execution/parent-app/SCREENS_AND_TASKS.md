# شاشات ومهام تطبيق ولي الأمر

## ترتيب التنفيذ المقترح

1. auth + app shell
2. parent dashboard
3. child detail shell
4. child reports
5. child homework
6. child transport live status
7. messages / notifications / announcements
8. profile/password

## الشاشات المطلوبة

### 1. تسجيل الدخول والجلسة

- login
- forgot password
- reset password
- logout
- me/profile bootstrap
- change password

### 2. Parent Dashboard

- عرض معلومات ولي الأمر
- عرض الأبناء المرتبطين
- عرض ملخص attendance / behavior / assessment لكل ابن
- عرض latest notifications + unread count

### 3. Child Detail Shell

- بطاقة أساسية للطالب
- tabs أو sections:
  - profile
  - attendance summary
  - assessment summary
  - behavior summary
  - homework
  - transport

### 4. Child Reports

- attendance summary
- assessment summary
- behavior summary

### 5. Homework

- list homework for selected child
- homework detail if needed داخل نفس الشاشة

### 6. Transport Live Status

- active trip summary
- latest location
- recent events
- current / target stop information عند توفرها في الاستجابة

### 7. Communication

- inbox
- sent
- conversation
- notifications
- active announcements

### 8. Profile / Password

- current user info
- change password
- logout

## الاعتماديات

- parent linkage يجب أن يكون موجودًا من لوحة الإدارة
- child reports تعتمد على وجود attendance / assessments / behavior / homework data
- transport status يعتمد على assignment + active trip

## ملاحظات تنفيذية

- لا تبنوا أي شاشة parent على generic student endpoints
- استخدموا فقط المسارات parent-owned
- empty state في child transport مهم جدًا لأنه قد لا توجد رحلة نشطة دائمًا

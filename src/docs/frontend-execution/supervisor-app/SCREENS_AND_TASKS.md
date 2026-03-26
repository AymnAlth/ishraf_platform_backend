# شاشات ومهام تطبيق المشرف

## ترتيب التنفيذ المقترح

1. auth + app shell
2. supervisor dashboard
3. behavior
4. attendance oversight
5. student reports
6. communication
7. profile/password

## الشاشات المطلوبة

### 1. تسجيل الدخول والجلسة

- login
- forgot/reset password
- logout
- me bootstrap
- change password

### 2. Supervisor Dashboard

- الصفوف التابعة للمشرف
- أحدث السجلات السلوكية
- ملخصات طلاب الصفوف

### 3. Behavior

- categories list
- records list
- create record
- record detail
- update record
- student-specific behavior timeline

### 4. Attendance Oversight

- sessions list
- session detail
- update attendance record

مهم:

- المشرف لا يملك create session في `Wave 1`

### 5. Student Reports

- student profile
- attendance summary
- assessment summary
- behavior summary

### 6. Communication

- inbox
- sent
- conversation
- notifications
- active announcements

### 7. Profile / Password

- current user
- change password
- logout

## ملاحظات تنفيذية

- التطبيق يجب أن يترجم scope failures كجزء طبيعي من العمل وليس كأخطاء غير متوقعة
- الطالب أو الجلسة أو السجل خارج الصفوف المخصصة للمشرف يجب أن يعامل كـ no access

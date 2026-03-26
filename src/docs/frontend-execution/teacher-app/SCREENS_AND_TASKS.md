# شاشات ومهام تطبيق المعلم

## ترتيب التنفيذ المقترح

1. auth + app shell
2. teacher dashboard
3. attendance
4. assessments
5. behavior
6. homework
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

### 2. Teacher Dashboard

- عرض التوزيعات الحالية
- أحدث attendance sessions
- أحدث assessments
- أحدث behavior records
- روابط سريعة إلى العمليات اليومية

### 3. Attendance

- list sessions
- create session
- session detail
- mark attendance bulk
- update single attendance record

### 4. Assessments

- read assessment types
- create assessment
- assessments list
- assessment detail
- scores list / bulk save / single update

### 5. Behavior

- read categories
- create record
- records list
- record detail
- update record

### 6. Homework

- create homework
- list homework
- homework detail
- manage/update submissions

### 7. Communication

- inbox
- sent
- conversation
- send message
- notifications center
- active announcements

### 8. Profile / Password

- current user info
- change password
- logout

## الاعتماديات

- teacher assignments يجب أن تكون صحيحة من لوحة الإدارة
- classes/students/subjects يجب أن تكون مهيأة
- attendance / assessments / behavior تعتمد على academic structure + students

## ملاحظات تنفيذية

- المعلم يعمل دائمًا ضمن ownership scope
- لا تبنوا app flow يسمح للمعلم باختيار أي فصل أو أي مادة خارج assignments الفعلية
- استخدموا dashboard كنقطة دخول للمهام الأكثر تكرارًا

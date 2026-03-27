# شاشات ومهام لوحة الإدارة

## ترتيب التنفيذ المقترح

1. auth + app shell
2. dashboard overview
3. users
4. academic structure
5. students + parents + promotions
6. attendance
7. assessments
8. behavior
9. transport
10. communication
11. reporting
12. homework

## الشاشات المطلوبة

### 1. شاشة تسجيل الدخول والجلسة

المهام:

- login
- forgot password
- reset password
- logout
- change password
- session bootstrap عبر `me`

### 2. لوحة الإدارة الرئيسية

المهام:

- عرض `admin dashboard summary`
- عرض أحدث الطلاب
- عرض أحدث الإعلانات
- عرض الرحلات النشطة
- ربط البطاقات بمسارات التفاصيل

### 3. إدارة المستخدمين

المهام:

- قائمة المستخدمين
- create user
- user detail
- edit user
- activate/deactivate user
- filter by role and active status

### 4. إدارة الهيكل الأكاديمي

المهام:

- academic years list/create/update/activate
- semesters create/list/update
- grade levels create/list
- classes create/list/detail
- subjects create/list/detail
- subject offerings create/list/detail/update activation
- teacher assignments create/list
- supervisor assignments create/list
- create-subject flow must support a two-step path when semester availability is required:
  - create `subject`
  - then create one or more `subject-offerings`

### 5. إدارة الطلاب

المهام:

- students list/create/detail/update
- link parent
- list linked parents
- set primary parent
- promote student
- filters and pagination

### 6. إدارة الحضور

المهام:

- create attendance session
- list sessions
- session detail
- bulk save attendance records
- single attendance record update

### 7. إدارة التقييمات

المهام:

- assessment types create/list
- assessments create/list/detail
- view scores
- bulk save scores
- update single score

### 8. إدارة السلوك

المهام:

- behavior categories create/list
- behavior records create/list/detail/update
- student behavior timeline

### 9. إدارة النقل

المهام:

- buses create/list
- routes create/list
- route stops create/list
- student assignments create/deactivate/list active
- route assignments create/list/deactivate
- student home location read/save/delete
- trips create/list/detail
- start/end trip
- location posting
- trip student events
- transport summary

### 10. إدارة التواصل

المهام:

- inbox / sent / conversation
- message send
- announcement create/list/active preview
- manual notification create
- notifications inbox and mark as read

### 11. شاشات التقارير

المهام:

- student full profile
- attendance summary
- assessment summary
- behavior summary
- transport summary page

### 12. إدارة الواجبات

المهام:

- homework create/list/detail
- view student homework list
- update homework submission state when needed

## الاعتماديات

- users قبل teacher/supervisor assignments
- academic structure قبل students وattendance وassessments
- students قبل parent linking وbehavior وhomework وtransport assignments
- route assignments بعد buses/routes
- transport summary بعد setup وتشغيل الرحلات

## ملاحظات تنفيذية

- جميع الجداول الكبيرة يجب أن تعتمد pagination من البداية
- لا تبنوا أي شاشة على افتراض delete hard delete غير موجود
- شاشة `create trip` تبقى موجودة، لكن باعتبارها manual/exception flow وليست التشغيل اليومي الأساسي
- طبقة النقل التشغيلية الآن تبدأ من:
  - `student assignments`
  - `route assignments`
  - ثم `trips`
- استخدموا `409` لعرض conflict messages واضحة، خصوصًا في:
  - duplicate email
  - duplicate academic number
  - duplicate parent link
  - duplicate assessment/attendance constraints

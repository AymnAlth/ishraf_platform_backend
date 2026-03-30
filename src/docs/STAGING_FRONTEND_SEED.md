# Current Staging Accounts And Data State

هذا الملف هو المرجع الحالي للبيئة المستضافة على `Render + Neon` بعد إعادة تهيئة قاعدة البيانات بتاريخ `2026-03-30`.

## الحالة الحالية

البيئة المستضافة لا تحتوي الآن على dataset تشغيلية كاملة.

الموجود حاليًا فقط:
- حساب الأدمن الأساسي المحفوظ كما هو
- حساب معلم واحد
- حساب ولي أمر واحد
- حساب سائق واحد
- حسابا مشرفين

غير الموجود حاليًا:
- سنوات دراسية
- فصول
- صفوف
- مواد
- طلاب
- نقل
- رسائل
- إعلانات
- إشعارات

مهم:
- أي surfaces أكاديمية أو تشغيلية ستعيد `empty state` أو `404` حسب العقد إلى أن يُعاد إنشاء البيانات من داخل النظام
- هذا السلوك صحيح حاليًا ولا يعني وجود كسر في الباك

## الحسابات الحالية

### Admin

- البريد: `mod87521@gmail.com`
- كلمة المرور: **تبقى كما هي سابقًا** ولم تُوثق هنا عمدًا

### Teacher

- الاسم: `مروان أمين شعبان`
- البريد: `marwan-amin-shaban@ishraf.local`

### Parent

- الاسم: `خالد العرامي`
- البريد: `khaled-alarami@ishraf.local`

### Driver

- الاسم: `هلال عبد الله الملصي`
- البريد: `hilal-abdullah-almolsi@ishraf.local`

### Supervisors

- `إدريس مشوير`
  - `idris-mashwir@ishraf.local`
- `بسام علي علي نحيلة`
  - `bassam-ali-ali-nuhailah@ishraf.local`

## كلمات المرور الافتراضية الحالية

### Teacher + Parent + Supervisors

```text
SeedDev123!
```

### Driver

```text
SeedDriver123!
```

## التحقق السريع الحالي

```sql
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS teachers_count FROM teachers;
SELECT COUNT(*) AS parents_count FROM parents;
SELECT COUNT(*) AS drivers_count FROM drivers;
SELECT COUNT(*) AS supervisors_count FROM supervisors;
SELECT COUNT(*) AS academic_years_count FROM academic_years;
SELECT COUNT(*) AS students_count FROM students;
SELECT COUNT(*) AS messages_count FROM messages;
SELECT COUNT(*) AS announcements_count FROM announcements;
SELECT COUNT(*) AS notifications_count FROM notifications;
```

النتيجة المرجعية الحالية:
- `users = 6`
- `teachers = 1`
- `parents = 1`
- `drivers = 1`
- `supervisors = 2`
- `academic_years = 0`
- `students = 0`
- `messages = 0`
- `announcements = 0`
- `notifications = 0`

## عن ملفات الـ seed الأكبر

الملف التالي ما زال موجودًا كأداة تشغيلية اختيارية فقط:
- `src/database/seeds/staging_frontend_seed.sql`

والـ runner الخاص به:
- `src/scripts/seed-staging-frontend-data.ts`

لكن مهم جدًا:
- هذه الـ seed **ليست** ما يعكس البيئة المستضافة الحالية
- لا تعتمد عليها كمرجع للحالة الحية إلا إذا قررنا تشغيلها صراحة مرة أخرى

# رد مؤقت لفريق فرونت لوحة الإدارة: Parent ID Alignment

بعد مراجعة مسار ربط ولي الأمر بالطالب في الباك الحالي، تأكد أن المشكلة **حقيقية من جهة العقد** وليست خطأ في الفرونت.

## سبب المشكلة

- `GET /api/v1/users?role=parent` يعيد قائمة مستخدمين من نوع `UserResponseDto`
- الحقل `id` في هذه القائمة هو `users.id`
- بينما مساري:
  - `POST /api/v1/students/:id/parents`
  - `PATCH /api/v1/students/:studentId/parents/:parentId/primary`
  كانا يعتمدان داخليًا على `parents.id`
- النتيجة: إرسال `users.id` القادم من `/users?role=parent` كان يؤدي إلى:
  - `400 Bad Request`
  - `Parent not found`

## ما تم تعديله في الباك

تم تعديل الباك ليقبل الآن في `parentId` أحد الشكلين التاليين:

- `users.id` القادم من `GET /users?role=parent`
- أو `parents.id` للتوافق الخلفي

ويقوم الباك بتحويله داخليًا إلى `parents.id` الصحيح قبل:

- التحقق من وجود ولي الأمر
- منع التكرار
- إنشاء الربط
- تغيير الـ primary parent

## العقد النهائي المعتمد

### 1. Link Parent

`POST /api/v1/students/:id/parents`

Body:

```json
{
  "parentId": "1003",
  "relationType": "father",
  "isPrimary": true
}
```

مهم:
- المسار الموصى به للفرونت: استخدم `users.id` القادم من `/users?role=parent`
- لا حاجة بعد الآن إلى استخراج `parents.id` من مكان آخر

### 2. Set Primary Parent

`PATCH /api/v1/students/:studentId/parents/:parentId/primary`

مهم:
- `parentId` في هذا المسار يقبل أيضًا:
  - `users.id`
  - أو `parents.id`
- المسار الموصى به للفرونت: استخدم نفس `id` القادم من `/users?role=parent`

## ما الذي يجب على الفرونت عمله الآن

1. استمروا في جلب أولياء الأمور من:
   - `GET /api/v1/users?role=parent`
2. استخدموا `user.id` مباشرة في:
   - `POST /students/:id/parents`
   - `PATCH /students/:studentId/parents/:parentId/primary`
3. لا تبنوا أي workaround لاستخراج `parents.id` من خارج الـ API

## ملاحظات مهمة

- الردود الحالية الخاصة بالروابط المرتبطة بالطالب ستبقى تعيد:
  - `parentId` = معرف جدول `parents`
  - `userId` = معرف جدول `users`
- هذا مقصود، لأن التخزين الداخلي ما زال يعتمد على `student_parents.parent_id -> parents.id`
- لكن الإدخال من الفرونت في هذا التدفق يمكن أن يعتمد الآن على `users.id` بأمان

## الخلاصة

تم حل المشكلة من جهة الباك.

اعتمدوا من الآن على هذا السلوك:

- الاختيار من `/users?role=parent`
- الإرسال باستخدام `users.id`

ولا حاجة إلى أي تغيير معماري إضافي في شاشة الربط.

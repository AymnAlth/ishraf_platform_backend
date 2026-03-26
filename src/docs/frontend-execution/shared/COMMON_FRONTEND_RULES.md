# القواعد المشتركة للفرونت إند

هذا الملف يثبت القواعد المشتركة التي يجب أن تعتمدها جميع فرق الفرونت.

## الروابط الأساسية

- Public root URL: `https://ishraf-platform-backend-staging.onrender.com`
- Public API base URL: `https://ishraf-platform-backend-staging.onrender.com/api/v1`

Health endpoints خارج `api/v1`:

- `GET /health`
- `GET /health/ready`

## شكل الاستجابة القياسي

كل الاستجابات تعتمد envelope موحدًا:

### Success

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "code": "VALIDATION_ERROR",
      "message": "Email must be a valid email address"
    }
  ]
}
```

## قواعد المعرفات والأنواع

- جميع `id` values تعامل في الفرونت على أنها `string`
- لا تعتمد على تحويل `id` إلى `number`
- الحقول التاريخية قد تعاد بصيغة `date-only` أو `datetime`
- تعامل مع التواريخ المعادة كما هي، ولا تفترض timezone محلية إلا إذا كانت الشاشة تعرض وقتًا فعليًا

## قواعد المصادقة

- كل المسارات المحمية تتطلب:

```http
Authorization: Bearer <accessToken>
```

- عند انتهاء صلاحية `accessToken`:
  - جرّب `refresh`
  - ثم أعد الطلب الأصلي
  - وإن فشل `refresh` انقل المستخدم إلى شاشة تسجيل الدخول

## قواعد pagination / sorting / filters

القوائم المفعّل عليها pagination تعيد:

```json
{
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 0,
      "totalPages": 0
    }
  }
}
```

بعض المسارات تضيف `unreadCount` داخل `data`.

القواعد العامة:

- `page` الافتراضي: `1`
- `limit` الافتراضي: `20`
- `limit` الأقصى: `100`
- `sortOrder`: `asc` أو `desc`
- `sortBy` يجب أن يكون ضمن whitelist الخاصة بكل endpoint

## قواعد role scoping

- لا تعتمد أي واجهة على مجرد إخفاء الزر فقط
- كل تطبيق يجب أن يفترض أن الباك سيفرض الـ role access والـ ownership
- التطبيق يجب أن يترجم `403` و`404` و`409` إلى رسائل استخدام مفهومة

## دلالات الأخطاء الموحدة

- `401`
  - التوثيق مفقود أو منتهي أو غير صالح
- `403`
  - المستخدم موثق، لكنه خارج الصلاحية أو الـ scope أو الـ ownership
- `404`
  - route غير موجود فعلًا
  - أو المورد الأساسي نفسه غير موجود
  - أو prerequisite نظامي مفقود مثل `active academic period`
- `200` مع empty state أو zero-safe payload
  - عندما يكون المورد الأساسي موجودًا لكن لا توجد بيانات مرتبطة بعد

قواعد ثابتة:

- لا تفسر `404` على أنه "لا توجد بيانات بعد" بشكل تلقائي
- لا تفسر `403` على أنه route غير موجود
- في student-scoped reporting وstudent homework وstudent behavior:
  - الطالب الموجود بدون بيانات مرتبطة يجب أن يعيد `200` مع arrays فارغة أو summary صفرية

## ownership rules المهمة

- `parent` لا يقرأ أي `studentId` إلا عبر parent-owned endpoints
- `teacher` و`supervisor` يعملان ضمن assignments الحالية فقط
- `driver` يعمل ضمن الرحلات والحافلات المملوكة له بحسب ownership enforcement الحالي
- `admin` هو السطح الوحيد ذو إدارة شاملة عبر معظم الوحدات

## قواعد تشغيل النقل

- لا تعتمدوا على "عنوان الطالب" النصي في أي منطق نقل داخل الفرونت
- النقل في Wave 1 مبني على:
  - `route`
  - `bus_stops`
  - `student_bus_assignments`
  - `trips`
  - `trip_student_events`
- في تطبيق السائق:
  - `GET /transport/trips/:id` يعيد تفاصيل الرحلة وليس roster الطلاب
  - `GET /transport/trips/:id/events` يعيد الأحداث المسجلة فقط
  - `GET /transport/trips/:id/students` هو مصدر الحقيقة للـ roster

## قواعد recipients في الرسائل

- `GET /communication/recipients` هو surface القراءة الرسمية لبناء اختيار المستلم
- لا تعتمد الواجهات على إدخال `receiverUserId` يدويًا
- في السياسة الحالية لـ Wave 1:
  - يعاد المستخدمون النشطون فقط
  - ويستثنى المستخدم الحالي
  - ولا توجد role directory أدق من ذلك
  - وهذه هي السياسة الرسمية المعتمدة حاليًا

## قواعد empty states

كل فريق فرونت يجب أن يجهز empty states واضحة لـ:

- لا توجد عناصر بعد
- لا توجد نتائج مطابقة للفلترة
- لا توجد بيانات summary بعد
- لا توجد رحلة نشطة
- لا توجد إشعارات أو رسائل

## ملاحظات تشغيلية على الاستضافة

- البيئة الحالية مخصصة للتطوير المرحلي للفرونت وليست production customer rollout
- الاستضافة الحالية على Render free/staging، لذلك:
  - قد يوجد `cold start` عند أول طلب بعد خمول
  - لا تعتمدوا على response time ثابت جدًا في التقييم البصري
- قاعدة البيانات الحالية على Neon

## مراجع مرتبطة

- [قواعد المصادقة والجلسات](./AUTH_AND_SESSION_RULES.md)
- [تسلسل التنفيذ](./DELIVERY_SEQUENCE.md)
- [مواءمة العقود الإدارية](../admin-dashboard/ATTENDANCE_BEHAVIOR_ROUTE_ALIGNMENT.md)
- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/ishraf-platform.openapi.json`

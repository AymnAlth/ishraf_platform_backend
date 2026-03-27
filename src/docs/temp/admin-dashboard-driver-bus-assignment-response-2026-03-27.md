# Admin Dashboard Backend Response: Driver Bus Assignment

بعد مراجعة المشكلة في الكود الفعلي، تبيّن أن الـ gap كان حقيقيًا من جهة الباك:

- `GET /api/v1/users?role=driver` يعيد `users.id`
- بينما `POST /api/v1/transport/buses` كان يتحقق سابقًا من `drivers.id` فقط

تم حل المشكلة **بدون إضافة endpoint جديدة** وبدون كشف `driverProfileId` داخل `/users`.

## القرار الرسمي المعتمد

الفرونت يجب أن يعتمد من الآن على:

- `users.id` القادم من `GET /api/v1/users?role=driver`

ويرسله مباشرة داخل:

- `POST /api/v1/transport/buses`

ضمن الحقل:

- `driverId`

والباك سيحوّل هذه القيمة داخليًا إلى `driverProfileId` الصحيح قبل الحفظ.

## ماذا أصبح `POST /transport/buses` يقبل

الحقل:

- `driverId`

يقبل الآن رسميًا أحد الشكلين:

1. `users.id` الخاص بالسائق
2. `drivers.id` للتوافق الخلفي

لكن المسار الرسمي المطلوب من الفرونت هو:

- استخدموا `users.id` فقط

## مثال صحيح

```json
{
  "plateNumber": "UI-BUS-TEST",
  "capacity": 30,
  "status": "active",
  "driverId": "1004"
}
```

حيث `1004` هو `users.id` لسائق تم اختياره من:

- `GET /api/v1/users?role=driver`

## ما الذي يجب حذفه من منطق الفرونت

- أي محاولة لاستخراج `driverProfileId`
- أي طلب للمستخدم بإدخال معرف داخلي يدويًا
- أي workaround يعتمد على أن السائق يجب أن يظهر مسبقًا في:
  - buses
  - route assignments
  - trips

## الأماكن المتأثرة في الفرونت

### 1. شاشة إنشاء الحافلة

يجب أن ترسل:

- `driverId = selectedUser.id`

وليس أي profile id داخلي.

### 2. مكوّن اختيار السائق

إذا كان selector يعتمد الآن على:

- اسم السائق
- `users.id`

فهذا أصبح كافيًا، ولا يحتاج أي lookup إضافي.

### 3. أي helper أو store أو adapter خاص بالنقل

إذا كنتم أضفتم mapping مؤقتًا من:

- `userId -> driverProfileId`

فيجب حذفه.

### 4. أي validation محلي في شاشة إنشاء الحافلة

لا تفترضوا أن `driverId` يجب أن يكون `driverProfileId`.
التحقق المحلي يجب أن يعتبر:

- `users.id` القادمة من قائمة السائقين هي القيمة الصحيحة المرسلة للباك

## التوافق الخلفي

إذا كان لديكم أي flow قديم أو بيانات اختبارية ترسل:

- `drivers.id`

فهي ما زالت تعمل.

لكن لا تبنوا عليها أي منطق جديد في الواجهة.

## السلوك عند القيم غير الصحيحة

إذا أُرسل `driverId` لا يعود إلى:

- driver user
- أو driver profile

فسيعيد الباك:

- `Driver not found`

والسلوك الحالي يبقى مطابقًا لسياسة الأخطاء المعتمدة في المشروع.

## المرجع الرسمي الذي يجب الاعتماد عليه

- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`
- `src/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md`

## الخلاصة

المشكلة انحلت من جهة الباك عبر توسيع `POST /transport/buses` نفسه.

المطلوب من الفرونت الآن:

1. اجلبوا السائقين من `/users?role=driver`
2. استخدموا `selectedUser.id`
3. أرسلوه مباشرة في `driverId`
4. احذفوا أي logic سابق للبحث عن `driverProfileId`

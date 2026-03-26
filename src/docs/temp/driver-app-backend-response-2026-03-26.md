# Driver App Backend Response

تاريخ الرد: `2026-03-26`

مهم:

- هذا الملف مؤقت وأرشيفي
- المرجع الدائم المعتمد الآن هو:
  - `src/docs/API_REFERENCE.md`
  - `src/docs/openapi/ishraf-platform.openapi.json`
  - `src/docs/postman/ishraf-platform.postman_collection.json`
  - `src/docs/frontend-execution/driver-app/ENDPOINT_MAP.md`

## النتيجة المختصرة

بعد مراجعة الباك الحالي على `staging`:

1. طلب roster الطلاب للرحلة كان **Gap حقيقي** في الباك.
2. طلب recipients المتاحين للرسائل كان **Gap حقيقي** في الباك.

تمت إضافة endpointين جديدين فعليًا ونشرهما داخل التوثيق المرجعي أيضًا.

## ما كان موجودًا مسبقًا

كانت endpoints التالية موجودة مسبقًا وتعمل:

- `GET /api/v1/transport/trips/:id`
- `GET /api/v1/transport/trips/:id/events`
- `POST /api/v1/transport/trips/:id/events`
- `POST /api/v1/communication/messages`
- `GET /api/v1/communication/messages/inbox`
- `GET /api/v1/communication/messages/sent`
- `GET /api/v1/communication/messages/conversations/:otherUserId`

لكن:

- `GET /transport/trips/:id` لا يعيد roster الطلاب.
- `GET /transport/trips/:id/events` يعيد فقط الطلاب الذين لديهم event مسجل.
- لم يكن يوجد surface رسمي لجلب recipients المسموح بهم للمراسلة.

بالتالي طلب الفرونت هنا كان صحيحًا.

---

## القرار النهائي المعتمد

### 1. Trip roster

تم اعتماد route جديدة:

- `GET /api/v1/transport/trips/:id/students`

لم يتم توسيع `GET /api/v1/transport/trips/:id` لأن إبقاء تفاصيل الرحلة الحالية مستقرة أفضل من تغيير contract قائم تستخدمه الواجهة بالفعل.

### 2. Available recipients

تم اعتماد route جديدة:

- `GET /api/v1/communication/recipients`

---

## 1) Trip Students Roster

### Endpoint

- `GET /api/v1/transport/trips/:id/students`

### من يستخدمه

- `driver`
- `admin`

### الصلاحيات

- `admin`: مسموح دائمًا.
- `driver`: مسموح فقط إذا كان مالك الرحلة نفسها.
- `driver` غير مالك الرحلة: `403`
- `admin` إذا كانت الرحلة غير موجودة: `404`
- بدون توكن أو بتوكن منتهي: `401`

### Query params المدعومة

- `search?`
  - يبحث في `fullName` و`academicNo`
- `stopId?`
  - لتصفية roster إلى نقطة توقف محددة

### الـ response المعتمد

```json
{
  "success": true,
  "message": "Trip students roster returned successfully",
  "data": {
    "tripId": "2",
    "tripStatus": "started",
    "students": [
      {
        "studentId": "101",
        "academicNo": "SEED-STU-001",
        "fullName": "أحمد محمد",
        "assignedStop": {
          "stopId": "5",
          "stopName": "نقطة السوق",
          "stopOrder": 1
        },
        "currentTripEventType": "not_marked",
        "lastEvent": {
          "eventType": null,
          "eventTime": null,
          "stopId": null
        }
      }
    ]
  }
}
```

### القواعد السلوكية

- يعيد **كل الطلاب المرتبطين فعليًا بمسار الرحلة في تاريخ الرحلة** حتى لو لم يكن لديهم أي `trip event` بعد.
- `currentTripEventType` مشتق من **آخر event لنفس الطالب داخل نفس الرحلة فقط**.
- القيم الممكنة:
  - `not_marked`
  - `boarded`
  - `dropped_off`
  - `absent`
- `lastEvent` يعرض آخر event داخل نفس الرحلة:
  - `eventType`
  - `eventTime`
  - `stopId`
- الترتيب:
  - أولًا `assignedStop.stopOrder`
  - ثم `fullName`
- إذا كانت الرحلة موجودة ولا يوجد لها طلاب:
  - `200`
  - `students = []`

### كيف يستخدمه Flutter

استخدموا هذا endpoint كمصدر الحقيقة لقائمة اختيار الطالب داخل:

- `boarded`
- `dropped_off`
- `absent`

ثم استخدموا `studentId` الناتج منه مباشرة مع:

- `POST /api/v1/transport/trips/:id/events`

ولا تعتمدوا بعد الآن على `GET /transport/trips/:id/events` لبناء roster.

---

## 2) Available Message Recipients

### Endpoint

- `GET /api/v1/communication/recipients`

### من يستخدمه

- كل مستخدم موثق ونشط:
  - `admin`
  - `parent`
  - `teacher`
  - `supervisor`
  - `driver`

### الصلاحيات

- يتطلب توثيقًا صحيحًا: `Bearer access token`
- بدون توكن أو بتوكن منتهي: `401`

### Query params المدعومة

- `search?`
  - يبحث في `fullName` و`email` و`phone`
- `role?`
  - لتصفية النتائج حسب الدور
- `page?`
- `limit?`

### الـ response المعتمد

```json
{
  "success": true,
  "message": "Available recipients returned successfully",
  "data": {
    "items": [
      {
        "userId": "7",
        "fullName": "مشرف النقل",
        "role": "supervisor",
        "phone": "770000000",
        "email": "ops@ishraf.local"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

### القواعد السلوكية

- في `v1` هذا endpoint يعكس **سياسة الرسائل الحالية كما هي في الباك**:
  - أي مستخدم نشط يمكنه مراسلة أي مستخدم نشط آخر
  - مع استثناء المستخدم نفسه
- لذلك:
  - لا تظهر حسابات `inactive`
  - لا يظهر المستخدم الحالي داخل نتائجه الخاصة
- إذا لم توجد نتائج:
  - `200`
  - `items = []`

### كيف يستخدمه Flutter

استخدموا هذا endpoint كمصدر الحقيقة لقائمة اختيار المستلم قبل:

- `POST /api/v1/communication/messages`

ولا تعتمدوا على إدخال `receiverUserId` يدويًا.

---

## Business Rules الإضافية التي يجب عكسها في Flutter

### Trip roster

- لا تفترضوا أن الطالب الذي لا يملك event غير موجود في الرحلة.
- الحالة الصحيحة له ستكون:
  - `currentTripEventType = "not_marked"`
- عند عرض حالة كل طالب:
  - اعتمدوا على `currentTripEventType`
  - وليس على وجود event row من عدمه

### Messaging recipients

- لا تعرضوا قائمة عامة hardcoded للمستخدمين.
- اعتمدوا على `/communication/recipients` فقط.
- إذا كانت القائمة فارغة:
  - اعرضوا empty state
  - وليس error state

---

## ماذا تم تحديثه أيضًا

تم تحديث:

- `OpenAPI`
- `Postman`

والإندبوينتان الجديدتان معلمتان داخل الـ artifacts بـ:

- `[NEW]`

حتى يستطيع فريق الفرونت ملاحظتهما بسرعة.

## مرجع التنفيذ النهائي

- `GET /api/v1/transport/trips/:id/students`
- `GET /api/v1/communication/recipients`

إذا ظهرت حاجة لاحقًا لقيود رسائل role-based أكثر تحديدًا، فسيتم تعديل `communication/recipients` ليعكسها مباشرة بدل إنشاء surface ثانية.

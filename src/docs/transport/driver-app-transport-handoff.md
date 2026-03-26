# Handoff لمطور تطبيق السائق: Transport

هذا الملف هو المرجع النهائي لتعديل تطبيق السائق بحيث ينتقل من النموذج القديم إلى workflow النقل الصحيح بدون كسر ما بُني.

## 1. المطلوب منك قبل أي تعديل

ابدأ أولًا بهذا الحصر داخل مشروعك:

1. أين تعتمد الآن على `GET /transport/trips` فقط؟
2. أين تعتمد على `POST /transport/trips` كإنشاء يومي؟
3. أين تعتمد على `GET /transport/trips/:id/events` لبناء roster أو student picker؟
4. أين تدخل `studentId` يدويًا؟
5. أين تحتاج خريطة أو location source لعرض stop أو منزل الطالب؟

لا تعدّل أي flow قبل أن تعرف هذه النقاط بدقة.

## 2. الفكرة الصحيحة التي يجب أن تعتمدها

من الآن فصاعدًا، workflow السائق يجب أن يكون:

1. يجلب route assignments الخاصة به
2. يختار route assignment + نوع الرحلة + تاريخها
3. يستدعي `ensure-daily`
4. يدخل على trip detail
5. يجلب roster من endpoint مخصص
6. يبدأ الرحلة
7. يرسل المواقع
8. يسجل boarded / dropped_off / absent
9. ينهي الرحلة

## 3. ما الذي أضفناه في الباك

### [NEW] route assignments الخاصة بالسائق

- `GET /api/v1/transport/route-assignments/me`

الغرض:

- هذه هي نقطة البداية الصحيحة ليوم السائق
- تعطي الخطوط المتكررة النشطة الخاصة به

### [NEW] ensure daily trip

- `POST /api/v1/transport/trips/ensure-daily`

Body:

```json
{
  "routeAssignmentId": "1",
  "tripDate": "2026-03-26",
  "tripType": "pickup"
}
```

السلوك:

- إذا كانت الرحلة موجودة يعيدها مع `created=false`
- إذا لم تكن موجودة ينشئها ويعيدها مع `created=true`

### تغير مهم في roster

- `GET /api/v1/transport/trips/:id/students`

أصبح يعيد أيضًا:

- `assignedStop.latitude`
- `assignedStop.longitude`
- `homeLocation` إن كانت Approved

### تغير مهم في event validation

- `POST /api/v1/transport/trips/:id/events`

أصبح يتحقق من assignment الصحيحة على **تاريخ الرحلة نفسه**

هذا ممتاز لك في التطبيق لأنه يجعل:

- roster
- event create

يعتمدان على نفس الحقيقة التشغيلية.

## 4. الـ workflow النهائي الذي يجب أن تبنيه

### 4.1 شاشة البداية التشغيلية

ابدأ من:

- `GET /transport/route-assignments/me`

اعرض:

- اسم الخط
- bus
- driver
- start/end points

### 4.2 اختيار رحلة اليوم

بعد اختيار route assignment:

- اختر:
  - `tripType = pickup | dropoff`
  - `tripDate`

ثم استدع:

- `POST /transport/trips/ensure-daily`

### 4.3 الدخول إلى trip detail

بعد `ensure-daily`:

- استخدم `trip.id`
- ثم اجلب:
  - `GET /transport/trips/:id`
  - `GET /transport/trips/:id/students`

### 4.4 شاشة roster

استخدم endpoint واحد فقط كمصدر حقيقة:

- `GET /transport/trips/:id/students`

ويجب أن تبني عليه:

- student picker
- student list
- current status لكل طالب
- grouping by stop

لا تعتمد على:

- `GET /transport/trips/:id/events`

لبناء roster.

### 4.5 الخريطة

يمكنك الآن عرض:

- `assignedStop.latitude`
- `assignedStop.longitude`

وإذا وُجدت:

- `homeLocation.latitude`
- `homeLocation.longitude`
- `homeLocation.addressLabel`
- `homeLocation.addressText`

لكن القاعدة:

- stop هي المرجع التشغيلي
- home location مرجع مساعد فقط

### 4.6 تسجيل الأحداث

عند إنشاء event:

- `boarded` يحتاج `stopId`
- `dropped_off` يحتاج `stopId`
- `absent` لا يقبل `stopId`

ولا تدخل `studentId` يدويًا من المستخدم:

- يجب أن يأتي من roster

### 4.7 بقية الرحلة

- `POST /transport/trips/:id/start`
- `POST /transport/trips/:id/locations`
- `POST /transport/trips/:id/events`
- `POST /transport/trips/:id/end`

## 5. ما الذي لا يجب أن تفعله

- لا تبدأ يوم السائق عبر `POST /transport/trips` مباشرة
- لا تبني roster من `events`
- لا تعتمد على `trip detail` وحده لاستخراج الطلاب
- لا تفترض أن `homeLocation` موجودة دائمًا
- لا تفترض أن منزل الطالب هو نقطة التشغيل المعتمدة
- لا تستخدم manual IDs للمستلمين في الرسائل

## 6. الـ endpoints التي يجب أن تعتمدها الآن

### بداية التشغيل

- `GET /transport/route-assignments/me`
- `POST /transport/trips/ensure-daily`

### التشغيل اليومي

- `GET /transport/trips`
- `GET /transport/trips/:id`
- `GET /transport/trips/:id/students`
- `POST /transport/trips/:id/start`
- `POST /transport/trips/:id/end`
- `POST /transport/trips/:id/locations`
- `POST /transport/trips/:id/events`
- `GET /transport/trips/:id/events`

### الملخص

- `GET /reporting/transport/summary`

### التواصل

- `GET /communication/recipients`
- `POST /communication/messages`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`
- `GET /communication/announcements/active`

## 7. Checklist القبول قبل الدمج

- التطبيق يبدأ من route assignments وليس من manual trip create
- `ensure-daily` مستخدمة فعليًا
- الطالب يختار من roster لا من إدخال يدوي
- roster مبنية من `/transport/trips/:id/students`
- الخريطة تستخدم stop coords وتعرض home location فقط إذا وجدت
- event creation يحترم stop rules
- لا يوجد أي flow يعتمد على IDs يدوية في messaging

## 8. الملفات المرجعية التي يجب أن تعمل عليها

- [TRANSPORT_EXECUTION_AND_HANDOFF.md](/d:/Project-R/ishraf_platform_backend/TRANSPORT_EXECUTION_AND_HANDOFF.md)
- [TRANSPORT_UNIFICATION_PLAN.md](/d:/Project-R/ishraf_platform_backend/TRANSPORT_UNIFICATION_PLAN.md)
- [ishraf-platform.openapi.json](/d:/Project-R/ishraf_platform_backend/src/docs/openapi/ishraf-platform.openapi.json)
- [ishraf-platform.postman_collection.json](/d:/Project-R/ishraf_platform_backend/src/docs/postman/ishraf-platform.postman_collection.json)
- [ishraf-platform.staging.postman_environment.json](/d:/Project-R/ishraf_platform_backend/src/docs/postman/ishraf-platform.staging.postman_environment.json)

إذا كان مشروعك الحالي يعمل على flow مختلف، لا تكسره دفعة واحدة. انقل التطبيق إلى هذا الـ workflow بالتدرج، لكن اجعل هذه الوثيقة هي المرجع النهائي. 

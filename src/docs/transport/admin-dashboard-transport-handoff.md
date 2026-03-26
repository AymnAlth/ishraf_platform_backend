# Handoff لمطور لوحة الإدارة: Transport

هذا الملف هو المرجع النهائي لتعديل transport داخل لوحة الإدارة بدون كسر المشروع الحالي.

## 1. المطلوب منك قبل أي تعديل

قبل أن تكتب أي كود جديد، نفّذ هذه الخطوات داخل مشروع الفرونت الخاص بك:

1. احصر كل الشاشات أو المكونات التي تستخدم transport.
2. حدّد أين تعتمد الآن على:
   - `POST /transport/trips`
   - trips create daily flow
   - أي افتراض أن الإدارة تنشئ رحلة الذهاب والعودة كل يوم يدويًا
3. حدّد إن كانت لديك شاشة مستقلة أو modal لـ:
   - buses
   - routes
   - route stops
   - student assignments
   - trips
4. دوّن المواضع التي ستحتاج إضافة support فيها إلى:
   - route assignments
   - student home location

مهم:

- لا تبدأ بالهدم
- لا تحذف create trip flow
- افهم أولًا أين تعتمد الواجهة الحالية على النموذج القديم

## 2. الفكرة الصحيحة التي يجب أن تعتمدها

النقل الآن يعمل كالتالي:

- `route` = خط ثابت
- `route assignment` = ربط bus مع route بشكل تشغيلي متكرر
- `student assignment` = ربط الطالب بخط ونقطة وقوف
- `trip` = تشغيل يومي فعلي

هذا يعني:

- الإدارة لا تنشئ route يومية
- الإدارة لا يجب أن تكون المشغل اليومي الأساسي
- الإدارة تجهز البنية، وتراجعها، وتملك manual fallback

## 3. ما الذي أضفناه في الباك

### [NEW] route assignments

- `POST /api/v1/transport/route-assignments`
- `GET /api/v1/transport/route-assignments`
- `PATCH /api/v1/transport/route-assignments/:id/deactivate`

الغرض:

- ربط الحافلة بخط ثابت متكرر
- تمهيد تشغيل السائق اليومي دون إعادة إنشاء route أو trip من الإدارة كل مرة

### [NEW] student home location

- `GET /api/v1/transport/students/:studentId/home-location`
- `PUT /api/v1/transport/students/:studentId/home-location`
- `DELETE /api/v1/transport/students/:studentId/home-location`

الغرض:

- حفظ موقع/عنوان منزل الطالب كمعلومة مرجعية
- لا يغير التشغيل تلقائيًا
- السائق يرى فقط location المعتمدة `approved`

### create trip بقي موجودًا

- `POST /api/v1/transport/trips`

لكن:

- لم يعد هو workflow اليومي الأساسي
- أصبح fallback يدويًا للإدارة

## 4. ما الذي يجب أن تغيّره في لوحة الإدارة

### 4.1 أبقِ هذه الشاشات كما هي وظيفيًا

- buses
- routes
- route stops
- student transport assignments
- trips list/detail
- transport summary

### 4.2 أضف شاشة أو تبويب جديدًا لـ route assignments

الحد الأدنى المطلوب:

- list route assignments
- create route assignment
- deactivate route assignment

العناصر الأساسية في الـ form:

- `busId`
- `routeId`
- `startDate`
- `endDate?`

### 4.3 أضف إدارة home location داخل student detail أو transport tab

الحد الأدنى المطلوب:

- عرض home location الحالية إن وجدت
- create/update via `PUT`
- delete via `DELETE`

الحقول:

- `addressLabel?`
- `addressText?`
- `latitude`
- `longitude`
- `status?`
- `notes?`

في هذه الجولة:

- الإدارة فقط هي من تديرها
- لا يوجد parent UI هنا

### 4.4 غيّر معنى create trip داخل الواجهة

هذا مهم:

- لا تحذف create trip
- لا تبنها كأنها daily workflow mandatory
- غيّر التسمية أو الوصف في الواجهة إلى واحد من المعاني التالية:
  - رحلة يدوية
  - رحلة استثنائية
  - تشغيل يدوي عند الحاجة

إذا احتجت عنوانًا واضحًا:

- `Manual Trip Creation`
- أو `Create Exception Trip`

## 5. ما الذي لا يجب أن تفعله

- لا تبن transport على فكرة أن route = trip
- لا تطلب من المستخدم الإداري إنشاء رحلات اليوم لكل سائق كخطوة أساسية
- لا تعامل home location على أنها بديل مباشر عن stop
- لا تجعل تعديل منزل الطالب يغيّر route أو stop تلقائيًا في الواجهة

## 6. الـ endpoints التي يجب أن تعتمدها الآن

### البنية الثابتة

- `POST /transport/buses`
- `GET /transport/buses`
- `POST /transport/routes`
- `GET /transport/routes`
- `POST /transport/routes/:routeId/stops`
- `GET /transport/routes/:routeId/stops`
- `POST /transport/assignments`
- `PATCH /transport/assignments/:id/deactivate`
- `GET /transport/assignments/active`

### [NEW] البنية المتكررة

- `POST /transport/route-assignments`
- `GET /transport/route-assignments`
- `PATCH /transport/route-assignments/:id/deactivate`

### [NEW] منزل الطالب

- `GET /transport/students/:studentId/home-location`
- `PUT /transport/students/:studentId/home-location`
- `DELETE /transport/students/:studentId/home-location`

### التشغيل والمراقبة

- `POST /transport/trips`
- `GET /transport/trips`
- `GET /transport/trips/:id`
- `GET /transport/trips/:id/students`
- `GET /transport/trips/:id/events`
- `POST /transport/trips/:id/start`
- `POST /transport/trips/:id/end`
- `POST /transport/trips/:id/locations`
- `POST /transport/trips/:id/events`
- `GET /reporting/transport/summary`

## 7. قواعد العمل التي يجب أن تنعكس في UI

- route assignment النشطة هي ما يحدد bus-to-route recurring link
- create trip اليدوي ليس المسار اليومي الطبيعي
- إذا لم توجد home location:
  - هذا ليس خطأ
  - بل empty state
- إذا كانت home location موجودة لكن غير معتمدة:
  - لا تبن عليها سلوكًا تشغيليًا
- roster الرحلة مصدره:
  - `GET /transport/trips/:id/students`
  - وليس `events`

## 8. Checklist القبول قبل الدمج

- كل transport screen الحالية ما زالت تعمل
- create trip بقيت متاحة ولم تنكسر
- route assignments أصبحت موجودة وظيفيًا
- home location أصبحت موجودة وظيفيًا
- لا توجد أي شاشة تفترض أن الإدارة تنشئ الرحلات اليومية دائمًا
- لا توجد أي شاشة تخلط بين home location وassigned stop

## 9. المرجع الذي يجب أن تعود إليه

- [TRANSPORT_EXECUTION_AND_HANDOFF.md](/d:/Project-R/ishraf_platform_backend/TRANSPORT_EXECUTION_AND_HANDOFF.md)
- [TRANSPORT_UNIFICATION_PLAN.md](/d:/Project-R/ishraf_platform_backend/TRANSPORT_UNIFICATION_PLAN.md)
- [ishraf-platform.openapi.json](/d:/Project-R/ishraf_platform_backend/src/docs/openapi/ishraf-platform.openapi.json)
- [ishraf-platform.postman_collection.json](/d:/Project-R/ishraf_platform_backend/src/docs/postman/ishraf-platform.postman_collection.json)

إذا وجدت تضاربًا بين واجهتك الحالية وهذه الوثيقة، فهذه الوثيقة مع OpenAPI هما المرجع النهائي.

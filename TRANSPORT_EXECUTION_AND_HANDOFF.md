# Transport Execution And Handoff

تاريخ الإغلاق: `2026-03-26`

هذا الملف هو المرجع التنفيذي النهائي لمسار النقل بعد تثبيت الفكرة التي شرحناها في:

- [TRANSPORT_UNIFICATION_PLAN.md](/d:/Project-R/ishraf_platform_backend/TRANSPORT_UNIFICATION_PLAN.md)

الفرق بين الملفين:

- `TRANSPORT_UNIFICATION_PLAN.md` يشرح الفكرة المعمارية ومنطق المجال
- هذا الملف يشرح ما تم تنفيذه فعليًا في الباك، وما الذي يجب أن يفعله كل فريق فرونت الآن

## 1. النتيجة النهائية

تم تثبيت النقل على النموذج التالي:

- `route` = خط ثابت متكرر
- `transport_route_assignments` = الربط التشغيلي المتكرر بين الحافلة والخط
- `student_bus_assignments` = مصدر الحقيقة لربط الطالب بنقطة الوقوف والخط
- `trip` = التنفيذ اليومي الفعلي من نوع `pickup` أو `dropoff`
- `trip_student_events` = ما حدث لكل طالب داخل الرحلة
- `student_transport_home_locations` = معلومة مرجعية معتمدة أو غير معتمدة، وليست مصدر التشغيل المباشر

النتيجة المهمة:

- الإدارة لم تعد مطالبة بإنشاء رحلة جديدة كل يوم كمسار تشغيل أساسي
- تطبيق السائق أصبح يملك workflow يومي واضح وآمن
- بقي `POST /transport/trips` موجودًا حتى لا نكسر ما هو قائم
- لكن المسار التشغيلي الجديد للسائق هو:
  - `GET /transport/route-assignments/me`
  - `POST /transport/trips/ensure-daily`
  - ثم بقية تشغيل الرحلة

## 2. ما تم تنفيذه في الباك

### 2.1 الجداول والقيود الجديدة

تمت إضافة:

- `transport_route_assignments`
- `student_transport_home_locations`

وتمت إضافة/تثبيت:

- unique constraint على:
  - `trips (bus_id, route_id, trip_date, trip_type)`
- منطق تحقق trip student events ليصبح معتمدًا على:
  - `tripDate`
  - وليس فقط على active assignment الحالية

### 2.2 الـ endpoints الجديدة

#### إدارة route assignments

- `POST /api/v1/transport/route-assignments`
- `GET /api/v1/transport/route-assignments`
- `PATCH /api/v1/transport/route-assignments/:id/deactivate`
- `GET /api/v1/transport/route-assignments/me`

#### التشغيل اليومي للرحلات

- `POST /api/v1/transport/trips/ensure-daily`

#### home location

- `GET /api/v1/transport/students/:studentId/home-location`
- `PUT /api/v1/transport/students/:studentId/home-location`
- `DELETE /api/v1/transport/students/:studentId/home-location`

### 2.3 العقود التي تغيرت بدون كسر

#### `GET /api/v1/transport/trips/:id/students`

أصبح يعيد أيضًا:

- `assignedStop.latitude`
- `assignedStop.longitude`
- `homeLocation` عندما تكون الحالة `approved`

#### `POST /api/v1/transport/trips/:id/events`

بقي بنفس request shape، لكن التحقق الداخلي صار صحيحًا زمنيًا:

- الطالب يجب أن يملك assignment صالحة لنفس `tripDate`
- وليس مجرد active assignment حالية

## 3. ما الذي لم نكسره عمدًا

هذه نقطة مهمة جدًا للدمج الآمن:

- `POST /api/v1/transport/trips` ما زال موجودًا
- شاشة الإدارة الحالية التي تنشئ رحلة يدويًا يمكن أن تبقى
- لكنها لم تعد workflow التشغيل اليومي الأساسي
- أصبحت:
  - manual fallback
  - exception handling
  - operations override

بمعنى: لم نكسر القديم، لكننا ثبّتنا الجديد كمسار صحيح للمستقبل.

## 4. ما الذي يجب أن يفعله فريق لوحة الإدارة

أرسل له هذه الملفات فقط:

- [src/docs/transport/admin-dashboard-transport-handoff.md](/d:/Project-R/ishraf_platform_backend/src/docs/transport/admin-dashboard-transport-handoff.md)
- [TRANSPORT_UNIFICATION_PLAN.md](/d:/Project-R/ishraf_platform_backend/TRANSPORT_UNIFICATION_PLAN.md)
- [src/docs/openapi/ishraf-platform.openapi.json](/d:/Project-R/ishraf_platform_backend/src/docs/openapi/ishraf-platform.openapi.json)
- [src/docs/postman/ishraf-platform.postman_collection.json](/d:/Project-R/ishraf_platform_backend/src/docs/postman/ishraf-platform.postman_collection.json)

ولا ترسل له ملفات transport قديمة أو مؤقتة خارج هذه الحزمة.

الذي يجب أن يخرج به:

- إضافة شاشات route assignments
- إضافة إدارة home location للطالب
- إبقاء create trip موجودة لكن بوصفها manual fallback
- عدم بناء الإدارة على فكرة أن الرحلة اليومية تُنشأ يدويًا دائمًا

## 5. ما الذي يجب أن يفعله فريق تطبيق السائق

أرسل له هذه الملفات فقط:

- [src/docs/transport/driver-app-transport-handoff.md](/d:/Project-R/ishraf_platform_backend/src/docs/transport/driver-app-transport-handoff.md)
- [TRANSPORT_UNIFICATION_PLAN.md](/d:/Project-R/ishraf_platform_backend/TRANSPORT_UNIFICATION_PLAN.md)
- [src/docs/openapi/ishraf-platform.openapi.json](/d:/Project-R/ishraf_platform_backend/src/docs/openapi/ishraf-platform.openapi.json)
- [src/docs/postman/ishraf-platform.postman_collection.json](/d:/Project-R/ishraf_platform_backend/src/docs/postman/ishraf-platform.postman_collection.json)
- [src/docs/postman/ishraf-platform.staging.postman_environment.json](/d:/Project-R/ishraf_platform_backend/src/docs/postman/ishraf-platform.staging.postman_environment.json)

الذي يجب أن يخرج به:

- لا يعتمد على `POST /transport/trips` كخطوة يومية أساسية
- يبدأ من `GET /transport/route-assignments/me`
- ثم `POST /transport/trips/ensure-daily`
- ثم `GET /transport/trips/:id/students`
- ثم start / locations / events / end

## 6. الترتيب الصحيح للتنفيذ عند الفرونت

### أولًا: لوحة الإدارة

لأنها تجهز البنية التشغيلية:

- route assignments
- student transport assignments
- student home locations

### ثانيًا: تطبيق السائق

بعد توفر البنية:

- route assignment selection
- ensure-daily
- trip roster
- event-driven workflow

## 7. التحقق الذي أُنجز على الباك

تم التحقق من:

- migration الجديدة
- unit tests الخاصة بالنقل
- integration tests كاملة
- build

النتيجة:

- `pnpm build` نجح
- `pnpm test:integration` نجح: `78 passed`

## 8. ما الذي يبقى خارج هذه الجولة

هذا المسار لا يشمل:

- Google Maps integration
- ETA
- Firebase / realtime transport
- proximity alerts
- parent submission UI لموقع المنزل

لكن الباك أصبح جاهزًا لأن تُبنى هذه الأشياء لاحقًا فوق نموذج صحيح بدل ترقيعات متعارضة.

## 9. القرار التنفيذي النهائي

من هذه اللحظة:

- المرجع الصحيح للنقل هو هذا النموذج الجديد
- أي فرونت قديم يجب أن يرحل إليه
- أي تطوير جديد يجب أن يبنى عليه مباشرة
- لا نفتح workflow ثالثًا للنقل

الجملة الحاسمة:

**الإدارة تبني البنية وتراجعها، والسائق يشغل اليوميات، والـ trip تبقى تنفيذًا يوميًا لخط ثابت، بينما home location تبقى معلومة مرجعية معتمدة وليست بديلًا عن نقطة الوقوف التشغيلية.**

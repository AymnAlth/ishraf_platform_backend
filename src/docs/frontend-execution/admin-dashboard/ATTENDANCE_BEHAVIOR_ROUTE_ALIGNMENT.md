# مواءمة عقود Attendance وBehavior وAdmin Reporting

هذا الملف هو الرد الرسمي الموحد على بلاغات الفرونت المتعلقة بـ:

- `404` في `attendance` و`behavior`
- عقود student-scoped endpoints في لوحة الإدارة
- التمييز بين:
  - route غير موجود
  - مورد غير موجود
  - empty state
  - forbidden
  - unauthorized

الهدف هو أن يعمل فريقا الفرونت على **backend contract واحد** بدل افتراضات مختلفة.

## الخلاصة

المشكلات التي وصلت من الفرونت تنقسم إلى نوعين:

1. `Attendance / Behavior 404`
   - هذه ليست مشكلة نقص تنفيذ شامل.
   - السبب الأساسي هو طلب paths غير موجودة أصلًا في العقد الحالي.

2. `Admin reporting / student-scoped data`
   - هذه endpoints موجودة فعليًا في الباك.
   - المشكلة هنا ليست غياب route، بل وجود drift توثيقي وبعض افتراضات response shape غير المطابقة للعقد الفعلي.

القرار المعتمد:

- لا نضيف runtime endpoints جديدة الآن لهذه البلاغات
- نعتمد العقد الحالي كما هو
- نطلب من الفرونت التعديل على هذا العقد
- نثبت نفس العقد في `API_REFERENCE`, `OpenAPI`, و`Postman`

## Attendance: السبب الحقيقي لـ 404 والعقد الصحيح

المسارات المعتمدة:

- `POST /api/v1/attendance/sessions`
- `GET /api/v1/attendance/sessions`
- `GET /api/v1/attendance/sessions/:id`
- `PUT /api/v1/attendance/sessions/:id/records`
- `PATCH /api/v1/attendance/records/:attendanceId`

ملاحظات تنفيذية:

- لا يوجد `GET/POST /api/v1/attendance`
- `GET /attendance/sessions` يعيد **جلسات حضور paginated**، وليس list مسطحة لسجلات الطلاب
- تفاصيل roster اليومية تأتي من `GET /attendance/sessions/:id`
- حفظ الحالات يتم عبر `PUT /attendance/sessions/:id/records` بصيغة **full snapshot** للـ roster
- المشرف يقرأ ويحدّث السجلات داخل نطاقه، لكنه لا ينشئ session جديدة

أمور غير منفذة حاليًا، ولا يجوز للفرونت افتراضها:

- منع تسجيل حضور لتاريخ مستقبلي
- إلزام `notes` عندما تكون الحالة `excused`
- root endpoint موحد يعيد flat attendance records

## Behavior: السبب الحقيقي لـ 404 والعقد الصحيح

المسارات المعتمدة:

- `GET /api/v1/behavior/categories`
- `POST /api/v1/behavior/categories`
- `POST /api/v1/behavior/records`
- `GET /api/v1/behavior/records`
- `GET /api/v1/behavior/records/:id`
- `PATCH /api/v1/behavior/records/:id`
- `GET /api/v1/behavior/students/:studentId/records`

ملاحظات تنفيذية:

- لا يوجد `GET/POST /api/v1/behavior`
- `GET /behavior/categories` موجود فعليًا؛ إذا ظهر عليه `404` فافحصوا:
  - `base URL`
  - `api prefix`
  - path النهائي المرسل من الواجهة
- `GET /behavior/students/:studentId/records` موجود، وشكله ثابت كما يلي:
  - `data.student`
  - `data.summary`
  - `data.records`

فروقات عقد مهمة:

- field الصحيح عند إنشاء السجل هو `behaviorCategoryId` وليس `categoryId`
- الحقول المطلوبة فعليًا:
  - `studentId`
  - `behaviorCategoryId`
  - `academicYearId`
  - `semesterId`
  - `behaviorDate`
  - `description?`
  - `severity?`
- لا يوجد حاليًا `actionTaken`
- لا يوجد `behaviorType` filter على `GET /behavior/categories` في v1
- الإشعار الآلي يطلق عند `behaviorType = negative`، وليس عند `high severity` فقط

## Admin reporting وstudent-scoped endpoints: ما هو الموجود فعليًا

هذه الـ endpoints موجودة فعليًا على الباك:

- `GET /api/v1/reporting/dashboards/admin/me`
- `GET /api/v1/reporting/students/:studentId/profile`
- `GET /api/v1/reporting/students/:studentId/reports/attendance-summary`
- `GET /api/v1/reporting/students/:studentId/reports/assessment-summary`
- `GET /api/v1/reporting/students/:studentId/reports/behavior-summary`
- `GET /api/v1/behavior/students/:studentId/records`
- `GET /api/v1/homework/students/:studentId`

المعرف `studentId` هنا هو **نفس** `id` المستخدم في:

- `GET /api/v1/students/:id`

### العقود الصحيحة

#### `GET /reporting/students/:studentId/profile`

يعيد:

- `student`
- `parents`
- `attendanceSummary`
- `assessmentSummary`
- `behaviorSummary`

#### `GET /reporting/students/:studentId/reports/attendance-summary`

يعيد:

- `student`
- `attendanceSummary`

#### `GET /reporting/students/:studentId/reports/assessment-summary`

يعيد:

- `student`
- `assessmentSummary`
- وداخلها `subjects[]`

مهم:

- لا يوجد `items[]` داخل هذا endpoint

#### `GET /reporting/students/:studentId/reports/behavior-summary`

يعيد:

- `student`
- `behaviorSummary`

مهم:

- لا يوجد `records[]` داخل هذا endpoint
- السجل التفصيلي للسلوك يأتي من:
  - `GET /api/v1/behavior/students/:studentId/records`

#### `GET /behavior/students/:studentId/records`

العقد المعتمد هو:

- `data.student`
- `data.summary`
- `data.records`

هذا يطابق **الخيار A** فقط، وليس paginated `items + pagination`.

#### `GET /homework/students/:studentId`

العقد المعتمد هو:

- `data.student`
- `data.items`

هذا endpoint ليس:

- raw array
- ولا `items + pagination`

## الصلاحيات المعتمدة فعليًا

- `GET /reporting/dashboards/admin/me`
  - `admin` فقط
- `GET /reporting/students/:studentId/*`
  - `admin`
  - `teacher`
  - `supervisor`
  - مع scope enforcement للمعلم والمشرف
- `GET /behavior/students/:studentId/records`
  - `admin`
  - `teacher`
  - `supervisor`
- `GET /homework/students/:studentId`
  - `admin`
  - `teacher`
  - `parent` للطالب المرتبط فقط

## دلالات الأخطاء المعتمدة

يجب أن يفسر الفرونت الأخطاء بهذا الترتيب:

- `401`
  - توكن مفقود
  - توكن منتهي أو غير صالح
- `403`
  - المستخدم موثق لكنه غير مخول
  - أو خارج ownership/scope
- `404`
  - route غير موجود فعلًا
  - أو المورد الأساسي نفسه غير موجود مثل:
    - `student not found`
    - `teacher profile not found`
    - `supervisor profile not found`
    - `active academic period not found`
- `200` مع payload zero-safe أو arrays فارغة
  - عندما يكون الطالب موجودًا لكن لا توجد بيانات attendance/assessment/behavior/homework بعد

قواعد مهمة:

- لا يستخدم `404` للتعبير عن empty state
- لا يستخدم `404` لإخفاء مشكلة صلاحيات
- لا يستخدم `403` بدل `401`

## ما يجب أن يصححه الفرونت الآن

### غير صحيح في طلب المطور الأول

- افتراض وجود:
  - `GET/POST /api/v1/attendance`
  - `GET/POST /api/v1/behavior`

### غير دقيق في طلب المطور الثاني

- افتراض أن `assessment-summary` يعيد `items[]`
- افتراض أن `behavior-summary` يعيد `records[]`
- افتراض أن `GET /homework/students/:studentId` raw array أو paginated
- افتراض أن student reporting endpoints خاصة بـ `admin` فقط

## الرد الرسمي الموحد الجاهز للإرسال للفرونت

```md
بعد مراجعة الباك الحالي، تبين أن المشاكل المطروحة تنقسم إلى نوعين:

1. Attendance / Behavior 404
هذا ليس نقص تنفيذ شامل في الباك، بل mismatch بين المسارات التي يطلبها الفرونت والعقد الفعلي المعتمد.
المسارات `/api/v1/attendance` و`/api/v1/behavior` غير موجودة أصلًا في العقد الحالي.

العقد الصحيح هو:

Attendance:
- `POST /api/v1/attendance/sessions`
- `GET /api/v1/attendance/sessions`
- `GET /api/v1/attendance/sessions/:id`
- `PUT /api/v1/attendance/sessions/:id/records`
- `PATCH /api/v1/attendance/records/:attendanceId`

Behavior:
- `GET /api/v1/behavior/categories`
- `POST /api/v1/behavior/records`
- `GET /api/v1/behavior/records`
- `GET /api/v1/behavior/records/:id`
- `PATCH /api/v1/behavior/records/:id`
- `GET /api/v1/behavior/students/:studentId/records`

2. Admin reporting and student-scoped endpoints
هذه الـ endpoints موجودة فعليًا في الباك، لكن يجب اعتماد shape الفعلي كما هو:

- `GET /api/v1/reporting/dashboards/admin/me`
- `GET /api/v1/reporting/students/:studentId/profile`
- `GET /api/v1/reporting/students/:studentId/reports/attendance-summary`
- `GET /api/v1/reporting/students/:studentId/reports/assessment-summary`
- `GET /api/v1/reporting/students/:studentId/reports/behavior-summary`
- `GET /api/v1/behavior/students/:studentId/records`
- `GET /api/v1/homework/students/:studentId`

العقود المهمة:
- `studentId` هنا هو نفس `id` المستخدم في `/students/:id`
- `assessment-summary` يعيد `assessmentSummary.subjects[]` وليس `items[]`
- `behavior-summary` يعيد `behaviorSummary` فقط، وليس `records[]`
- السجل التفصيلي للسلوك يأتي من:
  - `GET /api/v1/behavior/students/:studentId/records`
  - ويعيد:
    - `student`
    - `summary`
    - `records`
- `GET /api/v1/homework/students/:studentId` يعيد:
  - `student`
  - `items`

سياسة الأخطاء المعتمدة:
- `401` عند غياب أو انتهاء التوكن
- `403` عند عدم امتلاك الصلاحية
- `404` فقط عند غياب route فعليًا أو غياب المورد الأساسي مثل الطالب
- `200` مع zero-safe / arrays فارغة عندما يكون المورد موجودًا لكن لا توجد بيانات مرتبطة بعد

الصلاحيات:
- `GET /reporting/dashboards/admin/me` = `admin` فقط
- student reporting endpoints = `admin`, `teacher`, `supervisor` ضمن scope
- `GET /behavior/students/:studentId/records` = `admin`, `teacher`, `supervisor`
- `GET /homework/students/:studentId` = `admin`, `teacher`, `parent` ضمن scope

الخلاصة:
المطلوب الآن هو توحيد تكامل الفرونت على العقد الحالي بدل افتراض مسارات أو response shapes غير موجودة.
وسيتم اعتماد هذا العقد نفسه للفريقين حتى لا يبني كل مشروع frontend على مواصفات مختلفة.
```

## ما الذي لا يزال خارج هذا العقد

هذه ليست gaps توثيقية؛ هذه أمور غير منفذة أصلًا:

- `GET /behavior/categories?behaviorType=...`
- public update/deactivate لفئات السلوك
- `actionTaken` داخل behavior records
- root attendance endpoint موحد
- future attendance date rule
- mandatory `notes` for `excused`

إذا احتاجت الواجهة UX مختلفًا عن هذا العقد، فالطلب الصحيح لاحقًا هو:

- compatibility / convenience endpoints

وليس إعادة تعريف هذه الوحدات من الصفر.

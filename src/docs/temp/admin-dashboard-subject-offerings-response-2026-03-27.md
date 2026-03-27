# Admin Dashboard Backend Response: Subject Offerings

تم اعتماد التحديث من جهة الباك، وأصبح النموذج الرسمي للمشروع كالتالي:

- `subject` = تعريف مادة عام مرتبط بـ `gradeLevel`
- `subject offering` = ربط المادة بفصل دراسي محدد

هذا يعني أن المادة نفسها لم تصبح `semester-scoped` داخل جدول `subjects`.
بدلًا من ذلك، أضيفت طبقة رسمية جديدة باسم `subject-offerings` لتحديد ما إذا كانت المادة متاحة في فصل دراسي معين أم لا.

## القرار النهائي الذي يجب أن يعتمد عليه الفرونت

لا ترسلوا `semesterId` داخل:

- `POST /api/v1/academic-structure/subjects`

هذا المسار بقي كما هو، ويقبل فقط تعريف المادة الأساسية على مستوى `gradeLevel`.

إذا كانت المادة يجب أن تكون متاحة في فصل معين، فيجب بعد إنشاء المادة أو اختيار مادة موجودة مسبقًا تنفيذ:

- `POST /api/v1/academic-structure/subject-offerings`

## الـ Endpoints الجديدة المعتمدة

- `POST /api/v1/academic-structure/subject-offerings`
- `GET /api/v1/academic-structure/subject-offerings`
- `GET /api/v1/academic-structure/subject-offerings/:id`
- `PATCH /api/v1/academic-structure/subject-offerings/:id`

## Workflow الصحيح في لوحة الإدارة

### الحالة 1: مادة جديدة غير موجودة أصلًا

1. أنشئ `subject` عبر:
   - `POST /api/v1/academic-structure/subjects`
2. أنشئ `subject offering` لهذه المادة في الفصل المطلوب عبر:
   - `POST /api/v1/academic-structure/subject-offerings`

### الحالة 2: المادة موجودة مسبقًا لنفس المستوى الدراسي

1. لا تعيد إنشاء `subject`
2. أنشئ فقط `subject offering` جديدة للفصل المطلوب

## شكل الطلبات

### Create Subject

```json
{
  "name": "القرآن",
  "gradeLevelId": "4",
  "code": "QUR-4",
  "isActive": true
}
```

### Create Subject Offering

```json
{
  "subjectId": "10",
  "semesterId": "1",
  "isActive": true
}
```

## قواعد الدومين التي يجب أن تعكسها الواجهة

- يسمح بوجود نفس المادة في أكثر من فصل دراسي
- لا يسمح بتكرار نفس `(subjectId + semesterId)` مرتين
- `subjects.code` يبقى على مستوى المادة نفسها، وليس offering-level
- `PATCH /subject-offerings/:id` في هذه الجولة يدعم:
  - `isActive` فقط

## الأماكن المتأثرة في الفرونت

### 1. شاشة إنشاء المادة

يجب فصل المفهومين:

- إنشاء المادة نفسها
- ربطها بالفصل الدراسي

إذا كانت الشاشة الحالية تبني كيانًا واحدًا باسم:

- `subject + semester`

فيجب تعديلها إلى flow من خطوتين أو flow واحد داخليًا ينفذ طلبين.

### 2. شاشة قائمة المواد

لا يكفي عرض `subjects` فقط إذا كنتم تريدون معرفة التوفر حسب الفصل.

أضيفوا surface تعتمد على:

- `GET /academic-structure/subject-offerings`

مع الفلاتر:

- `academicYearId`
- `semesterId`
- `gradeLevelId`
- `subjectId`
- `isActive`

### 3. شاشة تعديل/تعطيل توفر المادة في فصل معين

إذا كانت لديكم حاجة لتعطيل إتاحة المادة في فصل معيّن، فالتعديل يجب أن يكون على:

- `subject-offering`

وليس على `subject` نفسها.

### 4. شاشات التشغيل اليومي

الآن توجد قاعدة تحقق جديدة في الباك على المسارات التالية:

- `POST /api/v1/attendance/sessions`
- `POST /api/v1/assessments`
- `POST /api/v1/homework`

إذا اختار المستخدم `subjectId` و`semesterId` بدون وجود `subject-offering` نشطة بينهما، فسيعيد الباك:

- `400 Validation Error`
- `Subject is not offered in the selected semester`

هذا يعني أن الفرونت يجب أن يراجع الشاشات التالية:

- create attendance session
- create assessment
- create homework

ويضمن أن اختيار المادة في هذه الشاشات يعتمد على المواد المقدمة فعليًا في الفصل، وليس فقط على قائمة `subjects` العامة.

## التوصية التنفيذية للفرونت

### في لوحة الإدارة

نفذوا هذا الترتيب:

1. راجعوا جميع المواضع التي تعرض أو تنشئ مواد
2. حدّدوا أين ما زلتم تفترضون أن `subject` نفسها مرتبطة بالفصل
3. عدّلوا شاشة إنشاء المادة لتصبح:
   - create subject
   - ثم create subject offering
4. أضيفوا قائمة أو tab أو section لإدارة `subject-offerings`
5. حدّثوا شاشات attendance / assessments / homework بحيث تعتمد على offering-aware selection

## ما الذي لا يجب فعله

- لا ترسلوا `semesterId` داخل `POST /subjects`
- لا تعتبروا `subjects` قائمة نهائية للمواد المتاحة داخل فصل معين
- لا تعطّلوا المادة كلها إذا كان المطلوب فقط إيقافها في فصل واحد
- لا تبنوا workaround محليًا لتجاوز خطأ `Subject is not offered in the selected semester`

## المرجع الرسمي الذي يجب الاعتماد عليه

- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`
- `src/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md`
- `src/docs/frontend-execution/admin-dashboard/SCREENS_AND_TASKS.md`

## الخلاصة

الباك الآن يدعم الاحتياج الأكاديمي الصحيح:

- المادة تبقى تعريفًا عامًا
- والتوفر داخل فصل معين يتم عبر `subject-offerings`

المطلوب من الفرونت هو تحديث workflow والشاشات المرتبطة بالمواد والتشغيل الأكاديمي على هذا الأساس، بدون محاولة تغيير معنى `subjects` نفسها أو الالتفاف على العقد الحالي.

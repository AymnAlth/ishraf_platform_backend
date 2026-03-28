# Admin Dashboard Backend Response: Teacher / Supervisor UserId Resolver

## Decision

تم اعتماد التعديل من جهة الباك، لكن **بدون إضافة endpoint جديدة** وبدون كشف `teacherProfileId` أو `supervisorProfileId` داخل `/users`.

القرار النهائي:
- `teacherId` و`supervisorId` في المسارات الإدارية والتشغيلية المتأثرة يقبلان الآن:
  - `users.id` القادم من `GET /api/v1/users?role=teacher|supervisor`
  - أو `teachers.id` / `supervisors.id` القديمة للتوافق الخلفي

المسار الرسمي المطلوب من الفرونت من الآن:
- اختاروا الحساب من `/users`
- أرسلوا `selectedUser.id` مباشرة
- لا تبنوا أي resolver أو mapping محلي إلى profile ids

## What Was Fixed In Backend

تمت إضافة internal resolution موحدة في الباك بحيث:
- إذا أُرسل `teacherId` كـ `teacher user id`
  - يحوله الباك داخليًا إلى `teachers.id`
- إذا أُرسل `supervisorId` كـ `supervisor user id`
  - يحوله الباك داخليًا إلى `supervisors.id`
- إذا أُرسلت profile ids القديمة
  - ما زالت تعمل كما هي

لم نضف:
- `GET /drivers`-style resolver جديد
- `GET /users/:id/teacher-profile`
- `GET /users/:id/supervisor-profile`
- ولا أي fields إضافية في `/users`

## Affected Endpoints

### Direct assignment endpoints

- `POST /api/v1/academic-structure/teacher-assignments`
- `POST /api/v1/academic-structure/supervisor-assignments`

### Operational create endpoints

- `POST /api/v1/attendance/sessions`
- `POST /api/v1/assessments`
- `POST /api/v1/behavior/records`
- `POST /api/v1/homework`

### Operational list filters

- `GET /api/v1/attendance/sessions`
  - `teacherId`
- `GET /api/v1/assessments`
  - `teacherId`
- `GET /api/v1/behavior/records`
  - `teacherId`
  - `supervisorId`
- `GET /api/v1/homework`
  - `teacherId`

## Required Frontend Changes

### 1. Teacher assignment form

- عند اختيار المعلم من `/users?role=teacher`
- أرسلوا:
  - `teacherId = selectedUser.id`

### 2. Supervisor assignment form

- عند اختيار المشرف من `/users?role=supervisor`
- أرسلوا:
  - `supervisorId = selectedUser.id`

### 3. Attendance create flow

- إذا كان المستخدم `admin` ويرسل `teacherId`
- أرسلوا `teacher users.id`
- لا تبحثوا عن `teachers.id`

### 4. Assessments create flow

- إذا كان المستخدم `admin` ويرسل `teacherId`
- أرسلوا `teacher users.id`

### 5. Behavior create flow

- عند اختيار actor من نوع `teacher` أو `supervisor`
- أرسلوا `users.id` للحساب المختار
- لا تبنوا أي تحويل داخلي إلى profile ids

### 6. Homework create flow

- إذا كان المستخدم `admin` ويرسل `teacherId`
- أرسلوا `teacher users.id`

### 7. Filters / query params

في هذه الشاشات:
- attendance list
- assessments list
- behavior records list
- homework list

إذا كنتم تمررون:
- `teacherId`
- `supervisorId`

فالمرجع الرسمي الآن هو:
- `users.id`

### 8. Shared client code

احذفوا أو أوقفوا أي logic من هذا النوع:
- `userId -> teacherProfileId`
- `userId -> supervisorProfileId`
- أي blocking احترازي سببه غياب resolver رسمي
- أي fallback يعتمد على assignment graph لاستخراج profile ids

## Validation Behavior

- إذا أُرسل `users.id` لا يعود إلى `teacher` فعلي:
  - `404 Teacher not found`
- إذا أُرسل `users.id` لا يعود إلى `supervisor` فعلي:
  - `404 Supervisor not found`

وفي الحالة النادرة جدًا إذا طابقت نفس القيمة:
- `users.id` لشخص
- و`profile id` لشخص مختلف

فلن يختار الباك أحدهما بصمت، بل سيعيد:
- `400 Validation Error`
- `TEACHER_ID_AMBIGUOUS`
أو
- `SUPERVISOR_ID_AMBIGUOUS`

## What Must Change In Frontend Behavior

اعتمدوا هذا النمط النهائي:
- account picker from `/users`
- send `selectedUser.id`
- do not resolve profile ids manually

هذا ينطبق الآن بنفس العائلة التي اعتمدناها سابقًا في:
- `parentId`
- `driverId`

## Official References

اعتمدوا فقط هذه الملفات:
- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`
- `src/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md`

ولا تعتمدوا على أي فرضية قديمة تقول إن:
- `teacherId` يجب أن يكون `teachers.id` فقط
- أو `supervisorId` يجب أن يكون `supervisors.id` فقط

## Final Frontend Rule

في لوحة الإدارة:
- اختاروا المعلم أو المشرف من `/users`
- أرسلوا `users.id` فقط
- والباك سيتكفل بالـ resolution الداخلي

# Backend Response: Admin Preview / Monitoring Surfaces

## Decision

بعد مراجعة الطلب، تم اعتماد توسعة Backend رسمية داخل `reporting` بدل أي resolver جزئي أو تجميع تقريبي من جهة الفرونت.

القرار النهائي:
- إضافة surfaces جديدة `admin-only`
- كلها `read-only`
- بدون impersonation
- وتعتمد على `users.id` فقط في المسارات الجديدة

هذا التحديث يغطي:
- `parent-first preview`
- `teacher preview parity`
- `supervisor preview parity`

## Final Endpoints

### Parent Preview

- `GET /api/v1/reporting/admin-preview/parents/:parentUserId/dashboard`
- `GET /api/v1/reporting/admin-preview/parents/:parentUserId/students/:studentId/profile`
- `GET /api/v1/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary`
- `GET /api/v1/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary`
- `GET /api/v1/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary`
- `GET /api/v1/reporting/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status`

### Teacher Preview

- `GET /api/v1/reporting/admin-preview/teachers/:teacherUserId/dashboard`

### Supervisor Preview

- `GET /api/v1/reporting/admin-preview/supervisors/:supervisorUserId/dashboard`

## Identifier Contract

في هذه المسارات الجديدة:
- `parentUserId`
- `teacherUserId`
- `supervisorUserId`

كلها تعني:
- `users.id`

مهم:
- هذه المسارات لا تقبل profile ids
- لا تستخدموا:
  - `parents.id`
  - `teachers.id`
  - `supervisors.id`

## Response Contract

العقد المعتمد هو parity مع surfaces الحالية المملوكة للأدوار:

- parent dashboard preview
  - نفس shape الخاصة بـ:
    - `GET /api/v1/reporting/dashboards/parent/me`

- parent child preview
  - نفس shapes الخاصة بـ:
    - `.../profile`
    - `.../reports/attendance-summary`
    - `.../reports/assessment-summary`
    - `.../reports/behavior-summary`
    - `.../transport/live-status`

- teacher preview dashboard
  - نفس shape الخاصة بـ:
    - `GET /api/v1/reporting/dashboards/teacher/me`

- supervisor preview dashboard
  - نفس shape الخاصة بـ:
    - `GET /api/v1/reporting/dashboards/supervisor/me`

## Access and Validation Rules

- هذه المسارات `admin-only`
- أي مستخدم غير `admin` يحصل على:
  - `403`

- إذا كان `parentUserId` غير موجود أو ليس role=`parent` أو لا يملك parent profile:
  - `404 Parent not found`

- إذا كان `teacherUserId` غير موجود أو ليس role=`teacher` أو لا يملك teacher profile:
  - `404 Teacher not found`

- إذا كان `supervisorUserId` غير موجود أو ليس role=`supervisor` أو لا يملك supervisor profile:
  - `404 Supervisor not found`

- إذا كان `studentId` غير مرتبط فعليًا بذلك parent:
  - `404 Student not linked to parent`

- إذا كان الكيان صحيحًا لكن لا توجد بيانات تشغيلية بعد:
  - `200`
  - مع payload zero-safe / empty-safe حسب surface نفسها

## What Frontend Must Change

يجب أن تتحول شاشة `/monitoring` إلى هذه surfaces الرسمية بدل أي تجميع تقريبي محلي.

الأماكن المتأثرة في لوحة الإدارة:

1. role switcher داخل monitoring
   - parent preview يجب أن يبدأ من:
     - `GET /reporting/admin-preview/parents/:parentUserId/dashboard`
   - teacher preview يجب أن يستخدم:
     - `GET /reporting/admin-preview/teachers/:teacherUserId/dashboard`
   - supervisor preview يجب أن يستخدم:
     - `GET /reporting/admin-preview/supervisors/:supervisorUserId/dashboard`

2. parent-first child selector
   - لا تبنوا linked students محليًا من endpoints متفرقة
   - اعتمدوا dashboard preview الخاص بالـ parent كمصدر الحقيقة

3. parent child preview loaders
   - profile
   - attendance summary
   - assessment summary
   - behavior summary
   - transport live status
   يجب أن تُحمّل من مسارات `admin-preview/parents/...`

4. teacher preview loader
   - احذفوا أي local aggregation من:
     - assignments
     - attendance
     - assessments
     - homework
     - behavior
   - واستبدلوه بـ teacher preview dashboard الرسمي

5. supervisor preview loader
   - احذفوا أي local aggregation
   - واعتمدوا supervisor preview dashboard الرسمي

6. أي عقود محلية تقريبية داخل monitoring
   - خصوصًا أي منطق داخل:
     - `AdminPreviewPage.tsx`
     - `PreviewSurfaces.tsx`
     - `admin-preview-contract.ts`
   - يجب أن يتحول من parity simulated locally إلى parity من الباك مباشرة

## What Must Not Change in Frontend

- لا تضيفوا impersonation
- لا تستخدموا profile ids في هذه المسارات
- لا تعيدوا اشتقاق dashboards من endpoints متعددة إذا كانت surface الرسمية الجديدة متوفرة
- لا تعتمدوا على child preview بدون التحقق من parent-selected context

## Official Documentation Updated

تم تحديث:
- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`
- `src/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md`

## Final Backend Position

تم اعتماد الطلب كتوسعة رسمية صحيحة في الباك.

المسار النهائي المطلوب من الفرونت:
- استخدام admin preview endpoints الجديدة فقط داخل monitoring
- وإيقاف أي implementation تقريبي محلي لهذه المعاينات متى أصبح الدمج جاهزًا

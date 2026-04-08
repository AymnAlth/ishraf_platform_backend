# Common Frontend Rules

هذه الوثيقة هي القواعد المشتركة التي يجب أن يلتزم بها أي مستهلك للباك الحالي: `admin-dashboard`, `teacher-app`, `supervisor-app`, `parent-app`, `driver-app`.

## 1. المصدر المعياري للعقود

- الكود في `src/modules/*/{routes,controller,service,dto,validator,types}` هو المصدر الوحيد للحقيقة.
- `src/docs/openapi/*.json` و`src/docs/postman/*.json` هما الطبقة المعيارية المولدة من نفس الحقيقة.
- ملفات `frontend-execution/*` هي handoff تشغيلية تشرح المنطق التنفيذي، وليست مصدرًا بديلًا للعقد.

## 2. Envelope الاستجابات

كل الاستجابات تستخدم envelope ثابتة:

- نجاح:
  - `success: true`
  - `message: string`
  - `data: object | array | null`
- خطأ:
  - `success: false`
  - `message: string`
  - `errors: Array<{ field?: string | null; code?: string | null; message: string }>`

الواجهة يجب أن تبني تعاملها على envelope نفسها، لا على payload خام مفترضة.

## 3. Policy المعرفات

- كل المعرفات في JSON تظهر كسلاسل رقمية مثل `"1"`.
- لا تعتمد الواجهة على UUID assumptions.
- في surfaces الحديثة المرتبطة بالمعلمين والمشرفين والسائقين وأولياء الأمور:
  - المرجع المفضل هو `users.id`
  - وليس profile ids القديمة
- بعض endpoints ما زالت تقبل legacy profile ids للتوافق الخلفي، لكن الواجهة الجديدة يجب أن ترسل `users.id` متى كان ذلك موثقًا.

## 4. Active Academic Context

`Active Academic Context` هو الزوج:

- `active academic year`
- `active semester`

ويحكم السطوح التشغيلية اليومية التالية:

- attendance
- assessments
- behavior
- homework
- reporting اليومية

### 4.1 كيف يتصرف الباك

- إذا لم ترسل الواجهة `academicYearId` و`semesterId` في surface تشغيلية تدعم السياق النشط:
  - الباك يحل القيم تلقائيًا من `GET /academic-structure/context/active`
- إذا أرسلت الواجهة واحدة أو كلتا القيمتين:
  - يجب أن تطابقا السياق النشط
  - وإلا يفشل الطلب
- إذا لم يكن هناك `active academic year + active semester` مضبوطين أصلًا:
  - يفشل الطلب تشغيليًا بدل أن يعمل على سنة/فصل عشوائي

### 4.2 أكواد الأخطاء المرتبطة

| Code | Status | المعنى التشغيلي |
| --- | --- | --- |
| `ACADEMIC_CONTEXT_NOT_CONFIGURED` | `409` | لا توجد سنة وفصل نشطان، لذلك surface التشغيل اليومي غير متاحة بعد |
| `ACTIVE_ACADEMIC_YEAR_ONLY` | `400` | `academicYearId` المرسلة لا تطابق السنة النشطة |
| `ACTIVE_SEMESTER_ONLY` | `400` | `semesterId` المرسلة لا تطابق الفصل النشط |

### 4.3 ماذا يجب أن يفعل الفرونت

- عند `409 ACADEMIC_CONTEXT_NOT_CONFIGURED`:
  - اعرض `Unavailable / Setup required`
  - لا تعرض empty state عادية
- عند `ACTIVE_ACADEMIC_YEAR_ONLY` أو `ACTIVE_SEMESTER_ONLY`:
  - اعتبرها mismatch في state المحلية
  - أعد تحميل active context
  - لا تحاول force override من الفرونت

## 5. Enums & Constants

### 5.1 Attendance

| Enum | Allowed values | الاستخدام |
| --- | --- | --- |
| `ATTENDANCE_STATUS` | `present`, `absent`, `late`, `excused` | حالات سجل الحضور |

### 5.2 Homework

| Enum | Allowed values | الاستخدام |
| --- | --- | --- |
| `HOMEWORK_SUBMISSION_STATUS` | `submitted`, `not_submitted`, `late` | حالات تسليم الواجب على مستوى الطالب |

### 5.3 Transport

| Enum | Allowed values | الاستخدام |
| --- | --- | --- |
| `BUS_STATUS` | `active`, `inactive`, `maintenance` | حالة الحافلة |
| `TRIP_TYPE` | `pickup`, `dropoff` | نوع الرحلة |
| `TRIP_STATUS` | `scheduled`, `started`, `ended`, `completed`, `cancelled` | حالة الرحلة |
| `TRIP_STUDENT_EVENT_TYPE` | `boarded`, `dropped_off`, `absent` | نوع حدث الطالب داخل الرحلة |
| `HOME_LOCATION_STATUS` | `pending`, `approved`, `rejected` | حالة موقع المنزل |

## 6. Domain Error Handling

الفرونت يجب أن يميز بين أنواع الأخطاء، لا أن يعاملها كلها كرسالة نصية واحدة.

| HTTP status | المعنى |
| --- | --- |
| `400` | Validation أو domain rule failure مع `errors[]` قابلة للعرض أو الربط بالحقول |
| `401` | الجلسة غير موجودة أو منتهية |
| `403` | المستخدم مسجل، لكن الدور أو الملكية لا يسمحان بالوصول |
| `404` | المورد غير موجود أو غير مرئي للمستخدم الحالي |
| `409` | الحالة الحالية للنظام تمنع التنفيذ الآن، مثل غياب active context |

### 6.1 400 validation/domain envelope

أغلب business-rule errors تأتي ضمن:

- `message`
- `errors[].field`
- `errors[].code`
- `errors[].message`

الواجهة يجب أن تعتمد `errors[].code` للتمييز البرمجي متى كان ذلك متاحًا.

## 7. Role Enforcement

- لا تعتمد الواجهة على الإخفاء البصري فقط.
- `403` جزء طبيعي من العقد عندما يحاول دور الوصول إلى surface غير مخصصة له.
- بعض الحالات domain-level تبدو للمستخدم كأنها forbidden بينما هي فعليًا ownership denial. اعرضها بصيغة "غير مسموح لك الوصول لهذا المورد".

## 8. No Frontend Workarounds

ممنوع تعويض gaps الهيكلية عبر:

- loops كتابية متعددة
- fake rollback
- local conflict resolution غير authoritative
- محاولة حل العلاقات الحساسة خارج الخادم

الأمثلة الواضحة:

- `communication/messages/bulk`
- `communication/notifications/bulk`
- `admin-imports/school-onboarding/*`

## 9. Root vs API routes

- `/health` و`/health/ready` خارج `/api/v1`
- بقية المسارات تحت `/api/v1`

## 10. Empty vs Unavailable

| الحالة | كيف تفسرها الواجهة |
| --- | --- |
| `200` مع بيانات فارغة | empty state طبيعية |
| `401/403` | auth أو role/ownership issue |
| `404` | المورد غير موجود أو غير مرئي |
| `409` | surface غير متاحة الآن بسبب حالة domain |

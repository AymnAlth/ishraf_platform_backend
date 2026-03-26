# إضافة Endpoints

هذا الملف يشرح كيف تطلب إضافة `Endpoint` جديد داخل مشروع `ishraf_platform_backend` بشكل صحيح، وما هو تسلسل العمل الكامل منذ لحظة تقديم الطلب وحتى يصبح الـ `Endpoint` جاهزًا ليستخدمه مبرمج الفرونت إند على البيئة المستضافة.

الهدف من هذا الملف:

- تقليل الطلبات الغامضة أو الناقصة
- تسريع التنفيذ داخل الباك إند
- منع بناء `Endpoint` على افتراضات غير محسومة
- توحيد ما يجب تحديثه بعد كل إضافة جديدة
- توضيح متى يصبح الـ `Endpoint` جاهزًا فعليًا للفرونت

## القاعدة الأساسية

طلب مثل:

- "أضف لي endpoint جديد"

غير كافٍ.

الطلب الصحيح يجب أن يوضح:

- لماذا نحتاج الـ `Endpoint`
- من سيستخدمه
- ماذا يدخل إليه
- ماذا يجب أن يعيد
- من يملك الصلاحية
- ما هي قواعد العمل المرتبطة به

بدون هذا، يصبح التنفيذ ترقيعًا أو يبنى على افتراضات قد تكسر النظام لاحقًا.

## مثال عام وقابل لإعادة الاستخدام

استخدم هذا المثال كما هو، ثم عدّل القيم حسب الحاجة:

```text
أريد إضافة Endpoint جديد داخل مشروع ishraf_platform_backend.

اسم/وصف الـ Endpoint:
- [اذكر الاسم الوظيفي المختصر]

الهدف:
- [اشرح ما الذي نريد تحقيقه من هذا الـ Endpoint]

المستخدم أو التطبيق الذي سيستخدمه:
- [admin / teacher / parent / supervisor / driver / frontend admin dashboard / mobile app]

الموديول المتوقع:
- [auth / users / students / attendance / assessments / behavior / transport / communication / reporting / homework / غير محسوم]

العقد المطلوب:
- Method: [GET / POST / PATCH / PUT / DELETE]
- Path: [/api/v1/...]
- Query params: [إن وجدت]
- Path params: [إن وجدت]
- Body: [الحقول المطلوبة والاختيارية]
- Response: [ما الذي يجب أن يرجع]

الصلاحيات:
- من يملك الوصول؟
- هل يوجد ownership rule؟
- هل يحتاج admin فقط أم دورًا آخر أيضًا؟

قواعد العمل:
- [اذكر أي validation أو business rules أو حالات رفض أو conflicts متوقعة]

تأثيرات جانبية:
- [هل يجب إنشاء Notification؟ هل يجب تحديث حالة؟ هل يجب تشغيل Automation؟]

البيانات المرتبطة:
- [هل يعتمد على جداول/Views موجودة؟]
- [هل يحتاج migration جديدة؟]

التوثيق والاختبار:
- [هل يجب تحديث OpenAPI؟ Postman؟ API_REFERENCE؟ دليل الفرونت؟]

بعد التنفيذ، اشرح لي بالتفصيل الخطوات المتعلقة بالمشروع محليًا، والرفع إلى GitHub، والاستضافات المعتمدة، وقاعدة البيانات، والباك إند، وكيف أوجّه مبرمج الفرونت إند لاستخدام الـ Endpoint بعد جاهزيته.
```

## ماذا يجب أن يتضمن الطلب حتى يكون واضحًا وكافيًا

## 1. الهدف الوظيفي

أجب بوضوح:

- ما المشكلة التي نحلها؟
- ما الشاشة أو الـ flow الذي يحتاج هذا الـ `Endpoint`؟
- لماذا لا تكفي الـ endpoints الحالية؟

مثال جيد:

- "أحتاج `Endpoint` يعرض واجبات طالب محدد داخل تطبيق ولي الأمر."

مثال ضعيف:

- "أريد endpoint للواجبات."

## 2. من هو المستهلك الحقيقي

حدد من سيستخدمه:

- `admin`
- `teacher`
- `parent`
- `supervisor`
- `driver`
- لوحة الإدارة
- تطبيق معين

هذا مهم لأن المشروع يعتمد على:

- `role-based access`
- `ownership enforcement`
- `profile resolution`

## 3. شكل الـ Endpoint المطلوب

يجب توضيح:

- `Method`
- `Path`
- path params
- query params
- body
- response shape

إذا لم تكن متأكدًا من الشكل النهائي، اكتب:

- "الشكل غير محسوم، واقترح الشكل الأنسب بما ينسجم مع المشروع الحالي"

هذا أفضل من تركه غامضًا بالكامل.

## 4. الصلاحيات والـ ownership

يجب أن توضح:

- من يستطيع استدعاء الـ `Endpoint`
- هل الوصول عام داخل الدور أم مقيد بالملكية
- هل يجب أن يمر عبر parent-owned / teacher-owned / driver-owned scope

أمثلة:

- `parent` يرى بيانات أبنائه فقط
- `teacher` يعمل ضمن الصفوف/المواد المسندة له فقط
- `driver` يعمل على رحلاته فقط

## 5. قواعد العمل

اذكر ما أمكن من القواعد مثل:

- حقول مطلوبة
- uniqueness
- validation
- status transitions
- conflicts
- triggers أو automation متوقعة

كلما كانت القواعد أوضح، كان التنفيذ أقرب للصحيح من أول مرة.

## 6. مصدر البيانات

حدد إن كان الـ `Endpoint`:

- يعتمد على جداول موجودة فقط
- يعتمد على `Views`
- يحتاج queries تجميعية
- يحتاج migration جديدة
- يحتاج جداول أو قيود أو triggers إضافية

## 7. ما إذا كان يحتاج تأثيرات جانبية

في هذا المشروع بعض العمليات لا تنتهي عند حفظ البيانات فقط.

أحيانًا يجب أن ينتج عنها:

- `Notification`
- تحديث حالة
- تشغيل `AutomationService`
- تحديث reporting surfaces

إذا كان هذا متوقعًا، اذكره صراحة.

## 8. ما الذي يجب تحديثه بعد التنفيذ

إذا أردت `Endpoint` مكتملًا فعلًا، فالطلب يجب أن يتوقع تحديث:

- الكود
- الاختبارات
- `API_REFERENCE.md`
- `OpenAPI`
- `Postman`
- أدلة الفرونت إن كان الـ `Endpoint` سيستخدم مباشرة هناك

## آلية العمل بعد استلام الطلب

هذه هي السلسلة الصحيحة داخل المشروع من لحظة وصول الطلب حتى يصبح الـ `Endpoint` جاهزًا.

## المرحلة 1: فهم الطلب ومواءمته مع المشروع

في هذه المرحلة يتم:

- قراءة الطلب
- تحديد الموديول الصحيح
- مقارنة المطلوب مع الـ endpoints الحالية
- التأكد أن الإضافة لا تكرر endpoint موجود أصلًا
- تحديد إن كان المطلوب `CRUD` بسيطًا أو `reporting/aggregation` أو `automation-aware`
- حسم الصلاحيات والـ ownership

الهدف هنا هو منع بناء شيء صحيح تقنيًا لكنه خاطئ معماريًا.

## المرحلة 2: العمل محليًا

العمل يبدأ محليًا دائمًا.

عادة يشمل:

- فحص module الحالي
- فحص `routes`, `policy`, `service`, `repository`, `dto`, `validator`, `mapper`, `types`
- التحقق من توافق الإضافة مع:
  - `pagination`
  - `query parsing`
  - `ownership helpers`
  - `profile resolution`
  - `error mapping`

إذا احتاج الـ `Endpoint` قاعدة بيانات جديدة أو تعديلًا على schema:

- تُنشأ migration جديدة
- تُختبر migration محليًا
- تُراجع القيود والـ indexes والـ views عند الحاجة

إذا لم يحتج schema change:

- يُنفذ على مستوى الباك الحالي فقط

## المرحلة 3: التعامل مع قاعدة البيانات

يوجد في المشروع أكثر من سياق لقاعدة البيانات:

### 1. Local development database

هذه للتطوير المحلي فقط عبر `.env`.

### 2. Test database

هذه مخصصة للاختبارات عبر `.env.test`.

### 3. Hosted staging database

هذه على `Neon`.

مهم:

- `DATABASE_URL` مخصص للتشغيل
- `DATABASE_URL_MIGRATIONS` مخصص للمهاجرات عندما يكون متوفرًا

إذا كان الـ `Endpoint` يحتاج تغيير schema:

1. تنشأ migration محليًا
2. تختبر محليًا
3. تمر الاختبارات
4. تطبق migration على قاعدة `Neon` الصحيحة
5. ثم يرفع الكود إلى GitHub

لا تعتمد على إعادة نشر Render وحدها لتطبيق schema changes.

## المرحلة 4: تنفيذ الباك إند

عادة يشمل هذا:

- route جديدة أو توسيع route موجودة
- policy صحيحة
- validator صحيح
- service logic
- repository queries
- mapper/response shape
- error handling
- ownership enforcement
- automation إن كانت مطلوبة

إذا كان المطلوب surface front-facing فعلًا، فهذا يعني أن الـ endpoint يجب أن يكون:

- منسجمًا مع العقود الحالية
- واضحًا من جهة success/error shape
- جاهزًا للاستخدام وليس مجرد دالة داخلية

## المرحلة 5: الاختبارات

لا يعتبر الـ `Endpoint` مكتملًا بدون اختبار مناسب.

الحد الأدنى عادة:

- unit tests إذا كان فيه منطق حساس
- integration tests إذا كان endpoint حقيقيًا أو يمس auth/ownership/database

وقد يشمل ذلك:

- validation tests
- role/ownership tests
- success path
- conflict path
- empty state behavior
- automation side effects إن وجدت

## المرحلة 6: التحديث التوثيقي

إذا أصبح الـ `Endpoint` جزءًا من العقد العام، فيجب تحديث:

- `src/docs/API_REFERENCE.md`
- `OpenAPI`
- `Postman`
- أي دليل تنفيذي للفرونت يتأثر به

في هذا المشروع تحديدًا، قد نحتاج أيضًا إلى تحديث:

- `src/docs/BACKEND_WAVE1_STATUS.md`
- `src/docs/frontend-execution/*`

إذا كانت الإضافة تفتح شاشة جديدة أو تغير flow قائمًا.

## المرحلة 7: التحقق المحلي

قبل الرفع يجب أن يمر الحد الأدنى من التحقق:

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration` عندما يكون الـ `Endpoint` يمس المسارات التكاملية أو قاعدة البيانات فعليًا

ثم يجرى:

- smoke check يدوي أو عبر Postman/OpenAPI إن لزم

## المرحلة 8: الرفع إلى GitHub

بعد نجاح التنفيذ محليًا:

1. يراجع التغيير
2. يُعمل `git add`
3. يُعمل `git commit`
4. يُرفع إلى GitHub

في المشروع الحالي:

- GitHub هو المصدر الذي تتزامن منه الاستضافة
- أي تعديل جديد يجب أن يصل إلى `main` حتى يلتقطه `Render`

## المرحلة 9: التعامل مع الاستضافات المعتمدة

الاستضافات المعتمدة للمشروع حاليًا:

- `GitHub` للمصدر والمزامنة
- `Render` لاستضافة الباك
- `Neon` لقاعدة البيانات

### Render

- يستقبل التحديثات من GitHub
- يعيد النشر تلقائيًا بعد `push`
- health path المستخدم: `/health/ready`

### Neon

- هو مصدر قاعدة البيانات المستضافة
- يجب تطبيق migrations الصحيحة عليه إذا تغيرت schema

### Local env vs hosted env

يجب التمييز دائمًا بين:

- `.env` المحلي
- `.env.test`
- إعدادات `Render`
- إعدادات `Neon`

ولا يجوز خلطها أثناء التنفيذ أو الاختبار.

## المرحلة 10: متى يصبح الـ Endpoint جاهزًا للفرونت

لا يعتبر الـ `Endpoint` جاهزًا للفرونت إلا عندما تكتمل هذه العناصر كلها:

- الكود مكتمل
- الصلاحيات صحيحة
- قاعدة البيانات متوافقة
- الاختبارات ناجحة
- التوثيق محدث
- `OpenAPI` و`Postman` محدثان إذا كان الـ endpoint public
- التغيير مرفوع إلى GitHub
- الاستضافة محدثة
- الـ endpoint متاح على رابط `Render`

## ماذا يجب أن يستلمه مبرمج الفرونت بعد اكتمال الـ Endpoint

بعد اكتمال أي `Endpoint` جديد يجب توجيه مبرمج الفرونت بوضوح إلى:

- `Method + Path`
- الدور المسموح له
- هل يحتاج `Bearer token`
- request body / query params / path params
- response shape
- errors الشائعة
- ownership notes
- هل يوجد pagination
- هل يوجد side effects مثل notifications أو status changes
- هل يحتاج endpoint آخر قبله في نفس flow
- هل أصبح متاحًا على الاستضافة أم ما زال محليًا فقط

## تسلسل التوجيه الصحيح للفرونت إند

عند تسليم الـ `Endpoint` للفرونت:

1. أعطه الـ path الكامل أو المرجع في `API_REFERENCE/OpenAPI`
2. وضح role والقيود
3. وضح أي متغيرات مطلوبة في Postman أو البيئة
4. وضح هل التغيير موجود على:
   - local فقط
   - GitHub فقط
   - staging hosted backend
5. إذا كان يحتاج بيانات قاعدة معينة، وضح ذلك
6. إن كان يحتاج migration مطبقة على `Neon`، أكد أنها طُبقت

## أخطاء شائعة يجب تجنبها

- طلب endpoint بدون تحديد من سيستخدمه
- طلب endpoint بدون تحديد الصلاحيات
- طلب endpoint دون تحديد هل يحتاج ownership
- طلب endpoint دون توضيح شكل الاستجابة المطلوب
- افتراض أن الـ endpoint جاهز للفرونت قبل تحديث docs وOpenAPI/Postman
- رفع الكود إلى GitHub قبل تطبيق migration اللازمة على قاعدة الاستضافة
- اختبار endpoint محليًا فقط ثم اعتباره جاهزًا على `Render`

## Checklist مختصر قبل إرسال طلب إضافة Endpoint

- هل شرحت الهدف؟
- هل حددت التطبيق أو الدور الذي سيستخدمه؟
- هل ذكرت `Method` و`Path`؟
- هل ذكرت body/query/path params؟
- هل حددت الصلاحيات؟
- هل حددت ownership إن وجد؟
- هل ذكرت قواعد العمل؟
- هل ذكرت إن كان يحتاج migration؟
- هل ذكرت إن كان يحتاج توثيق واختبارات؟
- هل طلبت صراحة شرح خطوات local/GitHub/database/backend/hosting/frontend handoff؟

إذا كانت الإجابة "نعم" على هذه الأسئلة، فغالبًا سيكون الطلب جاهزًا للتنفيذ بشكل صحيح.

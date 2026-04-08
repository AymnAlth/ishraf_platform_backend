# خطة التوسعة المؤسسية المترابطة للباك إند

تاريخ الإنشاء: `2026-04-02`

هذا الملف هو المرجع التنفيذي الرسمي للمرحلة التالية بعد اكتمال `Wave 1`.

الهدف ليس إضافة ست قدرات بشكل منفصل، بل بناء طبقة توسعة مؤسسية متماسكة فوق البنية الحالية بحيث يبقى النظام:

- `modular monolith`
- `contract-driven`
- `security-first`
- قابلًا للتوسع دون فتح مسارات متوازية أو workarounds من الفرونت

القدرات التي سنبنيها كلها دون إسقاط أي عنصر:

1. `Firebase / FCM / realtime transport`
2. `Google Maps / ETA`
3. `AI analytics`
4. `2FA`
5. `advanced system settings`
6. `CSV import` إذا عاد مطلوبًا تشغيليًا

## 1. القرار المعماري الحاكم

سننفذ كل هذه القدرات داخل نفس البنية الحالية، وليس عبر split جديد أو microservices.

هذا يعني:

- تبقى الطبقة التنفيذية: `routes -> controller -> service -> repository -> SQL/DB`
- تبقى `OpenAPI` و`Postman` و`API_REFERENCE.md` جزءًا من التسليم في كل خطوة
- تبقى جميع الاستجابات ضمن envelope الموحدة
- تبقى جميع المعرفات العامة `string`
- لا نضيف أي feature جديدة عبر منطق مباشر في الفرونت إذا كان مكانها المؤسسي الصحيح في الباك

## 2. الصورة النهائية المستهدفة للنظام

بعد اكتمال هذه الخطة يصبح النظام مكوّنًا من الطبقات التالية:

- `auth` هو بوابة الهوية والمصادقة و`2FA`
- `system-settings` هو control plane المركزي للسياسات التشغيلية والخصائص القابلة للضبط
- `communication` هو طبقة الإشعارات والرسائل وتسليم `FCM`
- `transport` هو مصدر الحقيقة للنقل والرحلات والموقع والأحداث التشغيلية
- `reporting` يبقى طبقة الحقائق والقراءات التشغيلية
- `analytics` يصبح طبقة الاستنتاجات والرؤى التنبؤية فوق البيانات الواقعية
- `admin-imports` يبقى محرك الاستيراد الرسمي، مع توسيع واجهة الإدخال عند الحاجة إلى `CSV`
- `automation` يصبح مشغل الأعمال الخلفية والـ retries والـ outbox processors
- `src/integrations/*` تصبح طبقة عوازل مزودي الخدمات الخارجية بدل ربط كل موديول مباشرة مع كل provider

## 3. ترتيب التنفيذ الفعلي

رغم أن القائمة التجارية تحتوي ستة عناصر، فإن التنفيذ الهندسي الصحيح سيكون بهذا الترتيب حتى لا نكرر العمل:

1. `advanced system settings` + البنية المشتركة للتكاملات
2. `Firebase / FCM / realtime transport`
3. `Google Maps / ETA`
4. `2FA`
5. `AI analytics`
6. `CSV import` فوق محرك `admin-imports` الحالي

السبب:

- `system settings` هي طبقة التحكم المشتركة لكل feature لاحقة
- `FCM` و`Maps` و`AI` تحتاج provider configuration وfeature flags وhealth state موحدة
- `2FA` تحتاج سياسات enforcement قابلة للضبط من الإدارة
- `CSV import` يجب أن يُبنى فوق المحرك الحالي لا بجانبه

## 4. العمود الفقري المشترك قبل بقية القدرات

هذه ليست feature منفصلة عن القائمة، بل جزء من تنفيذ `advanced system settings` لأنها ستخدم كل ما بعدها.

### 4.1 موديول جديد: `system-settings`

سنضيف موديول runtime جديد:

- `src/modules/system-settings/controller`
- `src/modules/system-settings/service`
- `src/modules/system-settings/repository`
- `src/modules/system-settings/routes`
- `src/modules/system-settings/validator`
- `src/modules/system-settings/types`

وسيُسجل في:

- `src/app/module-registry.ts`

### 4.2 جداول البيانات المشتركة

سنضيف جداول مشتركة تستخدمها جميع القدرات الجديدة:

- `system_settings`
- `system_setting_audit_logs`
- `integration_outbox`
- `integration_delivery_attempts`
- `integration_provider_health`

وظائفها:

- `system_settings`: حفظ الإعدادات التشغيلية غير السرية والـ feature flags والسياسات
- `system_setting_audit_logs`: تتبع من غيّر ماذا ومتى ولماذا
- `integration_outbox`: تسجيل الأعمال التي يجب إرسالها إلى مزود خارجي بشكل موثوق
- `integration_delivery_attempts`: تتبع retries والأخطاء الخارجية
- `integration_provider_health`: آخر حالة صحية معروفة لكل مزود خارجي

### 4.3 طبقة التكاملات الخارجية

سنضيف عوازل واضحة تحت:

- `src/integrations/firebase/*`
- `src/integrations/google-maps/*`
- `src/integrations/ai/*`

القاعدة هنا:

- الموديولات الوظيفية لا تستدعي SDKs خارجية مباشرة
- كل تكامل خارجي يمر عبر adapter/service داخلي مخصص
- أي فشل خارجي لا يكسر transaction الأساسية للبيانات التشغيلية
- التكاملات غير الحرجة تخرج عبر `integration_outbox` وتُنفذ بواسطة `automation`

### 4.4 قواعد الأمن والإعدادات

التمييز سيكون ثابتًا:

- الأسرار الحساسة: تبقى في البيئة أو secret manager لاحقًا
- الإعدادات غير السرية: تخزن في `system_settings`
- الواجهة الإدارية ترى حالة السر فقط: `configured / missing`
- لا نعيد أي secret فعلية عبر API

### 4.5 العقود المشتركة

سنضيف أسطح إدارة موحدة:

- `GET /api/v1/system-settings`
- `GET /api/v1/system-settings/:group`
- `PATCH /api/v1/system-settings/:group`
- `GET /api/v1/system-settings/audit`
- `GET /api/v1/system-settings/integrations/status`

المجموعات الرسمية المبدئية:

- `general`
- `authSecurity`
- `pushNotifications`
- `transportMaps`
- `analytics`
- `imports`

### 4.6 نقاط الربط مع المشروع بالكامل

كل feature لاحقة ستقرأ من `system-settings` بدل نشر constants متفرقة داخل الكود.

كما سنحدّث:

- `src/config/env.ts`
- `.env.example`
- `.env.render.example`
- `src/scripts/smoke-deploy.ts`
- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/*`
- `src/docs/postman/*`

## 5. الخطوة الأولى: `advanced system settings`

هذه الخطوة هي الأساس المؤسسي لكل ما بعدها.

### الهدف

- إنشاء control plane رسمي للمنصة
- توحيد feature flags والسياسات العامة
- جعل الخصائص الجديدة قابلة للتفعيل التدريجي دون تعديل الكود في كل مرة

### ما الذي سيدخل تحتها

- سياسات `2FA`
- تمكين/تعطيل `FCM`
- تمكين/تعطيل `Google Maps ETA`
- تمكين/تعطيل `AI analytics`
- تفعيل `CSV import`
- إعدادات thresholds وrefresh intervals وprovider behavior

### الدمج مع الموديولات الحالية

- `auth` يقرأ `authSecurity`
- `communication` يقرأ `pushNotifications`
- `transport` يقرأ `transportMaps`
- `analytics` يقرأ `analytics`
- `admin-imports` يقرأ `imports`

### قواعد التنفيذ

- الإعدادات تخضع لـ `zod` schema registry ثابت داخل الموديول
- كل setting لها default واضح وtype واضح وscope واضح
- أي تغيير في setting يُكتب في audit log
- التغييرات الحرجة تفرض `admin` فقط

### نتيجة التسليم

بعد هذه الخطوة يصبح لدينا backbone رسمي للتحكم المؤسسي، ويمكن بعدها دمج بقية القدرات دون تضخم عشوائي في الكود.

## 6. الخطوة الثانية: `Firebase / FCM / realtime transport`

### الهدف

- تمكين push notifications حقيقية للتطبيقات
- تحويل النقل من polling-only إلى event-driven experience
- الإبقاء على الـ REST الحالي مصدر الحقيقة، مع استخدام `FCM` كقناة تنبيه ودفع للتحديث

### حدود التنفيذ

لن نبني منطقًا موازيًا للرسائل والإشعارات خارج `communication`.

سنوسّع:

- `communication`
- `transport`
- `reporting`
- `automation`

### جداول البيانات الجديدة

- `user_devices`
- `user_device_subscriptions`

المسؤوليات:

- `user_devices`: تخزين device token والمنصة والتطبيق وآخر نشاط
- `user_device_subscriptions`: أنواع الاشتراك المسموح بها مثل رسائل عامة أو تحديثات نقل أو تنبيهات تشغيلية

### الأسطح العامة الجديدة

- `POST /api/v1/communication/devices`
- `PATCH /api/v1/communication/devices/:deviceId`
- `DELETE /api/v1/communication/devices/:deviceId`

### كيف يندمج هذا مع النظام الحالي

- عند إنشاء `message` أو `notification` أو `announcement` يقوم `communication.service` بإنشاء event في `integration_outbox`
- يقوم `automation` بمعالجة الـ outbox وإرسال `FCM`
- عند تحديث موقع الحافلة أو حالة الرحلة أو أحداث الركوب/الإنزال، يقوم `transport.service` بإنشاء transport events
- هذه الأحداث تُرسل إلى:
  - ولي الأمر المرتبط
  - السائق نفسه عند الحاجة
  - أسطح الإدارة/المراقبة حسب السياسة

### نموذج realtime transport الرسمي

لن نكسر العقود الحالية.

المصدر الحقيقي يبقى:

- جداول `transport`
- `reporting` endpoints الحالية

لكننا نضيف:

- push event يخبر التطبيق أن الحالة تغيرت
- client يعيد قراءة endpoint الحالية أو endpoint enriched

هذا يحافظ على:

- بساطة البنية
- موثوقية الـ source of truth
- عدم الحاجة إلى WebSocket stack كامل في هذه المرحلة

### ما الذي سيتغير في القراءة

سنضيف حقولًا additive فقط إلى الأسطح الحالية ذات الصلة مثل:

- `lastTransportEventAt`
- `lastTransportEventType`
- `hasRealtimeUpdates`

### اختبارات هذه الخطوة

- unit tests لعزل FCM adapter
- integration tests لتسجيل الأجهزة وربط الـ outbox
- smoke check يثبت:
  - صحة `system-settings` الخاصة بـ FCM
  - نجاح device registration
  - نجاح enqueue لاختبار push داخلي

## 7. الخطوة الثالثة: `Google Maps / ETA`

### الهدف

- إدخال حساب ETA حقيقي بدل الاكتفاء بآخر موقع وحالة الرحلة
- تحسين النقل للأسرة والإدارة والسائق بناءً على route intelligence

### حدود التنفيذ

`Google Maps` لن تصبح مصدر الحقيقة للنقل.

المصدر يبقى:

- `routes`
- `stops`
- `route assignments`
- `student transport assignments`
- `bus_location_history`
- `trips`

ودور `Google Maps` سيكون:

- geocoding
- distance/time estimation
- route ETA enrichment

### مكونات التنفيذ

سنضيف تحت `transport` و`src/integrations/google-maps`:

- `geocoding adapter`
- `eta estimation service`
- `maps cache repository`

### جداول البيانات الجديدة

- `geo_place_cache`
- `route_eta_snapshots`

### قواعد الدمج

- عند حفظ `home location` أو `route stop` بإحداثيات ناقصة أو غير موثقة، يُشغَّل geocoding/normalization
- عند وجود رحلة نشطة مع موقع حالي، يُحسب ETA دوريًا أو عند تحديث الموقع
- `reporting` و`transport` يعرضان ETA كطبقة enriched لا كبديل للحالة الحالية

### العقود الجديدة أو الموسعة

- `GET /api/v1/transport/trips/:id/eta`
- توسيع endpoints النقل والتقارير الحالية بحقوق إضافية مثل:
  - `estimatedArrivalAt`
  - `estimatedMinutesRemaining`
  - `etaConfidence`
  - `etaUpdatedAt`

### السلوك عند فشل المزود

- لا نفشل رحلة النقل أو live status بسبب فشل `Google Maps`
- نرجع آخر ETA معروفة إن وجدت
- وإلا نرجع الحقول كـ `null` مع `etaStatus=unavailable`
- الخطأ يسجّل في `integration_delivery_attempts` و`integration_provider_health`

### اختبارات هذه الخطوة

- unit tests لحسابات ETA وfallbacks
- integration tests لسيناريو:
  - route active
  - location update
  - eta snapshot creation
- smoke test لحالة provider configured/unconfigured

## 8. الخطوة الرابعة: `2FA`

### الهدف

- تقوية المصادقة خصوصًا للحسابات الحساسة
- رفع مستوى الثقة المؤسسية دون إدخال dependence مبكر على SMS

### القرار التنفيذي

التنفيذ الأول سيكون:

- `TOTP` كتدفق أساسي
- `backup codes` كآلية استرداد

ولن نعتمد في النسخة الأولى:

- SMS-based 2FA
- push approval login

### لماذا هذا القرار

- أكثر أمانًا من SMS
- لا يحتاج provider إضافي خارج المنظومة الحالية
- يندمج مباشرة مع `auth`

### الجداول الجديدة

- `user_two_factor_methods`
- `user_two_factor_backup_codes`
- `auth_two_factor_challenges`

### التعديلات داخل `auth`

سنوسّع:

- `auth.validator`
- `auth.service`
- `auth.repository`
- `auth.controller`
- `auth.dto`

### العقود الجديدة

- `POST /api/v1/auth/2fa/setup/totp`
- `POST /api/v1/auth/2fa/setup/verify`
- `POST /api/v1/auth/2fa/challenge/verify`
- `POST /api/v1/auth/2fa/disable`
- `POST /api/v1/auth/2fa/recovery-codes/regenerate`

كما سيتوسع `POST /api/v1/auth/login` ليعيد إحدى الحالتين:

- session كاملة كما هو الآن
- أو `requiresTwoFactor=true` مع `challengeToken`

### سياسة التفعيل

السياسة الافتراضية:

- `admin`: إجباري
- بقية الأدوار: configurable من `system-settings`

### قواعد الأمان

- لا نخزن backup codes بنص صريح
- جميع challenge tokens قصيرة العمر وموقعة
- محاولات التحقق تخضع rate limit
- تعطيل `2FA` يتطلب re-auth أو challenge صالح

### اختبارات هذه الخطوة

- unit tests لـ TOTP وbackup code hashing
- integration tests لـ setup/verify/login challenge/disable
- smoke test لحساب `admin` يمر عبر `2FA`

## 9. الخطوة الخامسة: `AI analytics`

### الهدف

- تحويل البيانات التشغيلية الحالية إلى رؤى استباقية قابلة للاستهلاك
- عدم خلط الحقيقة التشغيلية مع التفسير التحليلي

### القرار المعماري

سنضيف موديول runtime جديد:

- `src/modules/analytics/*`

والسبب:

- `reporting` يبقى factual
- `analytics` يصبح interpretive/predictive

### نطاق النسخة الأولى

سنبدأ بأربعة أسطح فقط:

- `student risk summary`
- `class performance overview`
- `transport anomaly summary`
- `admin operational digest`

### نموذج البناء

لن نرسل قاعدة البيانات الخام إلى الذكاء الاصطناعي.

المسار المعتمد:

1. repositories تستخرج features رقمية ومنطقية من:
   - `attendance`
   - `assessments`
   - `behavior`
   - `homework`
   - `transport`
2. `analytics.service` يبني payload معيارية صغيرة ومنزوعة الحساسية قدر الإمكان
3. `src/integrations/ai` يولد:
   - summary
   - labels
   - recommendations
   - confidence
4. النتيجة تحفظ كـ snapshot versioned ومؤرخة

### الجداول الجديدة

- `analytics_snapshots`
- `analytics_jobs`
- `analytics_feedback`

### العقود الجديدة

- `GET /api/v1/analytics/students/:studentId/risk-summary`
- `GET /api/v1/analytics/classes/:classId/overview`
- `GET /api/v1/analytics/transport/routes/:routeId/anomalies`
- `POST /api/v1/analytics/jobs/recompute`

### قواعد الحوكمة

- مخرجات `AI` استشارية وليست مصدر قرار نهائي
- لا يسمح للـ AI بأي mutate operation على البيانات الأكاديمية أو التشغيلية
- كل نتيجة يجب أن تتضمن:
  - `generatedAt`
  - `modelVersion`
  - `inputWindow`
  - `confidence`
  - `disclaimer`

### التكامل مع بقية المشروع

- `reporting` يظل المرجع الرقمي الخام
- `analytics` يستهلك `reporting`/repositories ولا يعيد تعريف domain logic
- `admin dashboard` و`teacher` و`supervisor` و`parent` يمكنهم استهلاك أسطح analytics حسب الدور والسياسة
- `system-settings` يتحكم في:
  - enablement
  - refresh cadence
  - thresholds
  - provider mode

### اختبارات هذه الخطوة

- unit tests لـ feature extraction وprompt/input builders
- integration tests لتوليد snapshot وعرضها
- smoke test لسلامة provider configuration وحالة fallback

## 10. الخطوة السادسة: `CSV import` إذا عاد مطلوبًا تشغيليًا

### الهدف

- إضافة مدخل CSV دون نسخ أو تشتيت محرك الاستيراد الحالي
- الإبقاء على `school-onboarding-import.engine.ts` كمحرك وحيد للـ planning/validation/apply

### القرار المعماري

لن نبني import engine ثانية.

سنضيف فقط:

- `CSV ingestion adapter`
- `CSV normalization layer`

ثم نحوّل الناتج إلى نفس `structured workbook payload` الحالية.

### مكان التنفيذ

التوسعة ستكون داخل:

- `src/modules/admin-imports/*`

وليس عبر موديول منفصل.

### العقود الجديدة

- `POST /api/v1/admin-imports/school-onboarding/csv/dry-run`
- `GET /api/v1/admin-imports/school-onboarding/templates/csv`

أما:

- `apply`
- `history`

فتبقى كما هي عبر `dryRunId`.

### شكل الإدخال المعتمد

النسخة الأولى ستعتمد:

- `multipart/form-data`
- ملف `zip` يحتوي CSV files مسماة بأسماء الأوراق المعتمدة

ولن نعتمد:

- CSV واحدة ضخمة متعددة الدلالات
- parsing غير محدد النسخة

### قواعد التحقق

- فحص نسخة القالب
- فحص أسماء الملفات المطلوبة
- فحص headers لكل ملف
- تحويل القيم إلى نفس model المستعملة في structured workbook
- إعادة استعمال:
  - dry-run
  - apply
  - audit trail
  - idempotent behavior

### التكامل مع `system-settings`

لن يكون `CSV import` مفعلًا دائمًا.

التفعيل سيكون عبر:

- `imports.csvSchoolOnboardingEnabled`

### اختبارات هذه الخطوة

- unit tests للـ parser/normalizer
- integration tests لملف zip ناجح وملفات header mismatch وrow-level failures
- smoke test لقالب CSV والـ dry-run

## 11. تكامل القدرات مع التطبيقات الخمسة

### Admin Dashboard

- إدارة `system settings`
- مراقبة حالة مزودي الخدمات
- إدارة `2FA` policy
- قراءة transport ETA
- استهلاك analytics
- تشغيل CSV import عند تفعيلها

### Teacher App

- استلام push notifications
- استخدام `2FA` إذا فُرض على الدور
- استهلاك analytics الخاصة بالصفوف والطلاب ضمن الصلاحية

### Parent App

- استلام realtime transport pushes
- قراءة ETA
- استلام تنبيهات مرتبطة بالرحلة والطالب

### Supervisor App

- push notifications
- analytics ضمن ownership scope
- `2FA` عند تفعيل السياسة

### Driver App

- تسجيل device token
- استلام transport workflow pushes عند الحاجة
- الاستمرار في إرسال updates للنقل كمصدر الحقيقة

## 12. الملفات التي ستتأثر في كل موجة

في كل feature سنحدّث على الأقل:

- `src/config/env.ts`
- `.env.example`
- `.env.render.example`
- `src/app/module-registry.ts` عند إضافة موديول runtime جديد
- `src/database/migrations/*`
- `tests/unit/*`
- `tests/integration/*`
- `src/scripts/smoke-deploy.ts`
- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`

## 13. معايير القبول المؤسسية لكل خطوة

لا تُعتبر أي خطوة منجزة إلا إذا اكتملت جميع البنود التالية:

- migration موجودة وآمنة
- validation موجودة لكل input عام
- repository/service/controller/routes متوافقة مع النمط الحالي
- unit tests مضافة ومارة
- integration tests مضافة ومارة
- smoke checks محدثة
- `API_REFERENCE` و`OpenAPI` و`Postman` محدثة
- `.env.example` و`.env.render.example` محدثتان
- لا يوجد كسر في العقود الحالية إلا إذا كان التغيير additive أو موثقًا بوضوح

## 14. الترتيب التنفيذي العملي من الآن

سننفذ ابتداءً من هذه الوثيقة بهذا الترتيب:

1. بناء `system-settings` والـ integration backbone
2. دمج `FCM` وتسجيل الأجهزة وtransport events
3. دمج `Google Maps` وطبقة `ETA`
4. توسيع `auth` بـ `2FA`
5. إضافة موديول `analytics`
6. فتح `CSV adapter` داخل `admin-imports` عند بدء هذا المسار

## 15. النتيجة المؤسسية المستهدفة

بعد إنهاء هذه الخطة لن يكون لدينا مجرد features إضافية، بل نظام موحد أكثر نضجًا:

- control plane موحد
- security plane أقوى
- notification plane حقيقي
- transport plane لحظي ومدعوم بـ ETA
- analytics plane فوق البيانات التشغيلية
- import plane موحد لا يعيد اختراع نفسه

وهذا هو الشكل الصحيح لنقل المشروع من backend جاهز للفرونت فقط، إلى backend مؤسسي متكامل وقابل للتوسع.

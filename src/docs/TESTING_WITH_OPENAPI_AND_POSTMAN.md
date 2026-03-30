# Testing The Hosted Backend With OpenAPI And Postman

هذا الملف هو الدليل العملي الكامل لاختبار الباك إند المستضاف على Render باستخدام:

- `OpenAPI`
- `Postman`

البيئة المستهدفة حاليًا:

- `PUBLIC_ROOT_URL=https://ishraf-platform-backend-staging.onrender.com`
- `PUBLIC_API_BASE_URL=https://ishraf-platform-backend-staging.onrender.com/api/v1`

مهم:
- قاعدة البيانات تعمل على Neon عبر متغيرات البيئة فقط
- لا تحتاج ولا يجب أن تضع رابط قاعدة البيانات الحقيقي داخل Postman أو OpenAPI
- اختبار الـ API يتم عبر رابط Render العام فقط

## 1. الملفات التي ستستخدمها

### OpenAPI

- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/openapi/auth.openapi.json`

### Postman

- `src/docs/postman/ishraf-platform.postman_collection.json`
- `src/docs/postman/auth.postman_collection.json`
- `src/docs/postman/ishraf-platform.staging.postman_environment.json`

## 2. قبل أن تبدأ

تأكد من الآتي:

- الباك المستضاف يعمل:
  - `https://ishraf-platform-backend-staging.onrender.com/health`
  - `https://ishraf-platform-backend-staging.onrender.com/health/ready`
- لديك حساب صالح على البيئة المستضافة
- لديك بيانات الدخول لذلك الحساب

مهم:
- لا تعتمد على أي حسابات محلية قديمة أو أمثلة أرشيفية داخل وثائق أقدم
- استخدم حساب الـ staging الحقيقي الذي أنشأته على Neon/Render
- مرجع الحسابات الحالية للبيئة المستضافة موجود في:
  - `src/docs/STAGING_FRONTEND_SEED.md`
- البيئة المستضافة الحالية تحتوي فقط على الحسابات الدنيا، ولا تحتوي dataset أكاديمية أو تشغيلية جاهزة مسبقًا

## 3. اختبار سريع من المتصفح

قبل الدخول إلى Postman أو OpenAPI نفذ هذا التحقق السريع:

1. افتح:
   - `https://ishraf-platform-backend-staging.onrender.com/health`
2. تأكد أن الاستجابة `200`
3. افتح:
   - `https://ishraf-platform-backend-staging.onrender.com/health/ready`
4. تأكد أن الاستجابة `200`

إذا فشل `health/ready` فالمشكلة ليست في Postman أو OpenAPI، بل في التشغيل أو الاتصال بقاعدة البيانات.

## 4. استخدام Postman خطوة بخطوة

### 4.1 استيراد الملفات

1. افتح `Postman`
2. اختر `Import`
3. استورد الملفات التالية:
   - `src/docs/postman/ishraf-platform.postman_collection.json`
   - `src/docs/postman/ishraf-platform.staging.postman_environment.json`

إذا أردت مجموعة مصغرة خاصة بالمصادقة فقط، يمكنك أيضًا استيراد:

- `src/docs/postman/auth.postman_collection.json`

### 4.2 تفعيل البيئة الصحيحة

بعد الاستيراد:

1. من أعلى Postman اختر البيئة:
   - `Ishraf Platform Staging`
2. تأكد من وجود القيم التالية داخل environment أو collection variables:
   - `rootUrl`
   - `baseUrl`
   - `loginIdentifier`
   - `loginPassword`

القيم الافتراضية للرابط:

```text
rootUrl=https://ishraf-platform-backend-staging.onrender.com
baseUrl=https://ishraf-platform-backend-staging.onrender.com/api/v1
```

### 4.3 تعبئة بيانات تسجيل الدخول

افتح variables وعدّل:

- `loginIdentifier`
- `loginPassword`

ملاحظة:
- لا تحفظ كلمة المرور الحقيقية داخل الملف المصدَّر إذا كنت ستشاركه
- الأفضل تركها داخل Postman local value فقط

### 4.4 أول تسلسل اختبار صحيح

نفذ الطلبات بهذا الترتيب:

1. `Health / Health`
2. `Health / Health Ready`
3. `Auth / Login`
4. `Auth / Me`

بعد نجاح `Login`:

- يتم تخزين `accessToken` تلقائيًا
- يتم تخزين `refreshToken` تلقائيًا
- يتم تخزين `userId` عند توفره

هذا يعني أنك لا تحتاج نسخ الـ token يدويًا لمعظم الطلبات الجاهزة.

### 4.5 كيف أختبر الطلبات المحمية

بعد نجاح `Login`:

1. افتح أي طلب محمي مثل:
   - `Users / List Users`
   - `Homework / List Homework`
   - `Reporting Wave 1 / Parent Dashboard`
2. لا تعدل Authorization يدويًا إذا كان الطلب يستخدم:

```text
Bearer {{accessToken}}
```

3. اضغط `Send`

إذا رجع `401`:

- نفذ `Auth / Refresh`
- ثم أعد المحاولة

إذا رجع `403`:

- فالمستخدم الحالي لا يملك الصلاحية لذلك المسار

### 4.6 اختبار forgot / reset password

في بيئة staging الحالية:

- `forgot-password` يعمل
- لكن `resetToken` لا يظهر في الاستجابة لأن:

```text
AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE=false
```

وهذا متعمد لأمان البيئة المستضافة.

لذلك في Postman:

1. يمكنك اختبار أن الطلب يقبل التنفيذ ويعيد `200`
2. لكن لا تتوقع ظهور `resetToken` في body
3. إذا أردت اختبار reset فعليًا، استخدم بيئة تطوير محلية أو فعّل ذلك مؤقتًا في env غير المستضافة

### 4.7 ما الذي يحدث تلقائيًا داخل الـ Collection

الـ collection تحتوي scripts تحفظ:

- `accessToken`
- `refreshToken`
- `userId`
- `resetToken` فقط إذا ظهر أصلًا في الاستجابة

هذا يعني أن دورة الاستخدام العادية هي:

1. Login
2. Use protected endpoints
3. Refresh عند انتهاء access token
4. Logout عند الحاجة

### 4.8 إذا أردت تغيير البيئة من staging إلى local

لا تعدل كل طلب يدويًا.

يكفي تعديل:

- `rootUrl`
- `baseUrl`

مثال محلي:

```text
rootUrl=http://localhost:4000
baseUrl=http://localhost:4000/api/v1
```

## 5. استخدام OpenAPI خطوة بخطوة

### 5.1 ماذا أستورد؟

للواجهة الأشمل:

- `src/docs/openapi/ishraf-platform.openapi.json`

وللـ auth فقط:

- `src/docs/openapi/auth.openapi.json`

### 5.2 أين أفتحه؟

يمكنك استخدام أي أداة تدعم OpenAPI 3.1 مثل:

- Swagger Editor
- Postman Import
- Insomnia
- Bruno إذا كان يدعم التحويل

### 5.3 بعد الاستيراد

اختر server الصحيح:

- `https://ishraf-platform-backend-staging.onrender.com/api/v1`

إذا كنت تختبر محليًا بدل الاستضافة اختر:

- `http://localhost:4000/api/v1`

### 5.4 أول تسلسل اختبار صحيح في OpenAPI UI

1. نفذ `GET /health/ready` من المتصفح مباشرة لأن health خارج prefix
2. افتح `POST /auth/login`
3. أدخل:
   - `identifier`
   - `password`
4. انسخ `accessToken` من الاستجابة
5. اضغط `Authorize`
6. الصق:

```text
Bearer <accessToken>
```

7. اختبر `GET /auth/me`
8. ثم اختبر أي endpoint محمي آخر

### 5.5 ملاحظات مهمة عن OpenAPI

- OpenAPI لا يخزن الـ token تلقائيًا مثل Postman
- أنت مسؤول عن لصق الـ token في `Authorize`
- بعض health endpoints خارج server prefix، لذلك قد تختبرها من المتصفح أو من Postman مباشرة بسهولة أكثر

## 6. كيف أعرف أن الاختبار ناجح فعلاً؟

الحد الأدنى الناجح هو:

1. `GET /health` = `200`
2. `GET /health/ready` = `200`
3. `POST /auth/login` = `200`
4. `GET /auth/me` = `200` باستخدام token الناتج

إذا مرّ هذا التسلسل، فالاستضافة والاتصال بقاعدة البيانات والمصادقة تعمل معًا بشكل صحيح.

## 7. الأخطاء الشائعة ومعناها

### 401 Unauthorized

الأسباب المعتادة:

- لم تسجل الدخول بعد
- `accessToken` منتهي
- header `Authorization` مفقود أو خاطئ

الحل:

- نفذ `Login`
- أو نفذ `Refresh`

### 403 Forbidden

الأسباب المعتادة:

- الدور الحالي لا يملك الصلاحية
- الحساب غير نشط
- ownership غير محقق

الحل:

- استخدم الحساب المناسب للدور الصحيح
- أو اختبر endpoint مطابقًا لصلاحيات المستخدم الحالي

### 404 Not Found

الأسباب المعتادة:

- استخدام `rootUrl` بدل `baseUrl`
- أو العكس
- أو استخدام endpoint غير موجود في النسخة الحالية

القاعدة:

- health على `rootUrl`
- بقية الـ API على `baseUrl`

### 429 Too Many Requests

الأسباب المعتادة:

- تكرار محاولات login كثيرًا
- تكرار forgot/reset password كثيرًا

الحل:

- انتظر انتهاء نافذة rate limit
- أو استخدم حسابًا مختلفًا أو IP مختلفًا عند الحاجة

## 8. كيف أختبر الـ frontend لاحقًا على نفس البيئة؟

عند بدء الفرونت:

1. استخدم:

```text
https://ishraf-platform-backend-staging.onrender.com/api/v1
```

2. أضف domain الفرونت إلى `CORS_ALLOWED_ORIGINS` على Render
3. لا تغيّر connection strings في الكود
4. أي تغيير على قاعدة البيانات يمر عبر:

```bash
pnpm db:migrate
```

## 9. المرجع الصحيح عند التعارض

رتّب المرجع بهذا الشكل:

1. الكود الحالي
2. `src/docs/BACKEND_WAVE1_STATUS.md`
3. ملفات OpenAPI وPostman
4. `src/docs/API_REFERENCE.md`
5. أي وثائق أقدم

## 10. ملخص عملي سريع جدًا

إذا كنت تريد أقصر مسار للاختبار:

### Postman

1. Import collection
2. Import staging environment
3. ضع `loginIdentifier` و`loginPassword`
4. نفذ `Health Ready`
5. نفذ `Login`
6. نفذ `Me`

### OpenAPI

1. افتح `ishraf-platform.openapi.json`
2. اختر server الخاص بالاستضافة
3. نفذ `Login`
4. انسخ access token
5. اضغط `Authorize`
6. اختبر `Me` أو أي endpoint محمي

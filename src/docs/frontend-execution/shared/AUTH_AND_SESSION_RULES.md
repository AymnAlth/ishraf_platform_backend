# قواعد المصادقة والجلسات

هذا الملف يشرح ما الذي يجب أن تبنيه جميع فرق الفرونت حول `auth` وsession lifecycle.

## المسارات الأساسية

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## دورة الجلسة الموصى بها

1. المستخدم يفتح شاشة `login`
2. التطبيق يرسل `identifier + password`
3. عند النجاح:
   - خزّن `accessToken`
   - خزّن `refreshToken`
   - خزّن بيانات المستخدم الأساسية
4. نفّذ `GET /auth/me` عند الحاجة لتأكيد session الحالية
5. عند `401` بسبب access token:
   - نفّذ `POST /auth/refresh`
   - أعد الطلب الأصلي مرة واحدة
6. عند فشل `refresh`:
   - امسح session
   - انقل المستخدم إلى login

## ما الذي يجب أن يعرفه الفرونت عن كل endpoint

### `POST /auth/login`

- يستخدم `identifier` الذي قد يكون `email` أو `phone`
- يرجع `user` و`tokens`
- يجب تجهيز UI لاحتمالات:
  - `401` بيانات غير صحيحة
  - `403` حساب غير نشط
  - `429` تجاوز rate limit

### `POST /auth/refresh`

- يعتمد على `refreshToken`
- يرجع access token جديدًا مع refresh token جديد
- يجب على الفرونت تحديث token pair بالكامل

### `POST /auth/logout`

- يعتمد على `refreshToken`
- يجب استدعاؤه عند تسجيل الخروج الصريح إن أمكن
- حتى لو فشل، امسح session محليًا

### `GET /auth/me`

- المرجع الأبسط لمعرفة المستخدم الحالي ودوره
- يستحسن استدعاؤه بعد app bootstrap إذا لم تكن بيانات المستخدم مخزنة محليًا

### `POST /auth/change-password`

- شاشة متاحة للمستخدم المسجل دخوله
- بعد النجاح يجب توقع إبطال refresh tokens السابقة
- الأفضل أن يطلب التطبيق login جديد بعد التغيير

### `POST /auth/forgot-password`

- الفرونت يجب أن يعاملها كطلب إطلاق reset flow فقط
- لا تبنوا الواجهة على افتراض عودة `resetToken` في الاستجابة
- في hosted staging السياسة الحالية تمنع كشف reset token في الاستجابة

### `POST /auth/reset-password`

- تبني عليها شاشة إدخال reset token + password جديد
- واجهة الفرونت نفسها يجب أن تكون جاهزة حتى لو كانت آلية التسليم التشغيلية خارج النطاق الحالي

## rate limiting

المسارات التالية قد ترجع `429 Too Many Requests`:

- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

متطلبات الفرونت:

- عرض رسالة هادئة وواضحة
- منع إعادة الإرسال السريع بشكل عدائي من الواجهة
- عدم معاملة `429` كخطأ غير معروف

## تخزين التوكنات

السياسة التنفيذية في الفرونت يجب أن تحدد بوضوح:

- أين يخزن `accessToken`
- أين يخزن `refreshToken`
- كيف تتم مزامنتهما بين tabs إن وُجدت واجهة ويب

هذه الحزمة لا تفرض آلية تخزين معينة، لكنها تفرض السلوك التالي:

- لا تستخدم session قديمة بعد فشل `refresh`
- لا تبقِ المستخدم في حالة غير متزامنة بين الشاشة والـ auth state

## ربط auth بالدور

بعد login أو `me`:

- `admin` يوجّه إلى لوحة الإدارة
- `teacher` يوجّه إلى teacher app
- `parent` يوجّه إلى parent app
- `supervisor` يوجّه إلى supervisor app
- `driver` يوجّه إلى driver app

## حالات يجب تغطيتها في كل تطبيق

- first login success
- invalid credentials
- expired access token + refresh success
- expired refresh token
- forgot password request accepted
- reset password success/failure
- logout manual

## مراجع مرتبطة

- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/auth.openapi.json`
- `src/docs/postman/auth.postman_collection.json`
- [القواعد المشتركة](./COMMON_FRONTEND_RULES.md)

# Render + Neon Deployment Guide

هذه الوثيقة تشرح طريقة نشر **بيئة staging** من الباك إند على:

- **Render Web Service**
- **Neon Postgres**

هذه البيئة مخصصة لتطوير الفرونت، وليست إطلاق production نهائي للعملاء.

البيئة المستضافة الحالية:

- `PUBLIC_ROOT_URL=https://ishraf-platform-backend-staging.onrender.com`
- `PUBLIC_API_BASE_URL=https://ishraf-platform-backend-staging.onrender.com/api/v1`
- قاعدة البيانات الفعلية تعمل عبر Neon من خلال:
  - `DATABASE_URL`
  - `DATABASE_URL_MIGRATIONS`

مهم:
- لا تضع connection strings الحقيقية داخل ملفات التوثيق
- احتفظ بها داخل `.env` المحلي وداخل Render env vars فقط

للاختبار العملي بعد النشر باستخدام Postman وOpenAPI:

- `src/docs/TESTING_WITH_OPENAPI_AND_POSTMAN.md`

## 1. قبل البدء

- تأكد أن المشروع يمر محليًا:
  - `pnpm build`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm test:integration`
- استخدم Node `24.13.1` كما هو مثبت في `.node-version`.
- لا تستخدم قاعدة التطوير المحلية على Render أو Neon.

## 2. إعداد Neon

- أنشئ مشروع Neon جديد مخصصًا لـ staging.
- انسخ **pooled connection string** وضعها في:
  - `DATABASE_URL`
- انسخ **direct connection string** وضعها في:
  - `DATABASE_URL_MIGRATIONS`
- اضبط:
  - `DATABASE_SCHEMA=public`

القاعدة:
- التطبيق وقت التشغيل يستخدم `DATABASE_URL`
- الـ migrations تستخدم `DATABASE_URL_MIGRATIONS` إن كانت موجودة

## 3. إعداد Render

- أنشئ Web Service جديدة من نفس المستودع.
- استخدم ملف `render.yaml` الموجود في المشروع.
- اجعل البيئة:
  - `NODE_ENV=production`
- استخدم Health Check:
  - `/health/ready`

## 4. Environment Variables

الحد الأدنى المطلوب على Render:

- `PUBLIC_ROOT_URL`
- `PUBLIC_API_BASE_URL`
- `DATABASE_URL`
- `DATABASE_URL_MIGRATIONS`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `CORS_ALLOWED_ORIGINS`

بقية القيم الموصى بها موجودة في:

- `.env.render.example`

قيم مهمة في staging:

- `DATABASE_SCHEMA=public`
- `TRUST_PROXY=true`
- `AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE=false`
- `LOG_LEVEL=info`

القيم الحالية الموصى بها للروابط العامة:

```text
PUBLIC_ROOT_URL=https://ishraf-platform-backend-staging.onrender.com
PUBLIC_API_BASE_URL=https://ishraf-platform-backend-staging.onrender.com/api/v1
```

## 5. تشغيل الـ Migrations

لا تعتمد في هذه المرحلة على `preDeploy` أو أي خطوة مخفية داخل الاستضافة.

شغّل migrations يدويًا ضد Neon direct URL:

```bash
pnpm db:migrate
```

تأكد أن:

- `DATABASE_URL_MIGRATIONS` يشير إلى Neon direct connection
- `DATABASE_SCHEMA=public`

أعد تشغيل هذه الخطوة بعد أي schema change جديد قبل اعتماد النشر.

## 6. إنشاء أول Admin

بعد نجاح الـ migrations، أنشئ أول admin مرة واحدة فقط:

```bash
pnpm deploy:bootstrap-admin
```

المتغيرات المطلوبة:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_FULL_NAME`
- `BOOTSTRAP_ADMIN_PHONE` اختياري
- `BOOTSTRAP_ADMIN_RESET_PASSWORD=false` افتراضيًا

ملاحظات:

- الـ script idempotent
- إذا كان البريد موجودًا بدور غير `admin` فسيفشل صراحة
- لا يغير كلمة المرور للحساب الموجود إلا إذا فعلت:
  - `BOOTSTRAP_ADMIN_RESET_PASSWORD=true`

## 7. Smoke Check بعد النشر

بعد أن يصبح رابط Render متاحًا:

```bash
pnpm deploy:smoke
```

المتغيرات:

- `SMOKE_BASE_URL=https://ishraf-platform-backend-staging.onrender.com`
- `SMOKE_ADMIN_EMAIL` اختياري
- `SMOKE_ADMIN_PASSWORD` اختياري

الـ script يتحقق من:

- `GET /health`
- `GET /health/ready`
- `POST /api/v1/auth/login` إذا زودته ببيانات admin

## 8. CORS أثناء تطوير الفرونت

اجعل `CORS_ALLOWED_ORIGINS` تحتوي فقط على origins المصرح بها، مثل:

```text
http://localhost:3000,http://localhost:5173,https://<frontend-preview-domain>
```

إذا كانت القيمة فارغة في `production` فسيفشل startup عمدًا.

## 9. ملاحظات تشغيلية مهمة

- `GET /health` هو liveness بسيط
- `GET /health/ready` يتحقق من جاهزية قاعدة البيانات
- الـ forgot/reset password flows موجودة، لكن staging لا يعيد `resetToken` ما دام:
  - `AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE=false`
- rate limiting الحالي in-memory ومناسب لنسخة Render single-instance فقط

## 10. حدود بيئة الاستضافة المجانية

- قد توجد cold starts على Render free
- لا يوجد realtime transport أو FCM أو ETA في هذه المرحلة
- هذه البيئة تصلح لتطوير الفرونت واختبارات التشغيل الأساسية، لا لحمولة إنتاجية حقيقية

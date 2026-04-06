# Deploying To Render + Neon

هذا الملف يصف التشغيل المرجعي الحالي للباك إند على:

- Render للتطبيق
- Neon لقاعدة البيانات PostgreSQL

## الملفات المرجعية

- `render.yaml`
- `.env.render.example`
- `.env.example`
- `src/scripts/smoke-deploy.ts`

## متغيرات البيئة الأساسية

يجب ضبط المتغيرات التالية في Render:

- `NODE_ENV=production`
- `APP_NAME`
- `API_PREFIX=/api/v1`
- `PUBLIC_ROOT_URL`
- `PUBLIC_API_BASE_URL`
- `DATABASE_URL`
- `DATABASE_URL_MIGRATIONS`
- `DATABASE_SCHEMA`
- `ACCESS_TOKEN_SECRET`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_SECRET`
- `REFRESH_TOKEN_TTL_DAYS`
- `PASSWORD_RESET_TOKEN_TTL_MINUTES`
- `CORS_ALLOWED_ORIGINS`
- `TRUST_PROXY`
- `REQUEST_BODY_LIMIT`
- `AUTH_LOGIN_RATE_LIMIT_MAX`
- `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS`
- `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`
- `AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS`
- `AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE`
- `LOG_LEVEL`

## اتصال قاعدة البيانات

- `DATABASE_URL` للاتصال pooled runtime
- `DATABASE_URL_MIGRATIONS` للاتصال المباشر المخصص للهجرات والمهام الإدارية

## أوامر التشغيل الأساسية

### بناء محلي

```powershell
pnpm.cmd build
```

### تطبيق الهجرات

```powershell
pnpm.cmd db:migrate
```

### فحص smoke بعد النشر

```powershell
pnpm.cmd deploy:smoke
```

## أوامر تشغيلية إضافية

### Bootstrap admin

```powershell
pnpm.cmd deploy:bootstrap-admin
```

يعتمد على متغيرات:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_FULL_NAME`
- `BOOTSTRAP_ADMIN_PHONE`
- `BOOTSTRAP_ADMIN_RESET_PASSWORD`

### Seed عربية لواجهة الفرونت

```powershell
pnpm.cmd deploy:seed-frontend-data
```

### إعادة القاعدة إلى minimal accounts

```powershell
pnpm.cmd deploy:reset-minimal-accounts
```

## سياسة النشر

- لا تنشر قبل:
  - `pnpm.cmd build`
  - tests المناسبة للتغيير
  - `pnpm.cmd db:migrate` إذا كانت هناك migrations
- بعد أي نشر أو migration على البيئة:
  - شغّل `pnpm.cmd deploy:smoke`

## ملاحظات

- لا توثّق connection strings الفعلية في أي ملف repo.
- المرجع الرسمي لمسارات الـ API بعد النشر يبقى:
  - `/health`
  - `/health/ready`
  - و`/api/v1/*` حسب OpenAPI/Postman.

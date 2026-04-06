# Staging Frontend Seed

هذا الملف يوثق **مصادر seed المدعومة من الريبو** للبيئة المستضافة أو أي بيئة تشغيل مشابهة.  
لا يفترض هذا الملف أن حالة البيئة الحية دائمًا مطابقة حرفيًا لما في اللحظة الحالية؛ المرجع الحقيقي هو scripts وseed artifacts داخل الريبو.

## المصادر المعتمدة

### 1. Arabic operational frontend seed

الملف:

- `src/database/seeds/staging_frontend_seed.sql`

التشغيل:

```powershell
pnpm.cmd deploy:seed-frontend-data
```

السكربت المنفذ:

- `src/scripts/seed-staging-frontend-data.ts`

هذا المسار يطبق dataset عربية تشغيلية من SQL مباشرة.

### 2. Minimal accounts reset

السكربت:

- `src/scripts/reset-minimal-accounts.ts`

التشغيل:

```powershell
pnpm.cmd deploy:reset-minimal-accounts
```

هذا المسار:

- يحافظ على الأدمن الأساسي الموجود مسبقًا
- يحذف بقية البيانات التشغيلية والأكاديمية
- ينشئ فقط الحسابات الدنيا الموثقة في السكربت

## Primary admin rule

الأدمن الأساسي المحفوظ في minimal reset:

- `mod87521@gmail.com`

السكربت يتحقق من:

- بقاء نفس الحساب
- بقاء نفس `id`
- بقاء نفس `password_hash`

## الحسابات الدنيا التي ينشئها `reset-minimal-accounts`

### Shared password accounts

- `teacher`: `marwan-amin-shaban@ishraf.local`
- `parent`: `khaled-alarami@ishraf.local`
- `supervisor`: `idris-mashwir@ishraf.local`
- `supervisor`: `bassam-ali-ali-nuhailah@ishraf.local`

كلمة المرور المشتركة:

```text
SeedDev123!
```

### Driver account

- `driver`: `hilal-abdullah-almolsi@ishraf.local`

كلمة مرور السائق:

```text
SeedDriver123!
```

## ما الذي لا يجب افتراضه من هذا الملف

- لا تفترض أن كل بيئة حية تعمل دائمًا على minimal accounts.
- لا تفترض row counts ثابتة ما لم تكن قد طبقت أحد السكربتين بنفسك.
- لا تبنِ frontend logic على بيانات seed ثابتة؛ ابنها على العقود.

## كيف تتحقق من الحالة الفعلية للبيئة

1. استخدم auth + read endpoints الفعلية.
2. افحص:
   - `GET /health/ready`
   - `GET /auth/me`
   - `GET /reporting/dashboards/admin/me`
   - والسطوح التي يعتمد عليها التطبيق الذي تختبره

الملف هنا يشرح **ما يستطيع الريبو إنتاجه**، لا snapshot مضمونة أبدًا لكل لحظة تشغيل.

# Testing With OpenAPI And Postman

هذا الملف يشرح الاستخدام المرجعي الحالي للملفات التالية:

- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/openapi/auth.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`
- `src/docs/postman/auth.postman_collection.json`
- `src/docs/postman/ishraf-platform.staging.postman_environment.json`

## القاعدة العامة

- OpenAPI هي المرجع الآلي للـ schema والمسارات.
- Postman هي المرجع العملي الجاهز للتجريب.
- الكود داخل `src/modules` يظل المصدر الأعلى للحقيقة.

## استخدام Postman

### 1. استيراد الملفات

استورد:

- `ishraf-platform.postman_collection.json`
- `auth.postman_collection.json`
- `ishraf-platform.staging.postman_environment.json`

### 2. اختيار البيئة

اختر environment:

- `Ishraf Platform Staging`

### 3. ضبط بيانات الدخول

املأ متغيرات البيئة أو collection المناسبة:

- `loginIdentifier`
- `loginPassword`

### 4. تسلسل اختبار سريع

1. `GET /health`
2. `GET /health/ready`
3. `POST /auth/login`
4. `GET /auth/me`
5. اختبر السطوح الخاصة بالدور المستعمل

## استخدام OpenAPI

يمكن استخدام ملفات OpenAPI من أجل:

- استعراض العقود
- توليد clients
- المقارنة مع route surfaces الحالية

إذا احتجت subset خاص بالمصادقة فقط:

- استخدم `auth.openapi.json`

## إعادة التوليد بعد أي تغيير في العقود

```powershell
node scripts/reconcile-openapi-postman.mjs
```

هذا السكربت يعيد كتابة:

- OpenAPI master/auth
- Postman master/auth
- staging environment
- `src/docs/OPENAPI_POSTMAN_AUDIT.md`

## تحقق العقد بعد التغيير

الحد الأدنى:

```powershell
node scripts/reconcile-openapi-postman.mjs
pnpm.cmd build
```

وعند الحاجة:

```powershell
pnpm.cmd test:unit
pnpm.cmd test:integration
```

## ما الذي لا يجب فعله

- لا تعدل ملفات OpenAPI/Postman ثم تترك الكود مختلفًا عنها.
- لا تعتمد على ملفات handoff تاريخية بدل OpenAPI/Postman الحالية.
- لا تضف examples أو payloads يدوية غير مدعومة من validator/DTOs.

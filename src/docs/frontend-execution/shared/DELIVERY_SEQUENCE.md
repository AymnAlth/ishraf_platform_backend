# Delivery Sequence

هذا هو التسلسل المقترح لاستهلاك الباك الحالي دون الالتفاف على العقود.

## 1. ابدأ بالعقود المعيارية

- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`

## 2. فعّل auth أولًا

- login
- me
- refresh
- logout

## 3. انتقل إلى ملفات التطبيق المستهلك

اختر واحدًا من:

- `admin-dashboard`
- `teacher-app`
- `supervisor-app`
- `parent-app`
- `driver-app`

واقرأ بالترتيب:

1. `README.md`
2. `ENDPOINT_MAP.md`
3. `SCREENS_AND_TASKS.md`
4. `QA_AND_ACCEPTANCE.md`

## 4. عند تغير العقد

بعد أي تغيير backend:

```powershell
node scripts/reconcile-openapi-postman.mjs
pnpm.cmd build
```

ثم حدّث فقط handoff الحية التي تأثرت.

إذا أعاد السكربت خطأ `Missing documentation manifest entry for runtime route`:

- أضف endpoint للـ OpenAPI/Postman يدويًا بشكل مؤقت حتى لا تبقى فجوة توثيقية.
- حدّث manifest التوثيق لاحقًا في السكربت ضمن دفعة مستقلة (غير دفعة docs-only).

## 5. ما لا نستخدمه

- docs تاريخية
- temp responses
- backlog/request files
- flows غير مدعومة في الكود

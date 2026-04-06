# Adding Endpoints

هذا الملف يصف الطريقة المعتمدة لإضافة surface HTTP جديدة في هذا المشروع دون ترك التوثيق يتخلف عن الكود.

## قاعدة العمل

المصدر الوحيد للحقيقة هو الكود داخل:

- `src/modules/*/routes`
- `src/modules/*/controller`
- `src/modules/*/service`
- `src/modules/*/dto`
- `src/modules/*/validator`

أي endpoint جديدة لا تعتبر منجزة حتى تُسجل في هذه السلسلة كاملة ثم تُعاد مزامنة docs المعيارية.

## خطوات الإضافة

1. أضف route جديدة داخل الموديول الصحيح.
2. اربطها بcontroller method صريحة.
3. أضف request validation في `validator`.
4. أضف أو حدّث DTOs / mapper إن تغيرت request أو response shape.
5. نفّذ منطق الخدمة في `service` والبيانات في `repository` عند الحاجة.
6. إذا كان الموديول جديدًا:
   - أنشئ `index.ts`
   - سجله في `src/app/module-registry.ts`
7. راجع الصلاحيات في `policies`.
8. حدث أو صحح أي tests متعلقة بالعقد.

## تحديث التوثيق بعد الإضافة

بعد اكتمال الكود:

1. شغّل:

```powershell
node scripts/reconcile-openapi-postman.mjs
```

2. راجع:

- `src/docs/openapi/*.json`
- `src/docs/postman/*.json`
- `src/docs/OPENAPI_POSTMAN_AUDIT.md`

3. حدّث handoff الحي فقط عند الحاجة:

- `src/docs/API_REFERENCE.md`
- `src/docs/frontend-execution/*`

لا تُنشئ ملفات handoff تاريخية أو `temp` جديدة لتوثيق endpoint مستقرة.

## قواعد لا تقبل التجاوز

- لا توثّق endpoint غير موجودة في `routes`.
- لا تضف حقولًا إلى docs غير موجودة في validator/DTO/mapper.
- لا توثق flows مستقبلية أو wishful.
- إذا كانت endpoint داخلية وليست surface HTTP عامة، لا تدخلها في OpenAPI/Postman.
- إذا تغيرت الصلاحيات أو semantics في `service`, فيجب أن تنعكس في `frontend-execution`.

## متى نعدّل `reconcile-openapi-postman`

عدّل السكربت فقط إذا احتجت واحدًا من التالي:

- إضافة route module جديد إلى `moduleSources`
- إضافة schema/example جديدة تحتاجها OpenAPI/Postman
- تصحيح توليد audit أو environment

لا تستخدم السكربت لإخفاء gap في الكود؛ أصلح الكود أولًا ثم التوليد.

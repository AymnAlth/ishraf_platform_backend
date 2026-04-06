# Frontend Execution Docs

هذا المجلد يحتوي فقط على **handoff حي** مبني على surfaces الباك الحالية.  
إذا تعارض أي ملف هنا مع الكود في `src/modules` أو مع `OpenAPI/Postman`، فالكود هو الحقيقة.

## ترتيب القراءة

1. `src/docs/API_REFERENCE.md`
2. `src/docs/openapi/ishraf-platform.openapi.json`
3. `src/docs/postman/ishraf-platform.postman_collection.json`
4. الملفات داخل هذا المجلد حسب التطبيق المستهلك

## البنية المعتمدة

### Shared

- `shared/COMMON_FRONTEND_RULES.md`
- `shared/AUTH_AND_SESSION_RULES.md`
- `shared/DELIVERY_SEQUENCE.md`

### Applications

- `admin-dashboard/`
- `teacher-app/`
- `supervisor-app/`
- `parent-app/`
- `driver-app/`

كل تطبيق يحتفظ فقط بأربعة ملفات حية:

- `README.md`
- `ENDPOINT_MAP.md`
- `SCREENS_AND_TASKS.md`
- `QA_AND_ACCEPTANCE.md`

### Management

- `management/EXECUTION_MATRIX.md`

## قواعد التوثيق في هذا المجلد

- لا توجد ملفات تاريخية أو request/review/backlog هنا.
- لا يتم توثيق screens غير قابلة للإثبات من backend surfaces الحالية.
- `ENDPOINT_MAP` يركز على routes والصلاحيات.
- `SCREENS_AND_TASKS` يركز على task flows المدعومة فعليًا.
- `QA_AND_ACCEPTANCE` يصف ما يجب أن ينجح أو يفشل الآن، لا ما نرغب في بنائه لاحقًا.

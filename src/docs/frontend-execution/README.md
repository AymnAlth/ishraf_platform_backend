# Frontend Execution Docs (Code-Truth)

هذا المجلد هو handoff تشغيلي لفِرق الواجهة، مبني على الكود الفعلي فقط.

قاعدة المصدر الوحيد للحقيقة:

- الكود في `src/modules/**` + `src/common/**` + `src/integrations/**` + `src/config/env.ts`.
- إذا تعارض أي نص هنا مع الكود، الكود هو الصحيح.

حالة المزامنة:

- Sync date: `2026-04-23`
- Runtime surface: `178` endpoint تحت `/api/v1` + مساري health على الجذر:
  - `GET /health`
  - `GET /health/ready`
- الأدوار المغطاة:
  - `admin`
  - `teacher`
  - `supervisor`
  - `parent`
  - `driver`

## ترتيب القراءة الموصى به

1. `shared/COMMON_FRONTEND_RULES.md`
2. `shared/AUTH_AND_SESSION_RULES.md`
3. `shared/INTEGRATIONS_AND_ENV.md`
4. `shared/TRANSPORT_REALTIME_MAPS_OPERATIONAL_CONTRACT.md`
5. `management/EXECUTION_MATRIX.md`
6. إذا كان الدور يستهلك `AI Analytics`:
   - `admin-dashboard/*`
   - `parent-app/*`
   - `teacher-app/*`
   - `supervisor-app/*`
7. مجلد الدور المستهلك (`admin-dashboard` أو `teacher-app` أو `supervisor-app` أو `parent-app` أو `driver-app`)

## بنية التوثيق

### Shared

- `shared/COMMON_FRONTEND_RULES.md`
- `shared/AUTH_AND_SESSION_RULES.md`
- `shared/INTEGRATIONS_AND_ENV.md`
- `shared/TRANSPORT_REALTIME_MAPS_OPERATIONAL_CONTRACT.md`
- `shared/DELIVERY_SEQUENCE.md`

مهم:

- تكامل `Firebase/RTDB/FCM` و`Maps` و`AI Analytics providers` موثق في `shared/INTEGRATIONS_AND_ENV.md`.
- الواجهات لا تتصل مباشرةً بـ `OpenAI` أو `Groq`.
- جميع أسطح `AI Analytics` العامة تأتي من backend فقط عبر `/analytics/*`.

### Role Folders

- `admin-dashboard/`
- `teacher-app/`
- `supervisor-app/`
- `parent-app/`
- `driver-app/`

كل role folder يحوي:

- `README.md` (العقد التشغيلي للدور)
- `ENDPOINT_MAP.md` (المسارات المسموح بها فعليًا)
- `SCREENS_AND_TASKS.md` (تدفق الشاشات والتنفيذ)
- `QA_AND_ACCEPTANCE.md` (معايير قبول/رفض واقعية)

### Management

- `management/EXECUTION_MATRIX.md`

## سياسة تحديث هذه الملفات

- لا نوثق أي endpoint غير موجود في `*.routes.ts`.
- لا نضيف payload keys غير موجودة في `validator/dto/mapper`.
- لا نفترض سلوك غير مكتوب في `service`.
- أي feature flags أو integrations أو env rules يجب أن تستند مباشرة إلى `env.ts` وملفات integrations.

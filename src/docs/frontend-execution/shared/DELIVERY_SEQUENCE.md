# Delivery Sequence (Backend-Accurate)

هذا التسلسل لتقليل التعارضات بين فرق الواجهة.

## 1. مرحلة الجلسة

1. بناء auth flow:
   - login
   - me
   - refresh
   - logout
2. توحيد error handling لـ:
   - `401`, `403`, `404`, `409`, `429`

## 2. مرحلة السياق الأكاديمي

1. للإدارة:
   - `GET /academic-structure/context/active`
   - `PATCH /academic-structure/context/active`
2. لباقي التطبيقات:
   - التعامل مع `ACADEMIC_CONTEXT_NOT_CONFIGURED` وmismatch codes بشكل موحد.

## 3. مرحلة شاشات الدور الأساسية

اعمل حسب role folder:

- `admin-dashboard`
- `teacher-app`
- `supervisor-app`
- `parent-app`
- `driver-app`

الترتيب داخل كل role:

1. `README.md`
2. `ENDPOINT_MAP.md`
3. `SCREENS_AND_TASKS.md`
4. `QA_AND_ACCEPTANCE.md`

## 4. مرحلة التكاملات

قبل تشغيل التتبع الحي أو الإشعارات:

1. راجع `shared/INTEGRATIONS_AND_ENV.md`.
2. نفذ split القنوات:
   - Live GPS عبر Firebase RTDB.
   - Business snapshot (ETA وغيرها) عبر REST.

## 5. Phase lock قبل الإطلاق

قبل دمج أي واجهة:

1. endpoint coverage check (لا مسارات وهمية).
2. payload contract check (request/response keys).
3. ownership check لكل تدفق role-sensitive.
4. 409 conflict scenarios check (خصوصًا context + trip summary).

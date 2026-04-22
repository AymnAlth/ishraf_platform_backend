# Auth And Session Rules (Code-Truth)

Sync baseline: `2026-04-16`

## 1. Auth endpoints

- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /auth/me`

## 2. Session model

- `login` يرجع:
  - `user`
  - `tokens.accessToken`
  - `tokens.refreshToken`
  - `tokens.expiresIn`
- `refresh` يرجع زوج tokens جديد (access + refresh).
- `logout` يلغي refresh token المرسل.
- `me` هو مرجع role/session الحالي.

## 3. قواعد frontend للجلسة

- كل endpoint محمي يحتاج:
  - `Authorization: Bearer <accessToken>`
- عند `401`:
  - حاول `POST /auth/refresh` مرة واحدة.
  - إذا فشل، اعمل logout كامل.
- لا تعتمد على role محفوظ محليًا فقط؛ استخدم `GET /auth/me`.

## 4. Reset password flow

- `forgot-password` لا يكشف وجود الحساب.
- إذا `AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE=true` (غالبًا dev/test):
  - الاستجابة قد تتضمن `resetToken`.
- `reset-password` يتطلب token صالحة غير منتهية.

## 5. Rate limiting (Auth)

من السياسة الفعلية:

- login rate limit:
  - `AUTH_LOGIN_RATE_LIMIT_MAX`
  - `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS`
- forgot/reset password rate limit:
  - `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`
  - `AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS`

النتيجة عند تجاوز الحد:

- `429 Too Many Requests`

## 6. Password operations

- `change-password` يتطلب user نشط + currentPassword صحيح.
- بعد `change-password` أو `reset-password`:
  - يتم revoke لجلسات refresh السابقة.
  - يجب على التطبيق تحديث state الجلسة حسب التدفق.

## 7. Device metadata

الخادم يخزن metadata للجلسة (device/ip) عند login/refresh.
لا يوجد متطلب إضافي على frontend غير إرسال الطلبات بشكل طبيعي.

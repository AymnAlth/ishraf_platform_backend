# Auth And Session Rules

Sync baseline: `2026-04-08` (applies to admin, teacher, supervisor, parent, driver)

## Auth surfaces

- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /auth/me`

## Session model

- `login` تعيد access token + refresh token + current user payload
- `refresh` تدور access/refresh pair
- `logout` تبطل refresh token المرسلة
- `me` هي المرجع السريع لتأكيد الجلسة الحالية

## Frontend expectations

- خزّن access token بالطريقة التي يعتمدها التطبيق المستهلك
- أرسل `Authorization: Bearer <token>` لكل route محمية
- استخدم `refresh` فقط عندما تكون الجلسة قابلة للاستمرار
- لا تعتمد على claims محلية فقط؛ `GET /auth/me` هي التحقق الحي

## Password recovery

- `forgot-password` لا تكشف الحسابات الموجودة عبر success branching مختلف
- `reset-password` تعتمد token صالحة غير منتهية
- auth rate limits جزء من العقد التشغيلية

## Role hydration

اعتمد على user payload الفعلية من:

- `login`
- أو `me`

ولا تبنِ routing على تخمينات منفصلة عن `role` الحالية.

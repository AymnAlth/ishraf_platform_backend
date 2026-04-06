# Transport Execution And Handoff

تاريخ التحديث: `2026-04-06`

هذا الملف أصبح سجلًا مؤرشفًا للحالة التنفيذية للنقل كما هي مثبتة في الكود.

## النموذج التشغيلي الحالي

النقل الآن مبني فعليًا على:

- `buses`
- `routes`
- `route stops`
- `student transport assignments`
- `transport route assignments`
- `trips`
- `trip student events`
- `student home locations`

## ما هو موجود فعليًا في السطح العام

من [transport.routes.ts](/d:/Project-R/ishraf_platform_backend/src/modules/transport/routes/transport.routes.ts):

- إدارة ثابتة:
  - `POST/GET /transport/buses`
  - `POST/GET /transport/routes`
  - `POST/GET /transport/routes/:routeId/stops`
- تشغيل إداري:
  - `POST /transport/assignments`
  - `PATCH /transport/assignments/:id/deactivate`
  - `GET /transport/assignments/active`
  - `POST /transport/route-assignments`
  - `GET /transport/route-assignments`
  - `PATCH /transport/route-assignments/:id/deactivate`
- تشغيل السائق:
  - `GET /transport/route-assignments/me`
  - `POST /transport/trips/ensure-daily`
  - `POST /transport/trips`
  - `GET /transport/trips`
  - `GET /transport/trips/:id`
  - `GET /transport/trips/:id/students`
  - `POST /transport/trips/:id/start`
  - `POST /transport/trips/:id/end`
  - `POST /transport/trips/:id/locations`
  - `POST /transport/trips/:id/events`
- إدارة موقع المنزل:
  - `GET /transport/students/:studentId/home-location`
  - `PUT /transport/students/:studentId/home-location`
  - `DELETE /transport/students/:studentId/home-location`

## الحالة التي نثبتها الآن

- النقل لم يعد blocker.
- نموذج السائق اليومي واضح وموجود.
- هذا الأساس جاهز الآن ليُبنى فوقه:
  - `FCM / realtime transport`
  - `Google Maps / ETA`

## ما لا يجب إعادة تصميمه

- لا نعود إلى اعتبار `route` رحلة يومية.
- لا نعيد النقاش حول `ensure-daily` كمسار التشغيل اليومي الصحيح.
- لا نجعل `home location` مصدر الحقيقة التشغيلي المباشر للرحلة.


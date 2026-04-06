# Parent App Endpoint Map

## 1. Session

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

## 2. Parent dashboard

- `GET /reporting/dashboards/parent/me`

Response concept:

- dashboard تعيد children[] فقط للطلاب linked فعليًا.
- كل child قد يحتوي attendanceSummary / assessmentSummary / behaviorSummary.

## 3. Linked student reporting

- `GET /reporting/dashboards/parent/me/students/:studentId/profile`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary`

قواعد:

- كل route هنا تعمل فقط إذا كان الطالب linked لولي الأمر الحالي.
- عدم الارتباط قد يظهر كـ `404` أو denial semantics حسب المسار والسياق.

Response concepts:

- `profile`:
  - student
  - parents
  - attendanceSummary
  - assessmentSummary
  - behaviorSummary
- `attendance-summary`:
  - totals + percentage
- `assessment-summary`:
  - `assessmentSummary.subjects[]`
- `behavior-summary`:
  - totals + recent highlights

## 4. Transport live status

- `GET /reporting/transport/parent/me/students/:studentId/live-status`

قواعد:

- الطالب يجب أن يكون linked لولي الأمر الحالي.
- إذا لم توجد assignment أو trip نشطة:
  - الاستجابة تبقى `200`
  - لكن `assignment` أو `activeTrip` قد تكون `null`

Response concept:

- `assignment` يشرح route/stop الحالية
- `activeTrip` يشرح:
  - trip status
  - bus
  - driver
  - latest location
  - latest events

## 5. Student homework

- `GET /homework/students/:studentId`

قواعد:

- ولي الأمر يرى الواجبات لطلابه المرتبطين فقط.
- response تبقى `200` مع `items=[]` عندما لا توجد واجبات بعد.

## 6. Communication

- `GET /communication/recipients`
- `POST /communication/messages`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`
- `GET /communication/announcements/active`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`

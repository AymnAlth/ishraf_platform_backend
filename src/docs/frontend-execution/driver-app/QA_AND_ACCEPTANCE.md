# Driver App QA And Acceptance (Code-Truth)

## 1. Happy paths

- `GET /transport/route-assignments/me` يرجع بيانات السائق فقط.
- `POST /transport/trips/ensure-daily` ينشئ/يعيد استخدام رحلة اليوم.
- start -> locations -> eta flow يعمل على رحلة مملوكة للسائق.
- roster/events endpoints تعمل على الرحلة المملوكة.

## 2. Attendance flow checks

- request valid => success.
- mapping:
  - pickup+present => boarded
  - dropoff+present => dropped_off
  - absent => absent
- المحطة تُغلق بعد نجاح attendance.
- آخر محطة تُكمل الرحلة إلى `completed`.

## 3. Validation/domain failures

- trip ليست `started` => `TRIP_STOP_ATTENDANCE_STATUS_INVALID`.
- stop خارج route => `TRIP_ATTENDANCE_STOP_ROUTE_MISMATCH`.
- طالب بلا assignment على تاريخ الرحلة => `STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND`.
- route mismatch => `TRIP_STUDENT_ROUTE_MISMATCH`.
- stop mismatch => `TRIP_ATTENDANCE_STOP_ASSIGNMENT_MISMATCH`.
- missing stop snapshot => `TRIP_STOP_ETA_SNAPSHOT_NOT_FOUND`.
- duplicate studentId في نفس الطلب => validation error.

## 4. Ownership and denies

- سائق لا يملك الرحلة => `403`.
- لا وصول لـ admin-only surfaces.
- لا وصول لـ `/transport/trips/:tripId/summary` (admin-only).

## 5. UX guard

- إذا عادت الرحلة `completed` في أي response، يجب تعطيل/إخفاء زر `End Trip`.

# Supervisor App Endpoint Map

## 1. Session

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

## 2. Supervisor dashboard

- `GET /reporting/dashboards/supervisor/me`

## 3. Attendance

- `GET /attendance/sessions`
- `GET /attendance/sessions/:id`
- `PUT /attendance/sessions/:id/records`
- `PATCH /attendance/records/:attendanceId`

قواعد:

- supervisor cannot create attendance sessions.
- supervisor can update attendance only when the session/record belongs to a class-year assignment owned by that supervisor.

Relevant domain and access errors:

| Code | المعنى |
| --- | --- |
| `ACADEMIC_CONTEXT_NOT_CONFIGURED` | surface تشغيلية غير متاحة لعدم ضبط active context |
| `ACTIVE_ACADEMIC_YEAR_ONLY` | `academicYearId` لا تطابق السنة النشطة |
| `ACTIVE_SEMESTER_ONLY` | `semesterId` لا يطابق الفصل النشط |
| `ATTENDANCE_DUPLICATE_STUDENT` | payload الحضور تحتوي duplicate students |
| `ATTENDANCE_ROSTER_STUDENT_MISSING` | payload لا تغطي roster كاملة |
| `ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED` | payload تحتوي طالبًا خارج roster |

ملاحظات:

- فشل ownership هنا يظهر عادة كـ `403` وليس code domain منفصلة.

## 4. Behavior

- `GET /behavior/categories`
- `POST /behavior/records`
- `GET /behavior/records`
- `GET /behavior/records/:id`
- `PATCH /behavior/records/:id`
- `GET /behavior/students/:studentId/records`

ملاحظات:

- behavior access أيضًا يخضع للملكية الأكاديمية للصف/السنة.

## 5. Student reporting

- `GET /reporting/students/:studentId/profile`
- `GET /reporting/students/:studentId/reports/attendance-summary`
- `GET /reporting/students/:studentId/reports/assessment-summary`
- `GET /reporting/students/:studentId/reports/behavior-summary`

قواعد:

- الوصول ليس عامًا.
- الباك يفرض `assertSupervisorAssignedToClassYear` على الطالب داخل السنة النشطة.

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

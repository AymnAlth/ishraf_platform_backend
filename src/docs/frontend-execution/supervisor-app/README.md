# Supervisor App Backend Contract (Code-Truth, Detailed)

آخر مزامنة مع الكود: `2026-04-16`

الدور المستهدف: `supervisor`

## 1) نطاق التطبيق

المشرف يستهلك:

1. `auth` للجلسة.
2. `reporting` (supervisor dashboard + student reports ضمن scope).
3. `attendance` (قراءة الجلسات + تحديث السجلات فقط).
4. `behavior` (إنشاء/تحديث/قراءة السجلات).
5. `communication` (رسائل مباشرة + إشعارات + announcements active + device registry).
6. `analytics` (قراءة class overview للصفوف المعيّنة + feedback على snapshots المنشورة).

## 2) قواعد تشغيل إلزامية

1. المشرف لا يملك `POST /attendance/sessions`.
2. تحديثات attendance مسموحة فقط داخل class-year assignments الخاصة بالمشرف.
3. `Active Academic Context` يحكم attendance/behavior/reporting.
4. أي طالب خارج assignment => `403`.
5. في behavior create/update:
   - إذا أرسل المشرف `teacherId` أو `supervisorId` في الطلب، يتم رفضه (`BEHAVIOR_ACTOR_NOT_ALLOWED`).
6. `GET /analytics/classes/:classId/overview` مقيد بـ supervisor assignments الفعلية.
7. `POST /analytics/snapshots/:snapshotId/feedback` لا يقبل snapshots غير `approved` لغير `admin`.

## 3) أخطاء يجب أن يدعمها UX

### سياق أكاديمي
- `ACADEMIC_CONTEXT_NOT_CONFIGURED` (`409`)
- `ACTIVE_ACADEMIC_YEAR_ONLY` (`400`)
- `ACTIVE_SEMESTER_ONLY` (`400`)

### Attendance/Behavior
- `CLASS_YEAR_MISMATCH`
- `SEMESTER_YEAR_MISMATCH`
- `SUBJECT_GRADE_LEVEL_MISMATCH`
- `SUBJECT_NOT_OFFERED_IN_SEMESTER`
- `ATTENDANCE_ROSTER_STUDENT_MISSING`
- `ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED`
- `BEHAVIOR_CATEGORY_INACTIVE`
- `STUDENT_YEAR_MISMATCH`
- `BEHAVIOR_ACTOR_NOT_ALLOWED`

## 4) Full SDK Inbound FCM Payload (Reference)

```json
{
  "notification": {
    "title": "وصول الحافلة",
    "body": "الحافلة بالخارج في انتظار الطلاب أحمد و سارة."
  },
  "data": {
    "eventType": "bus_arrived",
    "notificationType": "transport_bus_arrived",
    "tripId": "1201",
    "routeId": "31",
    "studentIds": "501,502"
  }
}
```

قواعد parsing:

1. `notification` للعرض.
2. `data` للمنطق (routing/state).
3. العلاقة التشغيلية:
   - `integration_outbox.event_type = fcm.transport.bus_approaching` => `data.eventType = bus_approaching`
   - `integration_outbox.event_type = fcm.transport.bus_arrived` => `data.eventType = bus_arrived`
4. `studentIds` تصل كسلسلة CSV ويجب تحويلها إلى array داخل التطبيق.

## 5) Analytics contracts

- `GET /analytics/classes/:classId/overview`
- `POST /analytics/snapshots/:snapshotId/feedback`

قواعد:

1. المشرف لا يطلق jobs.
2. المشرف لا يراجع snapshots.
3. المشرف يرى snapshots المنشورة فقط.

## 6) ما لا يملكه المشرف

1. إنشاء attendance sessions:
   - `POST /attendance/sessions`.
2. إدارة assessments/homework.
3. كل مسارات الإدارة:
   - `/users/*`
   - `/academic-structure/*`
   - `/students/*`
   - `/system-settings/*`
   - `/admin-imports/*`
4. communication admin-only:
   - bulk messages/notifications
   - announcement management
5. analytics admin-only:
   - كل `POST /analytics/jobs/*`
   - `POST /analytics/snapshots/:snapshotId/review`
   - `GET /analytics/teachers/:teacherId/compliance-summary`
   - `GET /analytics/admin/operational-digest`
   - `GET /analytics/transport/routes/:routeId/anomalies`

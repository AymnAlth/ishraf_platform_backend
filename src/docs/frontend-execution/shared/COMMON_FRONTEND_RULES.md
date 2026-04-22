# Common Frontend Rules (Code-Truth)

هذه الوثيقة إلزامية لكل مستهلك frontend:

- `admin-dashboard`
- `teacher-app`
- `supervisor-app`
- `parent-app`
- `driver-app`

## 1. مصدر الحقيقة

- المصدر الحقيقي للعقود هو الكود:
  - `src/modules/**/{routes,policies,validator,dto,service,mapper}`
  - `src/common/**`
  - `src/integrations/**`
  - `src/config/env.ts`
- لا تعتمدوا على assumptions أو سلوك محفوظ من بيئات قديمة.

## 2. Envelope الاستجابات

كل API responses ترجع envelope موحدة:

- نجاح:
  - `success: true`
  - `message: string`
  - `data: object | array | null`
- فشل:
  - `success: false`
  - `message: string`
  - `errors: Array<{ field?: string | null; code?: string | null; message: string }>`

## 3. قاعدة المعرفات

- المعرفات في أغلب العقود تظهر كسلاسل نصية رقمية (`"123"`).
- لا تفترض UUID.
- لا تعتمد على تحويل تلقائي إلى أرقام في state بدون سبب.

## 4. Active Academic Context (قاعدة تشغيل يومي)

السياق النشط = سنة دراسية نشطة + فصل نشط.

يؤثر على:

- attendance
- assessments
- behavior
- homework
- reporting اليومية

سلوك الباك:

- إذا لم تُرسل `academicYearId/semesterId`:
  - الباك يحلها من السياق النشط.
- إذا أُرسلت:
  - يجب أن تطابق القيم النشطة.

أكواد الأخطاء المهمة:

| Code | HTTP | المعنى |
| --- | --- | --- |
| `ACADEMIC_CONTEXT_NOT_CONFIGURED` | `409` | لا توجد سنة/فصل نشطان |
| `ACTIVE_ACADEMIC_YEAR_ONLY` | `400` | `academicYearId` لا تطابق النشطة |
| `ACTIVE_SEMESTER_ONLY` | `400` | `semesterId` لا يطابق النشط |

سياسة UX:

- `409 ACADEMIC_CONTEXT_NOT_CONFIGURED` => شاشة "الإعداد غير مكتمل" وليس empty list.
- mismatch codes => أعد تحميل active context ثم اطلب البيانات مجددًا.

## 5. Role + Ownership

- `403` طبيعي عندما يفشل role policy.
- كثير من endpoints لديها ownership gate داخل service (ولي أمر/سائق/معلم/مشرف).
- لا تعتبر `403` bug تلقائيًا قبل التحقق من:
  - token role
  - ownership للعُنصر المطلوب
  - active context

## 6. أكواد أخطاء شائعة يجب دعمها في UX

- `401`: token مفقود/منتهي.
- `403`: role/ownership denial.
- `404`: resource غير موجود أو غير مرئي.
- `409`: تعارض حالة domain.

أمثلة domain-specific:

- `TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS` (409)
- `TRIP_STOP_ATTENDANCE_STATUS_INVALID`
- `TRIP_ATTENDANCE_STOP_ROUTE_MISMATCH`
- `STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND`
- `TRIP_STUDENT_ROUTE_MISMATCH`
- `TRIP_ATTENDANCE_STOP_ASSIGNMENT_MISMATCH`
- `TRIP_STOP_ETA_SNAPSHOT_NOT_FOUND`

## 7. Enums التشغيلية الحرجة

| Enum | Values |
| --- | --- |
| `ATTENDANCE_STATUS` | `present`, `absent`, `late`, `excused` |
| `HOMEWORK_SUBMISSION_STATUS` | `submitted`, `not_submitted`, `late` |
| `TRIP_TYPE` | `pickup`, `dropoff` |
| `TRIP_STATUS` | `scheduled`, `started`, `ended`, `completed`, `cancelled` |
| `TRIP_STUDENT_EVENT_TYPE` | `boarded`, `dropped_off`, `absent` |
| `TRIP_STOP_ATTENDANCE_STATUS` | `present`, `absent` |
| `ETA calculationMode` (public) | `provider_snapshot`, `derived_estimate`, `null` |

## 8. مسارات الجذر مقابل API

- جذر الخدمة:
  - `GET /health`
  - `GET /health/ready`
- بقية السطوح تحت:
  - `/api/v1/*`

## 9. قواعد عدم الالتفاف

ممنوع في frontend:

- اختراع transitions غير معتمدة.
- تنفيذ business reconciliation محليًا بدل الخادم.
- افتراض أن endpoint يدعم role معين بدون policy evidence من الكود.
- استدعاء مزود خرائط من الواجهة لحساب ETA بدل snapshot الرسمي من backend.

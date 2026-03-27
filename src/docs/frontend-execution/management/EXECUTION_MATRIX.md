# مصفوفة التنفيذ

هذا الملف يعطي إدارة التنفيذ صورة سريعة عن الفرق، النطاق، والمرجع التشغيلي لكل جزء.

| الفريق | المخرج الرئيسي | الوحدات المستخدمة | الـ endpoints / المسارات الرئيسية | المرجع المصدر | حالة الجاهزية |
| --- | --- | --- | --- | --- | --- |
| Shared Frontend | network/auth/design-system/app shell | `auth`, كل المسارات المحمية | `/auth/*`, `/health`, `/health/ready` | `API_REFERENCE.md`, `auth.openapi.json`, `AUTH_AND_SESSION_RULES.md` | جاهز |
| Admin Dashboard | لوحة الإدارة الكاملة | `users`, `academic-structure`, `students`, `attendance`, `assessments`, `behavior`, `transport`, `communication`, `reporting`, `homework` | `/users/*`, `/academic-structure/*`, `/students/*`, `/attendance/*`, `/assessments/*`, `/behavior/*`, `/transport/*`, `/communication/*`, `/reporting/*`, `/homework/*` | `BACKEND_WAVE1_STATUS.md`, `API_REFERENCE.md`, `admin-dashboard/*` | جاهز |
| Teacher App | تطبيق المعلم اليومي | `reporting`, `attendance`, `assessments`, `behavior`, `homework`, `communication` | `/reporting/dashboards/teacher/me`, `/attendance/*`, `/assessments/*`, `/behavior/*`, `/homework/*`, `/communication/*` | `BACKEND_WAVE1_STATUS.md`, `API_REFERENCE.md`, `teacher-app/*` | جاهز |
| Parent App | تطبيق ولي الأمر | `reporting`, `homework`, `communication` | `/reporting/dashboards/parent/me*`, `/reporting/transport/parent/me/students/:studentId/live-status`, `/homework/students/:studentId`, `/communication/*` | `BACKEND_WAVE1_STATUS.md`, `API_REFERENCE.md`, `parent-app/*` | جاهز |
| Supervisor App | تطبيق المشرف | `reporting`, `attendance`, `behavior`, `communication` | `/reporting/dashboards/supervisor/me`, `/reporting/students/:studentId/*`, `/attendance/*`, `/behavior/*`, `/communication/*` | `BACKEND_WAVE1_STATUS.md`, `API_REFERENCE.md`, `supervisor-app/*` | جاهز |
| Driver App | تطبيق السائق | `transport`, `reporting`, `communication` | `/transport/trips*`, `/transport/trips/:id/students`, `/reporting/transport/summary`, `/communication/recipients`, `/communication/*` | `BACKEND_WAVE1_STATUS.md`, `API_REFERENCE.md`, `driver-app/*` | جاهز |

## الاعتماديات الرئيسية بين الفرق

| من | يعتمد على | السبب |
| --- | --- | --- |
| Teacher App | Admin Dashboard master data | يحتاج teachers/classes/subjects/subject-offerings/students/assignments صحيحة |
| Parent App | Admin Dashboard + Daily Operations | يحتاج parent linkage + student data + reports + homework + transport assignment |
| Supervisor App | Admin Dashboard + Daily Operations | يحتاج supervisor assignments + attendance/behavior/reporting data |
| Driver App | Admin Dashboard transport setup | يحتاج buses/routes/stops/assignments/trips |

## ما الذي يُعد blocker حقيقي

- عدم جاهزية auth shell المشترك
- عدم جاهزية إدارة المستخدمين والهيكل الأكاديمي والطلاب
- عدم وجود strategy موحدة للتعامل مع `401/403/404/409/429`
- تجاهل ownership rules في parent/teacher/supervisor/driver flows

## ما الذي لا يعد blocker لبدء الفرونت

- Firebase / FCM / realtime transport
- Google Maps / ETA
- AI analytics
- 2FA
- advanced system settings
- CSV import إذا لم يعد مطلوبًا تشغيليًا

## روابط مباشرة لأدلة الفرق

- [لوحة الإدارة](../admin-dashboard/README.md)
- [تطبيق المعلم](../teacher-app/README.md)
- [تطبيق ولي الأمر](../parent-app/README.md)
- [تطبيق المشرف](../supervisor-app/README.md)
- [تطبيق السائق](../driver-app/README.md)

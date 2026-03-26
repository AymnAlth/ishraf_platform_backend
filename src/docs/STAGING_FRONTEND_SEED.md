# Staging Frontend Seed

هذا الملف يشرح بيانات الـ seed التشغيلية الموجودة على قاعدة `Neon` الخاصة بالبيئة المستضافة لتطوير الفرونت.

## الهدف

تجهيز قاعدة البيانات ببيانات مترابطة وقابلة للاستخدام من:

- لوحة الإدارة
- تطبيق المعلم
- تطبيق ولي الأمر
- تطبيق المشرف
- تطبيق السائق

## مصدر الـ seed

- SQL file: `src/database/seeds/staging_frontend_seed.sql`
- Runner script: `src/scripts/seed-staging-frontend-data.ts`

## طريقة التشغيل

من داخل المشروع:

```bash
pnpm deploy:seed-frontend-data
```

مهم:

- التنفيذ يستخدم `DATABASE_URL_MIGRATIONS` إذا كانت موجودة
- وإلا يستخدم `DATABASE_URL`
- الـ seed **idempotent additive**
- لا يحذف البيانات الحالية
- لا يغير كلمة مرور حساب `admin` الحالي الموجود مسبقًا

## كلمة المرور الموحدة لحسابات seed

جميع حسابات seed الجديدة تستخدم:

```text
SeedDev123!
```

## الحسابات المرجعية

### Admin

- `seed-admin-01@ishraf.local`
- `seed-admin-02@ishraf.local`

### Teacher

- `seed-teacher-01@ishraf.local`
- `seed-teacher-02@ishraf.local`
- `seed-teacher-03@ishraf.local`

### Parent

- `seed-parent-01@ishraf.local`
- `seed-parent-02@ishraf.local`
- `seed-parent-03@ishraf.local`

### Supervisor

- `seed-supervisor-01@ishraf.local`
- `seed-supervisor-02@ishraf.local`
- `seed-supervisor-03@ishraf.local`

### Driver

- `seed-driver-01@ishraf.local`
- `seed-driver-02@ishraf.local`
- `seed-driver-03@ishraf.local`

## البيانات المرجعية المهمة

### Academic structure

- Active academic year: `SEED AY 2025-2026`
- Active semester: `SEED Semester 2`
- Grade levels:
  - `SEED Grade 1`
  - `SEED Grade 2`
  - `SEED Grade 3`
- Classes:
  - `SEED-A`
  - `SEED-B`
  - `SEED-C`

### Students

- `SEED-STU-001` إلى `SEED-STU-009`

### Transport

- Routes:
  - `SEED-ROUTE-01`
  - `SEED-ROUTE-02`
  - `SEED-ROUTE-03`
- Buses:
  - `SEED-BUS-001`
  - `SEED-BUS-002`
  - `SEED-BUS-003`
- Recurring route assignments:
  - seeded between the transport buses and the seeded routes
- Student home locations:
  - seeded for operational transport testing
  - appear in driver roster only when approved

## التحقق السريع بعد التنفيذ

```sql
SELECT COUNT(*) AS users_count FROM users WHERE email LIKE 'seed-%@ishraf.local';
SELECT COUNT(*) AS students_count FROM students WHERE academic_no LIKE 'SEED-STU-%';
SELECT COUNT(*) AS homework_count FROM homework WHERE title LIKE '[Seed HW-%';
SELECT COUNT(*) AS trips_count FROM trips;
SELECT COUNT(*) AS route_assignments_count FROM transport_route_assignments;
SELECT COUNT(*) AS home_locations_count FROM student_transport_home_locations;
SELECT COUNT(*) AS messages_count FROM messages WHERE message_body LIKE '[Seed MSG-%';
SELECT COUNT(*) AS notifications_count FROM notifications WHERE title LIKE '[Seed NTF-%';
```

## Smoke checks مقترحة على الباك المستضاف

- `POST /api/v1/auth/login` بحساب من كل role
- `GET /api/v1/reporting/dashboards/admin/me`
- `GET /api/v1/reporting/dashboards/teacher/me`
- `GET /api/v1/reporting/dashboards/parent/me`
- `GET /api/v1/reporting/dashboards/supervisor/me`
- `GET /api/v1/transport/trips`
- `GET /api/v1/transport/route-assignments/me`
- `POST /api/v1/transport/trips/ensure-daily`
- `GET /api/v1/transport/trips/:id/students`
- `GET /api/v1/reporting/transport/summary`

## ملاحظة مهمة

إذا أردت تنفيذ نفس الـ SQL يدويًا داخل `https://console.neon.tech/`، فاستخدم الملف:

- `src/database/seeds/staging_frontend_seed.sql`

كما هو.

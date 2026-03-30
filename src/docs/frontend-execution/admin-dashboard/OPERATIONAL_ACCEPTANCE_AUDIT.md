# Operational Acceptance Audit

مهم:
- هذا التقرير وُلد قبل reset البيئة الحية بتاريخ `2026-03-30`
- المرجع الحالي للحسابات والبيانات الحية أصبح:
  - `src/docs/STAGING_FRONTEND_SEED.md`
- البيانات الأكاديمية والتشغيلية لم تعد seeded على البيئة الحالية

Generated at: 2026-03-29T22:33:57.877Z

## Execution Context

- App base URL: `http://127.0.0.1:5000`
- Auth ready: yes
- Authenticated admin: `mod87521@gmail.com`
- Overall result: pass
- Scenario results: 12 pass / 0 fail / 0 skipped

## Fixture Discovery

- academicYearId <- 11
- userId <- 46
- parentUserId <- 4
- teacherUserId <- 7
- supervisorUserId <- 10
- otherUserId <- 46
- studentId <- 36
- attendanceSessionId <- 14
- assessmentId <- 4
- behaviorRecordId <- 14
- homeworkId <- 10
- routeId <- 1
- tripId <- 6
- parentPreviewStudentId <- 7

## Scenario Audit

| Scenario | Route | Result | Failure Type | Notes |
| --- | --- | --- | --- | --- |
| `setup.students-create` | `/students/create` | pass | pass | Matched page text: إضافة طالب |
| `operations.attendance` | `/attendance` | pass | pass | Matched page text: جلسات الحضور |
| `operations.assessments` | `/assessments` | pass | pass | Matched page text: التقييمات |
| `operations.behavior` | `/behavior` | pass | pass | Matched page text: سجلات السلوك |
| `operations.homework` | `/homework` | pass | pass | Matched page text: الواجبات |
| `transport.student-assignments` | `/transport/assignments` | pass | pass | Matched page text: تعيينات الطلاب | Student assignment modal opened successfully. |
| `transport.manual-trip-create` | `/transport/trips` | pass | pass | Matched page text: الرحلات | Manual trip modal opened successfully. |
| `communication.compose` | `/communication/inbox` | pass | pass | Matched page text: الوارد | Unified composer opened from the inbox route and rendered the audience step. |
| `communication.reporting-context-compose` | `/reports/students/36` | pass | pass | Matched page text: تقرير الطالب | Report-context communication launch opened the composer with a locked student reference. |
| `communication.monitoring-parent-compose` | `/monitoring?role=parent&userId=4&studentId=7` | pass | pass | Matched page text: معاينة ولي الأمر | Parent preview launched the unified composer with the parent recipient preselected. |
| `monitoring.parent-preview` | `/monitoring?role=parent&userId=4&studentId=7` | pass | pass | Matched page text: معاينة ولي الأمر | Parent preview rendered transport section state: الحالة الحية للنقل |
| `reporting.student-profile` | `/reports/students/36` | pass | pass | Matched page text: تقرير الطالب |

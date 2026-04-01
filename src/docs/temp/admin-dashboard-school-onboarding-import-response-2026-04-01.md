# Backend Response: School Onboarding Import Service

تم اعتماد خدمة Backend رسمية لمسار `School Onboarding Import`.

## القرار النهائي

تم اختيار نموذج:
- `structured workbook payload`
- `dry-run`
- ثم `apply`
- مع `all-or-nothing`
- و`create-only v1`
- و`import audit trail`

ولم نعتمد:
- `raw Excel upload` في `v1`
- ولا loops كتابية من الفرونت
- ولا async jobs/queue system في هذه الجولة

## لماذا هذا القرار

هذا هو الشكل الأنسب للبنية الحالية لأنه:
- يحافظ على ownership الحالية في الفرونت لـ:
  - template export
  - local parsing
  - local validation
  - preview
- وينقل الجزء الحساس والمؤسسي إلى الباك:
  - natural-key resolution
  - re-validation
  - conflict detection
  - transaction safety
  - audit trail
  - idempotent apply

## المسارات المعتمدة

- `POST /api/v1/admin-imports/school-onboarding/dry-run`
- `POST /api/v1/admin-imports/school-onboarding/apply`
- `GET /api/v1/admin-imports/school-onboarding/history`
- `GET /api/v1/admin-imports/school-onboarding/history/:importId`

## القواعد المعتمدة

1. `dry-run` تستقبل workbook JSON منظمة، وليس ملف Excel ثنائي.
2. `apply` تعتمد على `dryRunId` من dry-run ناجحة ومحفوظة.
3. `apply` تعمل داخل transaction واحدة.
4. `v1` هي `create-only`:
   - لا update existing
   - لا delete
   - لا sync mode
5. `apply` idempotent:
   - إعادة الطلب على نفس `dryRunId` بعد نجاح سابق تعيد نفس النتيجة مع `alreadyApplied=true`
6. لا نسمح للفرونت بحل العلاقات الحساسة أو بناء rollback وهمي محليًا.
7. `activateAfterImport` يبقى supported، لكن التنفيذ الفعلي لا يحدث إلا داخل `apply` وبشرط النجاح الكامل.

## النطاق داخل v1

داخل النطاق:
- `AcademicYears`
- `Semesters`
- `GradeLevels`
- `Classes`
- `Subjects`
- `Users_Teachers`
- `Users_Supervisors`
- `Users_Parents`
- `Users_Drivers`
- `Students`
- `StudentParentLinks`
- `StudentEnrollments`
- `SubjectOfferings`
- `TeacherAssignments`
- `SupervisorAssignments`
- `Buses`
- `Routes`
- `RouteStops`
- `RouteAssignments`
- `StudentTransportAssignments`
- `StudentHomeLocations`

خارج النطاق:
- attendance
- assessments
- behavior
- homework
- trips
- communication records
- reporting outputs

## المطلوب من الفرونت الآن

1. أبقوا:
   - template export
   - local parsing
   - local validation
   - validation preview
2. لا تنفذوا:
   - create loops من المتصفح
   - partial import
   - fake rollback
3. بعد local preview:
   - استدعوا `POST /admin-imports/school-onboarding/dry-run`
4. لا تسمحوا بزر التطبيق النهائي إلا إذا:
   - `status = validated`
   - `canApply = true`
5. التطبيق النهائي يجب أن يستدعي:
   - `POST /admin-imports/school-onboarding/apply`
   - مع `dryRunId`
6. اعتمدوا history surfaces الجديدة لعرض:
   - dry-runs السابقة
   - attempts السابقة
   - details / reopen state

## سلوك الأخطاء

أمثلة codes المعتمدة:
- `template_version_mismatch`
- `missing_sheet`
- `header_mismatch`
- `duplicate_row_in_sheet`
- `duplicate_existing_record`
- `ambiguous_parent_reference`
- `ambiguous_teacher_reference`
- `ambiguous_supervisor_reference`
- `missing_target_active_year_reference`
- `missing_target_active_semester_reference`
- `dry_run_required`
- `dry_run_not_found`
- `dry_run_stale`
- `import_already_applied`

## المرجع النهائي

- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`
- `src/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md`

هذه هي العقود الرسمية المعتمدة للمرحلة التالية.

# KNOWLEDGE PAYLOAD INIT

| Key | Value |
| --- | --- |
| project | `ishraf-platform-backend` |
| commit | `982867c` |
| generated_from | `solid repo state only` |
| scope | `backend + docs` |
| generated_at | `2026-04-02 Asia/Aden` |
| excludes | `node_modules`, `dist`, `.git`, `.tmp`, `.vscode`, `ishraf_platform_admin_dashboard`, local untracked noise |

هذه الكبسولة تصف فقط الحالة الصلبة الحالية للباك إند والوثائق المرجعية التابعة له. أي تغييرات محلية غير committed أو ملفات غير متعقبة أو مشروع الفرونت المضمن ليست جزءًا من baseline هذه الكبسولة.

## الضوابط الصارمة (Core Directives)

- هذا الريبو هو مصدر الحقيقة للباك إند فقط؛ مشروع الفرونت المضمن `ishraf_platform_admin_dashboard/` يُقرأ للتحليل ولا يُعدّل من هنا.
- التعديل يجب أن يحافظ على `modular monolith` الحالية بدل إدخال تفكيك خدمات أو حلول متوازية غير لازمة.
- طبقة التنفيذ المعتمدة هي: `routes -> controller -> service -> repository -> SQL/DB`.
- جميع المدخلات العامة تمر عبر validation صريحة باستخدام `zod` أو validators module-local.
- جميع الاستجابات تلتزم envelope موحدة: `success`, `message`, `data` أو `errors`.
- جميع المعرفات العامة تعاد كسلاسل `string` حتى عندما تكون `bigint` في PostgreSQL.
- لا تُستخدم destructive git commands مثل `reset --hard` أو `checkout --` لحل المشاكل.
- لا يتم التراجع عن تغييرات المستخدم أو تغييرات محلية خارج نطاق الطلب.
- التوثيق المرجعي يجب أن يبقى متزامنًا مع الكود:
  - `API_REFERENCE.md`
  - `OpenAPI`
  - `Postman`
  - `frontend-execution/*` عند الحاجة
- أي gap بنيوي لا يُحل عبر workaround من الفرونت إذا كان القرار المؤسسي الصحيح يقتضي backend fix أو endpoint/service additive.
- حيثما تم توحيد العقود، المسار المفضل في لوحات الإدارة هو `users.id` بدل profile ids:
  - `parentId`
  - `driverId`
  - `teacherId`
  - `supervisorId`
- `Active Academic Context` هو السياق التشغيلي اليومي الرسمي:
  - سنة دراسية نشطة واحدة
  - فصل نشط واحد
  - السطوح التشغيلية اليومية يجب أن تعمل عليهما فقط
- `subjects` تبقى master data على مستوى `grade level` فقط.
- `subject-offerings` هي الطبقة الرسمية لـ semester-aware subject availability.
- `student_academic_enrollments` هي النموذج الأكاديمي الانتقالي الصحيح للحالة الأكاديمية حسب السنة؛ `students.class_id` لم يعد النموذج النهائي طويل المدى.
- `School Onboarding Import` تعتمد:
  - `structured workbook payload`
  - `dry-run`
  - `apply`
  - `all-or-nothing`
  - `create-only v1`
  - `import audit trail`
- عند تعطل `apply_patch` بيئيًا، fallback العملي الذي استُخدم هو PowerShell مع تحقق build/tests؛ لكن التعديل اليدوي الافتراضي يظل عبر patch-based editing.

## معمارية المشروع (Architecture)

### Root Runtime / Config Files

| Path | وظيفة الملف الحالية |
| --- | --- |
| `.env.example` | قالب متغيرات البيئة المحلية للتشغيل التطويري. |
| `.env.render.example` | قالب متغيرات Render/production-like بدون أسرار فعلية. |
| `.env.test.example` | قالب بيئة الاختبارات التكاملية على قاعدة بيانات test-only. |
| `.gitignore` | قواعد استبعاد الملفات المحلية والملفات المولدة من Git. |
| `.node-version` | إصدار Node المتوقع محليًا. |
| `README.md` | مدخل التشغيل العام، deployment summary، وروابط الوثائق الأساسية. |
| `eslint.config.js` | إعداد ESLint للمشروع TypeScript/Node. |
| `node-pg-migrate.config.js` | إعداد tool المايغريشنات لـ PostgreSQL. |
| `package.json` | تعريف المشروع، السكربتات، والاعتمادات الأساسية. |
| `pnpm-lock.yaml` | lockfile معتمد لإصدارات الحزم. |
| `prettier.config.js` | إعدادات التنسيق الموحدة. |
| `render.yaml` | تعريف خدمة Render وبيئة الاستضافة المرجعية. |
| `tsconfig.json` | إعداد TypeScript compilation إلى `dist/`. |
| `vitest.config.ts` | إعداد Vitest للوحدات والاختبارات. |

### Root Scripts

| Path | وظيفة الملف الحالية |
| --- | --- |
| `scripts/reconcile-openapi-postman.mjs` | مولد ومصالح عقود `OpenAPI/Postman` من runtime routes والـ examples الموثقة. |

### `src/app`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/index.ts` | entrypoint التشغيل الذي يقلع الخادم. |
| `src/app/app.ts` | إنشاء تطبيق Express وتجميع middlewares وroutes. |
| `src/app/module-registry.ts` | تسجيل modules الفعلية المحملة runtime. |
| `src/app/routes.ts` | تجميع root routes وAPI routes المشتركة. |
| `src/app/server.ts` | تشغيل HTTP server وإدارة bootstrap lifecycle. |

### `src/common`

#### base

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/common/base/http-response.ts` | builders موحدة لنجاح/فشل HTTP envelopes. |

#### errors

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/common/errors/app-error.ts` | الخطأ الأساسي للتطبيق مع status/code موحدين. |
| `src/common/errors/conflict-error.ts` | خطأ تضارب domain/unique constraints. |
| `src/common/errors/forbidden-error.ts` | خطأ صلاحيات/منع وصول. |
| `src/common/errors/not-found-error.ts` | خطأ عدم وجود الكيان المطلوب. |
| `src/common/errors/postgres-error.ts` | ترجمة أخطاء PostgreSQL إلى domain-safe errors. |
| `src/common/errors/too-many-requests-error.ts` | خطأ rate limiting. |
| `src/common/errors/unauthorized-error.ts` | خطأ مصادقة/توكن غير صالح. |
| `src/common/errors/validation-error.ts` | خطأ validation حقول structured. |

#### interfaces

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/common/interfaces/app-module.interface.ts` | عقدة module registry الموحدة. |
| `src/common/interfaces/queryable.interface.ts` | واجهة DB client/repository القابلة للتمرير داخل transactions. |

#### middlewares

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/common/middlewares/auth.middleware.ts` | Bearer auth parsing والتحقق وإرفاق `authUser`. |
| `src/common/middlewares/error-handler.ts` | central Express error handling وتحويل الأخطاء إلى envelopes. |
| `src/common/middlewares/request-logger.middleware.ts` | request logging المرتبط بـ `pino`. |
| `src/common/middlewares/validation.middleware.ts` | تشغيل zod schemas على `body/query/params`. |

#### services

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/common/services/active-academic-context.service.ts` | حل والتحقق من `active academic year + active semester` للسلوك اليومي. |
| `src/common/services/ownership.service.ts` | خدمات ownership checks بين user/student/parent وغيرها. |
| `src/common/services/profile-resolution.service.ts` | resolver مركزي لتحويل `users.id` إلى profile ids عند الحاجة. |

#### types

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/common/types/auth.types.ts` | أنواع المستخدم المصادق والتوكنات. |
| `src/common/types/express.d.ts` | augmentations لـ Express request/response locals. |
| `src/common/types/http.types.ts` | أنواع envelopes وHTTP helpers. |
| `src/common/types/pagination.types.ts` | أنواع pagination metadata والقوائم. |
| `src/common/types/profile.types.ts` | أنواع موحدة للبروفايلات domain-wide. |

#### utils

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/common/utils/async-handler.ts` | wrapper موحد لـ async Express handlers. |
| `src/common/utils/date.util.ts` | أدوات مساعدة للتواريخ والمقارنات الزمنية. |
| `src/common/utils/pagination.util.ts` | helpers لبناء paginated responses. |
| `src/common/utils/password.util.ts` | hashing/password helpers واشتقاق كلمات مرور عند الحاجة. |
| `src/common/utils/request-log.util.ts` | تنسيق سجلات الطلبات وربطها بالسياق. |
| `src/common/utils/token.util.ts` | helpers لإصدار والتحقق من JWTs. |

#### validators

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/common/validators/query.validator.ts` | reusable query schemas مثل `page/limit/sort`. |

### `src/config`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/config/constants.ts` | ثوابت عامة مشتركة بين الموديولات. |
| `src/config/database.ts` | أسماء الجداول/المفاتيح المرجعية الثابتة لطبقة البيانات. |
| `src/config/env.ts` | تحميل وvalidation متغيرات البيئة runtime. |
| `src/config/http.ts` | إعدادات HTTP/CORS/body-limit/trust proxy. |
| `src/config/jwt.ts` | إعدادات JWT TTL/secrets wiring. |
| `src/config/logger.ts` | إعداد `pino` وlog level. |

### `src/database`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/database/db.ts` | PostgreSQL pool + transaction helper الرئيسية. |
| `src/database/queries/index.ts` | نقطة تجميع SQL fragments/queries المشتركة. |
| `src/database/seeds/staging_frontend_seed.sql` | seed عربية متكاملة للبيئة المستضافة ولوحات الاختبار. |
| `src/database/migrations/1730000000000_init_auth_schema.js` | المايغريشن الأساسية لإنشاء auth/users والهيكل الأولي. |
| `src/database/migrations/1731000000000_transport_alignment.js` | توحيد طبقة النقل recurring assignments/home locations/trip validation. |
| `src/database/migrations/1731100000000_subject_offerings.js` | إضافة `subject_offerings` كطبقة ربط المادة بالفصل. |
| `src/database/migrations/1731200000000_communication_multi_target.js` | دعم bulk communication وmulti-role announcements. |
| `src/database/migrations/1731300000000_active_academic_context_and_enrollments.js` | تأسيس `Active Academic Context` و`student_academic_enrollments`. |
| `src/database/migrations/1731310000000_student_enrollment_compatibility_trigger.js` | trigger توافق انتقالي بين enrollments وحقول الطلاب القديمة. |
| `src/database/migrations/1731400000000_school_onboarding_import_runs.js` | جدول audit/history لخدمة School Onboarding Import. |

### `src/docs`

#### top-level docs

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/docs/ADDING_ENDPOINTS.md` | مرجع داخلي لإضافة endpoints وتحديث العقود. |
| `src/docs/API_REFERENCE.md` | المرجع البشري التشغيلي النهائي للعقود الحالية. |
| `src/docs/BACKEND_WAVE1_STATUS.md` | ملخص status backend الجاهز للاستهلاك الأمامي. |
| `src/docs/DEPLOY_RENDER_NEON.md` | خطوات النشر والتشغيل على Render + Neon. |
| `src/docs/LEGACY_DOC_ALIGNMENT.md` | توثيق محاذاة العقود الجديدة مع الفرضيات القديمة. |
| `src/docs/OPENAPI_POSTMAN_AUDIT.md` | تقرير تغطية runtime مقابل OpenAPI/Postman. |
| `src/docs/STAGING_FRONTEND_SEED.md` | مرجع dataset العربية الحالية على البيئة المستضافة. |
| `src/docs/TESTING_WITH_OPENAPI_AND_POSTMAN.md` | دليل اختبار الواجهات عبر OpenAPI/Postman. |

#### frontend-execution

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/docs/frontend-execution/BACKEND_STATUS_CONFIRMATION.md` | تأكيد backend readiness العام لاستهلاك الواجهات. |
| `src/docs/frontend-execution/README.md` | مدخل الحزمة التنفيذية لكل تطبيقات الفرونت. |
| `src/docs/frontend-execution/management/EXECUTION_MATRIX.md` | مصفوفة التنفيذ العليا بين التطبيقات والقدرات. |
| `src/docs/frontend-execution/shared/AUTH_AND_SESSION_RULES.md` | قواعد session/auth المشتركة للواجهات. |
| `src/docs/frontend-execution/shared/COMMON_FRONTEND_RULES.md` | قواعد دمج frontends المشتركة مع الباك. |
| `src/docs/frontend-execution/shared/DELIVERY_SEQUENCE.md` | ترتيب تسليم وتكامل الواجهات. |
| `src/docs/frontend-execution/admin-dashboard/README.md` | مدخل تنفيذ لوحة الإدارة ومرجع الصفحات الأساسية. |
| `src/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md` | الخريطة النهائية للـ endpoints المستخدمة في لوحة الإدارة. |
| `src/docs/frontend-execution/admin-dashboard/SCREENS_AND_TASKS.md` | مهام الشاشات والإجراءات الإدارية التفصيلية. |
| `src/docs/frontend-execution/admin-dashboard/QA_AND_ACCEPTANCE.md` | شروط الجودة والقبول الخاصة بلوحة الإدارة. |
| `src/docs/frontend-execution/admin-dashboard/READ_ROUTE_STABILITY_AUDIT.md` | تدقيق مسارات القراءة المستقرة للوحة الإدارة. |
| `src/docs/frontend-execution/admin-dashboard/OPERATIONAL_ACCEPTANCE_AUDIT.md` | تدقيق المسارات التشغيلية الفعلية للوحة الإدارة. |
| `src/docs/frontend-execution/admin-dashboard/LIVE_ACCEPTANCE_ENVIRONMENT_READINESS.md` | جاهزية البيئة المستضافة لقبول لوحة الإدارة. |
| `src/docs/frontend-execution/admin-dashboard/RESIDUAL_BACKEND_DEPENDENCIES_BACKLOG.md` | ما تبقى من gaps backend المؤسسية للوحة الإدارة. |
| `src/docs/frontend-execution/admin-dashboard/ATTENDANCE_BEHAVIOR_ROUTE_ALIGNMENT.md` | محاذاة عقود attendance/behavior مع الفهم الأمامي. |
| `src/docs/frontend-execution/admin-dashboard/ADMIN_WORKBENCH_AND_ACTIVE_CONTEXT_MIGRATION.md` | خطة ترحيل لوحة الإدارة إلى Admin Workbench وActive Context. |
| `src/docs/frontend-execution/admin-dashboard/ADMIN_DASHBOARD_SEED_COVERAGE_MATRIX.md` | مصفوفة تغطية الـ seed الحالية شاشة بشاشة للوحة الإدارة. |
| `src/docs/frontend-execution/driver-app/README.md` | مدخل تنفيذ تطبيق السائق. |
| `src/docs/frontend-execution/driver-app/ENDPOINT_MAP.md` | خريطة endpoints لتطبيق السائق. |
| `src/docs/frontend-execution/driver-app/SCREENS_AND_TASKS.md` | شاشات ومهام تطبيق السائق. |
| `src/docs/frontend-execution/driver-app/QA_AND_ACCEPTANCE.md` | شروط القبول والجودة لتطبيق السائق. |
| `src/docs/frontend-execution/parent-app/README.md` | مدخل تنفيذ تطبيق ولي الأمر. |
| `src/docs/frontend-execution/parent-app/ENDPOINT_MAP.md` | خريطة endpoints لتطبيق ولي الأمر. |
| `src/docs/frontend-execution/parent-app/SCREENS_AND_TASKS.md` | شاشات ومهام تطبيق ولي الأمر. |
| `src/docs/frontend-execution/parent-app/QA_AND_ACCEPTANCE.md` | شروط القبول والجودة لتطبيق ولي الأمر. |
| `src/docs/frontend-execution/supervisor-app/README.md` | مدخل تنفيذ تطبيق المشرف. |
| `src/docs/frontend-execution/supervisor-app/ENDPOINT_MAP.md` | خريطة endpoints لتطبيق المشرف. |
| `src/docs/frontend-execution/supervisor-app/SCREENS_AND_TASKS.md` | شاشات ومهام تطبيق المشرف. |
| `src/docs/frontend-execution/supervisor-app/QA_AND_ACCEPTANCE.md` | شروط القبول والجودة لتطبيق المشرف. |
| `src/docs/frontend-execution/teacher-app/README.md` | مدخل تنفيذ تطبيق المعلم. |
| `src/docs/frontend-execution/teacher-app/ENDPOINT_MAP.md` | خريطة endpoints لتطبيق المعلم. |
| `src/docs/frontend-execution/teacher-app/SCREENS_AND_TASKS.md` | شاشات ومهام تطبيق المعلم. |
| `src/docs/frontend-execution/teacher-app/QA_AND_ACCEPTANCE.md` | شروط القبول والجودة لتطبيق المعلم. |

#### generated API artifacts

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/docs/openapi/auth.openapi.json` | OpenAPI subset لمسارات auth فقط. |
| `src/docs/openapi/ishraf-platform.openapi.json` | OpenAPI الكاملة المطابقة لـ runtime الحالية. |
| `src/docs/postman/auth.postman_collection.json` | Postman subset لمسارات auth فقط. |
| `src/docs/postman/ishraf-platform.postman_collection.json` | Postman collection الكاملة المطابقة لـ runtime. |
| `src/docs/postman/ishraf-platform.staging.postman_environment.json` | بيئة Postman الجاهزة للاستضافة. |

#### handoff snapshots / temp

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/docs/temp/admin-dashboard-admin-preview-monitoring-response-2026-03-29.md` | رد اعتماد backend لمسارات admin preview monitoring. |
| `src/docs/temp/admin-dashboard-communication-multi-target-response-2026-03-30.md` | رد اعتماد Communication Phase 2. |
| `src/docs/temp/admin-dashboard-driver-bus-assignment-response-2026-03-27.md` | رد اعتماد توحيد `driverId` على `users.id`. |
| `src/docs/temp/admin-dashboard-parent-link-id-response-2026-03-27.md` | رد اعتماد parent linking عبر `users.id`. |
| `src/docs/temp/admin-dashboard-school-onboarding-import-response-2026-04-01.md` | رد اعتماد خدمة School Onboarding Import. |
| `src/docs/temp/admin-dashboard-subject-offerings-response-2026-03-27.md` | رد اعتماد طبقة `subject-offerings`. |
| `src/docs/temp/admin-dashboard-teacher-supervisor-userid-resolver-response-2026-03-29.md` | رد اعتماد resolver `teacherId/supervisorId` عبر `users.id`. |
| `src/docs/temp/driver-app-backend-response-2026-03-26.md` | رد handoff لتطبيق السائق في موجة النقل. |

#### transport docs

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/docs/transport/admin-dashboard-transport-handoff.md` | handoff خاص بتدفقات النقل في لوحة الإدارة. |
| `src/docs/transport/driver-app-transport-handoff.md` | handoff خاص بتدفقات النقل في تطبيق السائق. |

### `src/modules`

#### Registered modules

- `auth`
- `users`
- `academic-structure`
- `students`
- `behavior`
- `assessments`
- `attendance`
- `transport`
- `communication`
- `homework`
- `reporting`
- `admin-imports`

#### `src/modules/auth`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/auth/index.ts` | export entry لموديول المصادقة. |
| `src/modules/auth/controller/auth.controller.ts` | handlers لمسارات login/refresh/logout/password flows. |
| `src/modules/auth/dto/auth-response.dto.ts` | DTO response shapes الخاصة بالمصادقة. |
| `src/modules/auth/dto/change-password.dto.ts` | DTO تغيير كلمة المرور. |
| `src/modules/auth/dto/forgot-password.dto.ts` | DTO طلب استرجاع كلمة المرور. |
| `src/modules/auth/dto/login.dto.ts` | DTO تسجيل الدخول. |
| `src/modules/auth/dto/logout.dto.ts` | DTO تسجيل الخروج. |
| `src/modules/auth/dto/refresh-token.dto.ts` | DTO تدوير refresh token. |
| `src/modules/auth/dto/reset-password.dto.ts` | DTO إعادة تعيين كلمة المرور. |
| `src/modules/auth/mapper/auth.mapper.ts` | mapping بين rows والاستجابات auth-friendly. |
| `src/modules/auth/policies/auth.policy.ts` | سياسات الوصول لمسارات auth. |
| `src/modules/auth/repository/auth.repository.ts` | SQL data access لتوكنات المستخدمين والمصادقة. |
| `src/modules/auth/routes/auth.routes.ts` | تعريف مسارات auth. |
| `src/modules/auth/service/auth.service.ts` | use-cases للمصادقة والتوكنات وكلمات المرور. |
| `src/modules/auth/types/auth.types.ts` | أنواع داخلية لموديول auth. |
| `src/modules/auth/validator/auth.validator.ts` | validation schemas لمسارات auth. |

#### `src/modules/users`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/users/index.ts` | export entry لموديول المستخدمين. |
| `src/modules/users/controller/users.controller.ts` | handlers لإدارة المستخدمين من جهة admin. |
| `src/modules/users/dto/create-user.dto.ts` | DTO إنشاء مستخدم جديد مع role profile. |
| `src/modules/users/dto/update-user-status.dto.ts` | DTO تفعيل/تعطيل المستخدم. |
| `src/modules/users/dto/update-user.dto.ts` | DTO تعديل بيانات المستخدم وبروفايله. |
| `src/modules/users/dto/user-response.dto.ts` | DTO responses الخاصة بعرض المستخدم. |
| `src/modules/users/mapper/users.mapper.ts` | mapping من rows إلى unified user responses. |
| `src/modules/users/policies/users.policy.ts` | سياسات admin-only لموديول المستخدمين. |
| `src/modules/users/repository/users.repository.ts` | SQL data access للحسابات والبروفايلات حسب الدور. |
| `src/modules/users/routes/users.routes.ts` | تعريف مسارات users. |
| `src/modules/users/service/users.service.ts` | use-cases إدارة المستخدمين وتفعيلهم. |
| `src/modules/users/types/users.types.ts` | أنواع داخلية لموديول users. |
| `src/modules/users/validator/users.validator.ts` | validation schemas لمسارات المستخدمين. |

#### `src/modules/academic-structure`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/academic-structure/index.ts` | export entry لموديول الهيكل الأكاديمي. |
| `src/modules/academic-structure/controller/academic-structure.controller.ts` | handlers للسنوات والفصول والمستويات والصفوف والمواد والتعيينات والسياق النشط. |
| `src/modules/academic-structure/dto/academic-structure.dto.ts` | DTOs لمخرجات ومدخلات الهيكل الأكاديمي. |
| `src/modules/academic-structure/mapper/academic-structure.mapper.ts` | mapping بين rows والاستجابات الأكاديمية. |
| `src/modules/academic-structure/policies/academic-structure.policy.ts` | سياسات admin-only للهيكل الأكاديمي. |
| `src/modules/academic-structure/repository/academic-structure.repository.ts` | SQL access للسنوات والفصول والصفوف والمواد وofferings والتعيينات. |
| `src/modules/academic-structure/routes/academic-structure.routes.ts` | تعريف مسارات academic-structure بما فيها active context. |
| `src/modules/academic-structure/service/academic-structure.service.ts` | use-cases للهيكل الأكاديمي وإدارة التعيينات والـ offerings. |
| `src/modules/academic-structure/types/academic-structure.types.ts` | أنواع داخلية للكيانات الأكاديمية. |
| `src/modules/academic-structure/validator/academic-structure.validator.ts` | validation schemas للسنوات والفصول والصفوف والمواد والتعيينات. |

#### `src/modules/students`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/students/index.ts` | export entry لموديول الطلاب. |
| `src/modules/students/controller/students.controller.ts` | handlers للطلاب وروابط أولياء الأمور والترقيات والـ enrollments. |
| `src/modules/students/dto/students.dto.ts` | DTOs لعمليات الطلاب والتسجيلات الأكاديمية. |
| `src/modules/students/mapper/students.mapper.ts` | mapping لعرض الطالب وحالته الأكاديمية الحالية. |
| `src/modules/students/policies/students.policy.ts` | سياسات الوصول لمسارات الطلاب. |
| `src/modules/students/repository/students.repository.ts` | SQL access للطلاب، parent links، promotions، enrollments. |
| `src/modules/students/routes/students.routes.ts` | تعريف مسارات الطلاب والـ enrollments. |
| `src/modules/students/service/students.service.ts` | use-cases الطلاب، الربط، الترقية، وإدارة enrollments. |
| `src/modules/students/types/students.types.ts` | أنواع داخلية لموديول الطلاب. |
| `src/modules/students/validator/students.validator.ts` | validation schemas لعمليات الطلاب. |

#### `src/modules/attendance`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/attendance/index.ts` | export entry لموديول الحضور. |
| `src/modules/attendance/controller/attendance.controller.ts` | handlers لإنشاء جلسات الحضور وحفظ السجلات. |
| `src/modules/attendance/dto/attendance.dto.ts` | DTOs لجلسات وسجلات الحضور. |
| `src/modules/attendance/mapper/attendance.mapper.ts` | mapping لاستجابات جلسات الحضور والروستر. |
| `src/modules/attendance/policies/attendance.policy.ts` | سياسات الوصول للحضور حسب الدور. |
| `src/modules/attendance/repository/attendance.repository.ts` | SQL access لجلسات وسجلات الحضور. |
| `src/modules/attendance/routes/attendance.routes.ts` | تعريف مسارات attendance sessions/records. |
| `src/modules/attendance/service/attendance.service.ts` | use-cases الحضور active-context-first والتحقق من subject offerings. |
| `src/modules/attendance/types/attendance.types.ts` | أنواع داخلية لموديول الحضور. |
| `src/modules/attendance/validator/attendance.validator.ts` | validation schemas للحضور. |

#### `src/modules/assessments`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/assessments/index.ts` | export entry لموديول التقييمات. |
| `src/modules/assessments/controller/assessments.controller.ts` | handlers لأنواع التقييم والتقييمات والدرجات. |
| `src/modules/assessments/dto/assessments.dto.ts` | DTOs لأنواع التقييم والتقييمات والسكور. |
| `src/modules/assessments/mapper/assessments.mapper.ts` | mapping لاستجابات التقييمات والدرجات. |
| `src/modules/assessments/policies/assessments.policy.ts` | سياسات الوصول للتقييمات. |
| `src/modules/assessments/repository/assessments.repository.ts` | SQL access لأنواع التقييم والتقييمات ودرجات الطلاب. |
| `src/modules/assessments/routes/assessments.routes.ts` | تعريف مسارات assessments/types/scores. |
| `src/modules/assessments/service/assessments.service.ts` | use-cases التقييمات active-context-first والتحقق من التعيين والتوفر. |
| `src/modules/assessments/types/assessments.types.ts` | أنواع داخلية لموديول التقييمات. |
| `src/modules/assessments/validator/assessments.validator.ts` | validation schemas للتقييمات. |

#### `src/modules/behavior`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/behavior/index.ts` | export entry لموديول السلوك. |
| `src/modules/behavior/controller/behavior.controller.ts` | handlers لفئات السلوك والسجلات والتايملاين. |
| `src/modules/behavior/dto/behavior.dto.ts` | DTOs لفئات وسجلات السلوك. |
| `src/modules/behavior/mapper/behavior.mapper.ts` | mapping لاستجابات السلوك والملخصات. |
| `src/modules/behavior/policies/behavior.policy.ts` | سياسات الوصول لسجلات السلوك. |
| `src/modules/behavior/repository/behavior.repository.ts` | SQL access لفئات السلوك والسجلات والملخصات. |
| `src/modules/behavior/routes/behavior.routes.ts` | تعريف مسارات behavior categories/records. |
| `src/modules/behavior/service/behavior.service.ts` | use-cases السلوك active-context-first مع actor resolution. |
| `src/modules/behavior/types/behavior.types.ts` | أنواع داخلية لموديول السلوك. |
| `src/modules/behavior/validator/behavior.validator.ts` | validation schemas للسلوك. |

#### `src/modules/transport`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/transport/index.ts` | export entry لموديول النقل. |
| `src/modules/transport/controller/transport.controller.ts` | handlers للحافلات والخطوط والمواقف والتعيينات والرحلات. |
| `src/modules/transport/dto/transport.dto.ts` | DTOs لطبقات النقل الثابتة والتشغيلية. |
| `src/modules/transport/mapper/transport.mapper.ts` | mapping لاستجابات النقل والرحلات والروستر. |
| `src/modules/transport/policies/transport.policy.ts` | سياسات الوصول لمسارات النقل. |
| `src/modules/transport/repository/transport.repository.ts` | SQL access لجميع كيانات النقل. |
| `src/modules/transport/routes/transport.routes.ts` | تعريف مسارات buses/routes/stops/assignments/trips/home-location. |
| `src/modules/transport/service/transport.service.ts` | use-cases النقل مع resolver `driverId` وتحقق التغطية اليومية. |
| `src/modules/transport/types/transport.types.ts` | أنواع داخلية لموديول النقل. |
| `src/modules/transport/validator/transport.validator.ts` | validation schemas للنقل. |

#### `src/modules/communication`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/communication/index.ts` | export entry لموديول التواصل. |
| `src/modules/communication/controller/communication.controller.ts` | handlers للرسائل والإعلانات والإشعارات. |
| `src/modules/communication/dto/communication.dto.ts` | DTOs للتواصل الفردي والجماعي. |
| `src/modules/communication/mapper/communication.mapper.ts` | mapping لاستجابات الرسائل والإعلانات والإشعارات. |
| `src/modules/communication/policies/communication.policy.ts` | سياسات الوصول للتواصل حسب الدور. |
| `src/modules/communication/repository/communication.repository.ts` | SQL access للرسائل والإعلانات والإشعارات وrecipient lists. |
| `src/modules/communication/routes/communication.routes.ts` | تعريف مسارات communication بما فيها bulk endpoints. |
| `src/modules/communication/service/communication.service.ts` | use-cases الرسائل الفردية والجماعية والإعلانات متعددة الأدوار. |
| `src/modules/communication/types/communication.types.ts` | أنواع داخلية لموديول التواصل. |
| `src/modules/communication/validator/communication.validator.ts` | validation schemas للتواصل. |

#### `src/modules/homework`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/homework/index.ts` | export entry لموديول الواجبات. |
| `src/modules/homework/controller/homework.controller.ts` | handlers لإنشاء الواجبات وإدارة التسليمات. |
| `src/modules/homework/dto/homework.dto.ts` | DTOs للواجبات وتسليماتها. |
| `src/modules/homework/mapper/homework.mapper.ts` | mapping لاستجابات الواجبات وروستر التسليم. |
| `src/modules/homework/policies/homework.policy.ts` | سياسات الوصول للواجبات. |
| `src/modules/homework/repository/homework.repository.ts` | SQL access للواجبات وتسليماتها. |
| `src/modules/homework/routes/homework.routes.ts` | تعريف مسارات homework. |
| `src/modules/homework/service/homework.service.ts` | use-cases الواجبات active-context-first والتحقق من subject offerings. |
| `src/modules/homework/types/homework.types.ts` | أنواع داخلية لموديول الواجبات. |
| `src/modules/homework/validator/homework.validator.ts` | validation schemas للواجبات. |

#### `src/modules/reporting`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/reporting/index.ts` | export entry لموديول التقارير ولوحات المتابعة. |
| `src/modules/reporting/controller/reporting.controller.ts` | handlers للداشبورد، الملخصات، وadmin preview surfaces. |
| `src/modules/reporting/dto/reporting.dto.ts` | DTOs لملخصات التقارير ولوحات الأدوار. |
| `src/modules/reporting/mapper/reporting.mapper.ts` | mapping لاستجابات dashboards والتقارير الأكاديمية. |
| `src/modules/reporting/policies/reporting.policy.ts` | سياسات الوصول للتقارير والإدمن preview. |
| `src/modules/reporting/repository/reporting.repository.ts` | SQL access للـ dashboards، summaries، وpreview lookups. |
| `src/modules/reporting/routes/reporting.routes.ts` | تعريف مسارات reporting وadmin-preview monitoring. |
| `src/modules/reporting/service/reporting.service.ts` | use-cases لوحات الأدوار والتقارير وadmin-safe previews. |
| `src/modules/reporting/types/reporting.types.ts` | أنواع داخلية لموديول reporting. |
| `src/modules/reporting/validator/reporting.validator.ts` | validation schemas للتقارير ومعلمات المعاينة. |

#### `src/modules/admin-imports`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/admin-imports/controller/admin-imports.controller.ts` | handlers لـ dry-run/apply/history لمسار School Onboarding Import. |
| `src/modules/admin-imports/dto/admin-imports.dto.ts` | DTOs لهيكل workbook، config، وstructured validation results. |
| `src/modules/admin-imports/module/admin-imports.module.ts` | تجميع module wiring لموديول admin-imports. |
| `src/modules/admin-imports/policies/admin-imports.policy.ts` | سياسات admin-only لمسارات الاستيراد المؤسسي. |
| `src/modules/admin-imports/repository/admin-imports.repository.ts` | SQL access لسجل عمليات الاستيراد والعلاقات المرجعية. |
| `src/modules/admin-imports/routes/admin-imports.routes.ts` | تعريف مسارات `/admin-imports/school-onboarding/*`. |
| `src/modules/admin-imports/school-onboarding.constants.ts` | الثوابت الرسمية لأسماء الأوراق والإصدارات والأكواد. |
| `src/modules/admin-imports/service/admin-imports.service.ts` | façade لخدمة dry-run/apply/history مع idempotent apply. |
| `src/modules/admin-imports/service/school-onboarding-import.engine.ts` | محرك resolver/validation/planning/commit لخدمة onboarding المدرسي. |
| `src/modules/admin-imports/types/admin-imports.types.ts` | الأنواع الداخلية لخطط الاستيراد وملخصاته. |
| `src/modules/admin-imports/validator/admin-imports.validator.ts` | validation schemas لطلبات dry-run/apply/history. |

#### Internal / supporting modules

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/modules/automation/index.ts` | export entry لموديول automation الداخلي. |
| `src/modules/automation/repository/automation.repository.ts` | SQL helpers لعمليات automation والصيانة. |
| `src/modules/automation/service/automation.service.ts` | use-cases مساندة للمهام الآلية backend-side. |
| `src/modules/automation/types/automation.types.ts` | أنواع داخلية لموديول automation. |
| `src/modules/promotions/index.ts` | نقطة تصدير توافقية لمسار promotions أثناء الانتقال إلى enrollments. |

### `src/scripts`

| Path | وظيفة الملف الحالية |
| --- | --- |
| `src/scripts/bootstrap-admin.ts` | سكربت إنشاء أو مزامنة حساب الأدمن الأساسي. |
| `src/scripts/fix-placeholder-passwords.ts` | سكربت تصحيح كلمات المرور المؤقتة للحسابات seeded. |
| `src/scripts/reset-minimal-accounts.ts` | سكربت إعادة القاعدة إلى حسابات دنيا فقط مع الحفاظ على الأدمن الأساسي. |
| `src/scripts/seed-staging-frontend-data.ts` | سكربت حقن الـ seed العربية الكاملة لبيئة staging/frontends. |
| `src/scripts/smoke-deploy.ts` | smoke checks على health/readiness والعقود الأساسية بعد النشر. |

### `tests`

#### fixtures

| Path | وظيفة الملف الحالية |
| --- | --- |
| `tests/fixtures/auth.fixture.ts` | بيانات fixture مساعدة لاختبارات auth. |

#### helpers

| Path | وظيفة الملف الحالية |
| --- | --- |
| `tests/helpers/app-helper.ts` | helper لتجهيز التطبيق أثناء الاختبارات. |
| `tests/helpers/auth-helper.ts` | helper لتسجيل الدخول وتوليد ترويسات auth في الاختبارات. |
| `tests/helpers/integration-context.ts` | سياق مشترك لاختبارات التكامل وربط قاعدة الاختبار. |

#### setup

| Path | وظيفة الملف الحالية |
| --- | --- |
| `tests/setup/reset-test-db.ts` | إعادة بناء قاعدة الاختبار وتشغيل migrations/seed الاختبارية. |
| `tests/setup/run-integration-tests.ts` | orchestrator لتشغيل اختبارات التكامل على DB معزولة. |
| `tests/setup/seed-test-data.ts` | seed dataset خاصة باختبارات التكامل. |
| `tests/setup/test-db.ts` | utilities اتصال وحماية لقاعدة الاختبار. |
| `tests/setup/vitest.setup.ts` | bootstrap عام لـ Vitest. |

#### integration

| Path | وظيفة الملف الحالية |
| --- | --- |
| `tests/integration/integration.test.ts` | entry جامع لتشغيل suites التكاملية. |
| `tests/integration/access/access.integration.ts` | تحقق تكامل access control عبر الأدوار. |
| `tests/integration/academic/academic.integration.ts` | تحقق تكاملي للهيكل الأكاديمي والـ active context. |
| `tests/integration/admin-imports/admin-imports.integration.ts` | تحقق dry-run/apply/history لخدمة School Onboarding Import. |
| `tests/integration/app/security.integration.ts` | تحقق تكاملي لميدلويرات الأمان والـ headers العامة. |
| `tests/integration/assessments/assessments.integration.ts` | تحقق تكاملي لتدفقات التقييمات والدرجات. |
| `tests/integration/attendance/attendance.integration.ts` | تحقق تكاملي لجلسات وسجلات الحضور. |
| `tests/integration/auth/auth.integration.ts` | تحقق تكاملي لتسجيل الدخول والتوكنات واسترجاع كلمة المرور. |
| `tests/integration/automation/automation.integration.ts` | تحقق تكاملي للعمليات الآلية المساندة. |
| `tests/integration/behavior/behavior.integration.ts` | تحقق تكاملي لسجلات وفئات السلوك. |
| `tests/integration/communication/communication.integration.ts` | تحقق تكاملي للرسائل والإشعارات والإعلانات والـ bulk contracts. |
| `tests/integration/homework/homework.integration.ts` | تحقق تكاملي لإنشاء الواجبات والتسليمات. |
| `tests/integration/migrations/migrations.integration.ts` | تحقق تكاملي لصحة migrations بعد الإقلاع على DB نظيفة. |
| `tests/integration/reporting/reporting.integration.ts` | تحقق تكاملي للوحات reporting وadmin preview. |
| `tests/integration/students/students.integration.ts` | تحقق تكاملي للطلاب والروابط والترقيات والـ enrollments. |
| `tests/integration/transport/transport.integration.ts` | تحقق تكاملي للنقل وتوحيد `driverId`. |
| `tests/integration/users/users.integration.ts` | تحقق تكاملي لإدارة المستخدمين من جهة admin. |

#### unit

| Path | وظيفة الملف الحالية |
| --- | --- |
| `tests/unit/academic-structure.mapper.test.ts` | اختبارات mapper الخاصة بالهيكل الأكاديمي. |
| `tests/unit/academic-structure.service.test.ts` | اختبارات service الخاصة بالهيكل الأكاديمي والـ active context. |
| `tests/unit/academic-structure.validator.test.ts` | اختبارات validator الخاصة بالهيكل الأكاديمي. |
| `tests/unit/assessments.mapper.test.ts` | اختبارات mapper الخاصة بالتقييمات. |
| `tests/unit/assessments.service.test.ts` | اختبارات service الخاصة بالتقييمات. |
| `tests/unit/assessments.validator.test.ts` | اختبارات validator الخاصة بالتقييمات. |
| `tests/unit/attendance.mapper.test.ts` | اختبارات mapper الخاصة بالحضور. |
| `tests/unit/attendance.service.test.ts` | اختبارات service الخاصة بالحضور. |
| `tests/unit/attendance.validator.test.ts` | اختبارات validator الخاصة بالحضور. |
| `tests/unit/auth.mapper.test.ts` | اختبارات mapper الخاصة بالمصادقة. |
| `tests/unit/auth.policy.test.ts` | اختبارات policy الخاصة بالمصادقة. |
| `tests/unit/auth.service.test.ts` | اختبارات service الخاصة بالمصادقة. |
| `tests/unit/automation.service.test.ts` | اختبارات service الخاصة بالمهام الآلية. |
| `tests/unit/behavior.mapper.test.ts` | اختبارات mapper الخاصة بالسلوك. |
| `tests/unit/behavior.service.test.ts` | اختبارات service الخاصة بالسلوك. |
| `tests/unit/behavior.validator.test.ts` | اختبارات validator الخاصة بالسلوك. |
| `tests/unit/common/ownership.service.test.ts` | اختبارات ownership service وتحقق الملكية. |
| `tests/unit/common/profile-resolution.service.test.ts` | اختبارات profile resolution عبر `users.id` وprofile ids. |
| `tests/unit/communication.mapper.test.ts` | اختبارات mapper الخاصة بالتواصل. |
| `tests/unit/communication.service.test.ts` | اختبارات service الخاصة بالتواصل وbulk semantics. |
| `tests/unit/communication.validator.test.ts` | اختبارات validator الخاصة بالتواصل. |
| `tests/unit/env.test.ts` | اختبارات قراءة متغيرات البيئة والتحقق منها. |
| `tests/unit/fix-placeholder-passwords.test.ts` | اختبارات سكربت إصلاح كلمات المرور المؤقتة. |
| `tests/unit/homework.service.test.ts` | اختبارات service الخاصة بالواجبات. |
| `tests/unit/http-config.test.ts` | اختبارات إعدادات HTTP والـ limits والـ proxy. |
| `tests/unit/password.util.test.ts` | اختبارات utilities كلمات المرور. |
| `tests/unit/postgres-error.test.ts` | اختبارات تحويل أخطاء Postgres إلى AppErrors. |
| `tests/unit/reporting.mapper.test.ts` | اختبارات mapper الخاصة بالتقارير. |
| `tests/unit/reporting.service.test.ts` | اختبارات service الخاصة بالتقارير وadmin preview. |
| `tests/unit/request-log.util.test.ts` | اختبارات utilities سجلات الطلبات. |
| `tests/unit/students.mapper.test.ts` | اختبارات mapper الخاصة بالطلاب. |
| `tests/unit/students.service.test.ts` | اختبارات service الخاصة بالطلاب والـ enrollments. |
| `tests/unit/students.validator.test.ts` | اختبارات validator الخاصة بالطلاب. |
| `tests/unit/token.util.test.ts` | اختبارات utilities JWT/refresh/reset tokens. |
| `tests/unit/transport.service.test.ts` | اختبارات service الخاصة بالنقل. |
| `tests/unit/transport.validator.test.ts` | اختبارات validator الخاصة بالنقل. |
| `tests/unit/users.mapper.test.ts` | اختبارات mapper الخاصة بالمستخدمين. |
| `tests/unit/users.service.test.ts` | اختبارات service الخاصة بالمستخدمين. |
| `tests/unit/users.validator.test.ts` | اختبارات validator الخاصة بالمستخدمين. |

## المكدس التقني (Tech Stack)

### Runtime / language

- `Node.js >=24.13.1 <25`
- `pnpm >=10.0.0`
- `TypeScript 5.9.3`
- `CommonJS` runtime packaging

### HTTP / application framework

- `Express 5.1.0`
- `helmet 8.1.0`
- `cors 2.8.5`
- `pino 10.0.0`

### Database / persistence

- `PostgreSQL`
- `pg 8.16.3`
- `node-pg-migrate 8.0.3`
- معمارية `SQL-first` تعتمد repositories ومشاهدات وقواعد DB واضحة

### Validation / auth / security

- `zod 4.1.11`
- `jsonwebtoken 9.0.2`
- `bcrypt 6.0.0`
- rate limiting عبر إعدادات auth في الطبقة التطبيقية

### Tooling / build / tests

- `tsx 4.20.6`
- `vitest 3.2.4`
- `supertest 7.1.4`
- `eslint 9.38.0`
- `prettier 3.6.2`
- `typescript-eslint 8.46.0`

### Architectural style

- `modular monolith`
- `Express + controllers + services + repositories + validators + mappers`
- `OpenAPI/Postman generated and reconciled locally` عبر `scripts/reconcile-openapi-postman.mjs`
- companion frontend project `ishraf_platform_admin_dashboard/` موجود داخل الريبو للقراءة فقط، وليس جزءًا من runtime backend

## الحالة المنجزة (Current State)

### Contract and delivery baseline

- baseline المرجعي لهذه الكبسولة هو `HEAD 982867c`.
- تغطية التوثيق التعاقدي الحالية:
  - `OpenAPI = 150/150`
  - `Postman = 150/150`
- آخر capability مضافة ومرفوعة هي:
  - `School Onboarding Import`
- آخر migration مطبقة في السلسلة الحالية:
  - `1731400000000_school_onboarding_import_runs.js`

### Capabilities المنجزة والمستقرة

- **Auth**
  - login / refresh / logout
  - forgot/reset password
  - change password
  - JWT access/refresh model
- **Users admin management**
  - إنشاء الحسابات حسب الدور
  - تعديل البيانات
  - تفعيل/تعطيل المستخدمين
  - surfaces موحدة لعرض البروفايلات حسب الدور
- **Academic Structure**
  - academic years / semesters / grade levels / classes / subjects
  - `subject-offerings` كطبقة semester-aware رسمية
  - teacher/supervisor assignments
  - resolver داخلي يقبل `users.id` مع الحفاظ على التوافق الخلفي
  - `GET/PATCH /academic-structure/context/active`
- **Students**
  - إنشاء وإدارة الطلاب
  - parent linking عبر `users.id`
  - promotion model انتقالي
  - `student_academic_enrollments` كنموذج الحالة الأكاديمية حسب السنة
- **Operational modules**
  - `attendance`
  - `assessments`
  - `behavior`
  - `homework`
  - جميعها تعمل الآن بنمط `active-context-first`
- **Transport**
  - buses / routes / stops / assignments / trips / home locations
  - `driverId` يقبل `users.id` للمسار الرسمي مع بقاء التوافق الخلفي
- **Communication Phase 2**
  - `messages/bulk`
  - `notifications/bulk`
  - multi-role announcements
  - direct multi-target semantics = one-to-one copies without group thread
- **Reporting**
  - dashboards للأدوار
  - summaries أكاديمية وتشغيلية
  - `admin preview / monitoring surfaces` للأب والمعلم والمشرف
- **Admin Imports**
  - `POST /admin-imports/school-onboarding/dry-run`
  - `POST /admin-imports/school-onboarding/apply`
  - `GET /admin-imports/school-onboarding/history`
  - `GET /admin-imports/school-onboarding/history/:importId`
  - import audit trail
  - create-only v1
  - all-or-nothing commit semantics
  - idempotent apply based on `dryRunId`

### Data and hosted environment state

- البيئة المرجعية الحالية موثقة في `src/docs/STAGING_FRONTEND_SEED.md`.
- القاعدة المرجعية الحالية تحتوي Arabic staging seed متكاملة بدل الحسابات الدنيا فقط.
- الأدمن الأساسي المحفوظ:
  - `mod87521@gmail.com`
- السياق الأكاديمي النشط المرجعي في الاستضافة:
  - السنة: `2025-2026`
  - الفصل: `الفصل الثاني`
- seed الحالية تغطي:
  - users/profiles
  - academic structure
  - students + enrollments + parent links + promotions
  - attendance / assessments / behavior / homework
  - transport
  - communication
  - reporting-friendly data surfaces

## المتغيرات والإعدادات (Environment & Config)

### Core runtime variables

| المتغير | الغرض | النطاق |
| --- | --- | --- |
| `NODE_ENV` | تحديد نمط التشغيل `development/test/production`. | runtime / local / test / render |
| `PORT` | منفذ الاستماع المحلي للتطبيق. | local / test |
| `APP_NAME` | اسم الخدمة الظاهر في السجلات والبيئة. | runtime / render |
| `API_PREFIX` | البادئة العامة لمسارات الـ API. | runtime |
| `PUBLIC_ROOT_URL` | الجذر العام للخدمة المستضافة أو المحلية. | runtime / render |
| `PUBLIC_API_BASE_URL` | العنوان العام الكامل للـ API. | runtime / render |
| `DATABASE_URL` | اتصال PostgreSQL التشغيلي. | runtime / render |
| `DATABASE_URL_MIGRATIONS` | اتصال PostgreSQL المخصص للمهاجرات، ويستخدم direct connection على Neon. | runtime / render |
| `TEST_DATABASE_URL` | اتصال قاعدة الاختبار المعزولة. | test only |
| `DATABASE_SCHEMA` | اسم الـ schema المستهدف داخل PostgreSQL. | runtime / test / render |

### Auth / security variables

| المتغير | الغرض | النطاق |
| --- | --- | --- |
| `ACCESS_TOKEN_SECRET` | سر توقيع access tokens. | runtime / render |
| `ACCESS_TOKEN_TTL_MINUTES` | عمر access token بالدقائق. | runtime / render / test |
| `REFRESH_TOKEN_SECRET` | سر توقيع refresh tokens. | runtime / render |
| `REFRESH_TOKEN_TTL_DAYS` | عمر refresh token بالأيام. | runtime / render / test |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | عمر صلاحية reset tokens. | runtime / render / test |
| `AUTH_LOGIN_RATE_LIMIT_MAX` | الحد الأقصى لمحاولات login ضمن النافذة الزمنية. | runtime / render / test |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS` | نافذة rate limit الخاصة بتسجيل الدخول. | runtime / render / test |
| `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX` | الحد الأقصى لطلبات password reset ضمن النافذة الزمنية. | runtime / render / test |
| `AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS` | نافذة rate limit الخاصة بطلبات reset password. | runtime / render / test |
| `AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE` | كشف reset token في الاستجابة لأغراض التطوير/الاختبار فقط. | local / test / render override |
| `BCRYPT_SALT_ROUNDS` | عدد جولات hashing لكلمات المرور. | runtime / render / test |

### HTTP / infra variables

| المتغير | الغرض | النطاق |
| --- | --- | --- |
| `CORS_ALLOWED_ORIGINS` | قائمة origins المسموح بها للوصول إلى الـ API. | runtime / render / test |
| `TRUST_PROXY` | تفعيل trust proxy عند التشغيل خلف Render أو proxy مشابه. | runtime / render |
| `REQUEST_BODY_LIMIT` | الحد الأقصى لحجم body للطلبات. | runtime / render / test |
| `LOG_LEVEL` | مستوى السجلات المخرجة من pino/logger. | runtime / render / test |
| `RUN_DESTRUCTIVE_INTEGRATION_TESTS` | مفتاح أمان لتفعيل عمليات اختبارية مدمرة على DB الاختبار فقط. | test / local |

### Runtime URLs

- التطوير المحلي يعتمد عادة:
  - `PUBLIC_ROOT_URL=http://localhost:4000`
  - `PUBLIC_API_BASE_URL=http://localhost:4000/api/v1`
- الاستضافة المرجعية الحالية على Render تعتمد:
  - root URL عام للخدمة
  - API base URL مطابقًا له مع `/api/v1`

### Testing DB safety

- `TEST_DATABASE_URL` معزولة عن `DATABASE_URL`.
- سكربتات `tests/setup/reset-test-db.ts` و`tests/setup/test-db.ts` تُستخدم لعزل قاعدة الاختبار قبل suites التكامل.
- المتغير `RUN_DESTRUCTIVE_INTEGRATION_TESTS` موجود لضبط أي عمليات قد تمس البيانات أثناء بيئة الاختبار.

### Deployment targets = Render + Neon

- التطبيق منشور كخدمة `web` على Render.
- قاعدة البيانات التشغيلية على Neon Postgres.
- `DATABASE_URL` مخصصة عادة للاتصال pooled.
- `DATABASE_URL_MIGRATIONS` مخصصة للاتصال المباشر أثناء migrations.
- ملف `.neon` يحتوي معرفات الربط التنظيمية `projectId` و`orgId` فقط، دون أسرار تشغيلية.

## المهام المعلقة (Pending Tasks)

- لا يوجد backend regression مفتوح ناتج عن آخر تنفيذ.
- آخر capability backend مكتملة ومرفوعة:
  - `School Onboarding Import`
- نقطة التوقف الفعلية بعد هذه الحالة الصلبة:
  - frontend integration لاستهلاك:
    - `school-onboarding dry-run/apply/history`
  - واستكمال frontend migration إلى:
    - `Active Academic Context`
    - `Admin Workbench`
- الأعمال المتبقية في هذه المرحلة frontend-facing وليست backend gaps معروفة.
- أي working-tree noise محلي أو ملفات غير متعقبة لا تُعتبر جزءًا من هذه الحالة المرجعية.

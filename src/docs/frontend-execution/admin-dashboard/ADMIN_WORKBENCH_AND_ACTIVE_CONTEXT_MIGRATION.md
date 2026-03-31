# ترحيل لوحة الإدارة إلى `Active Academic Context` و`Admin Workbench`

هذه الوثيقة هي المرجع التنفيذي الرسمي لمطوري لوحة الإدارة في هذه المرحلة.

الهدف ليس بناء شاشة إضافية فقط، بل **إعادة تنظيم تجربة الإدارة** بحيث:

- تعتمد كل surfaces التشغيلية اليومية على:
  - `Active Academic Year`
  - `Active Semester`
- وتتحول لوحة الإدارة من:
  - `page-first`
- إلى:
  - `workflow-first`

مهم:

- لا توجد حاجة إلى backend جديدة في هذه المرحلة.
- لا يُعاد بناء المشروع من الصفر.
- لا تُكسر routing الحالية.
- التنفيذ يجب أن يكون additive وآمنًا.

## 1. النموذج المؤسسي النهائي

### 1.1 السياق العام

- السنة الدراسية النشطة + الفصل النشط هما السياق التشغيلي الرسمي للوحة الإدارة.
- السطوح اليومية لا تعرض بيانات من سنوات غير نشطة.
- السنوات غير النشطة تبقى فقط داخل:
  - `Academic Management`
  - history/reference views
  - planning / promotion flows

### 1.2 أنواع الحالات التي يجب التمييز بينها في UI

- `Unavailable`
  - لا يوجد `active academic context`
  - يجب أن يقود المستخدم إلى ضبط السياق
- `Setup required`
  - يوجد active context لكن prerequisites ناقصة
  - يجب عرض الخطوة التالية بوضوح
- `Empty state`
  - السياق جاهز لكن لا توجد بيانات بعد
  - هذا ليس خطأ
- `History / planning`
  - موجودة داخل `Academic Management` فقط

## 2. القرار التنفيذي الأساسي

### 2.1 لا تنشئوا route جديدة مستقلة للـ workbench

القرار المعتمد:

- **حوّلوا شاشة dashboard الحالية نفسها إلى `Admin Setup & Operations Workbench`**

السبب:

- هذا يمنع كسر التنقل الحالي
- ويجعل أول شاشة بعد login هي شاشة التوجيه الصحيحة
- ويتيح إعادة استخدام:
  - `GET /reporting/dashboards/admin/me`
  - `usePlatformReadiness`
  - `GET /academic-structure/context/active`

### 2.2 الطبقات الثلاث في الواجهة

- `Admin Workbench`
  - surface التوجيه واتخاذ الخطوة التالية
- `Academic Management`
  - إعداد السنوات والفصول والصفوف والمواد والتعيينات والتخطيط
- `Daily Operations`
  - الطلاب
  - الحضور
  - التقييمات
  - السلوك
  - الواجبات
  - التقارير
  - المراقبة

## 3. ما الذي يجب بناؤه فعليًا

### 3.1 طبقة سياق أكاديمي مركزية

اعتمدوا provider أو shell wrapper فوق:

- `GET /api/v1/academic-structure/context/active`

ويجب أن يوفّر مركزيًا:

- `academicYear`
- `semester`
- `hasActiveContext`
- `activeContextLabel`
- `isUnavailable`
- `isLoading`

نقطة الدمج:

- `AdminLayout`
- `Topbar`
- dashboard / workbench
- route guards للسطوح التشغيلية

لا تبنوا منطق context مختلفًا في كل صفحة.

### 3.2 تحويل dashboard إلى workbench

يجب أن تتكون dashboard من 4 أقسام مرتبة:

1. `السياق الأكاديمي النشط`
2. `جاهزية الإعداد الأكاديمي`
3. `تشغيل اليوم`
4. `التحضير للسنة القادمة`

ويجب أن تحتوي على:

- بطاقة current active context
- زر واضح لفتح `ActiveAcademicContextModal`
- readiness checklist حي
- next required action واحدة واضحة
- quick actions للانتقال المباشر
- warning cards عند غياب prerequisites
- الإحصاءات الحالية من `admin dashboard summary` أسفل workbench، لا بدلًا عنه

### 3.3 مكونات مشتركة يجب إضافتها

اعتمدوا هذه المكونات أو ما يكافئها بنفس السلوك:

- `OperationalSurfaceGuard`
  - إذا لا يوجد active context يعرض `Unavailable` مع CTA إلى `/academic/years`
- `SetupRequiredCard`
  - إذا active context موجود لكن prerequisites ناقصة
- `ActiveContextHeader`
  - badge موحد أعلى كل surface تشغيلية
- `NextActionsPanel`
  - أزرار الخطوة التالية داخل صفحات الإدارة والتفاصيل

لا تكرروا رسائل readiness بشكل يدوي داخل كل صفحة إلا إذا كانت الصفحة تحتاج استثناء واضحًا.

## 4. ما الذي يتغير في الشاشات

### 4.1 Dashboard

- تتحول إلى `Admin Workbench`
- لا تبقى مجرد summary cards
- يجب أن تكون أول surface توجّه المستخدم إلى:
  - ضبط السياق
  - إكمال الإعداد الأكاديمي
  - تشغيل اليوم
  - التخطيط للعام القادم

### 4.2 Academic Years / Semesters

- تبقيان surfaces الإدارة الرسمية للسنة والفصل
- `PATCH /academic-structure/context/active` هو التدفق الرسمي للتفعيل
- `PATCH /academic-structure/academic-years/:id/activate` تعامل كـ legacy utility فقط
- يجب أن يظهر بوضوح:
  - ما السنة النشطة
  - ما الفصل النشط
  - ما الخطوة التالية بعد إنشاء السنة أو الفصل

### 4.3 Classes

- تبقى صفحة إدارة تفصيلية
- بعد إنشاء الصف:
  - يجب تحديد الصف الجديد تلقائيًا
  - وتظهر `NextActionsPanel` واضحة:
    - تعيين معلم
    - تعيين مشرف
    - فتح planning لهذا الصف
- لا تتركوا المستخدم يكتشف هذه العلاقات من الروابط الجانبية فقط

### 4.4 Subjects

- المادة تبقى `master data`
- لا تربطوا المادة مباشرة بالفصل داخل صفحة المادة
- بعد إنشاء المادة:
  - اختاروها تلقائيًا في الجدول/السياق
  - اعرضوا CTA واضحة:
    - `تفعيل المادة في الفصل النشط`
    - وتنقل إلى `subject-offerings`
- في detail/context panel يجب أن يظهر بوضوح:
  - هذه مادة master data
  - الإتاحة الفصلية تتم عبر `subject-offerings`

### 4.5 Subject Offerings

- هي surface الإتاحة الفصلية الرسمية
- يجب أن تعرض بوضوح:
  - active context
  - filters بحسب:
    - السنة
    - الفصل
    - الصف
    - المادة
- أضيفوا summary panel يوضح:
  - كم مادة متاحة الآن في الفصل النشط
  - وما الخطوة التالية:
    - تعيين المعلمين

### 4.6 Teacher Assignments / Supervisor Assignments

- تبقى صفحات إدارة تفصيلية
- يجب أن تعرض داخل context panel:
  - أين يقع هذا التعيين داخل الإعداد العام
  - وما الذي يفتحه بعدها
- `teacherId` و`supervisorId` يجب أن يعتمدا دائمًا على `users.id`
- عند نجاح create/update:
  - اعرضوا CTA للانتقال إلى surface التشغيل المرتبطة
  - وليس مجرد toast نجاح

### 4.7 Academic Planning

- هذه surface **Academic Management**
- ليست surface تشغيل يومي
- يجب أن تعرض بوضوح:
  - current active year
  - target year/class
  - أن هذا surface للتحضير والترقية المنظمة
- لا تقدموها للمستخدم كـ “تعديل مباشر لحالة الطالب اليومية”

### 4.8 Students List

- تصبح operational roster للسنة النشطة فقط
- لا تعرضوا بيانات سنة غير نشطة
- اعرضوا active context header موحد
- إذا لا يوجد active context:
  - `Unavailable`
- إذا يوجد active context ولا يوجد طلاب:
  - `Empty`
- لا تجعلوا المستخدم يفهم ذلك من خلال أخطاء API الخام

### 4.9 Create Student

اجعلوا الصفحة onboarding flow داخل نفس route الحالية، لا route جديدة:

1. الهوية + enrollment الحالية
2. ربط ولي الأمر
3. بيانات النقل/الموقع المنزلي

السلوك المطلوب:

- form sections واضحة كخطوات
- إغلاق الخطوات اللاحقة إذا prerequisites غير مكتملة
- بعد النجاح:
  - الانتقال إلى `StudentDetailPage`
  - مع notice منظم
  - ومع `NextActionsPanel` جاهزة:
    - مراجعة البيانات
    - ربط ولي أمر إضافي
    - فتح النقل
    - فتح التقارير
    - فتح planning

### 4.10 Student Detail

افصلوا بوضوح بين:

- `الحالة الحالية`
- `السجل الأكاديمي`
- `التخطيط/الترقية`
- `الوالدان`
- `السلوك`
- `الواجبات`
- `النقل`

والقرار المهم:

- `active enrollment` هي ما يجب اعتباره “الحالة الحالية”
- `academic enrollments` الأخرى هي history/planning
- لا تعتمدوا طويلًا على `students.class_id` كحقيقة UI نهائية

### 4.11 Daily Operational Pages

هذه الصفحات يجب أن تكون `active-context-only`:

- attendance
- assessments
- behavior
- homework
- reporting
- monitoring

القاعدة:

- لا year/semester selector يومي
- لا عرض لسنوات أخرى
- استخدموا `ActiveContextHeader`
- استخدموا `OperationalSurfaceGuard`
- تعاملوا مع `409 Academic context not configured` كـ unavailable state موحدة

### 4.12 Monitoring

- اعتمدوا بالكامل على:
  - `reporting/admin-preview/*`
- لا تعودوا إلى تجميع preview محليًا
- parent-first preview هو المسار الرسمي

### 4.13 Communication

- استخدموا bulk contracts الجديدة في multi-target
- لا loops من الفرونت
- recipient selection يجب أن يعتمد على:
  - `/communication/recipients`
- لا تبنوا أي compose flow جديد على `/users` مباشرة إلا عندما يكون ذلك جزءًا من workflow آخر غير communication

## 5. تسلسل التنفيذ المقترح لمطور الفرونت

1. تحويل dashboard إلى workbench
2. إدخال shared active-context shell
3. توحيد unavailable/setup/empty states
4. تحسين صفحات:
   - classes
   - subjects
   - subject-offerings
   - teacher-assignments
   - supervisor-assignments
5. تحويل create student إلى onboarding flow
6. إعادة تنظيم `StudentDetailPage`
7. تنظيف daily operational pages من أي سلوك غير active-context-first
8. تحديث docs والـ QA references

## 6. قواعد عدم الكسر

- لا تغيّروا routing الأساسية إلا إذا كان التغيير additive.
- لا تنقلوا logic جديدًا إلى backend في هذه الدفعة.
- لا تكسروا الصفحات الحالية أثناء إضافة workbench.
- لا تزيلوا أي شاشة قائمة قبل أن يصبح البديل جاهزًا ومندمجًا.
- لا تستخدموا local assumptions تخالف:
  - `ENDPOINT_MAP`
  - `API_REFERENCE`
  - `STAGING_FRONTEND_SEED`

## 7. مراجع التنفيذ

- `src/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md`
- `src/docs/frontend-execution/admin-dashboard/SCREENS_AND_TASKS.md`
- `src/docs/frontend-execution/admin-dashboard/ADMIN_DASHBOARD_SEED_COVERAGE_MATRIX.md`
- `src/docs/STAGING_FRONTEND_SEED.md`
- `src/docs/API_REFERENCE.md`

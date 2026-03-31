# مصفوفة تغطية Seed لشاشات لوحة الإدارة

هذا الملف يربط بين:

- الشاشات الحالية في لوحة الإدارة
- العقود الخلفية المستخدمة
- dependencies المطلوبة
- وما المتوقع أن يظهر الآن فوق seed العربية الحالية

المرجع النهائي لحسابات البيئة والبيانات الحية:

- `src/docs/STAGING_FRONTEND_SEED.md`

## 1. ملخص مهم

- البيئة الحالية **ليست فارغة**
- لذلك التوقع الافتراضي في معظم الشاشات الأساسية يجب أن يكون:
  - وجود بيانات فعلية
  - لا empty state
- إذا ظهرت empty state في screen أساسية الآن، فهذا غالبًا واحد من:
  - bug في filter/context
  - الشاشة تعتمد active context غير مهيأ محليًا
  - mismatch بين surface والشروط التشغيلية

## 2. السطوح الأساسية

| Surface | Primary Endpoints | Context Mode | Expected State On Current Seed | Meaning If Empty |
| --- | --- | --- | --- | --- |
| Dashboard / Workbench | `GET /reporting/dashboards/admin/me` + `GET /academic-structure/context/active` + readiness queries | `active-context-only` | يجب أن يظهر context نشط + summary + readiness | bug أو mismatch في readiness إذا اختفى كل شيء |
| Academic Years | `GET /academic-structure/academic-years` | `academic-management` | يجب أن تظهر 3 سنوات | empty هنا غير متوقع |
| Semesters | `GET /academic-structure/academic-years/:id/semesters` | `academic-management` | يجب أن تظهر 6 فصول موزعة على 3 سنوات | empty هنا غير متوقع |
| Grade Levels | `GET /academic-structure/grade-levels` | `master-data` | يجب أن تظهر 4 مستويات | empty هنا غير متوقع |
| Classes | `GET /academic-structure/classes` | `academic-management` مع active context hint | يجب أن تظهر صفوف السنة النشطة عند الفلترة الافتراضية | empty قد يعني active-year filter غير صحيح |
| Subjects | `GET /academic-structure/subjects` | `master-data` | يجب أن تظهر 12 مادة | empty هنا غير متوقع |
| Subject Offerings | `GET /academic-structure/subject-offerings` | `academic-management` | يجب أن تظهر offerings فعلية، وفي السنة النشطة توجد بيانات | empty قد يعني academicYearId/semesterId filter خاطئ |
| Teacher Assignments | `GET /academic-structure/teacher-assignments` | `academic-management` | يجب أن تظهر تعيينات فعلية | empty قد يعني year filter أو resolver bug |
| Supervisor Assignments | `GET /academic-structure/supervisor-assignments` | `academic-management` | يجب أن تظهر تعيينات فعلية | empty قد يعني year filter أو resolver bug |
| Academic Planning | `GET /students/academic-enrollments` | `academic-management` | يجب أن تظهر enrollments فعلية وتاريخية/حالية | empty غير متوقع على seed الحالية |
| Students List | `GET /students` | `active-context-only` | يجب أن تظهر roster السنة النشطة | empty قد يعني active context غير مقروء أو filter class/status غير صحيح |
| Create Student | `GET /academic-structure/context/active` + `GET /academic-structure/classes` + `GET /users?role=parent` | `active-context-only` | يجب أن تكون prerequisites مكتملة ويمكن الإنشاء | block state يعني فشل readiness وليس نقص seed |
| Student Detail | `GET /students/:id` + tabs related endpoints | mixed | يجب أن تعمل جميع التبويبات الأساسية لطلاب seed | empty في تبويب محدد قد يكون منطقيًا حسب الطالب |
| Attendance | `GET /attendance/sessions` + create dependencies | `active-context-only` | يجب أن تظهر جلسات فعلية | empty قد يعني mismatch مع السنة/الفصل النشطين |
| Assessments | `GET /assessments` + types + dependencies | `active-context-only` | يجب أن تظهر تقييمات فعلية | empty قد يعني mismatch مع subject offerings أو active context |
| Behavior | `GET /behavior/records` + categories | `active-context-only` | يجب أن تظهر سجلات فعلية | empty قد يعني filter actor/category أو context |
| Homework | `GET /homework` | `active-context-only` | يجب أن تظهر واجبات فعلية | empty قد يعني context mismatch |
| Reporting Hub | student reporting endpoints | `active-context-only` مع zero-safe summaries | يجب أن تعمل على الأقل لبعض الطلاب ببيانات فعلية | empty summary لبعض الطلاب قد يكون مقبولًا حسب payload |
| Monitoring | `GET /reporting/admin-preview/*` | `active-context-only` | يجب أن تعمل parent/teacher/supervisor preview على حسابات seed الحالية | empty هنا غير متوقع إن كان الاختيار صحيحًا |
| Transport Management | buses/routes/assignments/trips endpoints | mixed | يجب أن تظهر bus واحدة وخط واحد وتعيينات ورحلتان | empty قد يعني route filter أو عدم قراءة البيانات الجديدة |
| Communication | inbox/sent/announcements/notifications/recipients | mixed | يجب أن تظهر بيانات فعلية ورسائل/إعلانات/إشعارات | empty قد يعني استخدام endpoint أو filter غير مناسب |

## 3. dependencies الرسمية قبل اعتبار الشاشة “جاهزة”

### Daily Operational Surfaces

هذه الشاشات لا تعتبر جاهزة إلا إذا توفّر:

- `active academic year`
- `active semester`

وبحسب الشاشة:

- attendance:
  - classes
  - subject offerings
  - teacher assignments
- assessments:
  - classes
  - assessment types
  - subject offerings
  - teacher assignments
- behavior:
  - classes
  - behavior categories
- homework:
  - classes
  - subject offerings
  - teacher assignments
- students:
  - active context
  - classes

### Academic Management

هذه الشاشات لا يجب أن تُحجب لمجرد أن اليومي غير جاهز.  
لكن كل شاشة داخلها لها prerequisites خاصة:

- semesters تحتاج academic years
- classes تحتاج academic years + grade levels
- subjects تحتاج grade levels
- subject offerings تحتاج:
  - grade levels
  - subjects
  - semesters
- teacher assignments تحتاج:
  - academic years
  - classes
  - subjects
- supervisor assignments تحتاج:
  - academic years
  - classes
- planning تحتاج:
  - academic years
  - classes

## 4. ما الذي يجب أن يراه المستخدم الآن على seed الحالية

### يجب أن يظهر مباشرة

- active context مضبوط
- dashboard summary
- academic years / semesters / classes / subjects / offerings
- teacher assignments / supervisor assignments
- students list
- academic planning table
- attendance / assessments / behavior / homework قوائم فعلية
- transport setup + active trips/history
- communication surfaces
- monitoring previews

### قد يظهر فارغًا لكن بشكل منطقي حسب الاختيار

- تفاصيل طالب بعينه إذا اخترت طالبًا لا يملك بيانات في تبويب فرعي معين
- reporting summary لبعض الطلاب إذا كانت السجلات قليلة
- بعض filters المتخصصة في القوائم

### يجب ألا يفسر كـ bug

- `409 Academic context not configured`
  - فقط إذا فُقد السياق النشط فعلًا
- zero-safe summaries
  - في reporting
- empty state بعد تضييق الفلاتر يدويًا

## 5. أخطاء التفسير الشائعة التي يجب تجنبها

- لا تفترضوا أن كل empty state تعني نقص seed
- لا تفترضوا أن كل صفحة يجب أن تعرض كل البيانات الموجودة في القاعدة
- لا تختلط عليكم:
  - `active-context-only`
  - مع `academic-management`
- لا تبنوا workaround محليًا قبل التحقق من:
  - هل الصفحة daily أم management؟
  - هل filter السنة/الفصل مفروضة؟
  - هل الـ endpoint paginated أو zero-safe؟

## 6. استخدام هذه المصفوفة أثناء التطوير

عند مراجعة أي شاشة:

1. حدّد نوعها:
   - daily operational
   - academic management
   - master data
2. راجع endpoint المعتمدة لها
3. راجع dependencies
4. قارن المتوقع من seed الحالية
5. بعدها فقط احكم:
   - bug frontend
   - bug backend
   - expected empty/unavailable state

## 7. المراجع

- `src/docs/STAGING_FRONTEND_SEED.md`
- `src/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md`
- `src/docs/frontend-execution/admin-dashboard/ADMIN_WORKBENCH_AND_ACTIVE_CONTEXT_MIGRATION.md`
- `src/docs/API_REFERENCE.md`

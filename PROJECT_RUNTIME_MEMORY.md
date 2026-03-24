# Project Runtime Memory

هذا الملف هو مرجع التشغيل الدائم للمشروع. يجب الرجوع إليه قبل أي قرار معماري أو تنفيذي.

## Source of Truth

- الملف النظري: `الفصل الرابع منسق معا المخططات 3224321a94a1807698e5ced26c554f64.md`
- الملف التنفيذي لقاعدة البيانات: `SQL-DB.md`

## Precedence Rules

- نأخذ من الملف النظري:
  - الهدف العام للنظام
  - حدود المجالات Domain Boundaries
  - الأدوار والصلاحيات العامة
  - تدفقات العمل وحالات الاستخدام
- نأخذ من ملف SQL:
  - أسماء الجداول الفعلية
  - القيود والقواعد الصارمة
  - الـ triggers
  - الـ views
  - بيانات seed
- عند التعارض:
  - السلوك التجاري العام من الملف النظري
  - الحقيقة البنيوية والتنفيذية من `SQL-DB.md`

## Core Intent

منصة "إشراف" هي منصة تعليمية مدرسية موحدة تخدم:

- الإدارة
- المعلمين
- المشرفين
- أولياء الأمور
- السائقين

وتركز على ستة مجالات رئيسية:

- إدارة المستخدمين والهوية
- الهيكل الأكاديمي والطلاب
- العمليات الأكاديمية
- السلوك
- النقل المدرسي
- التواصل والإشعارات

## Architecture Intent

- المرجع النظري يصمم النظام كبنية `Microservices`.
- التنفيذ الحالي في هذا المشروع هو `Modular Monolith`.
- يجب الحفاظ على حدود الخدمات النظرية داخل الـ modules الحالية حتى لو كان التنفيذ داخل تطبيق واحد.

## Main Roles

- `admin`
- `teacher`
- `supervisor`
- `parent`
- `driver`

## Functional Domains

### 1) User Domain

- الحساب الأساسي في `users`
- لكل دور تشغيلي جدول profile مستقل:
  - `parents`
  - `teachers`
  - `supervisors`
  - `drivers`
- الدور الواحد مرتبط بملف واحد فقط

### 2) Academic Structure Domain

- `academic_years`
- `semesters`
- `grade_levels`
- `classes`
- `subjects`
- `teacher_classes`
- `supervisor_classes`

### 3) Student Domain

- `students`
- `student_parents`
- `student_promotions`

### 4) Academic Operations Domain

- `assessment_types`
- `assessments`
- `student_assessments`
- `attendance_sessions`
- `attendance`
- `homework`
- `homework_submissions`

### 5) Behavior Domain

- `behavior_categories`
- `behavior_records`

### 6) Transport Domain

- `buses`
- `routes`
- `bus_stops`
- `student_bus_assignments`
- `trips`
- `bus_location_history`
- `trip_student_events`

### 7) Communication Domain

- `messages`
- `announcements`
- `notifications`

### 8) Auth Domain

- `auth_refresh_tokens`

## Key Business Flows

- تسجيل الدخول عبر JWT
- إدارة المستخدمين من قبل الإدارة
- إدارة السنوات والفصول والمستويات والمواد والتوزيعات
- متابعة الطلاب وربطهم بأولياء الأمور
- إنشاء التقييمات ورصد درجات الطلاب
- تسجيل جلسات الحضور ثم ربط حضور كل طالب بها
- إنشاء الواجبات ثم تتبع تسليم كل طالب
- تسجيل السلوكيات عبر فئات سلوكية موجبة أو سالبة
- إدارة الحافلات والمسارات والرحلات والتتبع اللحظي
- الرسائل والإعلانات والإشعارات

## Hard Constraints From SQL

- مستخدمو النظام مقيدون بالأدوار:
  - `admin`, `parent`, `teacher`, `supervisor`, `driver`
- البريد الإلكتروني فريد إذا كان موجودًا
- الهاتف فريد إذا كان موجودًا
- profile table يجب أن يطابق role المستخدم عبر triggers
- سنة دراسية واحدة فقط يمكن أن تكون `is_active = true`
- الفصل الدراسي يجب أن يقع بالكامل داخل حدود السنة الدراسية
- `grade_levels.name` و`grade_levels.level_order` فريدان
- `subjects`:
  - الاسم فريد داخل نفس المستوى
  - `code` فريد إذا استُخدم
- `classes` فريدة داخل:
  - `grade_level_id + academic_year_id + class_name + section`
- `teacher_classes`:
  - نفس المعلم لا يكرر نفس التوزيع
  - نفس `class + subject + year` لا يُسند إلا لمعلم واحد
- `supervisor_classes` تمنع تكرار نفس التوزيع
- الطالب:
  - `academic_no` فريد
  - `gender` ضمن `male | female`
  - `status` ضمن `active | transferred | graduated | dropped | suspended`
- لكل طالب ولي أمر أساسي واحد فقط كحد أقصى
- الترقية لا تسمح بأن يكون `from_class_id = to_class_id`
- الدرجة لا يمكن أن تتجاوز `assessment.max_score`
- `assessment`, `attendance_session`, `homework`, `behavior_record` يجب أن ترتبط بفصل دراسي من نفس السنة الأكاديمية
- سجل الحضور لا يسمح لطالب من صف مختلف عن صف الجلسة
- `student_assessment` لا يسمح لطالب من صف مختلف عن صف التقييم
- `homework_submission` لا يسمح لطالب من صف مختلف عن صف الواجب
- `behavior_record` يتطلب `teacher_id` أو `supervisor_id` واحدًا على الأقل
- `severity` في السلوك بين 1 و5
- لكل طالب تعيين حافلة نشط واحد فقط
- نقطة التوقف في `student_bus_assignments` يجب أن تنتمي إلى نفس المسار
- لا يمكن تسجيل موقع لحافلة في رحلة منتهية أو ملغاة
- انتقالات حالة الرحلة مضبوطة:
  - `scheduled -> started`
  - `started -> ended`
  - `scheduled -> cancelled`
  - الباقي مرفوض
- `trip_student_events` تتطلب:
  - أن تكون الرحلة في حالة مناسبة
  - الطالب لديه تعيين حافلة نشط
  - مسار الطالب يطابق مسار الرحلة
  - نقطة التوقف تطابق مسار الرحلة إذا أُرسلت
- الرسائل لا تسمح بالإرسال للنفس
- الإعلانات يمكن أن تستهدف دورًا محددًا أو الجميع
- `notifications.read_at` يُدار تلقائيًا من `is_read`
- `auth_refresh_tokens`:
  - تخزين `token_hash` فقط
  - ربط بالمستخدم
  - دعم الإبطال والانتهاء

## Important Terminology Mapping

- المفهوم النظري `EXAMS + GRADES` نُفذ فعليًا في SQL كالتالي:
  - `assessment_types`
  - `assessments`
  - `student_assessments`
- المفهوم النظري `HOMEWORK_STATUS` نُفذ فعليًا كجدول:
  - `homework_submissions`
- الحضور ليس جدولًا واحدًا فقط، بل:
  - `attendance_sessions`
  - `attendance`
- التوزيع الأكاديمي يستخدم profile ids وليس user ids:
  - `teacher_classes.teacher_id -> teachers.id`
  - `supervisor_classes.supervisor_id -> supervisors.id`

## External Integrations

- `Firebase Realtime Database` للتتبع اللحظي
- `Firebase Cloud Messaging` للإشعارات الفورية
- `Google Maps API` للمسارات والزمن المتوقع

## Views to Prefer for Read Models

- `vw_active_academic_year`
- `vw_active_semesters`
- `vw_student_profiles`
- `vw_student_primary_parent`
- `vw_class_students`
- `vw_teacher_assignments`
- `vw_supervisor_assignments`
- `vw_attendance_details`
- `vw_student_attendance_summary`
- `vw_class_attendance_summary`
- `vw_assessment_details`
- `vw_student_assessment_details`
- `vw_student_assessment_summary`
- `vw_homework_details`
- `vw_homework_submission_details`
- `vw_behavior_details`
- `vw_student_behavior_summary`
- `vw_route_stops`
- `vw_active_student_bus_assignments`
- `vw_trip_details`
- `vw_latest_trip_location`
- `vw_active_trip_live_status`
- `vw_trip_student_event_details`
- `vw_message_details`
- `vw_user_inbox_summary`
- `vw_announcement_details`
- `vw_active_announcements`
- `vw_notification_details`
- `vw_user_notification_summary`
- `vw_admin_dashboard_summary`

## Seed Facts To Remember

- السنة الدراسية المزروعة افتراضيًا: `2025-2026`
- يوجد فصلان دراسيان لهذه السنة
- تم زرع مستخدمين اختباريين أساسيين:
  - `admin@eshraf.local`
  - `parent1@eshraf.local`
  - `teacher1@eshraf.local`
  - `supervisor1@eshraf.local`
  - `driver1@eshraf.local`
- تم زرع طلاب تجريبيين:
  - `STU-1001`
  - `STU-1002`
  - `STU-1003`

## Implementation Guidance

- أي module جديد يجب أن يحترم هذا التقسيم الدوميني.
- أي endpoint جديد يجب أن يعكس القيود الموجودة في SQL كأخطاء تطبيقية واضحة، لا كأخطاء PostgreSQL خام.
- عند بناء read endpoints، الأفضلية للـ views عندما تختصر joins معقدة أو منطق تلخيص.
- عند بناء write endpoints، يجب احترام الـ triggers وعدم افتراض أن القاعدة "مرنة".
- أي قرار متعلق بالأسماء أو العلاقات أو القيود يجب مراجعته أولًا ضد `SQL-DB.md`.

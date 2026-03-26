# تسلسل التنفيذ بين الفرق

هذا الملف يحدد ترتيب التنفيذ العملي حتى لا تبدأ الفرق من الأسطح التابعة قبل اكتمال الأسطح المؤسسة.

## القاعدة العامة

ابدأوا بما يفتح بقية الشاشات، لا بما يبدو أسهل بصريًا.

## المرحلة 1: Shared Frontend Foundation

يجب إنجاز ما يلي أولًا على مستوى مشترك:

- network client موحد
- token handling
- auth guards
- error handling موحد
- pagination table/list primitives
- role-based app entry routing
- shared design tokens/components الأساسية

هذه المرحلة تخدم جميع الفرق.

## المرحلة 2: Admin Auth + Admin Dashboard Shell

الهدف:

- تثبيت login/session/admin navigation
- بناء shell اللوحة
- تفعيل dashboard overview

السبب:

- لوحة الإدارة هي المصدر العملي لإدارة master data
- بقية التطبيقات تعتمد على بيانات ومستخدمين وهيكل أكاديمي صحيح

## المرحلة 3: Admin Master Data

يبنى هنا:

- users
- academic structure
- students
- parent linking
- teacher assignments
- supervisor assignments

بعد اكتمال هذه المرحلة تصبح بقية التطبيقات قابلة للاختبار بشكل عملي.

## المرحلة 4: Daily Operations

يبنى هنا بالتوازي المنضبط:

- attendance
- assessments
- behavior
- homework

هذه المرحلة تفتح:

- teacher app
- أجزاء كبيرة من supervisor app
- تقارير student profile
- parent-facing summaries

## المرحلة 5: Communication Surfaces

يبنى هنا:

- inbox / sent / conversation
- notifications center
- active announcements

هذه المرحلة مشتركة بين جميع التطبيقات تقريبًا.

## المرحلة 6: Transport Flows

يبنى هنا:

- admin transport management
- driver trip operations
- parent transport live status

مهم:

- لا تُخططوا لأي realtime/Firebase أو ETA في `Wave 1`
- اعتمدوا على polling والـ endpoints الحالية فقط

## المرحلة 7: Reporting Surfaces

يبنى هنا:

- parent dashboard
- teacher dashboard
- supervisor dashboard
- admin dashboard enrichments
- student profile/report screens

هذه المرحلة تعتمد على نضج master data والعمليات اليومية.

## ترتيب التنفيذ داخل الفرق

### فريق لوحة الإدارة

1. auth + shell
2. dashboard
3. users
4. academic structure
5. students + linking + promotions
6. operations
7. transport
8. communication
9. reporting
10. homework

### فريق تطبيق المعلم

1. auth + app shell
2. teacher dashboard
3. attendance
4. assessments
5. behavior
6. homework
7. communication

### فريق تطبيق ولي الأمر

1. auth + app shell
2. parent dashboard
3. child profile shell
4. child reports
5. homework
6. transport live status
7. communication

### فريق تطبيق المشرف

1. auth + app shell
2. supervisor dashboard
3. behavior
4. attendance oversight
5. student reports
6. communication

### فريق تطبيق السائق

1. auth + app shell
2. trip list/detail
3. trip start/end
4. location updates
5. student events
6. transport summary
7. communication

## ما يمكن تأجيله داخل الفرونت

يمكن تأجيل polish أو enhancements التالية إلى ما بعد MVP الداخلي:

- advanced filters الثانوية
- analytics visual polish
- offline sync
- push notifications UI العميقة
- map/ETA experiences

## مراجع مرتبطة

- [مصفوفة التنفيذ](../management/EXECUTION_MATRIX.md)
- [تأكيد حالة الباك](../BACKEND_STATUS_CONFIRMATION.md)

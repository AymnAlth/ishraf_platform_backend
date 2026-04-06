# Admin Dashboard Backend Contract

الدور المستهدف: `admin`

هذه الحزمة تشرح التكامل التنفيذي للوحة الإدارة مع الباك الحالي. الهدف هنا ليس مجرد listing للمسارات، بل توضيح:

- ما الذي يدار من لوحة الإدارة
- ما الذي يعتمد على `Active Academic Context`
- متى تكون الـ surfaces إدارية فقط
- ومتى تدخل في التشغيل اليومي

## النطاق

لوحة الإدارة هي المستهلك الكامل لـ:

- `users`
- `academic-structure`
- `students`
- `admin-imports`

كما أنها تستهلك أيضًا:

- `attendance`
- `assessments`
- `behavior`
- `homework`
- `transport`
- `communication`
- `reporting`

## القواعد المؤثرة

- السطوح اليومية تعتمد `Active Academic Context`.
- `users.id` هي المرجع المعتمد في السطوح الحديثة الخاصة بالمعلمين والمشرفين والسائقين وأولياء الأمور.
- في `attendance` و`assessments` و`homework`:
  - admin-created request يجب أن ترسل `teacherId`
  - ويفضل أن تكون `teacherId = users.id`
- `admin-preview` surfaces في reporting هي read-only فقط.
- `school onboarding import` لا تُنفذ عبر loops من الفرونت؛ التسلسل الرسمي هو:
  - `dry-run`
  - `apply`
  - `history`

## الحدود بين الإدارة والتشغيل

- صفحات `academic-structure`, `users`, `students`, `admin-imports` هي surfaces إدارية بحتة.
- `attendance`, `assessments`, `behavior`, `homework`, و`reporting` هي surfaces تشغيل يومي لكنها متاحة أيضًا للإدارة.
- `transport` ينقسم إلى:
  - surfaces إدارية: buses, routes, stops, assignments, route assignments, home locations
  - surfaces live operations: trips, locations, trip events

## الملفات الحية هنا

- `ENDPOINT_MAP.md`
- `SCREENS_AND_TASKS.md`
- `QA_AND_ACCEPTANCE.md`

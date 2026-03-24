# Legacy Documentation Alignment

هذا الملف يوضح كيف تُقرأ الوثائق القديمة مقارنةً بالباك إند الحالي.

## Source of Truth

في Wave 1 المرجع التنفيذي الحقيقي هو:

- الكود الحالي
- `src/docs/BACKEND_WAVE1_STATUS.md`
- `src/docs/API_REFERENCE.md`

الوثائق الأكاديمية الأقدم تبقى مرجعًا تحليليًا أو تاريخيًا، لكنها ليست مرجع العقود التشغيلية الحالية.

## Architecture

- الوثائق القديمة تصف `Microservices Architecture`
- التنفيذ الحالي المعتمد فعليًا هو:
  - `Modular Monolith`

هذا قرار مقصود للإصدار الأول وليس نقصًا مؤقتًا.

## Canonical Model Mapping

- `attendance`
  - في الوثائق القديمة قد تظهر كجدول تشغيلي واحد
  - المرجع الحالي:
    - `attendance_sessions`
    - `attendance`

- `exams + grades`
  - في الوثائق القديمة تظهر كنموذج أساسي للتقييم
  - المرجع الحالي:
    - `assessment_types`
    - `assessments`
    - `student_assessments`

- `behavior_type` داخل السجل فقط
  - المرجع الحالي:
    - `behavior_categories`
    - `behavior_records`

- النقل
  - المرجع الحالي لا يقتصر على رحلة واحدة فقط
  - النموذج الحالي يشمل:
    - `trips`
    - `bus_location_history`
    - `trip_student_events`

- الطبقات الأعلى الموجودة في التنفيذ الحالي:
  - `reporting`
  - `automation`
  - `ownership enforcement`
  - `profile resolution`

## Features Deferred Beyond Wave 1

إذا ظهرت في الوثائق القديمة كجزء من التصميم العام، فهذا لا يعني أنها جزء من الباك الجاهز حاليًا.

المؤجل صراحة:

- Firebase Realtime Database
- FCM
- Google Maps / ETA
- AI analytics / prediction
- microservices split

## Guidance For Frontend Work

- لا تعتمد تطبيقات الفرونت على أسماء كيانات قديمة إذا اختلفت عن الكود الحالي
- استخدم `BACKEND_WAVE1_STATUS.md` كمرجع handoff
- استخدم `API_REFERENCE.md` و`OpenAPI/Postman` للعقود العملية

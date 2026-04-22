# Parent App Backend Contract (Code-Truth)

آخر مزامنة مع الكود: `2026-04-16`

الدور المستهدف: `parent`

هذه الوثيقة تختصر ما يحتاجه مطور تطبيق ولي الأمر لبناء التطبيق بدون افتراضات.
كل ما هنا مبني على الكود الفعلي فقط.

## 1) ماذا يبني تطبيق ولي الأمر فعليًا

1. مصادقة الجلسة (`login/refresh/me/logout/change-password`).
2. لوحة ولي الأمر + بيانات الأبناء الأكاديمية.
3. تتبع النقل الحي للابن:
- `REST snapshot` للـ ETA والحالة.
- `Firebase RTDB` لحركة الحافلة الحية.
4. مركز الإشعارات والرسائل.
5. تسجيل جهاز FCM لتلقي تنبيهات النقل.
6. قراءة `AI Analytics` الخاصة بمخاطر الطالب من backend فقط.

## 2) قاعدة القنوات الثلاث (إلزامية)

1. بيانات الأعمال (dashboard/reports/eta snapshot): من REST.
2. إحداثيات الحركة الحية: من RTDB path فقط.
3. إشعارات الاقتراب/الوصول: من FCM (`notification + data`).

لا تخلط القنوات الثلاث داخل نفس مصدر حالة بدون تمييز المصدر.

## 3) قواعد تشغيل يجب الالتزام بها

1. كل endpoints التطبيق تحت `/api/v1`.
2. كل endpoints الخاصة بولي الأمر تتطلب `Bearer access token`.
3. reporting endpoints تعتمد على `Active Academic Context` في الباك.
4. endpoint `GET /transport/trips/:tripId/live-status` يتحقق من ملكية ولي الأمر للرحلة.
5. endpoint `GET /transport/realtime-token` قد يرجع `409` عند تعطيل/عدم تهيئة التكامل.
6. endpoint `GET /analytics/students/:studentId/risk-summary` يتحقق من ملكية ولي الأمر للطالب ويعيد snapshots `approved` فقط.
7. endpoint `POST /analytics/snapshots/:snapshotId/feedback` يرفض أي snapshot غير منشورة لغير `admin`.

## 4) التدفق المرجعي المختصر

1. `POST /auth/login`
2. `GET /reporting/dashboards/parent/me`
3. عند اختيار طالب:
- `GET /reporting/transport/parent/me/students/:studentId/live-status`
4. إذا `activeTrip` موجود:
- `GET /transport/trips/:tripId/live-status`
- `GET /transport/realtime-token?tripId=:tripId`
- subscribe على RTDB path الوارد من الباك.
5. إذا كانت شاشة الطالب تتضمن insights:
- `GET /analytics/students/:studentId/risk-summary`
- لا تشغّل job من التطبيق.
- إذا لم توجد snapshot منشورة بعد، اعرض empty-state تشغيلية.

## 5) نقاط حساسة في التكامل

1. `myStopSnapshot` قد يكون `null`، والواجهة يجب أن تدعم ذلك.
2. `routePolyline` قد تكون `null`، لا تفترض وجود Polyline دائمًا.
3. في FCM:
- مفتاح التوجيه في التطبيق هو `data.eventType` وليس `event_type`.
- `data.studentIds` تصل كسلسلة CSV (مثل `"12,18"`) وليست array.
4. في `AI Analytics`:
- الواجهة لا ترى drafts أو rejected snapshots.
- `adminRecommendations` لا تظهر في استجابة ولي الأمر.
- feedback يرسل إلى backend فقط، وليس إلى مزود AI مباشرة.

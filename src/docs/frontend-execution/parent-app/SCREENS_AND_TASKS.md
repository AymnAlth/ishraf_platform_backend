# Parent App Screens And Tasks (Execution Playbook)

## 1) Authentication Boot Flow

1. شاشة login تستدعي `POST /auth/login`.
2. خزّن `accessToken/refreshToken` بشكل آمن.
3. نفّذ `GET /auth/me` بعد login للتأكد من الدور `parent`.
4. فعّل refresh تلقائي عبر `POST /auth/refresh` قبل انتهاء `accessToken`.
5. عند logout:
- استدعِ `POST /auth/logout`.
- احذف session state محليًا.
- ألغِ ربط FCM device إذا لديكم policy لذلك (`DELETE /communication/devices/:deviceId`).

## 2) Parent Home (Dashboard) Screen

1. حمّل `GET /reporting/dashboards/parent/me`.
2. ارسم العناصر الأساسية:
- معلومات ولي الأمر (`parent`).
- الأبناء (`children[]`).
- أحدث التنبيهات (`latestNotifications`).
- العداد (`unreadNotifications`).
3. إذا عاد `children=[]` اعرض empty-state واضحة بدل شاشة خطأ.
4. عند فشل endpoint بـ `ACADEMIC_CONTEXT_NOT_CONFIGURED` (409):
- اعرض رسالة تشغيلية أن الإدارة لم تضبط العام/الفصل النشط بعد.

## 3) Student Details Stack

لكل طالب:
1. profile: `GET /reporting/dashboards/parent/me/students/:studentId/profile`
2. attendance: `.../reports/attendance-summary`
3. assessment: `.../reports/assessment-summary`
4. behavior: `.../reports/behavior-summary`
5. homework: `GET /homework/students/:studentId`

قواعد UX:
1. لا تعتمد على dashboard data كبديل دائم، استخدم endpoint الصفحة نفسها.
2. أي `403` هنا يعني ownership violation أو role mismatch.
3. أي `404` يعني الطالب أو المورد غير موجود في السياق الحالي.

## 4) Live Tracking Screen (Authoritative Flow)

1. ابدأ دائمًا من:
- `GET /reporting/transport/parent/me/students/:studentId/live-status`
2. إذا `activeTrip=null`:
- اعرض state "لا توجد رحلة نشطة الآن".
3. إذا `activeTrip` موجود:
- خذ `tripId`.
- استدعِ `GET /transport/trips/:tripId/live-status`.
4. من `live-status`:
- استخدم `tripStatus` للتحكم في state الشريط العلوي.
- استخدم `myStopSnapshot` لبطاقة ETA.
- استخدم `routePolyline` لرسم خط الرحلة إن كان موجودًا.
- استخدم `firebaseRtdbPath` كمرجع path للحركة الحية.
5. استدعِ `GET /transport/realtime-token?tripId=:tripId`.
6. اتصل بـ RTDB واستمع للحركة على path المعاد من الباك.

قواعد إلزامية:
1. حركة الحافلة (marker position) من RTDB فقط.
2. ETA/الوقت المتبقي/المسافة المتبقية من REST snapshot فقط.
3. إذا `myStopSnapshot=null` لا تفترض خطأ؛ اعرض fallback message "قيد حساب التقدير".

## 5) Push Notifications UX

1. استقبل FCM payload.
2. اعرض `notification.title/body` كما هي.
3. استخدم `data.eventType` للتوجيه البرمجي:
- `bus_approaching`
- `bus_arrived`
4. parser لـ `data.studentIds`:
- قيمة CSV string.
- حوّلها إلى `string[]` قبل deep-linking.
5. deep-link مقترح:
- to live trip using `data.tripId`.
- مع filter للطلاب باستخدام `studentIds`.

## 6) Communication Screens

1. recipients: `GET /communication/recipients`
2. send message: `POST /communication/messages`
3. inbox/sent: `GET /communication/messages/inbox|sent`
4. conversation: `GET /communication/messages/conversations/:otherUserId`
5. mark read:
- `PATCH /communication/messages/:messageId/read`
- `PATCH /communication/notifications/:notificationId/read`
6. active announcements:
- `GET /communication/announcements/active`

## 7) Student AI Insight Screen

1. لا تطلب أي AI provider من التطبيق.
2. عند فتح شاشة insight لطالب:
- `GET /analytics/students/:studentId/risk-summary`
3. اعرض:
- بيانات `student`
- `snapshot.reviewStatus`
- `snapshot.publishedAt`
- `analysisMode`
- `computedAt`
- `insight.summary`
- `insight.parentGuidance`
- `insight.recommendedActions`
4. إذا لم توجد snapshot منشورة بعد:
- اعرض empty-state تشغيلية مثل:
  - `التحليل الذكي غير متاح بعد لهذا الطالب.`
5. feedback:
- `POST /analytics/snapshots/:snapshotId/feedback`
- اسمح بإرسال:
  - تقييم فقط
  - نص فقط
  - أو الاثنين

قواعد UX:

1. لا تفترض أن فتح الشاشة سيطلق job جديدة.
2. لا تعرض أي draft state؛ ولي الأمر لا يرى إلا المنشور.
3. إذا عاد `403` فتعامل معه كـ ownership violation على الطالب أو snapshot.

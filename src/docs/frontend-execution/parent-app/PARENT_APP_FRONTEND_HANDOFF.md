# Parent App Frontend Handoff (Code-Truth, Detailed)

هذه الوثيقة مكتوبة لمطور frontend يبدأ التنفيذ الآن بدون الرجوع للكود الخلفي.

## 1) الهدف الوظيفي للتطبيق

تطبيق ولي الأمر يحتاج 3 قدرات تشغيلية رئيسية:
1. المتابعة الأكاديمية للطلاب المرتبطين بولي الأمر.
2. متابعة النقل الحي (GPS + ETA) بدون تضارب مصادر البيانات.
3. استلام تنبيهات الاقتراب/الوصول وإدارة الرسائل والإشعارات.
4. قراءة تحليلات الطالب الذكية الجاهزة من backend وإرسال feedback عليها.

## 2) قواعد API العامة

1. قاعدة المسارات: كل endpoints تحت `/api/v1`.
2. نجاح الاستجابة:
```json
{
  "success": true,
  "message": "string",
  "data": {}
}
```
3. فشل الاستجابة:
```json
{
  "success": false,
  "message": "string",
  "errors": [
    { "field": "optional", "code": "optional", "message": "string" }
  ]
}
```
4. جميع الأسطح في هذه الوثيقة تتطلب bearer token لمستخدم نشط.

## 3) الأسطح المسموح بها لولي الأمر

### Auth
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

### Reporting (Parent)
- `GET /reporting/dashboards/parent/me`
- `GET /reporting/dashboards/parent/me/students/:studentId/profile`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary`
- `GET /reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary`
- `GET /reporting/transport/parent/me/students/:studentId/live-status`

### Transport (Parent live tracking)
- `GET /transport/trips/:tripId/live-status`
- `GET /transport/realtime-token?tripId=:tripId`

### Homework
- `GET /homework/students/:studentId`

### Communication
- `GET /communication/recipients`
- `POST /communication/messages`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`
- `GET /communication/announcements/active`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`
- `POST /communication/devices`
- `PATCH /communication/devices/:deviceId`
- `DELETE /communication/devices/:deviceId`

### AI Analytics
- `GET /analytics/students/:studentId/risk-summary`
- `POST /analytics/snapshots/:snapshotId/feedback`

## 4) التدفق المرجعي الصحيح (End-to-End)

### Step A: Session bootstrap
1. نفّذ `POST /auth/login`.
2. خزّن tokens محليًا.
3. نفّذ `GET /auth/me` وتأكد أن الدور `parent`.

### Step B: Home dashboard
1. نفّذ `GET /reporting/dashboards/parent/me`.
2. اعرض:
- بيانات ولي الأمر.
- قائمة الطلاب.
- ملخصات لكل طالب.
- أحدث الإشعارات وعدد غير المقروء.

### Step C: Child insights
عند اختيار طالب:
1. profile endpoint.
2. attendance endpoint.
3. assessment endpoint.
4. behavior endpoint.
5. homework endpoint.
6. إذا كانت شاشة insights مفعلة:
- `GET /analytics/students/:studentId/risk-summary`
- اعرض آخر snapshot منشورة فقط كما تأتي من backend.

### Step D: Live tracking
1. استدعِ `GET /reporting/transport/parent/me/students/:studentId/live-status`.
2. إذا `activeTrip=null` اعرض "لا توجد رحلة نشطة".
3. إذا `activeTrip` موجود:
- اقرأ `tripId`.
- استدعِ `GET /transport/trips/:tripId/live-status`.
- استدعِ `GET /transport/realtime-token?tripId=:tripId`.
4. افتح RTDB باستخدام token وdatabaseUrl.
5. اشترك في path المعاد (`/transport/live-trips/{tripId}/latestLocation`).

## 5) فصل مصادر البيانات (Critical Integration Rule)

1. Live GPS:
- المصدر الوحيد: RTDB listener.
2. ETA + stop progression:
- المصدر الوحيد: REST snapshot (`/transport/trips/:tripId/live-status`).
3. لا تستخدم RTDB لحساب ETA في التطبيق.
4. لا تستخدم polling لحركة GPS عند توفر RTDB.

## 6) عقود الاستجابات الحرجة

### A) `GET /transport/trips/:tripId/live-status`
```json
{
  "tripId": "123",
  "tripStatus": "started",
  "firebaseRtdbPath": "/transport/live-trips/123/latestLocation",
  "myStopSnapshot": {
    "stopId": "10",
    "stopName": "Main Gate",
    "stopOrder": 2,
    "etaAt": "2026-04-13T12:30:00.000Z",
    "remainingDistanceMeters": 420,
    "remainingDurationSeconds": 240,
    "isCompleted": false,
    "approachingNotified": true,
    "arrivedNotified": false,
    "updatedAt": "2026-04-13T12:26:00.000Z"
  },
  "routePolyline": {
    "encodedPolyline": "..."
  }
}
```

ملاحظات عملية:
1. `myStopSnapshot` قد تكون `null`.
2. `routePolyline` قد تكون `null`.
3. اختيار `myStopSnapshot` يتم من الباك (nearest active stop حسب `stopOrder`).

### B) `GET /transport/realtime-token?tripId=:tripId`
```json
{
  "customToken": "firebase_custom_token",
  "databaseUrl": "https://project-default-rtdb.firebaseio.com",
  "path": "/transport/live-trips/123/latestLocation",
  "tripId": "123",
  "access": "read",
  "refreshAfterSeconds": 840
}
```

### C) `GET /reporting/transport/parent/me/students/:studentId/live-status`
النقاط التي يعتمد عليها الفرونت:
1. `assignment` قد تكون `null` إذا لا يوجد ارتباط نقل فعال للطالب.
2. `activeTrip` قد تكون `null` إذا لا توجد رحلة جارية لهذا المسار.
3. عند وجود `activeTrip`:
- `tripId`
- `tripStatus`
- `latestLocation`
- `eta` من منظور محطة الطالب.

## 7) FCM Transport Notifications (Inbound SDK Contract)

### 7.1 لماذا هذا القسم مهم
الباك يستخدم `integration_outbox.event_type` داخليًا، لكن التطبيق لا يستقبله مباشرة.
المفتاح التشغيلي داخل التطبيق هو `data.eventType`.

### 7.2 مثال اقتراب الحافلة (Inbound to App)
```json
{
  "notification": {
    "title": "اقتراب الحافلة",
    "body": "حافلة الطلاب أحمد، سارة تقترب من المحطة، ستصل خلال دقائق."
  },
  "data": {
    "eventType": "bus_approaching",
    "tripId": "123",
    "routeId": "7",
    "studentIds": "1,2",
    "notificationType": "transport_bus_approaching"
  }
}
```

### 7.3 مثال وصول الحافلة (Inbound to App)
```json
{
  "notification": {
    "title": "وصول الحافلة",
    "body": "الحافلة بالخارج في انتظار الطلاب أحمد و سارة."
  },
  "data": {
    "eventType": "bus_arrived",
    "tripId": "123",
    "routeId": "7",
    "studentIds": "1,2",
    "notificationType": "transport_bus_arrived"
  }
}
```

### 7.4 Mapping rule (Internal -> App)
1. `fcm.transport.bus_approaching` -> `data.eventType = bus_approaching`
2. `fcm.transport.bus_arrived` -> `data.eventType = bus_arrived`

### 7.5 Parsing rule
1. FCM `data` values تصل كسلاسل نصية.
2. `studentIds` parser:
```ts
const studentIds =
  (message.data?.studentIds ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
```

## 8) الأخطاء التشغيلية التي يجب أن يدعمها UX

1. `401`:
- نفّذ refresh مرة واحدة.
- عند الفشل، logout.
2. `403`:
- parent حاول الوصول لرحلة/طالب غير مملوك.
- اعرض Access Denied واضح.
3. `404`:
- مورد غير موجود.
- اعرض empty-state مع retry.
4. `409` في realtime token:
- `FEATURE_DISABLED`
- `INTEGRATION_NOT_CONFIGURED`
- UX: تعطيل stream controls مع إبقاء البيانات REST حيثما أمكن.
5. `409` في reporting/homework عند غياب السياق الدراسي:
- `ACADEMIC_CONTEXT_NOT_CONFIGURED`
- UX: رسالة تشغيلية بدل رسالة تقنية.
6. `404` في `GET /analytics/students/:studentId/risk-summary`:
- لا توجد snapshot منشورة بعد.
- UX: empty-state تشغيلية، وليس crash.
7. `403` في `POST /analytics/snapshots/:snapshotId/feedback`:
- snapshot غير منشورة أو ليست ضمن صلاحية parent.

## 10) Parent AI Analytics Contract

### 10.1 ما الذي يفعله backend
1. يقرأ البيانات التشغيلية للطالب من attendance/assessments/behavior/homework.
2. يبني features داخل الباك.
3. يمررها إلى AI provider backend-side.
4. يحفظ snapshot.
5. لا يسمح لولي الأمر إلا بقراءة snapshot `approved`.

### 10.2 ما الذي يفعله التطبيق
1. يقرأ `GET /analytics/students/:studentId/risk-summary`.
2. يعرض:
- `snapshot.reviewStatus`
- `snapshot.publishedAt`
- `analysisMode`
- `providerKey`
- `fallbackUsed`
- `computedAt`
- `insight.summary`
- `insight.parentGuidance`
- `insight.recommendedActions`
3. لا يعرض أي حقل إداري داخلي غير موجود في الاستجابة الفعلية.
4. لا يطلق jobs من التطبيق.

### 10.3 feedback
request example:

```json
{
  "rating": 5,
  "feedbackText": "التحليل واضح ومفيد."
}
```

قواعد إلزامية:
1. يكفي `rating` أو `feedbackText`.
2. غير admin لا يرسل feedback على snapshot غير `approved`.
3. التطبيق لا يرسل feedback إلى OpenAI أو Groq؛ فقط إلى backend.

## 9) Device Lifecycle (FCM)

### Register
```json
{
  "providerKey": "fcm",
  "platform": "android",
  "appId": "com.ishraf.parent",
  "deviceToken": "FCM_DEVICE_TOKEN",
  "deviceName": "Pixel 8",
  "subscriptions": ["transportRealtime"]
}
```

### Update
يمكن إرسال أي من:
- `deviceToken`
- `deviceName`
- `subscriptions`

### Unregister
- عند logout أو إزالة الجهاز:
- `DELETE /communication/devices/:deviceId`

## 10) خطة تنفيذ frontend مقترحة

### Phase 1
1. Auth flow.
2. Parent dashboard.
3. Student reports + homework.

### Phase 2
1. Reporting transport live-status.
2. Trip live-status + realtime-token.
3. RTDB map stream + ETA card.

### Phase 3
1. FCM handling (`bus_approaching` / `bus_arrived`).
2. Notifications center.
3. Messaging screens + device lifecycle hardening.

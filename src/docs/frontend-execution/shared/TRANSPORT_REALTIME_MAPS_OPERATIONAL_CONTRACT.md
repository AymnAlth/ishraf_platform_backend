# Transport Realtime + Maps Operational Contract (Code-Truth)

هذه الوثيقة هي العقد التشغيلي الرسمي بين Backend وفرق Frontend فيما يخص:

- Firebase RTDB (حركة الحافلة الحية)
- ETA / الخرائط (Mapbox + Google عبر backend)
- FCM notifications للنقل
- الأدوار المسموح لها بالاستهلاك

المصدر الوحيد للحقيقة: الكود الحالي في:

- `src/modules/transport/**`
- `src/modules/reporting/**`
- `src/modules/system-settings/**`
- `src/integrations/firebase/**`
- `src/integrations/maps/**`
- `src/config/env.ts`

إذا تعارض أي توثيق آخر مع هذه الوثيقة، الكود هو المرجع الحاكم.

---

## 1) قرار معماري إلزامي (No Assumptions)

الفصل بين القنوات إلزامي:

- Live GPS = Firebase RTDB فقط.
- ETA/Stops/Status = REST snapshots من backend فقط.

لا يُسمح للفرونت بحساب ETA عبر SDK خرائط.
لا يُسمح للفرونت باختيار مزود الخرائط.
لا يُسمح للفرونت باعتبار RTDB مصدر ETA.

---

## 2) من يستهلك ماذا حسب الدور

| الدور | `GET /transport/realtime-token` | `GET /transport/trips/:tripId/live-status` | `GET /transport/trips/:id/eta` | كتابة RTDB |
| --- | --- | --- | --- | --- |
| admin | نعم (`read`) | لا | نعم | لا |
| parent | نعم (`read`) | نعم | لا | لا |
| driver | نعم (`write`) | لا | نعم | نعم |
| teacher | لا | لا | لا | لا |
| supervisor | لا | لا | لا | لا |

مراجع السياسات:

- `transport.policy.ts`: `realtimeAccess = admin,parent,driver`
- `parentTripLiveStatus = parent`
- `accessTrips = admin,driver`

---

## 3) خريطة الـ Endpoints الفعلية للنقل الحي

جميع المسارات تحت `/api/v1`.

1. `GET /transport/realtime-token?tripId=:tripId`
- الغرض: bootstrap اتصال Firebase.
- يراجع role + ownership + feature flags + Firebase config.
- الاستجابة `data`:
  - `customToken`
  - `databaseUrl`
  - `path` (المسار الحقيقي في RTDB)
  - `tripId`
  - `access` (`read` أو `write`)
  - `refreshAfterSeconds`

2. `GET /transport/trips/:tripId/live-status` (parent فقط)
- الغرض: Snapshot مركزي لشاشة التتبع عند ولي الأمر.
- الاستجابة `data`:
  - `tripId`
  - `tripStatus`
  - `firebaseRtdbPath`
  - `myStopSnapshot` (قد تكون `null`)
  - `routePolyline` (قد تكون `null`)

3. `POST /transport/trips/:id/locations` (driver/admin بملكية السائق)
- body:
  - `latitude`
  - `longitude`
- الغرض:
  - حفظ heartbeat في PostgreSQL.
  - إصدار outbox event داخلي لتحديث ETA (`transport_eta_refresh`).
- هذا المسار جزء أساسي من تشغيل ETA، وليس بديلًا عنه RTDB.

4. `GET /transport/trips/:id/eta` (admin/driver)
- يعيد `routePolyline`, `etaSummary`, `remainingStops`.
- `calculationMode` العام:
  - `provider_snapshot`
  - `derived_estimate`
  - `null`

5. `GET /reporting/transport/parent/me/students/:studentId/live-status`
- الغرض: Discovery على مستوى الطالب (assignment + activeTrip + eta + latestLocation).
- لا يعيد Firebase token.
- لا يعيد RTDB custom auth.

---

## 4) Firebase RTDB: التدفق الصحيح لكل تطبيق

### 4.1 Driver App (Writer)

خطوات إلزامية عند الرحلة `started`:

1. استدعِ `GET /transport/realtime-token?tripId=...`.
2. خذ `customToken + databaseUrl + path + access`.
3. افتح اتصال RTDB واعتبر `path` هو المرجع النهائي.
4. عند كل تحديث موقع:
- أرسل `POST /transport/trips/:id/locations` لحفظ heartbeat backend.
- اكتب آخر موقع إلى RTDB على نفس `path`.
5. عندما يقترب `refreshAfterSeconds`, جدد token باستدعاء نفس endpoint.

مهم:

- إرسال RTDB فقط بدون `POST /locations` يسبب فقدان تحديثات ETA التشغيلية.
- `POST /locations` بدون RTDB يجعل حركة الخريطة الحية ناقصة عند المستهلكين.

### 4.2 Parent App (Reader)

الترتيب الصحيح:

1. استخرج الرحلة النشطة للطالب عبر:
- `GET /reporting/transport/parent/me/students/:studentId/live-status`.
2. إذا لا توجد `activeTrip`: اعرض حالة "لا توجد رحلة نشطة".
3. إذا توجد `activeTrip.tripId`:
- استدعِ `GET /transport/trips/:tripId/live-status` لالتقاط ETA + stop snapshot + `firebaseRtdbPath`.
- استدعِ `GET /transport/realtime-token?tripId=...` للحصول على `customToken`.
4. اتصل بـ RTDB واستمع على path الوارد.

قاعدة عرض UI:

- marker position = RTDB فقط.
- ETA card + remaining distance/time + approaching/arrived flags = REST فقط.

### 4.3 Admin Dashboard (Reader)

للمتابعة الحية:

1. استدعِ `GET /transport/realtime-token?tripId=...` (`access=read`).
2. استمع على `path`.
3. اعرض ETA عبر:
- `GET /transport/trips/:id/eta`
- أو surfaces reporting المناسبة.

---

## 5) الخرائط و ETA: من يحدد المزود؟

المزود يُحدد فقط من admin عبر `system-settings`:

- `GET /system-settings/transportMaps`
- `PATCH /system-settings/transportMaps`

المفاتيح الفعلية:

- `etaProvider`: `mapbox | google`
- `etaDerivedEstimateEnabled`: `boolean` (default `true`)
- `googleMapsEtaEnabled`: `boolean` (default `false`)
- `etaProviderRefreshIntervalSeconds`
- `etaProviderDeviationThresholdMeters`

قرارات runtime في backend:

- إذا `etaProvider=mapbox`: resolver يستخدم Mapbox عند التهيئة.
- إذا `etaProvider=google`: يجب `googleMapsEtaEnabled=true` إضافة إلى التهيئة.
- عند فشل provider: backend يطبق derived logic حسب الإعدادات.

ممنوع على frontend:

- تمرير اختيار provider في أي شاشة تشغيلية.
- استدعاء Mapbox/Google لحساب ETA.
- افتراض أن ETA حي 1:1 مع RTDB.

---

## 6) Feature Gates والتشغيل الفعلي

### 6.1 Realtime token gates

`GET /transport/realtime-token` يفشل عند:

- `409 FEATURE_DISABLED` إذا `pushNotifications.transportRealtimeEnabled=false`.
- `409 INTEGRATION_NOT_CONFIGURED` إذا Firebase غير مهيأ.
- `403` عند فشل ownership/role.

### 6.2 Defaults المهمة (system settings)

- `pushNotifications.fcmEnabled = false`
- `pushNotifications.transportRealtimeEnabled = false`
- `transportMaps.etaProvider = mapbox`
- `transportMaps.etaDerivedEstimateEnabled = true`
- `transportMaps.googleMapsEtaEnabled = false`

معنى ذلك:

- في البيئات الافتراضية، realtime/FCM قد تكون مغلقة حتى يفعّلها admin.

---

## 7) FCM Contract (Inbound to App)

### 7.1 علاقة event_type الداخلي بما يصل للتطبيق

- `integration_outbox.event_type = fcm.transport.bus_approaching`
  - التطبيق يستلم `data.eventType = bus_approaching`
- `integration_outbox.event_type = fcm.transport.bus_arrived`
  - التطبيق يستلم `data.eventType = bus_arrived`

### 7.2 Full SDK inbound مثال (Approaching)

```json
{
  "notification": {
    "title": "اقتراب الحافلة",
    "body": "حافلة الطلاب أحمد، سارة تقترب من المحطة، ستصل خلال دقائق."
  },
  "data": {
    "eventType": "bus_approaching",
    "notificationType": "transport_bus_approaching",
    "tripId": "1201",
    "routeId": "31",
    "studentIds": "501,502"
  }
}
```

### 7.3 Full SDK inbound مثال (Arrived)

```json
{
  "notification": {
    "title": "وصول الحافلة",
    "body": "الحافلة بالخارج في انتظار الطلاب أحمد و سارة."
  },
  "data": {
    "eventType": "bus_arrived",
    "notificationType": "transport_bus_arrived",
    "tripId": "1201",
    "routeId": "31",
    "studentIds": "501,502"
  }
}
```

ملاحظات إلزامية:

- `notification` للعرض (banner/system tray).
- `data` للمنطق البرمجي (navigation/state).
- backend يحول `data` إلى strings قبل الإرسال؛
  `studentIds` تصل عمليًا string CSV وليست array.

---

## 8) قواعد شاشة السائق (منع تضارب الحالات)

- إذا `tripStatus=completed`:
  - أخفِ أو عطّل زر `End Trip` اليدوي.
- مسار attendance:
  - `POST /transport/trips/:tripId/stops/:stopId/attendance`
  - يغلق المحطة (`is_completed=true`) في ETA snapshots.
  - إذا أُغلقت كل المحطات: الرحلة تتحول تلقائيًا إلى `completed`.

هذا السلوك backend-driven ولا يحتاج endpoint إضافي من الفرونت لإكمال الرحلة.

---

## 9) أخطاء يجب أن يتعامل معها UX صراحة

| Endpoint | HTTP | code | المعنى التشغيلي |
| --- | --- | --- | --- |
| `/transport/realtime-token` | 409 | `FEATURE_DISABLED` | realtime مغلق من system settings |
| `/transport/realtime-token` | 409 | `INTEGRATION_NOT_CONFIGURED` | Firebase غير مهيأ |
| `/transport/trips/:tripId/live-status` | 403 | `FORBIDDEN` | parent غير مرتبط بالرحلة |
| `/transport/trips/:tripId/summary` | 409 | `TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS` | الملخص قبل اكتمال الرحلة |
| `/transport/trips/:tripId/stops/:stopId/attendance` | 400/409 | domain codes | stop/assignment/status mismatch |

---

## 10) Implementation Checklist لكل فريق

### Driver

- يلتزم بالثنائية: `POST /locations` + RTDB write.
- يجدد token قبل انتهاء نافذة `refreshAfterSeconds`.
- يطبق قاعدة تعطيل `End Trip` عند `completed`.

### Parent

- يستخدم reporting endpoint لاكتشاف `tripId`.
- يستخدم `live-status` للـ ETA.
- يستخدم RTDB للحركة فقط.
- يفصل rendering بين قناتي RTDB وREST.

### Admin

- يدير `system-settings` للـ gates والمزود.
- لا يعتمد على parent endpoints.
- يتوقع `409` في summary قبل `completed`.

---

## 11) Non-Negotiable Rules

- لا endpoint في frontend يختار map provider.
- لا حساب ETA داخل frontend.
- لا استخدام RTDB كمصدر ETA.
- لا تشغيل realtime بدون ownership checks.
- لا اعتبار teacher/supervisor كمستهلكين لقنوات transport realtime.

---

## 12) التشغيل التفصيلي (Firebase + Communication + Maps) بدون افتراضات

هذا القسم يوضح بدقة:

- ماذا ينفذ frontend.
- ماذا يرسل backend.
- ما هي المدخلات التي يجمعها التطبيق من المستخدم/السياق التشغيلي.

### 12.1 Firebase Realtime (RTDB) — End-to-End

#### ما يفعله frontend

1. يطلب bootstrap token من:
- `GET /transport/realtime-token?tripId=:tripId`

2. يقرأ من الاستجابة:
- `customToken`
- `databaseUrl`
- `path`
- `access` (`read` أو `write`)
- `refreshAfterSeconds`

3. يستخدم القيم كما هي:
- اتصال Firebase Auth عبر `customToken`.
- تشغيل RTDB على `databaseUrl`.
- القراءة/الكتابة على `path` نفسه.

4. يعيد طلب token قبل انتهاء `refreshAfterSeconds`.

#### ما يرسله backend

- token مخصص role-aware.
- RTDB path محدد للرحلة.
- access mode:
  - driver: `write`
  - parent/admin: `read`

#### ما يجمعه التطبيق من المستخدم (Inputs)

- `tripId` صحيح لرحلة فعلية.
- المستخدم مسجل دخول ومخول بالدور المناسب.
- للـ parent: التطبيق يحتاج سياق الطالب/الرحلة للوصول إلى `tripId`.

> ملاحظة تشغيلية من الكود: إذا فشل gate أو التكامل، endpoint يعيد `409` (`FEATURE_DISABLED` أو `INTEGRATION_NOT_CONFIGURED`).

### 12.2 Communication / Device Registry + FCM

#### الهدف

تسجيل جهاز المستخدم ليصبح مؤهلًا لاستلام إشعارات النقل (`transportRealtime`) عبر قناة `fcm`.

#### المسارات الفعلية

1. تسجيل جهاز:
- `POST /communication/devices`

2. تحديث جهاز:
- `PATCH /communication/devices/:deviceId`

3. إلغاء تسجيل:
- `DELETE /communication/devices/:deviceId`

4. قراءة إشعارات المستخدم:
- `GET /communication/notifications/me`

5. تعليم إشعار كمقروء:
- `PATCH /communication/notifications/:notificationId/read`

#### عقد الطلب الفعلي عند التسجيل (من validator)

```json
{
  "providerKey": "fcm",
  "platform": "android",
  "appId": "driver-app",
  "deviceToken": "fcm_device_token",
  "deviceName": "Pixel 8",
  "subscriptions": ["transportRealtime"]
}
```

قيود مهمة من الكود:

- `providerKey` يقبل فقط: `fcm`
- `platform` يقبل: `android | ios | web`
- `subscriptions` تقبل فقط: `transportRealtime`

#### ما يفعله frontend

- يحتفظ بـ `deviceId` بعد التسجيل.
- عند تغيّر `deviceToken` أو `subscriptions` يرسل `PATCH`.
- عند logout/إلغاء الربط يرسل `DELETE`.
- يفصل بين:
  - `notification` (عرض)
  - `data` (منطق التطبيق)

#### ما يجمعه التطبيق من المستخدم (Inputs)

- لا يوجد إدخال يدوي مباشر على payload الإشعارات.
- التطبيق يحتاج session مستخدم صالح (Bearer).
- التطبيق يحدد `platform/appId` ويجهز `deviceToken` من طبقة الإشعارات في العميل.

### 12.3 Maps + ETA (Provider-Neutral Public Contract)

#### ما يفعله frontend

1. يقرأ ETA من backend:
- `GET /transport/trips/:id/eta` (admin/driver)
- `GET /transport/trips/:tripId/live-status` (parent)

2. يرسم الخط إن توفر:
- `routePolyline.encodedPolyline`
- إذا `routePolyline = null` يعرض fallback UI بدون كسر الشاشة.

3. يقرأ `calculationMode` كما هو:
- `provider_snapshot`
- `derived_estimate`
- `null`

#### ما لا يفعله frontend

- لا يرسل اختيار مزود (`mapbox/google`) في أي endpoint تشغيلي.
- لا يستدعي API خرائط لحساب ETA.
- لا يعتبر RTDB بديلًا لـ ETA.

#### ما يجمعه التطبيق من المستخدم (Inputs)

- `tripId` (حسب الرحلة المختارة/النشطة).
- في parent flow: `studentId` لاكتشاف الرحلة النشطة عبر reporting.

### 12.4 ماذا يطلب التطبيق من المستخدم لكل دور (عمليًا)

#### Driver App

- اختيار رحلة (`tripId`) للعمل عليها.
- تنفيذ بدء الرحلة (`POST /transport/trips/:id/start`).
- متابعة إرسال المواقع (`POST /transport/trips/:id/locations`).
- تسجيل attendance لكل محطة عبر:
  - `POST /transport/trips/:tripId/stops/:stopId/attendance`
  - `attendances[]` تحتوي `studentId` + `status (present|absent)` + `notes?`
- عند `tripStatus=completed`:
  - إخفاء/تعطيل `End Trip`.

#### Parent App

- اختيار الطالب (`studentId`) داخل حساب ولي الأمر.
- قراءة الرحلة النشطة للطالب:
  - `GET /reporting/transport/parent/me/students/:studentId/live-status`
- إذا وجدت رحلة:
  - قراءة snapshot: `GET /transport/trips/:tripId/live-status`
  - قراءة stream token: `GET /transport/realtime-token?tripId=:tripId`

#### Admin Dashboard

- اختيار الرحلة (`tripId`) لمتابعة ETA/summary.
- إدارة إعدادات التكامل:
  - `PATCH /system-settings/pushNotifications`
  - `PATCH /system-settings/transportMaps`
- فهم أن `summary` لا يعمل إلا بعد `completed`.

### 12.5 حدود المسؤولية (Frontend vs Backend)

#### مسؤولية Backend

- صلاحيات role + ownership.
- إصدار realtime token/path.
- حساب ETA وتحديث snapshots.
- اختيار مزود الخرائط عبر system settings.
- enqueue + delivery pipeline للإشعارات عبر outbox.

#### مسؤولية Frontend

- احترام العقود كما هي (params/body/error handling).
- تشغيل قناتين منفصلتين في UI:
  - RTDB للحركة.
  - REST للـ ETA.
- إدارة device registry lifecycle (`POST/PATCH/DELETE` للأجهزة).
- عدم إضافة منطق خرائط موازي لحساب ETA.

# Parent App Endpoint Map (Code-Truth)

جميع المسارات أدناه تُستدعى تحت البادئة: `/api/v1`.

## 1) Session And Identity

### `POST /auth/login`
- الاستخدام: بدء الجلسة.
- request: `identifier`, `password`.
- response المهم للفرونت: `user` و `tokens.accessToken` و `tokens.refreshToken` و `tokens.expiresIn`.

### `GET /auth/me`
- الاستخدام: تأكيد هوية الجلسة الحالية.
- يجب أن يكون الدور `parent` لتفعيل شاشات ولي الأمر.

### `POST /auth/refresh`
- الاستخدام: تدوير `accessToken` قبل انتهاء الجلسة.

### `POST /auth/logout`
- الاستخدام: إنهاء الجلسة من جهة الباك.

### `POST /auth/change-password`
- الاستخدام: تحديث كلمة المرور للمستخدم الحالي.

## 2) Parent Dashboard And Student Reports

### `GET /reporting/dashboards/parent/me`
- الاستخدام: الشاشة الرئيسية لولي الأمر.
- response: `parent`, `children[]`, `latestNotifications[]`, `unreadNotifications`.
- ملاحظة: يعتمد على `Active Academic Context` الحالي.

### `GET /reporting/dashboards/parent/me/students/:studentId/profile`
### `GET /reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary`
### `GET /reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary`
### `GET /reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary`
- الاستخدام: صفحات تفاصيل الطالب.
- الحماية: parent ownership على الطالب.
- ملاحظة: تعتمد على `Active Academic Context`.

### `GET /reporting/transport/parent/me/students/:studentId/live-status`
- الاستخدام: surface تمهيدي لتحديد `assignment` و`activeTrip` لطالب معيّن.
- response مهم:
- `assignment`: route/stop الحالي أو `null`.
- `activeTrip`: معلومات الرحلة النشطة أو `null`.
- `activeTrip.eta`: ETA من منظور محطة الطالب داخل reporting.

## 3) Core Live Tracking Flow (Trip-Level)

### `GET /transport/trips/:tripId/live-status`
- الاستخدام: endpoint الرئيسي لشاشة تتبع الحافلة.
- الحماية: parent-only + ownership على الرحلة.
- response مفاتيح أساسية:
- `tripStatus`
- `firebaseRtdbPath` (المسار المرجعي للـ RTDB)
- `myStopSnapshot` (قد تكون `null`)
- `routePolyline` (قد تكون `null`)

### `GET /transport/realtime-token`
- الاستخدام: bootstrap للاتصال بـ Firebase RTDB.
- query إلزامي: `tripId`.
- response:
- `customToken`
- `databaseUrl`
- `path`
- `access` (`read` لولي الأمر)
- `refreshAfterSeconds`
- أخطاء مهمة:
- `409 FEATURE_DISABLED`
- `409 INTEGRATION_NOT_CONFIGURED`
- `403` إذا ولي الأمر لا يملك صلاحية الرحلة.

## 4) Homework (Parent Read Surface)

### `GET /homework/students/:studentId`
- الاستخدام: واجهة الواجبات للطالب.
- الحماية: parent ownership على الطالب.
- ملاحظة: تعتمد على semester من `Active Academic Context`.

## 5) Communication + Notifications

### Messages
- `GET /communication/recipients`
- `POST /communication/messages`
- `GET /communication/messages/inbox`
- `GET /communication/messages/sent`
- `GET /communication/messages/conversations/:otherUserId`
- `PATCH /communication/messages/:messageId/read`

### Announcements/Notifications
- `GET /communication/announcements/active`
- `GET /communication/notifications/me`
- `PATCH /communication/notifications/:notificationId/read`

### Device Registry (FCM)
- `POST /communication/devices`
- `PATCH /communication/devices/:deviceId`
- `DELETE /communication/devices/:deviceId`

`POST /communication/devices` request example:

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

## 6) FCM Transport Payload Mapping (Actual App Inbound)

الخريطة التشغيلية:
- outbox `event_type = fcm.transport.bus_approaching` => app `data.eventType = bus_approaching`
- outbox `event_type = fcm.transport.bus_arrived` => app `data.eventType = bus_arrived`

مفاتيح `data` الواصلة للتطبيق:
- `eventType`
- `tripId`
- `routeId`
- `studentIds` (CSV string)
- `notificationType`

مهم:
- `event_type` لا يصل مباشرة للـ SDK payload داخل التطبيق.
- `studentIds` تصل كسلسلة مثل `"501,502"` وتحتاج parse.

## 7) Parent AI Analytics

### `GET /analytics/students/:studentId/risk-summary`
- الاستخدام: قراءة آخر `student risk summary` منشور للطالب.
- الحماية: parent ownership على `studentId`.
- ملاحظات:
  - لا يعيد drafts أو rejected snapshots.
  - يعيد `snapshot.reviewStatus/publishedAt`.
  - يعيد `analysisMode`, `providerKey`, `fallbackUsed`, `computedAt`.
  - `insight.adminRecommendations` لا يجب أن يعتمد عليها الفرونت هنا لأنها لا تُعرض لولي الأمر.

### `POST /analytics/snapshots/:snapshotId/feedback`
- الاستخدام: إرسال rating أو feedback text على snapshot منشورة.
- body:

```json
{
  "rating": 4,
  "feedbackText": "التوصيات واضحة ومفيدة."
}
```

- قاعدة إلزامية:
  - يجب وجود `rating` أو `feedbackText` على الأقل.
  - ولي الأمر لا يستطيع إرسال feedback على snapshot غير `approved`.

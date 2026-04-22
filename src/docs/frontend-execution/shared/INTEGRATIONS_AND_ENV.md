# Integrations And Environment (Code-Truth)

هذه الوثيقة تشرح التكاملات الفعلية كما هي في الكود الحالي، وما يحتاجه frontend لفهم التشغيل.

## 1. Firebase Realtime (Transport Live GPS)

## 1.1 ما ينفذه backend

- endpoint bootstrap:
  - `GET /transport/realtime-token?tripId={tripId}`
- policy:
  - `admin | parent | driver`
- checks داخل service:
  - feature gate: `pushNotifications.transportRealtimeEnabled` يجب أن تكون مفعلة.
  - integration configured: Firebase env secrets + database URL.
  - ownership:
    - `driver`: لازم يملك الرحلة.
    - `parent`: لازم مرتبط بالرحلة.
    - `admin`: read access.
- path الناتج ثابت:
  - `/transport/live-trips/{tripId}/latestLocation`

## 1.2 ما يجب على frontend

- خذ token من `realtime-token`.
- اتصل بـ RTDB باستخدام `customToken` و`databaseUrl`.
- استمع/اكتب على path المرجع من الاستجابة.
- لا تستخدم REST polling للحركة الحية إذا RTDB متاح.

## 1.3 read/write windows

من `firebase-realtime-auth.service.ts`:

- access = `write` (driver):
  - `refreshAfterSeconds = 240`
- access = `read` (admin/parent):
  - `refreshAfterSeconds = 840`

## 2. Firebase Push (FCM)

## 2.1 قناة المعالجة

- جميع push delivery تمر عبر `integration_outbox` ثم:
  - `automation/firebase-outbox-processor.service.ts`
- provider key:
  - `pushNotifications`
- processor لا يعمل إذا:
  - `pushNotifications.fcmEnabled=false`
  - أو `pushNotifications.transportRealtimeEnabled=false`

## 2.2 شكل payload الوارد للتطبيق

التطبيق يستلم من SDK كائنين مهمين:

- `notification`: للعرض المباشر (banner/system tray)
- `data`: للمنطق البرمجي (routing/state/event handling)

مثال inbound:

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

ملاحظة مهمة:

- طبقة push backend تحول `data` إلى strings.
- `studentIds` تصل كسلسلة CSV (`"501,502"`)، وليست array في SDK payload النهائي.
- `referenceType/referenceId` موجودة في outbox payload الداخلي، وليست ضمن `data` المرسلة للجهاز.

## 2.3 event mapping

- `integration_outbox.event_type = fcm.transport.bus_approaching`
  - `data.eventType = bus_approaching`
- `integration_outbox.event_type = fcm.transport.bus_arrived`
  - `data.eventType = bus_arrived`

## 3. Maps / ETA integrations

## 3.1 ما ينفذه backend

- provider runtime layer:
  - `MapboxAdapter`
  - `GoogleMapsAdapter`
  - resolver عبر system settings:
    - `transportMaps.etaProvider`
- ETA public contract provider-neutral:
  - `calculationMode: provider_snapshot | derived_estimate | null`
- snapshot writer/update داخل backend workers/services.

## 3.2 ما يجب على frontend

- اعرض ETA كما تأتي من:
  - `GET /transport/trips/:id/eta`
  - أو `GET /transport/trips/:tripId/live-status` (for parent)
- لا تستدعي map provider API من التطبيق لحساب ETA.
- `routePolyline` قد تكون `null`؛ يجب دعم fallback UI.

## 4. Transport realtime split (إجباري في UX)

- Live GPS source:
  - Firebase RTDB
- ETA + stop states source:
  - REST snapshot من backend

لا تخلط القناتين داخل state machine واحدة بدون source labels واضحة.

## 5. AI Analytics integrations

## 5.1 ما ينفذه backend

- analytics runtime لا يعمل من الفرونت ولا من لوحة التحكم بشكل synchronous.
- المسار التشغيلي الفعلي:
  - `POST /analytics/jobs/*`
  - ثم `integration_outbox`
  - ثم `automation:analytics-worker`
  - ثم حفظ snapshot في قاعدة البيانات
  - ثم القراءة من:
    - `GET /analytics/students/:studentId/risk-summary`
    - `GET /analytics/teachers/:teacherId/compliance-summary`
    - `GET /analytics/admin/operational-digest`
    - `GET /analytics/classes/:classId/overview`
    - `GET /analytics/transport/routes/:routeId/anomalies`
- control plane الحاكم من:
  - `GET /system-settings/analytics`
  - `PATCH /system-settings/analytics`
- اختيار المزود ليس من الفرونت.
- المزودان المدعومان في الكود الحالي:
  - `openai`
  - `groq`
- backend يستخدم:
  - `primaryProvider`
  - `fallbackProvider`
  - ويشترط أن يكونا مختلفين.

## 5.2 ما يجب على frontend

- لا تتصل بـ `OpenAI` أو `Groq` من أي تطبيق frontend.
- لا ترسل raw student data إلى مزود AI من التطبيق.
- كل ما يفعله frontend:
  - `admin`: يطلق jobs ويقرأ snapshots ويراجعها ويرسل feedback.
  - `parent`: يقرأ `student risk summary` المصرح له فقط ويرسل feedback على snapshot المنشورة.
  - `teacher/supervisor`: يقرآن `class overview` المصرح لهما فقط ويرسلان feedback على snapshot المنشورة.
- `admin` وحده يراجع snapshot عبر:
  - `POST /analytics/snapshots/:snapshotId/review`
- غير `admin` لا يجب أن يفترضوا أنهم سيشاهدون drafts أو rejected snapshots.

## 5.3 review/publishing semantics

- snapshot الجديدة تبدأ `draft`.
- إذا اعتمدها `admin` تصبح:
  - `reviewStatus = approved`
  - `publishedAt != null`
- إذا رفضها `admin` تصبح:
  - `reviewStatus = rejected`
- عند اعتماد snapshot جديدة لنفس `(analysisType, subjectType, subjectId, academicYearId, semesterId)`:
  - snapshot المعتمدة السابقة تصبح `superseded`
- parent/teacher/supervisor يقرأون فقط snapshot المعتمدة.
- `admin` يقرأ آخر snapshot حتى لو كانت draft.

## 6. Environment Variables (from env.ts)

| Variable | Required by env schema | Default | Operational effect | Frontend impact |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | mode | indirect |
| `PORT` | no | `4000` | server bind | no |
| `APP_NAME` | no | `ishraf-platform-backend` | health/log identity | no |
| `API_PREFIX` | no | `/api/v1` | base API path | yes |
| `PUBLIC_ROOT_URL` | no | none | public root reference | indirect |
| `PUBLIC_API_BASE_URL` | no | none | public API URL reference | indirect |
| `DATABASE_URL` | yes | none | main DB connection | indirect |
| `DATABASE_URL_MIGRATIONS` | no | none | migration DB URL | no |
| `DATABASE_SCHEMA` | no | `public` | DB schema | no |
| `ACCESS_TOKEN_SECRET` | yes | none | JWT signing | no |
| `ACCESS_TOKEN_TTL_MINUTES` | no | `15` | access token TTL | yes (refresh timing) |
| `REFRESH_TOKEN_SECRET` | yes | none | refresh signing | no |
| `REFRESH_TOKEN_TTL_DAYS` | no | `7` | refresh TTL | yes (session behavior) |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | no | `30` | reset token validity | yes (UX timer text) |
| `CORS_ALLOWED_ORIGINS` | no | empty | CORS policy | yes (browser access) |
| `TRUST_PROXY` | no | `false` | proxy trust | no |
| `REQUEST_BODY_LIMIT` | no | `1mb` | body max size | yes (payload design) |
| `AUTH_LOGIN_RATE_LIMIT_MAX` | no | `5` | login throttling | yes (429 handling) |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS` | no | `900000` | login window | yes |
| `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX` | no | `5` | reset throttling | yes |
| `AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS` | no | `900000` | reset window | yes |
| `AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE` | no | `false` | reset response shape | yes (dev/test only) |
| `BCRYPT_SALT_ROUNDS` | no | `12` | password hash cost | no |
| `FIREBASE_PROJECT_ID` | optional | none | Firebase init | yes (if missing, realtime/push unavailable) |
| `FIREBASE_CLIENT_EMAIL` | optional | none | Firebase init | yes (same) |
| `FIREBASE_PRIVATE_KEY` | optional | none | Firebase init | yes (same) |
| `FIREBASE_DATABASE_URL` | optional | none | RTDB endpoint | yes (realtime bootstrap) |
| `OPENAI_API_KEY` | optional | none | primary AI analytics provider secret | no (backend only) |
| `OPENAI_API_MODEL` | no | `gpt-5-mini` | model name for OpenAI analytics narrative generation | no (backend only) |
| `OPENAI_API_TIMEOUT_MS` | no | `15000` | OpenAI analytics timeout | no (backend only) |
| `GROQ_API_KEY` | optional | none | fallback AI analytics provider secret | no (backend only) |
| `GROQ_API_MODEL` | no | `openai/gpt-oss-20b` | model name for Groq analytics narrative generation | no (backend only) |
| `GROQ_API_TIMEOUT_MS` | no | `15000` | Groq analytics timeout | no (backend only) |
| `MAPBOX_API_KEY` | optional | none | mapbox adapter config | indirect |
| `MAPBOX_API_TIMEOUT_MS` | no | `4000` | mapbox timeout | indirect |
| `GOOGLE_MAPS_API_KEY` | optional | none | google adapter config | indirect |
| `GOOGLE_MAPS_API_TIMEOUT_MS` | no | `4000` | google timeout | indirect |
| `LOG_LEVEL` | no | `info` | logging | no |

## 7. 409 integration conflicts التي يجب دعمها في UI

من `GET /transport/realtime-token`:

- `FEATURE_DISABLED`
  - عندما `pushNotifications.transportRealtimeEnabled=false`
- `INTEGRATION_NOT_CONFIGURED`
  - عندما Firebase غير مهيأ

التعامل المقترح:

- إخفاء live map stream controls.
- إبقاء ETA snapshot view متاحًا إن وجد.

من `analytics`:

- `AI analytics is disabled`
  - عندما `analytics.aiAnalyticsEnabled=false`
- `Scheduled analytics recompute is disabled`
  - عندما `analytics.scheduledRecomputeEnabled=false`
- retention cleanup endpoint يرفض عندما:
  - `analytics.retentionCleanupEnabled=false`

التعامل المقترح:

- في admin dashboard:
  - عطّل أزرار إطلاق jobs أو اعرض banner واضح بأن analytics غير مفعلة.
- في parent/teacher/supervisor:
  - إذا لم توجد snapshot منشورة بعد، اعرض empty-state تشغيلية بدل افتراض أن backend سيفتح job من التطبيق.

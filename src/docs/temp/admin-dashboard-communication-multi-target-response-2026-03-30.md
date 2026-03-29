# Backend Response: Communication Phase 2 / Multi-Target Contracts

تم اعتماد Backend رسمي لـ `Communication Phase 2 / Multi-Target Contracts`.

## القرار المعتمد

- لا يوجد frontend-only solution صحيح لهذه المرحلة.
- تم اعتماد عقود backend رسمية للمراسلة والإشعارات متعددة الأهداف.
- لا يوجد `group thread`.
- direct multi-target = `individual one-to-one copies`
- announcements = `roles/all only`
- لا توجد `person-targeted announcements`

## المسارات المعتمدة

### [NEW] `POST /api/v1/communication/messages/bulk`

Purpose:
- إرسال رسائل متعددة الأهداف من لوحة الإدارة عبر backend رسمي واحد.

Body:

```json
{
  "receiverUserIds": ["1005"],
  "targetRoles": ["teacher", "driver"],
  "messageBody": "تحديث تشغيلي لليوم"
}
```

Rules:
- `admin-only`
- واحد على الأقل من:
  - `receiverUserIds[]`
  - `targetRoles[]`
  مطلوب
- audience resolution تعتمد نفس قواعد:
  - `GET /api/v1/communication/recipients`
- explicit self-targeting مرفوض
- explicit unavailable user ids مرفوضة
- all-or-nothing transaction
- لا يتم إنشاء group thread

Success shape:

```json
{
  "success": true,
  "message": "Bulk messages delivered successfully",
  "data": {
    "resolvedRecipients": 3,
    "duplicatesRemoved": 1,
    "successCount": 3,
    "failedCount": 0,
    "failedTargets": []
  }
}
```

### [NEW] `POST /api/v1/communication/notifications/bulk`

Purpose:
- إرسال إشعارات متعددة الأهداف من لوحة الإدارة عبر backend رسمي واحد.

Body:

```json
{
  "userIds": ["1005"],
  "targetRoles": ["teacher", "driver"],
  "title": "تذكير تشغيلي",
  "message": "يرجى مراجعة الخطة المحدثة",
  "notificationType": "operations",
  "referenceType": null,
  "referenceId": null
}
```

Rules:
- `admin-only`
- واحد على الأقل من:
  - `userIds[]`
  - `targetRoles[]`
  مطلوب
- audience resolution تعتمد نفس قواعد:
  - `GET /api/v1/communication/recipients`
- all-or-nothing transaction
- response = delivery summary only

Success shape:

```json
{
  "success": true,
  "message": "Bulk notifications delivered successfully",
  "data": {
    "resolvedRecipients": 3,
    "duplicatesRemoved": 1,
    "successCount": 3,
    "failedCount": 0,
    "failedTargets": []
  }
}
```

### Extended `POST /api/v1/communication/announcements`

الآن يدعم:
- legacy:
  - `targetRole?: Role | null`
- new:
  - `targetRoles?: Role[]`

Rules:
- لا ترسلوا `targetRole` و`targetRoles` معًا
- omission لكليهما = `all users`
- لا توجد `userIds[]` هنا
- announcements تبقى:
  - role-targeted
  - أو all-users
  فقط

Response behavior:
- `targetRole` يبقى موجودًا للتوافق الخلفي
- `targetRoles[]` أضيفت رسميًا
- إذا كان الإعلان single-role:
  - `targetRole = that role`
  - `targetRoles = [that role]`
- إذا كان الإعلان multi-role:
  - `targetRole = null`
  - `targetRoles = [...]`
- إذا كان الإعلان عامًا:
  - `targetRole = null`
  - `targetRoles = []`

## المطلوب من الفرونت

### 1. الرسائل متعددة الأهداف

- لا تنفذوا loops محلية على:
  - `POST /communication/messages`
- استخدموا:
  - `POST /communication/messages/bulk`

### 2. الإشعارات متعددة الأهداف

- لا تنفذوا loops محلية على:
  - `POST /communication/notifications`
- استخدموا:
  - `POST /communication/notifications/bulk`

### 3. الإعلانات

- إذا كان الاستهداف role واحدة فقط:
  - يمكن استخدام `targetRole`
  - أو `targetRoles` مع عنصر واحد
- إذا كان الاستهداف متعدد الأدوار:
  - استخدموا `targetRoles[]`
- إذا كان الإعلان عامًا:
  - لا ترسلوا `targetRole`
  - ولا `targetRoles`

## الأماكن المتأثرة في لوحة الإدارة

1. `CommunicationComposerDrawer`
   - إضافة mode للـ bulk message
   - إضافة mode للـ bulk notification

2. `MessagingRecipientDirectorySelect`
   - يبقى مصدر الاختيار الرسمي
   - لكن multi-target submit يجب أن يذهب إلى bulk endpoints الجديدة

3. `communication-compose.ts`
   - إزالة أي local loop workaround
   - اعتماد contract جديدة للـ bulk summary responses

4. شاشات announcement compose
   - دعم `targetRoles[]`
   - منع إرسال `targetRole` و`targetRoles` معًا
   - منع أي person-targeted announcement UI

5. أي adapters / contracts محلية
   - أضيفوا delivery summary contract
   - أضيفوا `targetRoles` في announcement model

## Validation semantics

- `400 Validation Error`
  - عند غياب audience فعلية
  - code = `AUDIENCE_EMPTY`

- `400 Validation Error`
  - عند وجود explicit ids خارج surface المتاح
  - code = `TARGET_USER_NOT_AVAILABLE`

- `400 Validation Error`
  - عند explicit self-targeting في bulk messages
  - code = `SELF_TARGETING_NOT_ALLOWED`

- `403 Forbidden`
  - إذا حاول non-admin استخدام bulk endpoints

## المرجع النهائي

- `src/docs/API_REFERENCE.md`
- `src/docs/openapi/ishraf-platform.openapi.json`
- `src/docs/postman/ishraf-platform.postman_collection.json`
- `src/docs/frontend-execution/admin-dashboard/ENDPOINT_MAP.md`

اعتمدوا هذه الملفات فقط كمرجع نهائي، وأوقفوا أي local aggregation أو loops محلية خاصة بـ multi-target delivery.

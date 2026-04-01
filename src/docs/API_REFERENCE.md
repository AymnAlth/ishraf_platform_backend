# Ishraf Platform Backend API Reference

هذا الملف هو المرجع البشري التشغيلي الحالي للباك إند.

مهم:

- التغطية التعاقدية الدقيقة والكاملة للـ API موجودة في:
  - `src/docs/openapi/ishraf-platform.openapi.json`
  - `src/docs/postman/ishraf-platform.postman_collection.json`
- حالة التغطية الحالية:
- `OpenAPI = 150/150`
- `Postman = 150/150`
- هذا الملف يشرح العقود البشرية وقواعد الاستخدام والـ endpoints الأكثر أهمية للفرق، ويجب أن يبقى منسجمًا مع الكود و`OpenAPI/Postman` دون أن يحاول أن يكون clone حرفيًا لكل schema سطرًا بسطر.

حالة البيئة المستضافة الحالية بتاريخ `2026-04-01`:
- حساب الأدمن الأساسي المحفوظ: `mod87521@gmail.com`
- الحسابات الحالية نفسها موثقة في `src/docs/STAGING_FRONTEND_SEED.md`
- توجد الآن dataset أكاديمية وتشغيلية عربية متكاملة على البيئة المستضافة
- مرجع تفاصيلها وعدد السجلات الحالية موجود في:
  - `src/docs/STAGING_FRONTEND_SEED.md`

الملفات الجاهزة للاستخدام:
- Postman Collection: `src/docs/postman/ishraf-platform.postman_collection.json`
- Postman Staging Environment: `src/docs/postman/ishraf-platform.staging.postman_environment.json`
- OpenAPI Spec: `src/docs/openapi/ishraf-platform.openapi.json`
- Testing Guide: `src/docs/TESTING_WITH_OPENAPI_AND_POSTMAN.md`
- Frontend Execution Pack: `src/docs/frontend-execution/README.md`

إذا كنت تبني واجهات الفرونت أو لوحة الإدارة، فابدأ أولًا من:

- `src/docs/frontend-execution/README.md`

ثم عد إلى هذا الملف كمرجع بشري للعقود.

## Base URL

```text
https://ishraf-platform-backend-staging.onrender.com/api/v1
```

للتشغيل المحلي بدلًا من الاستضافة:

```text
http://localhost:4000/api/v1
```

المرجع التشغيلي الحالي يعتمد على متغيرات البيئة التالية:
- `PUBLIC_ROOT_URL=https://ishraf-platform-backend-staging.onrender.com`
- `PUBLIC_API_BASE_URL=https://ishraf-platform-backend-staging.onrender.com/api/v1`
- `DATABASE_URL=<Neon pooled connection>`
- `DATABASE_URL_MIGRATIONS=<Neon direct connection>`

مهم:
- روابط قاعدة البيانات تبقى داخل ملفات البيئة وRender env vars فقط
- لا يتم نشر connection strings الحقيقية داخل ملفات التوثيق أو OpenAPI أو Postman

Health endpoints are exposed outside the API prefix:

```text
GET /health
GET /health/ready
```

## Authentication

- `POST /auth/login` و`POST /auth/refresh` و`POST /auth/logout` لا تحتاج Access Token.
- بقية مسارات `users` و`academic-structure` تحتاج:

```http
Authorization: Bearer <accessToken>
```

- جميع مسارات `users` و`academic-structure` الحالية مخصصة لـ `admin` فقط.

## Common Response Shape

### Success

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "code": "VALIDATION_ERROR",
      "message": "Email must be a valid email address"
    }
  ]
}
```

## Quick Start With Postman

1. استورد الملف `src/docs/postman/ishraf-platform.postman_collection.json`
2. استورد ملف البيئة الجاهز للاستضافة:
   - `src/docs/postman/ishraf-platform.staging.postman_environment.json`
3. اختر environment `Ishraf Platform Staging`
4. أدخل:
   - `loginIdentifier`
   - `loginPassword`
5. نفّذ `Health / Health Ready`
6. نفّذ `Auth / Login`
7. سيتم حفظ `accessToken` و`refreshToken` تلقائيًا داخل متغيرات الـ collection
8. نفّذ بقية الطلبات مباشرة على الاستضافة

لشرح Postman وOpenAPI خطوة بخطوة:
- `src/docs/TESTING_WITH_OPENAPI_AND_POSTMAN.md`

ملاحظات تشغيلية سريعة:
- `POST /auth/login` عليه rate limit: خمس محاولات فاشلة خلال 15 دقيقة لكل `IP + identifier`
- `POST /auth/forgot-password` و`POST /auth/reset-password` عليهما rate limit أيضًا
- `GET /health/ready` يفحص اتصال قاعدة البيانات ويصلح كـ readiness probe في الاستضافة
- list endpoints التالية أصبحت تدعم pagination وsorting وfilters حسب الدومين:
  - `GET /users`
  - `GET /students`
  - `GET /attendance/sessions`
  - `GET /assessments`
  - `GET /behavior/records`
  - `GET /transport/trips`
  - `GET /communication/messages/inbox`
  - `GET /communication/messages/sent`
  - `GET /communication/messages/conversations/:otherUserId`
  - `GET /communication/notifications/me`
- أمثلة المعرفات `id` في هذا الملف أمثلة فقط، وليست قيمًا ثابتة مضمونة في كل قاعدة بيانات

## Paginated List Shape

كل list endpoint مفعّل عليه pagination يرجع:

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 0,
      "totalPages": 0
    }
  }
}
```

بعض المسارات تضيف حقولًا إضافية داخل `data`:
- `GET /communication/messages/inbox`: يضيف `unreadCount`
- `GET /communication/notifications/me`: يضيف `unreadCount`

الـ query params المشتركة:
- `page`: افتراضي `1`
- `limit`: افتراضي `20` وأقصى قيمة `100`
- `sortBy`: يجب أن يكون ضمن whitelist الخاصة بالمسار
- `sortOrder`: `asc` أو `desc`

الترتيب الافتراضي:
- `desc` في معظم القوائم
- `GET /communication/messages/conversations/:otherUserId` يستخدم `sentAt asc` افتراضيًا للحفاظ على التسلسل الزمني

## Active Academic Context

القاعدة التشغيلية الجديدة للنظام:
- توجد سنة دراسية واحدة فقط `active`
- يوجد فصل دراسي واحد فقط `active`
- الفصل النشط يجب أن ينتمي إلى السنة النشطة
- هذا الزوج هو المرجع التشغيلي اليومي الرسمي للوحة الإدارة

التمييز المهم:
- `Academic Management`:
  - يسمح بتجهيز سنوات غير نشطة صراحة
  - مثل السنوات والفصول والصفوف و`subject-offerings` والتعيينات و`student academic enrollments`
- `Operational Surfaces`:
  - تعمل فقط على `active academic year + active semester`
  - مثل الحضور والتقييمات والسلوك والواجبات والطلاب والتقارير اليومية

سلوك الاستجابات:
- إذا لم يوجد `active academic year + active semester` مكتملان:
  - المسارات التشغيلية المعتمدة على السياق ترجع `409 Academic context not configured`
- إذا وُجد السياق النشط لكن لا توجد بيانات بعد:
  - المسارات ترجع `200` مع empty/zero-safe payload

قواعد انتقالية مهمة:
- بعض المسارات التشغيلية ما زالت تقبل `academicYearId` و`semesterId` أثناء الانتقال
- لكن إذا أُرسلت هذه القيم في المسارات التشغيلية، فيجب أن تطابق السياق النشط
- يمكن أيضًا تركها فارغة في المسارات التي أصبحت `active-context-first`، والباك سيحلها من السياق النشط تلقائيًا
## Current Ready Endpoints

### Auth Module

#### POST `/auth/login`

الهدف: تسجيل الدخول عبر `email` أو `phone` وإرجاع `accessToken` و`refreshToken`.

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "identifier": "mod87521@gmail.com",
  "password": "<current-admin-password>"
}
```

أخطاء شائعة:
- `401 Unauthorized`: بيانات الدخول غير صحيحة
- `403 Forbidden`: الحساب غير نشط
- `429 Too Many Requests`: تم تجاوز عدد محاولات الدخول المسموح به

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "1",
      "fullName": "أيمن أحمد محسن الذاهبي",
      "email": "mod87521@gmail.com",
      "phone": null,
      "role": "admin",
      "isActive": true
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 900
    }
  }
}
```

#### POST `/auth/refresh`

الهدف: تدوير refresh token وإرجاع access token جديد.

```http
POST /api/v1/auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": 900
  }
}
```

#### POST `/auth/logout`

الهدف: إبطال refresh token الحالي.

```http
POST /api/v1/auth/logout
Content-Type: application/json
```

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

#### POST `/auth/change-password`

الهدف: تغيير كلمة مرور المستخدم الحالي وإبطال كل refresh tokens الخاصة به.

```http
POST /api/v1/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "currentPassword": "<current-admin-password>",
  "newPassword": "UpdatedPassword123!"
}
```

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

#### GET `/auth/me`

الهدف: جلب بيانات المستخدم الحالي.

```http
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "Current user fetched successfully",
  "data": {
    "id": "1",
    "fullName": "أيمن أحمد محسن الذاهبي",
    "email": "mod87521@gmail.com",
    "phone": null,
    "role": "admin",
    "isActive": true,
    "lastLoginAt": "2026-03-13T10:00:00.000Z"
  }
}
```

### Users Module

#### POST `/users`

الهدف: إنشاء مستخدم جديد وإنشاء profile مناسب حسب الدور داخل transaction واحدة.

```http
POST /api/v1/users
Authorization: Bearer <accessToken>
Content-Type: application/json
```

مثال Teacher:

```json
{
  "fullName": "New Teacher",
  "email": "newteacher@ishraf.local",
  "phone": "700000010",
  "password": "StrongPass123",
  "role": "teacher",
  "profile": {
    "specialization": "Mathematics",
    "qualification": "Bachelor",
    "hireDate": "2025-09-01"
  }
}
```

مثال Parent:

```json
{
  "fullName": "New Parent",
  "email": "newparent@ishraf.local",
  "phone": "700000011",
  "password": "StrongPass123",
  "role": "parent",
  "profile": {
    "address": "Dhamar",
    "relationType": "father"
  }
}
```

الأشكال الأخرى المدعومة:

Admin:

```json
{
  "fullName": "New Admin",
  "email": "newadmin@ishraf.local",
  "phone": "700000012",
  "password": "StrongPass123",
  "role": "admin"
}
```

Supervisor:

```json
{
  "fullName": "New Supervisor",
  "email": "newsupervisor@ishraf.local",
  "phone": "700000013",
  "password": "StrongPass123",
  "role": "supervisor",
  "profile": {
    "department": "Academic Affairs"
  }
}
```

Driver:

```json
{
  "fullName": "New Driver",
  "email": "newdriver@ishraf.local",
  "phone": "700000014",
  "password": "StrongPass123",
  "role": "driver",
  "profile": {
    "licenseNumber": "DRV-1001",
    "driverStatus": "active"
  }
}
```

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "6",
    "fullName": "New Teacher",
    "email": "newteacher@ishraf.local",
    "phone": "700000010",
    "role": "teacher",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-03-13T11:00:00.000Z",
    "updatedAt": "2026-03-13T11:00:00.000Z",
    "profile": {
      "specialization": "Mathematics",
      "qualification": "Bachelor",
      "hireDate": "2025-09-01"
    }
  }
}
```

قواعد مهمة:
- يجب إرسال `email` أو `phone` على الأقل
- `password` يجب أن يكون بين 8 و72 حرفًا
- `profile` يختلف حسب `role`
- `role=admin` لا يقبل profile

#### GET `/users`

الهدف: جلب كل المستخدمين الحاليين مع profile موحّد حسب الدور.

```http
GET /api/v1/users
Authorization: Bearer <accessToken>
```

Query params المدعومة:
- `page`
- `limit`
- `sortBy`: `createdAt | fullName | email | role`
- `sortOrder`: `asc | desc`
- `role`: `admin | parent | teacher | supervisor | driver`
- `isActive`: `true | false`

```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": {
    "items": [
      {
        "id": "1",
        "fullName": "أيمن أحمد محسن الذاهبي",
        "email": "mod87521@gmail.com",
        "phone": null,
        "role": "admin",
        "isActive": true,
        "lastLoginAt": "2026-03-13T10:00:00.000Z",
        "createdAt": "2026-03-13T03:44:07.985Z",
        "updatedAt": "2026-03-13T03:44:07.985Z",
        "profile": null
      },
      {
        "id": "47",
        "fullName": "مروان أمين شعبان",
        "email": "marwan-amin-shaban@ishraf.local",
        "phone": null,
        "role": "teacher",
        "isActive": true,
        "lastLoginAt": null,
        "createdAt": "2026-03-13T03:44:07.985Z",
        "updatedAt": "2026-03-13T03:44:07.985Z",
        "profile": {
          "specialization": "Mathematics",
          "qualification": "Bachelor",
          "hireDate": "2025-09-01"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 2,
      "totalPages": 1
    }
  }
}
```

#### GET `/users/:id`

الهدف: جلب مستخدم واحد مع profile.

```http
GET /api/v1/users/47
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "id": "47",
    "fullName": "مروان أمين شعبان",
    "email": "marwan-amin-shaban@ishraf.local",
    "phone": null,
    "role": "teacher",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-03-13T03:44:07.985Z",
    "updatedAt": "2026-03-13T03:44:07.985Z",
    "profile": {
      "specialization": "Mathematics",
      "qualification": "Bachelor",
      "hireDate": "2025-09-01"
    }
  }
}
```

#### PATCH `/users/:id`

الهدف: تحديث base fields وحقول profile فقط. لا يسمح بتغيير `role` أو `password`.

```http
PATCH /api/v1/users/47
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "fullName": "Updated Teacher",
  "phone": "700000099",
  "profile": {
    "specialization": "Physics"
  }
}
```

مهم: أرسل فقط حقول `profile` المطابقة لدور المستخدم الحالي. إذا أرسلت حقولًا لا تنتمي لدوره الحالي فستحصل على `400 Validation Error`.

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "47",
    "fullName": "Updated Teacher",
    "email": "marwan-amin-shaban@ishraf.local",
    "phone": "700000099",
    "role": "teacher",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-03-13T03:44:07.985Z",
    "updatedAt": "2026-03-13T11:20:00.000Z",
    "profile": {
      "specialization": "Physics",
      "qualification": "Bachelor",
      "hireDate": "2025-09-01"
    }
  }
}
```

#### PATCH `/users/:id/status`

الهدف: تفعيل أو تعطيل المستخدم. عند التعطيل يتم إبطال refresh tokens مباشرة.

```http
PATCH /api/v1/users/49/status
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "isActive": false
}
```

```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "id": "49",
    "fullName": "هلال عبد الله الملصي",
    "email": "hilal-abdullah-almolsi@ishraf.local",
    "phone": null,
    "role": "driver",
    "isActive": false,
    "lastLoginAt": null,
    "createdAt": "2026-03-13T03:44:07.985Z",
    "updatedAt": "2026-03-13T11:30:00.000Z",
    "profile": {
      "licenseNumber": "DRV-0001",
      "driverStatus": "active"
    }
  }
}
```

### Academic Structure Module

#### POST `/academic-structure/academic-years`

الهدف: إنشاء سنة دراسية جديدة، ويمكن جعلها السنة النشطة.

```http
POST /api/v1/academic-structure/academic-years
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "2026-2027",
  "startDate": "2026-09-01",
  "endDate": "2027-06-30",
  "isActive": true
}
```

```json
{
  "success": true,
  "message": "Academic year created successfully",
  "data": {
    "id": "2",
    "name": "2026-2027",
    "startDate": "2026-09-01",
    "endDate": "2027-06-30",
    "isActive": true,
    "createdAt": "2026-03-13T12:00:00.000Z",
    "updatedAt": "2026-03-13T12:00:00.000Z"
  }
}
```

#### GET `/academic-structure/academic-years`

الهدف: جلب كل السنوات الدراسية.

```http
GET /api/v1/academic-structure/academic-years
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "Academic years fetched successfully",
  "data": [
    {
      "id": "1",
      "name": "2025-2026",
      "startDate": "2025-09-01",
      "endDate": "2026-06-30",
      "isActive": true,
      "createdAt": "2026-03-13T03:44:07.985Z",
      "updatedAt": "2026-03-13T03:44:07.985Z"
    }
  ]
}
```

#### GET `/academic-structure/academic-years/:id`

الهدف: جلب سنة دراسية واحدة.

```http
GET /api/v1/academic-structure/academic-years/1
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "Academic year fetched successfully",
  "data": {
    "id": "1",
    "name": "2025-2026",
    "startDate": "2025-09-01",
    "endDate": "2026-06-30",
    "isActive": true,
    "createdAt": "2026-03-13T03:44:07.985Z",
    "updatedAt": "2026-03-13T03:44:07.985Z"
  }
}
```

#### PATCH `/academic-structure/academic-years/:id`

الهدف: تحديث بيانات سنة دراسية موجودة.

```http
PATCH /api/v1/academic-structure/academic-years/1
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "2025-2026 Updated"
}
```

```json
{
  "success": true,
  "message": "Academic year updated successfully",
  "data": {
    "id": "1",
    "name": "2025-2026 Updated",
    "startDate": "2025-09-01",
    "endDate": "2026-06-30",
    "isActive": true,
    "createdAt": "2026-03-13T03:44:07.985Z",
    "updatedAt": "2026-03-13T12:10:00.000Z"
  }
}
```

#### PATCH `/academic-structure/academic-years/:id/activate`

الهدف: جعل سنة واحدة فقط نشطة.

```http
PATCH /api/v1/academic-structure/academic-years/2/activate
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "Academic year activated successfully",
  "data": {
    "id": "2",
    "name": "2026-2027",
    "startDate": "2026-09-01",
    "endDate": "2027-06-30",
    "isActive": true,
    "createdAt": "2026-03-13T12:00:00.000Z",
    "updatedAt": "2026-03-13T12:15:00.000Z"
  }
}
```

#### POST `/academic-structure/academic-years/:academicYearId/semesters`

الهدف: إنشاء فصل دراسي داخل سنة محددة.

```http
POST /api/v1/academic-structure/academic-years/1/semesters
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "Summer Term",
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "isActive": false
}
```

```json
{
  "success": true,
  "message": "Semester created successfully",
  "data": {
    "id": "3",
    "academicYear": {
      "id": "1",
      "name": "2025-2026"
    },
    "name": "Summer Term",
    "startDate": "2026-05-01",
    "endDate": "2026-05-31",
    "isActive": false,
    "createdAt": "2026-03-13T12:20:00.000Z",
    "updatedAt": "2026-03-13T12:20:00.000Z"
  }
}
```

#### GET `/academic-structure/academic-years/:academicYearId/semesters`

الهدف: جلب فصول سنة دراسية محددة.

```http
GET /api/v1/academic-structure/academic-years/1/semesters
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "Semesters fetched successfully",
  "data": [
    {
      "id": "1",
      "academicYear": {
        "id": "1",
        "name": "2025-2026"
      },
      "name": "Semester 1",
      "startDate": "2025-09-01",
      "endDate": "2026-01-31",
      "isActive": false,
      "createdAt": "2026-03-13T03:44:07.985Z",
      "updatedAt": "2026-03-13T03:44:07.985Z"
    }
  ]
}
```

#### PATCH `/academic-structure/semesters/:id`

الهدف: تحديث الفصل الدراسي.

```http
PATCH /api/v1/academic-structure/semesters/3
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "Summer Term Updated"
}
```

```json
{
  "success": true,
  "message": "Semester updated successfully",
  "data": {
    "id": "3",
    "academicYear": {
      "id": "1",
      "name": "2025-2026"
    },
    "name": "Summer Term Updated",
    "startDate": "2026-05-01",
    "endDate": "2026-05-31",
    "isActive": false,
    "createdAt": "2026-03-13T12:20:00.000Z",
    "updatedAt": "2026-03-13T12:22:00.000Z"
  }
}
```

#### POST `/academic-structure/grade-levels`

الهدف: إنشاء مستوى دراسي جديد.

```http
POST /api/v1/academic-structure/grade-levels
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "Kindergarten",
  "levelOrder": 20
}
```

```json
{
  "success": true,
  "message": "Grade level created successfully",
  "data": {
    "id": "13",
    "name": "Kindergarten",
    "levelOrder": 20,
    "createdAt": "2026-03-13T12:30:00.000Z"
  }
}
```

#### GET `/academic-structure/grade-levels`

الهدف: جلب كل المستويات الدراسية.

```http
GET /api/v1/academic-structure/grade-levels
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "Grade levels fetched successfully",
  "data": [
    {
      "id": "1",
      "name": "Grade 1",
      "levelOrder": 1,
      "createdAt": "2026-03-13T03:44:07.985Z"
    }
  ]
}
```

#### POST `/academic-structure/classes`

الهدف: إنشاء فصل صفي داخل سنة ومستوى دراسي.

```http
POST /api/v1/academic-structure/classes
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "gradeLevelId": "1",
  "academicYearId": "1",
  "className": "B",
  "section": "B",
  "capacity": 25,
  "isActive": true
}
```

```json
{
  "success": true,
  "message": "Class created successfully",
  "data": {
    "id": "4",
    "className": "B",
    "section": "B",
    "capacity": 25,
    "isActive": true,
    "academicYear": {
      "id": "1",
      "name": "2025-2026"
    },
    "gradeLevel": {
      "id": "1",
      "name": "Grade 1",
      "levelOrder": 1
    },
    "createdAt": "2026-03-13T12:35:00.000Z",
    "updatedAt": "2026-03-13T12:35:00.000Z"
  }
}
```

#### GET `/academic-structure/classes`

الهدف: جلب كل الصفوف.

```http
GET /api/v1/academic-structure/classes
Authorization: Bearer <accessToken>
```

الـ query params المدعومة:
- `academicYearId`
- `gradeLevelId`
- `isActive`

```json
{
  "success": true,
  "message": "Classes fetched successfully",
  "data": [
    {
      "id": "1",
      "className": "A",
      "section": "A",
      "capacity": 40,
      "isActive": true,
      "academicYear": {
        "id": "1",
        "name": "2025-2026"
      },
      "gradeLevel": {
        "id": "1",
        "name": "Grade 1",
        "levelOrder": 1
      },
      "createdAt": "2026-03-13T03:44:07.985Z",
      "updatedAt": "2026-03-13T03:44:07.985Z"
    }
  ]
}
```

#### GET `/academic-structure/classes/:id`

الهدف: جلب فصل واحد.

```http
GET /api/v1/academic-structure/classes/1
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "Class fetched successfully",
  "data": {
    "id": "1",
    "className": "A",
    "section": "A",
    "capacity": 40,
    "isActive": true,
    "academicYear": {
      "id": "1",
      "name": "2025-2026"
    },
    "gradeLevel": {
      "id": "1",
      "name": "Grade 1",
      "levelOrder": 1
    },
    "createdAt": "2026-03-13T03:44:07.985Z",
    "updatedAt": "2026-03-13T03:44:07.985Z"
  }
}
```

#### PATCH `/academic-structure/classes/:id`

الهدف: تعديل الحقول التشغيلية والإدارية للفصل بدون تغيير ربطه الأكاديمي.

```http
PATCH /api/v1/academic-structure/classes/1
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "section": "C",
  "capacity": 30,
  "isActive": false
}
```

مهم:
- هذا المسار مخصص لتصحيح أو تفعيل/تعطيل الفصل داخل `Academic Management`
- لا يغيّر `academicYearId` أو `gradeLevelId`
- `capacity` يمكن إرسالها كرقم موجب أو `null`

#### POST `/academic-structure/subjects`

الهدف: إنشاء مادة دراسية مرتبطة بمستوى.

مهم:
- `subjects` ليست `semester-scoped`
- لا ترسل `semesterId` هنا
- إذا كانت المادة متاحة في فصل معين، فذلك يتم عبر `subject-offerings`

```http
POST /api/v1/academic-structure/subjects
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "English",
  "gradeLevelId": "1",
  "code": "ENG-G1",
  "isActive": true
}
```

```json
{
  "success": true,
  "message": "Subject created successfully",
  "data": {
    "id": "10",
    "name": "English",
    "code": "ENG-G1",
    "isActive": true,
    "gradeLevel": {
      "id": "1",
      "name": "Grade 1",
      "levelOrder": 1
    },
    "createdAt": "2026-03-13T12:40:00.000Z",
    "updatedAt": "2026-03-13T12:40:00.000Z"
  }
}
```

#### GET `/academic-structure/subjects`

الهدف: جلب المواد.

```http
GET /api/v1/academic-structure/subjects
Authorization: Bearer <accessToken>
```

الـ query params المدعومة:
- `gradeLevelId`
- `isActive`

```json
{
  "success": true,
  "message": "Subjects fetched successfully",
  "data": [
    {
      "id": "1",
      "name": "Science",
      "code": "SCI-G1",
      "isActive": true,
      "gradeLevel": {
        "id": "1",
        "name": "Grade 1",
        "levelOrder": 1
      },
      "createdAt": "2026-03-13T03:44:07.985Z",
      "updatedAt": "2026-03-13T03:44:07.985Z"
    }
  ]
}
```

#### GET `/academic-structure/subjects/:id`

الهدف: جلب مادة واحدة.

```http
GET /api/v1/academic-structure/subjects/1
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "Subject fetched successfully",
  "data": {
    "id": "1",
    "name": "Science",
    "code": "SCI-G1",
    "isActive": true,
    "gradeLevel": {
      "id": "1",
      "name": "Grade 1",
      "levelOrder": 1
    },
    "createdAt": "2026-03-13T03:44:07.985Z",
    "updatedAt": "2026-03-13T03:44:07.985Z"
  }
}
```

#### PATCH `/academic-structure/subjects/:id`

الهدف: تعديل بيانات المادة كـ `master data` على مستوى المستوى الدراسي.

```http
PATCH /api/v1/academic-structure/subjects/1
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "Advanced Science",
  "code": null,
  "isActive": false
}
```

مهم:
- هذا المسار لا يجعل المادة `semester-scoped`
- ما زالت `subject-offerings` هي الطبقة الرسمية لربط المادة بالفصل
- `code` يمكن مسحه بإرسال `null`

#### POST `/academic-structure/subject-offerings`

الهدف: ربط مادة موجودة مسبقًا بفصل دراسي محدد بدون تغيير تعريف المادة نفسها.

```http
POST /api/v1/academic-structure/subject-offerings
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "subjectId": "1",
  "semesterId": "1",
  "isActive": true
}
```

```json
{
  "success": true,
  "message": "Subject offering created successfully",
  "data": {
    "id": "1",
    "isActive": true,
    "subject": {
      "id": "1",
      "name": "Science",
      "code": "SCI-G1",
      "isActive": true,
      "gradeLevel": {
        "id": "1",
        "name": "Grade 1",
        "levelOrder": 1
      }
    },
    "semester": {
      "id": "1",
      "name": "Semester 1",
      "startDate": "2025-09-01",
      "endDate": "2026-01-31",
      "isActive": false,
      "academicYear": {
        "id": "1",
        "name": "2025-2026"
      }
    },
    "createdAt": "2026-03-27T12:00:00.000Z",
    "updatedAt": "2026-03-27T12:00:00.000Z"
  }
}
```

قواعد العمل:
- يسمح بوجود نفس `subject` في أكثر من فصل
- لا يسمح بتكرار نفس `(subjectId + semesterId)` مرتين
- هذه هي الطبقة الرسمية `semester-aware` للمواد

#### GET `/academic-structure/subject-offerings`

الهدف: جلب روابط المواد بالفصول.

```http
GET /api/v1/academic-structure/subject-offerings
Authorization: Bearer <accessToken>
```

الـ query params المدعومة:
- `academicYearId`
- `semesterId`
- `gradeLevelId`
- `subjectId`
- `isActive`

#### GET `/academic-structure/subject-offerings/:id`

الهدف: جلب `subject offering` واحدة بالمعرّف.

#### PATCH `/academic-structure/subject-offerings/:id`

الهدف: تعديل حالة التفعيل `isActive` فقط في هذه الجولة.

```json
{
  "isActive": false
}
```

#### POST `/academic-structure/teacher-assignments`

الهدف: توزيع معلم على فصل + مادة + سنة، مع تحقق service من توافق الصف مع السنة والمادة مع المستوى.

```http
POST /api/v1/academic-structure/teacher-assignments
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "teacherId": "47",
  "classId": "1",
  "subjectId": "1",
  "academicYearId": "1"
}
```

مهم: `teacherId` هنا يقبل الآن:
- `users.id` القادم من `GET /users?role=teacher`
- أو `teachers.id` legacy للتوافق الخلفي

المسار الموصى به للفرونت الإداري: استخدم دائمًا `users.id` القادم من Users API، والباك سيحوّله داخليًا إلى `teachers.id` الصحيح قبل الحفظ.

```json
{
  "success": true,
  "message": "Teacher assignment created successfully",
  "data": {
    "id": "1",
    "academicYear": {
      "id": "1",
      "name": "2025-2026"
    },
    "class": {
      "id": "1",
      "className": "A",
      "section": "A",
      "isActive": true,
      "gradeLevel": {
        "id": "1",
        "name": "Grade 1",
        "levelOrder": 1
      }
    },
    "subject": {
      "id": "1",
      "name": "Science",
      "code": "SCI-G1",
      "isActive": true,
      "gradeLevel": {
        "id": "1",
        "name": "Grade 1",
        "levelOrder": 1
      }
    },
    "teacher": {
      "id": "1",
      "userId": "47",
      "fullName": "مروان أمين شعبان",
      "email": "marwan-amin-shaban@ishraf.local",
      "phone": null
    },
    "createdAt": "2026-03-13T12:45:00.000Z"
  }
}
```

#### GET `/academic-structure/teacher-assignments`

الهدف: جلب كل توزيعات المعلمين بصيغة مفهومة.

```http
GET /api/v1/academic-structure/teacher-assignments
Authorization: Bearer <accessToken>
```

الـ query params المدعومة:
- `academicYearId`
- `classId`
- `subjectId`
- `teacherId`

مهم:
- `teacherId` يقبل:
  - `users.id` القادم من `GET /users?role=teacher`
  - أو `teachers.id` legacy

```json
{
  "success": true,
  "message": "Teacher assignments fetched successfully",
  "data": [
    {
      "id": "1",
      "academicYear": {
        "id": "1",
        "name": "2025-2026"
      },
      "class": {
        "id": "1",
        "className": "A",
        "section": "A",
        "isActive": true,
        "gradeLevel": {
          "id": "1",
          "name": "Grade 1",
          "levelOrder": 1
        }
      },
      "subject": {
        "id": "1",
        "name": "Science",
        "code": "SCI-G1",
        "isActive": true,
        "gradeLevel": {
          "id": "1",
          "name": "Grade 1",
          "levelOrder": 1
        }
      },
      "teacher": {
        "id": "1",
        "userId": "47",
        "fullName": "مروان أمين شعبان",
        "email": "marwan-amin-shaban@ishraf.local",
        "phone": null
      },
      "createdAt": "2026-03-13T12:45:00.000Z"
    }
  ]
}
```

#### POST `/academic-structure/supervisor-assignments`

الهدف: توزيع مشرف على فصل + سنة.

```http
POST /api/v1/academic-structure/supervisor-assignments
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "supervisorId": "50",
  "classId": "1",
  "academicYearId": "1"
}
```

#### GET `/academic-structure/teacher-assignments/:id`

الهدف: جلب توزيع معلم واحد بالتفاصيل الكاملة لاستخدامه في `edit flows`.

```http
GET /api/v1/academic-structure/teacher-assignments/1
Authorization: Bearer <accessToken>
```

#### PATCH `/academic-structure/teacher-assignments/:id`

الهدف: تعديل توزيع معلم موجود لأغراض التصحيح الإداري.

```http
PATCH /api/v1/academic-structure/teacher-assignments/1
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "classId": "2",
  "subjectId": "4",
  "academicYearId": "1"
}
```

مهم:
- `teacherId` هنا يقبل أيضًا `users.id` أو `teachers.id` legacy
- الباك يعيد تطبيق نفس تحقق التوافق:
  - الصف يجب أن ينتمي إلى السنة المختارة
  - المادة يجب أن تنتمي إلى نفس مستوى الصف

مهم: `supervisorId` هنا يقبل الآن:
- `users.id` القادم من `GET /users?role=supervisor`
- أو `supervisors.id` legacy للتوافق الخلفي

المسار الموصى به للفرونت الإداري: استخدم دائمًا `users.id` القادم من Users API، والباك سيحوّله داخليًا إلى `supervisors.id` الصحيح قبل الحفظ.

```json
{
  "success": true,
  "message": "Supervisor assignment created successfully",
  "data": {
    "id": "1",
    "academicYear": {
      "id": "1",
      "name": "2025-2026"
    },
    "class": {
      "id": "1",
      "className": "A",
      "section": "A",
      "isActive": true,
      "gradeLevel": {
        "id": "1",
        "name": "Grade 1",
        "levelOrder": 1
      }
    },
    "supervisor": {
      "id": "1",
      "userId": "50",
      "fullName": "إدريس مشوير",
      "email": "idris-mashwir@ishraf.local",
      "phone": null
    },
    "createdAt": "2026-03-13T12:50:00.000Z"
  }
}
```

#### GET `/academic-structure/supervisor-assignments`

الهدف: جلب توزيعات المشرفين.

```http
GET /api/v1/academic-structure/supervisor-assignments
Authorization: Bearer <accessToken>
```

الـ query params المدعومة:
- `academicYearId`
- `classId`
- `supervisorId`

مهم:
- `supervisorId` يقبل:
  - `users.id` القادم من `GET /users?role=supervisor`
  - أو `supervisors.id` legacy

```json
{
  "success": true,
  "message": "Supervisor assignments fetched successfully",
  "data": [
    {
      "id": "1",
      "academicYear": {
        "id": "1",
        "name": "2025-2026"
      },
      "class": {
        "id": "1",
        "className": "A",
        "section": "A",
        "isActive": true,
        "gradeLevel": {
          "id": "1",
          "name": "Grade 1",
          "levelOrder": 1
        }
      },
      "supervisor": {
        "id": "1",
        "userId": "50",
        "fullName": "إدريس مشوير",
        "email": "idris-mashwir@ishraf.local",
        "phone": null
      },
      "createdAt": "2026-03-13T12:50:00.000Z"
    }
  ]
}
```

### Admin Imports Module

#### مقدمة تشغيلية

خدمة `School Onboarding Import` هي خدمة استيراد مؤسسية مخصصة للإدارة:

- `admin-only`
- `structured workbook payload` فقط
- لا تدعم `raw Excel upload` في `v1`
- `dry-run` ثم `apply`
- `all-or-nothing`
- `create-only v1`
- مع `import audit trail` محفوظة في قاعدة البيانات

هذه الخدمة لا تستبدل create endpoints اليومية، ولا يجب على الفرونت تنفيذ loops كتابية بدلًا عنها.

المسارات الرسمية:

- `POST /admin-imports/school-onboarding/dry-run`
- `POST /admin-imports/school-onboarding/apply`
- `GET /admin-imports/school-onboarding/history`
- `GET /admin-imports/school-onboarding/history/:importId`

#### POST `/admin-imports/school-onboarding/dry-run`

الهدف: تنفيذ تحقق خادمي كامل على workbook منظمة، مع حل العلاقات الطبيعية داخل الخادم فقط، ثم حفظ نتيجة dry-run قابلة للمراجعة والتطبيق لاحقًا.

```http
POST /api/v1/admin-imports/school-onboarding/dry-run
Authorization: Bearer <accessToken>
Content-Type: application/json
```

مهم:
- `workbook` هنا JSON منظمة ناتجة من parser الفرونت، وليست ملف Excel ثنائي
- `templateVersion` يجب أن يطابق نسخة القالب الرسمية
- `workbook.sheets` يجب أن تحتوي جميع أوراق القالب المعتمدة
- `dry-run` لا تكتب بيانات الدومين نفسها
- تحفظ فقط سجل import audit مع:
  - `payload`
  - `summary`
  - `issues`
  - `entity counts`

مثال مختصر:

```json
{
  "templateVersion": "2026.04.phase-b",
  "fileName": "school-onboarding-valid.json",
  "fileHash": "sha256-valid-import-v1",
  "fileSize": 1024,
  "config": {
    "activateAfterImport": false,
    "targetAcademicYearName": "2026-2027",
    "targetSemesterName": "الفصل الأول"
  },
  "workbook": {
    "sheets": {
      "AcademicYears": {
        "sheetId": "AcademicYears",
        "present": true,
        "headers": ["year_name", "start_date", "end_date"],
        "rows": [
          {
            "rowNumber": 2,
            "values": {
              "year_name": "2026-2027",
              "start_date": "2026-09-01",
              "end_date": "2027-06-30"
            }
          }
        ]
      }
    }
  }
}
```

نجاح `dry-run` قد يرجع:

```json
{
  "success": true,
  "message": "School onboarding dry-run completed",
  "data": {
    "importId": "1",
    "mode": "dry-run",
    "status": "validated",
    "canApply": true,
    "summary": {
      "totalSheets": 26,
      "presentSheets": 26,
      "totalRows": 8,
      "errorCount": 0,
      "warningCount": 1
    },
    "sheetSummaries": [
      {
        "sheetId": "AcademicYears",
        "rowCount": 1,
        "errorCount": 0,
        "warningCount": 0,
        "present": true
      }
    ],
    "issues": [
      {
        "level": "warning",
        "code": "phone_password_policy_applied",
        "sheetId": "Users_Teachers",
        "rowNumber": 2,
        "columnKey": "phone",
        "message": "سيتم اشتقاق كلمة المرور من رقم الهاتف لهذا الحساب عند التطبيق",
        "suggestedFix": "مرر fallbackPassword فقط إذا أردت استخدام كلمة مرور موحدة بدل الاشتقاق من الهاتف"
      }
    ],
    "resolvedReferenceCounts": {
      "academicYears": 1,
      "semesters": 1,
      "gradeLevels": 1,
      "classes": 1,
      "subjects": 1,
      "teachers": 1,
      "students": 1
    },
    "entityPlanCounts": {
      "academicYears": 1,
      "semesters": 1,
      "gradeLevels": 1,
      "classes": 1,
      "subjects": 1,
      "users": 1,
      "students": 1,
      "studentEnrollments": 1
    }
  }
}
```

#### POST `/admin-imports/school-onboarding/apply`

الهدف: تطبيق dry-run ناجحة داخل transaction واحدة.

```http
POST /api/v1/admin-imports/school-onboarding/apply
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "dryRunId": "1",
  "fallbackPassword": "ImportSeed123!",
  "confirmActivateContext": false
}
```

القواعد:
- `apply` تتطلب `dryRunId` صحيحة و`validated`
- الباك يعيد `re-validation` سريعة حساسة للتعارضات قبل الكتابة
- إذا حدث conflict عند التطبيق:
  - لا يتم commit جزئي
- إذا أعيد استدعاء `apply` لنفس `dryRunId` بعد نجاح سابق:
  - لا يكرر الكتابة
  - يعيد نفس النتيجة مع `alreadyApplied=true`

نجاح `apply`:

```json
{
  "success": true,
  "message": "School onboarding import applied",
  "data": {
    "importId": "2",
    "mode": "apply",
    "status": "applied",
    "canApply": false,
    "summary": {
      "totalSheets": 26,
      "presentSheets": 26,
      "totalRows": 8,
      "errorCount": 0,
      "warningCount": 1
    },
    "sheetSummaries": [],
    "issues": [],
    "resolvedReferenceCounts": {
      "academicYears": 1,
      "semesters": 1
    },
    "entityPlanCounts": {
      "academicYears": 1,
      "semesters": 1,
      "gradeLevels": 1,
      "classes": 1,
      "subjects": 1,
      "users": 1,
      "students": 1,
      "studentEnrollments": 1
    },
    "alreadyApplied": false
  }
}
```

#### GET `/admin-imports/school-onboarding/history`

الهدف: جلب سجل dry-run/apply السابق للمراجعة والإدارة.

```http
GET /api/v1/admin-imports/school-onboarding/history?page=1&limit=20
Authorization: Bearer <accessToken>
```

يرجع Pagination عادية، وكل عنصر يحتوي:
- `importId`
- `mode`
- `status`
- `templateVersion`
- `fileName`
- `fileHash`
- `submittedAt`
- `appliedAt`
- `submittedBy`
- `canApply`
- `summary`

#### GET `/admin-imports/school-onboarding/history/:importId`

الهدف: جلب سجل import واحد بالتفاصيل الكاملة، بما في ذلك:
- `dryRunSourceId`
- `result`
- `issues`
- `entity counts`

```http
GET /api/v1/admin-imports/school-onboarding/history/2
Authorization: Bearer <accessToken>
```

#### حدود `v1`

داخل النطاق:
- years / semesters / grade levels / classes / subjects
- teachers / supervisors / parents / drivers
- students / parent links / enrollments
- subject offerings / teacher assignments / supervisor assignments
- buses / routes / route stops / route assignments
- student transport assignments / student home locations

خارج النطاق:
- attendance
- assessments
- behavior
- homework
- trips
- communication records
- reporting outputs

#### قواعد domain المعتمدة

- `create-only`
- لا `update existing`
- لا `delete`
- لا `sync`
- لا `raw IDs`
- جميع العلاقات الحساسة تُحل من natural/composite keys داخل الخادم فقط

#### سلوك الأخطاء المتوقع

أمثلة codes معتمدة:
- `template_version_mismatch`
- `missing_sheet`
- `header_mismatch`
- `duplicate_row_in_sheet`
- `duplicate_existing_record`
- `ambiguous_parent_reference`
- `ambiguous_teacher_reference`
- `ambiguous_supervisor_reference`
- `missing_target_active_year_reference`
- `missing_target_active_semester_reference`
- `dry_run_required`
- `dry_run_not_found`
- `dry_run_stale`
- `import_already_applied`

#### سياسة كلمات المرور

- كلمات المرور لا تُرسل داخل Excel
- الحسابات الجديدة تعتمد على:
  - اشتقاق من `phone` إذا أمكن
  - أو `fallbackPassword` من طلب `apply`
- يجب على الفرونت اعتبار backend هي المصدر النهائي لهذا القرار، لا parser المحلي

## Common Validation / Conflict Cases

- `401 Unauthorized`
  - access token مفقود أو غير صالح
  - بيانات login غير صحيحة
- `403 Forbidden`
  - المستخدم غير نشط
  - المستخدم ليس `admin` عند استدعاء `users` أو `academic-structure`
- `409 Conflict`
  - تكرار `email`
  - تكرار `phone`
  - تكرار `academic_years.name`
  - تكرار `grade_levels.name`
  - تكرار `grade_levels.level_order`
  - تكرار `subjects.code`
  - تكرار `subjects.name` داخل نفس المستوى
  - تكرار `classes` داخل نفس السنة والمستوى
  - تكرار assignment موجود مسبقًا
- `400 Validation Error`
  - `newPassword` أقصر من 8
  - `semester` خارج حدود `academic_year`
  - `teacher assignment` بين `class` و`subject` غير متوافقين
  - `teacherId` يطابق `users.id` لمعلم و`teachers.id` لمعلم آخر مختلف
    - `TEACHER_ID_AMBIGUOUS`
  - `supervisorId` يطابق `users.id` لمشرف و`supervisors.id` لمشرف آخر مختلف
    - `SUPERVISOR_ID_AMBIGUOUS`

## Important Notes For Frontend Developers

- كل المعرفات `id` تعاد كسلاسل `string` حتى لو كانت في PostgreSQL من نوع `bigint`.
- جميع الردود تلتزم envelope ثابت: `success`, `message`, `data` أو `errors`.
- Users وAcademic Structure حاليًا `admin-only`.
- `PATCH /users/:id` لا يغير `role` ولا `password`.
- `PATCH /users/:id/status` يعطّل refresh tokens مباشرة، لكن access token الحالي يبقى صالحًا حتى انتهاء صلاحيته القصيرة.
- `teacherId` و`supervisorId` في assignment endpoints وفي admin create/list filters للموديولات التشغيلية تقبل الآن:
  - `users.id` القادم من `GET /users?role=teacher|supervisor`
  - أو `teachers.id` / `supervisors.id` legacy للتوافق الخلفي
- المسار الموصى به للفرونت الإداري: استخدم دائمًا `users.id` القادم من Users API.
- إذا طابقت نفس القيمة رقم `users.id` لأحدهم و`profile id` لشخص مختلف، فلن يختار الباك أحدهما بصمت؛ سيعيد:
  - `400 Validation Error`
  - `TEACHER_ID_AMBIGUOUS` أو `SUPERVISOR_ID_AMBIGUOUS`
- في student-parent endpoints التالية:
  - `POST /students/:id/parents`
  - `PATCH /students/:studentId/parents/:parentId/primary`
  قيمة `parentId` تقبل الآن:
  - `users.id` القادم من `GET /users?role=parent`
  - أو `parents.id` للتوافق الخلفي
- المسار الموصى به للفرونت: استخدم دائمًا `users.id` القادم من `/users?role=parent`، والباك سيحوّله داخليًا إلى `parents.id` الصحيح قبل الحفظ.
- `subjects` تبقى master data على مستوى `gradeLevel` فقط.
  - التوفر داخل فصل محدد يتم عبر `subject-offerings`.
- في `POST /transport/buses`:
  - أرسلوا `driverId` على أنه `users.id` القادم من `GET /users?role=driver`
  - لا حاجة لاستخراج `driverProfileId`
  - الباك ما زال يقبل `drivers.id` أيضًا للتوافق الخلفي
- في المسارات التشغيلية التالية:
  - `POST /attendance/sessions`
  - `POST /assessments`
  - `POST /homework`
  يجب أن يملك `subjectId` رابط `subject-offering` نشطًا مع `semesterId` المحدد، وإلا سيعيد الباك:
  - `400 Validation Error`
  - `Subject is not offered in the selected semester`
- النقل لا يعتمد على "عنوان الطالب" النصي كمصدر تشغيل.
  - مصدر الحقيقة الحالي هو:
    - `route`
    - `bus_stops`
    - `student_bus_assignments`
    - `trips`
    - `trip_student_events`
- لا يوجد `GET/POST /attendance` في العقد الحالي. استخدم:
  - `POST /attendance/sessions`
  - `GET /attendance/sessions`
  - `GET /attendance/sessions/:id`
  - `PUT /attendance/sessions/:id/records`
  - `PATCH /attendance/records/:attendanceId`
- لا يوجد `GET/POST /behavior` root endpoint. استخدم:
  - `GET /behavior/categories`
  - `POST /behavior/records`
  - `GET /behavior/records`
  - `GET /behavior/records/:id`
  - `PATCH /behavior/records/:id`
  - `GET /behavior/students/:studentId/records`
- إنشاء behavior record يتطلب `behaviorCategoryId`, `academicYearId`, `semesterId`, `behaviorDate`.
- لا يوجد حاليًا `actionTaken` في behavior records.
- `GET /behavior/categories` لا يدعم `behaviorType` filter في v1.
- في `School Onboarding Import`:
  - لا ترسلوا ملفات Excel raw إلى الباك في `v1`
  - لا تنفذوا loops كتابية من الفرونت
  - المسار الرسمي هو:
    - `dry-run`
    - ثم `apply`
  - `apply` تعتمد على `dryRunId` ناجحة ومحفوظة
  - الخدمة `create-only` ولا تنفذ `update/delete/sync`
- إذا احتجت توضيحًا موحدًا بسبب أخطاء `404` أو التباس عقود التقارير الإدارية فارجع إلى:
  - `src/docs/frontend-execution/admin-dashboard/ATTENDANCE_BEHAVIOR_ROUTE_ALIGNMENT.md`



## Wave 1 Additions Before Frontend

### Auth Recovery

#### POST `/auth/forgot-password`

Purpose: request a password reset token for an active account if the identifier exists, while keeping the response generic enough to avoid account enumeration.

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json
```

```json
{
  "identifier": "parent@example.com"
}
```

```json
{
  "success": true,
  "message": "Password reset requested successfully",
  "data": {
    "delivery": "accepted",
    "resetToken": "development-only-token-or-null",
    "expiresInMinutes": 30
  }
}
```

#### GET `/academic-structure/supervisor-assignments/:id`

الهدف: جلب توزيع مشرف واحد بالتفاصيل الكاملة لاستخدامه في `edit flows`.

```http
GET /api/v1/academic-structure/supervisor-assignments/1
Authorization: Bearer <accessToken>
```

#### PATCH `/academic-structure/supervisor-assignments/:id`

الهدف: تعديل توزيع مشرف موجود لأغراض التصحيح الإداري.

```http
PATCH /api/v1/academic-structure/supervisor-assignments/1
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "classId": "2",
  "academicYearId": "1"
}
```

مهم:
- `supervisorId` هنا يقبل أيضًا `users.id` أو `supervisors.id` legacy
- الباك يعيد تطبيق تحقق توافق الصف مع السنة المختارة

Notes:
- `resetToken` يظهر فقط عندما تكون `AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE=true`
- في staging / production يجب أن يفترض الفرونت أن `resetToken` غير موجود
- المسار قد يعيد `429 Too Many Requests` عند تجاوز limit

#### POST `/auth/reset-password`

Purpose: reset the password using a valid, unused, non-expired reset token.

```http
POST /api/v1/auth/reset-password
Content-Type: application/json
```

```json
{
  "token": "raw-reset-token",
  "newPassword": "NewStrongPassword123!"
}
```

Operational effect:
- updates the password
- revokes remaining password reset tokens for that user
- revokes existing refresh tokens for that user
- قد يعيد `429 Too Many Requests` عند تجاوز limit

### Runtime Health

#### GET `/health`

Purpose: liveness endpoint بسيط يثبت أن التطبيق يعمل.

```http
GET /health
```

#### GET `/health/ready`

Purpose: readiness endpoint يفحص اتصال قاعدة البيانات، ويعيد `503` إذا لم تكن الـ DB جاهزة.

```http
GET /health/ready
```

### Homework Module

#### POST `/homework`

Purpose: create a homework item.

Roles:
- `admin`
- `teacher`

Rules:
- `teacher` cannot send `teacherId`
- `admin` must send `teacherId`
  - preferred value: teacher `users.id` from `GET /users?role=teacher`
  - legacy support: `teachers.id` still works
- the teacher must be assigned to `class + subject + academicYear`
- the selected `semester` must belong to the selected `academicYear`
- the selected subject must belong to the grade level of the selected class
- the selected `subjectId` must have an active `subject-offering` for the selected `semesterId`

#### GET `/homework`

Purpose: return a paginated homework list.

Roles:
- `admin`
- `teacher`

Supported filters:
- `classId`
- `subjectId`
- `teacherId`
- `academicYearId`
- `semesterId`
- `assignedDate`
- `dueDate`
- `dateFrom`
- `dateTo`
- `page`
- `limit`
- `sortBy = dueDate | assignedDate | createdAt | title`
- `sortOrder = asc | desc`

Filter note:
- `teacherId` here accepts the teacher `users.id` from `GET /users?role=teacher` or the legacy `teachers.id`.
- the recommended admin frontend path is still to send the teacher `users.id`.

#### GET `/homework/:id`

Purpose: return one homework item with the active student roster and the current submission state for each student.

Roles:
- `admin`
- `teacher`

#### PUT `/homework/:id/submissions`

Purpose: save homework submissions as a partial upsert.

Roles:
- `admin`
- `teacher`

Body:

```json
{
  "records": [
    {
      "studentId": "1",
      "status": "submitted",
      "submittedAt": null,
      "notes": "Completed"
    }
  ]
}
```

Supported `status` values:
- `submitted`
- `not_submitted`
- `late`

#### GET `/homework/students/:studentId`

Purpose: return homework assigned to one student.

Roles:
- `admin`
- `teacher`
- `parent` only if the student is linked to that parent

Success shape:

```json
{
  "success": true,
  "message": "Student homework fetched successfully",
  "data": {
    "student": {
      "id": "1",
      "academicNo": "SEED-STU-001",
      "fullName": "طالب تجريبي",
      "currentClass": {
        "id": "1",
        "className": "A",
        "section": "A",
        "academicYear": {
          "id": "1",
          "name": "2025-2026"
        }
      }
    },
    "items": [
      {
        "homeworkId": "1",
        "title": "Math Practice",
        "description": "Solve exercises 1-5",
        "assignedDate": "2026-03-20",
        "dueDate": "2026-03-27",
        "class": {
          "id": "1",
          "className": "A",
          "section": "A"
        },
        "subject": {
          "id": "1",
          "name": "Mathematics"
        },
        "teacher": {
          "id": "1",
          "fullName": "مروان أمين شعبان"
        },
        "academicYear": {
          "id": "1",
          "name": "2025-2026"
        },
        "semester": {
          "id": "1",
          "name": "Semester 1"
        },
        "submission": {
          "submissionId": "11",
          "status": "submitted",
          "submittedAt": "2026-03-21T09:00:00.000Z",
          "notes": "Completed"
        }
      }
    ]
  }
}
```

Contract notes:
- نفس `studentId` المستخدم هنا هو `id` الخاص بـ `/students/:id`
- هذا endpoint ليس raw array
- وليس `items + pagination`
- إذا كان الطالب موجودًا ولا توجد واجبات بعد، يعيد `200` مع:
  - `data.student`
  - `data.items = []`
- `404` فقط عندما يكون الطالب نفسه غير موجود
- `403` عندما يكون المستخدم موثقًا لكنه خارج الصلاحية أو ownership

### Admin reporting and student-scoped contracts

#### GET `/reporting/dashboards/admin/me`

Purpose: return the admin dashboard landing payload.

Roles:
- `admin` only

It includes:
- `summary`
- `recentStudents`
- `recentAnnouncements`
- `activeTrips`

#### GET `/reporting/students/:studentId/profile`

Purpose: return the full student profile payload used in admin and staff reporting screens.

Roles:
- `admin`
- `teacher`
- `supervisor`

Success shape:

```json
{
  "success": true,
  "message": "Student profile fetched successfully",
  "data": {
    "student": {},
    "parents": [],
    "attendanceSummary": {},
    "assessmentSummary": {},
    "behaviorSummary": {}
  }
}
```

Rules:
- `studentId` هنا هو نفس `id` المستخدم في `/students/:id`
- إذا كان الطالب موجودًا ولا توجد بيانات تشغيلية بعد، تبقى الـ summaries zero-safe
- `404` هنا يعني:
  - الطالب غير موجود
  - أو prerequisite تقريري مفقود مثل `active academic period`

#### GET `/reporting/students/:studentId/reports/attendance-summary`

Purpose: return the student attendance summary.

Roles:
- `admin`
- `teacher`
- `supervisor`

Success shape:

```json
{
  "success": true,
  "message": "Student attendance summary fetched successfully",
  "data": {
    "student": {},
    "attendanceSummary": {
      "totalSessions": 0,
      "presentCount": 0,
      "absentCount": 0,
      "lateCount": 0,
      "excusedCount": 0,
      "attendancePercentage": 0
    }
  }
}
```

Rules:
- إذا لم توجد بيانات حضور بعد، يعيد `200` مع summary صفرية
- لا يستخدم `404` للتعبير عن empty state

#### GET `/reporting/students/:studentId/reports/assessment-summary`

Purpose: return the student assessment summary.

Roles:
- `admin`
- `teacher`
- `supervisor`

Success shape:

```json
{
  "success": true,
  "message": "Student assessment summary fetched successfully",
  "data": {
    "student": {},
    "assessmentSummary": {
      "totalAssessments": 0,
      "totalScore": 0,
      "totalMaxScore": 0,
      "overallPercentage": 0,
      "subjects": []
    }
  }
}
```

Important:
- هذا endpoint يعيد `assessmentSummary.subjects[]`
- لا يعيد `items[]`

#### GET `/reporting/students/:studentId/reports/behavior-summary`

Purpose: return the student behavior summary.

Roles:
- `admin`
- `teacher`
- `supervisor`

Success shape:

```json
{
  "success": true,
  "message": "Student behavior summary fetched successfully",
  "data": {
    "student": {},
    "behaviorSummary": {
      "totalBehaviorRecords": 0,
      "positiveCount": 0,
      "negativeCount": 0,
      "negativeSeverityTotal": 0
    }
  }
}
```

Important:
- هذا endpoint لا يعيد `records[]`
- السجل التفصيلي يأتي من:
  - `GET /behavior/students/:studentId/records`

#### GET `/behavior/students/:studentId/records`

Purpose: return the detailed student behavior timeline used beside the summary endpoints.

Roles:
- `admin`
- `teacher`
- `supervisor`

Success shape:

```json
{
  "success": true,
  "message": "Student behavior records fetched successfully",
  "data": {
    "student": {},
    "summary": {
      "totalBehaviorRecords": 0,
      "positiveCount": 0,
      "negativeCount": 0,
      "negativeSeverityTotal": 0
    },
    "records": []
  }
}
```

Contract notes:
- هذا endpoint غير paginated في العقد الحالي
- إذا كان الطالب موجودًا ولا توجد سجلات سلوك بعد، يعيد:
  - `data.student`
  - `data.summary` بقيم صفرية
  - `data.records = []`
- `404` فقط عندما يكون الطالب نفسه غير موجود
- `403` عندما يكون المستخدم خارج الصلاحية أو الـ scope

### Reporting Wave 1 Additions

#### GET `/reporting/dashboards/parent/me`

Purpose: return the current parent dashboard.

It includes:
- parent identity block
- linked children
- attendance summary
- behavior summary
- assessment summary
- latest notifications
- unread notification count

#### GET `/reporting/dashboards/parent/me/students/:studentId/profile`

Purpose: return a safe parent-owned child profile.

#### GET `/reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary`
#### GET `/reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary`
#### GET `/reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary`

Purpose: return safe child summaries for linked children only.

#### GET `/reporting/dashboards/supervisor/me`

Purpose: return the supervisor dashboard.

It includes:
- supervisor identity block
- class assignments
- student summaries for assigned classes
- recent behavior records inside the supervisor scope

#### GET `/reporting/transport/parent/me/students/:studentId/live-status`

Purpose: return current transport visibility for a linked child.

It includes:
- student block
- active assignment if present
- active trip if present
- latest location if present
- latest trip events for the student

### Admin Preview / Monitoring Additions

هذه الإضافات هي الـ canonical backend surfaces الخاصة بـ admin monitoring داخل لوحة الإدارة.

القواعد الثابتة هنا:
- كلها `admin-only`
- كلها `read-only`
- لا يوجد فيها impersonation
- جميع المعرّفات في الـ path هي `users.id` فقط
- parent child preview يعيد `404 Student not linked to parent` إذا لم يكن الطالب مرتبطًا فعليًا بذلك parent
- عندما يكون الكيان صحيحًا لكن لا توجد بيانات تشغيلية بعد، تبقى الاستجابات `200` مع payload zero-safe أو arrays فارغة حسب العقد الحالي

#### GET `/reporting/admin-preview/parents/:parentUserId/dashboard`

Purpose: return the same parent dashboard shape, لكن بشكل admin-safe preview يبدأ من `parent users.id`.

Rules:
- `parentUserId` هنا هو `users.id` القادم من `/users?role=parent`
- إذا لم يكن الـ user موجودًا أو لا يملك parent profile:
  - `404 Parent not found`

#### GET `/reporting/admin-preview/parents/:parentUserId/students/:studentId/profile`
#### GET `/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary`
#### GET `/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary`
#### GET `/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary`
#### GET `/reporting/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status`

Purpose: return the same parent-owned child profile/report/live-status surfaces، ولكن داخل preview إداري آمن يبدأ من parent first.

Rules:
- `parentUserId` = parent `users.id`
- `studentId` = نفس المعرّف المستخدم في `/students/:id`
- إذا لم يكن `studentId` تابعًا لذلك parent:
  - `404 Student not linked to parent`
- shapes مطابقة للعقود الحالية التالية:
  - `GET /reporting/dashboards/parent/me/students/:studentId/profile`
  - `GET /reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary`
  - `GET /reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary`
  - `GET /reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary`
  - `GET /reporting/transport/parent/me/students/:studentId/live-status`

#### GET `/reporting/admin-preview/teachers/:teacherUserId/dashboard`

Purpose: return the same teacher dashboard shape, لكن بشكل admin-safe preview يبدأ من `teacher users.id`.

Rules:
- `teacherUserId` هنا هو `users.id` القادم من `/users?role=teacher`
- إذا لم يكن الـ user موجودًا أو لا يملك teacher profile:
  - `404 Teacher not found`
- shape مطابقة لـ:
  - `GET /reporting/dashboards/teacher/me`

#### GET `/reporting/admin-preview/supervisors/:supervisorUserId/dashboard`

Purpose: return the same supervisor dashboard shape, لكن بشكل admin-safe preview يبدأ من `supervisor users.id`.

Rules:
- `supervisorUserId` هنا هو `users.id` القادم من `/users?role=supervisor`
- إذا لم يكن الـ user موجودًا أو لا يملك supervisor profile:
  - `404 Supervisor not found`
- shape مطابقة لـ:
  - `GET /reporting/dashboards/supervisor/me`

### Transport Alignment Additions

هذه هي الطبقة التشغيلية الجديدة التي ثبّتت transport على النموذج الصحيح:

- `route` = خط ثابت
- `route assignment` = ربط bus مع route بشكل متكرر
- `trip` = تشغيل يومي فعلي
- `student assignment` = ربط الطالب بنقطة الوقوف
- `home location` = معلومة مرجعية وليست مصدر تشغيل مباشر

#### POST `/transport/buses`

Purpose: create a bus and optionally assign a driver.

Roles:
- `admin`

Body:

```json
{
  "plateNumber": "SEED-BUS-NEW",
  "driverId": "1004",
  "capacity": 45,
  "status": "active"
}
```

Rules:
- `driverId` is optional
- when `driverId` is sent, the backend accepts:
  - the `users.id` returned by `GET /users?role=driver`
  - or the legacy `drivers.id`
- the recommended frontend contract is:
  - fetch drivers from `/users?role=driver`
  - send the selected `user.id` directly to `POST /transport/buses`
- there is no need to extract or store `driverProfileId` in the admin UI
- if the provided id does not map to a driver account or driver profile, the endpoint returns:
  - `Driver not found`

#### POST `/transport/route-assignments`

Purpose: create a recurring operational link between one bus and one route.

Roles:
- `admin`

Body:

```json
{
  "busId": "1",
  "routeId": "2",
  "startDate": "2026-03-26",
  "endDate": null
}
```

Rules:
- bus and route must exist
- active duplicates are blocked
- `endDate` must be greater than or equal to `startDate` when provided

#### GET `/transport/route-assignments`

Purpose: list recurring route assignments for admin transport management.

Roles:
- `admin`

#### PATCH `/transport/route-assignments/:id/deactivate`

Purpose: deactivate one recurring route assignment without deleting its history.

Roles:
- `admin`

#### GET `/transport/route-assignments/me`

Purpose: return active recurring route assignments for the authenticated driver only.

Roles:
- `driver`

Contract notes:
- this is the correct driver-side starting point before the daily trip flow
- it returns active assignments only

#### POST `/transport/trips/ensure-daily`

Purpose: create or reuse the daily trip for one recurring route assignment.

Roles:
- `admin`
- `driver` only within route-assignment ownership

Body:

```json
{
  "routeAssignmentId": "1",
  "tripDate": "2026-03-26",
  "tripType": "pickup"
}
```

Success shape:

```json
{
  "success": true,
  "message": "Daily trip ensured successfully",
  "data": {
    "created": true,
    "trip": {
      "id": "12",
      "tripDate": "2026-03-26",
      "tripType": "pickup",
      "tripStatus": "scheduled",
      "startedAt": null,
      "endedAt": null,
      "bus": {
        "id": "1",
        "plateNumber": "SEED-BUS-001"
      },
      "driver": {
        "driverId": "1",
        "fullName": "هلال عبد الله الملصي"
      },
      "route": {
        "id": "1",
        "routeName": "SEED-ROUTE-01"
      },
      "latestLocation": null,
      "eventSummary": {
        "boardedCount": 0,
        "droppedOffCount": 0,
        "absentCount": 0,
        "totalEvents": 0
      }
    }
  }
}
```

Rules:
- if a matching trip already exists for the same:
  - `bus`
  - `route`
  - `tripDate`
  - `tripType`
  the endpoint returns it with `created=false`
- this is the preferred daily flow for the driver app
- `POST /transport/trips` still exists as legacy/manual fallback

#### GET `/transport/trips/:id/students`

Purpose: return the full operational roster for one trip.

Roles:
- `admin`
- `driver` only within trip ownership

Success shape:

```json
{
  "success": true,
  "message": "Trip students roster returned successfully",
  "data": {
    "tripId": "2",
    "tripStatus": "started",
    "students": [
      {
        "studentId": "101",
        "academicNo": "SEED-STU-001",
        "fullName": "أحمد محمد",
        "assignedStop": {
          "stopId": "5",
          "stopName": "نقطة السوق",
          "latitude": 14.2233445,
          "longitude": 44.2233445,
          "stopOrder": 1
        },
        "homeLocation": {
          "latitude": 15.4411,
          "longitude": 44.2411,
          "addressLabel": "منزل الطالب",
          "addressText": "خلف المسجد"
        },
        "currentTripEventType": "not_marked",
        "lastEvent": {
          "eventType": null,
          "eventTime": null,
          "stopId": null
        }
      }
    ]
  }
}
```

Contract notes:
- هذا endpoint هو مصدر الحقيقة لطلاب الرحلة
- لا تعتمد على:
  - `GET /transport/trips/:id`
  - أو `GET /transport/trips/:id/events`
  كمصدر roster كامل
- يعيد كل الطلاب المرتبطين بخط الرحلة في `tripDate` ضمن نطاق assignment الزمني
- إذا كانت الرحلة موجودة ولا يوجد طلاب مؤهلون:
  - يعيد `200`
  - مع `students = []`
- يدعم:
  - `search`
  - `stopId`
- الترتيب:
  - أولًا حسب `assignedStop.stopOrder`
  - ثم حسب `fullName`
- `homeLocation` لا تظهر إلا إذا كانت Approved
- `assignedStop` تبقى مصدر التشغيل الحقيقي حتى لو ظهرت home location

#### GET `/transport/students/:studentId/home-location`
#### PUT `/transport/students/:studentId/home-location`
#### DELETE `/transport/students/:studentId/home-location`

Purpose: manage the approved/pending transport home location for one student.

Roles:
- `admin`

Rules:
- this is an admin-managed surface in the current round
- parent submission UI is not part of the current frontend wave
- driver app should treat this location as reference-only, not as a stop replacement

#### POST `/transport/trips/:id/events`

Important runtime note:

- request shape did not change
- but validation is now trip-date aware
- the student must have an assignment valid for the same `tripDate`
- this removes the old mismatch between roster calculation and event validation

#### GET `/communication/recipients`

Purpose: return the available messaging recipients for the current authenticated user.

Roles:
- كل المستخدمين الموثقين المسموح لهم باستخدام messaging surfaces

Success shape:

```json
{
  "success": true,
  "message": "Available recipients returned successfully",
  "data": {
    "items": [
      {
        "userId": "7",
        "fullName": "مشرف النقل",
        "email": "ops@ishraf.local",
        "phone": "770000000",
        "role": "admin"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

Contract notes:
- هذا endpoint ليس directory عامة مفتوحة خارج auth
- يعيد فقط مستخدمين نشطين
- يستثني المستخدم الحالي نفسه
- يدعم:
  - `search`
  - `role`
  - `page`
  - `limit`
- في السياسة الحالية لـ Wave 1:
  - هذه هي السياسة الرسمية المعتمدة
  - النتائج ليست role-scoped بشكل أدق من ذلك
  - أي أن surface الرسائل الحالية واسعة نسبيًا بين المستخدمين النشطين
- إذا لم توجد نتائج:
  - يعيد `200`
  - مع `items = []`

#### POST `/communication/messages`

Purpose: send one direct message to one active recipient.

Roles:
- `admin`
- `parent`
- `teacher`
- `supervisor`
- `driver`

Body:

```json
{
  "receiverUserId": "50",
  "messageBody": "رسالة مباشرة تجريبية"
}
```

Notes:
- هذه surface one-to-one فقط
- لا يوجد group thread
- لا ترسل الرسائل المتعددة عبر loops محلية في لوحة الإدارة بعد الآن إذا كان المطلوب multi-target

#### POST `/communication/messages/bulk`

Purpose: create admin-only multi-target direct messages as individual one-to-one copies.

Roles:
- `admin`

Body:

```json
{
  "receiverUserIds": ["50"],
  "targetRoles": ["teacher", "driver"],
  "messageBody": "تحديث تشغيلي لليوم"
}
```

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

Contract notes:
- هذا endpoint `admin-only`
- delivery semantics = `all-or-nothing`
- audience تُحل بنفس قواعد `GET /communication/recipients`
- واحد على الأقل من:
  - `receiverUserIds[]`
  - `targetRoles[]`
  مطلوب
- الـ backend يزيل التكرار by `userId`
- كل رسالة تُنشأ كنسخة one-to-one مستقلة
- لا يتم إنشاء group thread
- self-targeting الصريح داخل `receiverUserIds[]` مرفوض
- إذا كانت الـ audience النهائية فارغة:
  - `400 Validation Error`
  - code = `AUDIENCE_EMPTY`
- إذا كان أي `userId` صريح خارج surface المستلمين المتاحين:
  - `400 Validation Error`
  - code = `TARGET_USER_NOT_AVAILABLE`

#### POST `/communication/announcements`

Purpose: create an admin announcement targeted to all users, one role, or multiple roles.

Roles:
- `admin`

Body:

```json
{
  "title": "إعلان تشغيلي",
  "content": "هذا الإعلان مخصص للمعلمين والمشرفين",
  "targetRoles": ["teacher", "supervisor"],
  "expiresAt": "2026-04-01T00:00:00.000Z"
}
```

Contract notes:
- legacy field:
  - `targetRole?: Role | null`
- new field:
  - `targetRoles?: Role[]`
- لا ترسل:
  - `targetRole`
  - و`targetRoles`
  معًا في نفس الطلب
- omission لكليهما يعني:
  - `all users`
- announcements لا تدعم:
  - `userIds[]`
  - أو person-targeted delivery
- `targetRole` يبقى موجودًا للتوافق الخلفي
- `targetRoles[]` هي الصيغة الرسمية الجديدة للاستهداف متعدد الأدوار

Response notes:
- الاستجابة الآن تعيد:
  - `targetRole`
  - `targetRoles`
- إذا كان الاستهداف single-role فقط:
  - `targetRole = that role`
  - `targetRoles = [that role]`
- إذا كان الاستهداف multi-role:
  - `targetRole = null`
  - `targetRoles = [...]`
- إذا كان الإعلان عامًا:
  - `targetRole = null`
  - `targetRoles = []`

#### POST `/communication/notifications`

Purpose: create one manual notification for one user.

Roles:
- `admin`

Body:

```json
{
  "userId": "50",
  "title": "إشعار يدوي",
  "message": "يرجى مراجعة الخطة الجديدة",
  "notificationType": "manual",
  "referenceType": null,
  "referenceId": null
}
```

Notes:
- single-target only
- `notificationType` يبقى free-form

#### POST `/communication/notifications/bulk`

Purpose: create admin-only multi-target notifications with one authoritative delivery summary.

Roles:
- `admin`

Body:

```json
{
  "userIds": ["50"],
  "targetRoles": ["teacher", "driver"],
  "title": "تذكير تشغيلي",
  "message": "يرجى مراجعة الخطة المحدثة",
  "notificationType": "operations",
  "referenceType": null,
  "referenceId": null
}
```

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

Contract notes:
- هذا endpoint `admin-only`
- delivery semantics = `all-or-nothing`
- audience resolution تعتمد نفس قواعد `GET /communication/recipients`
- واحد على الأقل من:
  - `userIds[]`
  - `targetRoles[]`
  مطلوب
- الـ backend يزيل التكرار by `userId`
- إذا كانت الـ audience النهائية فارغة:
  - `400 Validation Error`
  - code = `AUDIENCE_EMPTY`
- إذا احتوى `userIds[]` على مستخدمين غير متاحين لهذا surface:
  - `400 Validation Error`
  - code = `TARGET_USER_NOT_AVAILABLE`

## Active Context Foundation Endpoints

### GET `/academic-structure/context/active`

Purpose: return the canonical active academic year and active semester used by daily operational surfaces.

```http
GET /api/v1/academic-structure/context/active
Authorization: Bearer <accessToken>
```

Notes:
- هذا هو المرجع الرسمي للسياق العام في لوحة الإدارة
- إذا لم يكتمل السياق بعد، فبعض surfaces التشغيلية سترجع `409 Academic context not configured`

### PATCH `/academic-structure/context/active`

Purpose: atomically set the active academic year and active semester together.

```http
PATCH /api/v1/academic-structure/context/active
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "academicYearId": "1",
  "semesterId": "2"
}
```

Notes:
- استخدم هذا endpoint كالمسار canonical للتفعيل النهائي
- `PATCH /academic-structure/academic-years/:id/activate` بقي موجودًا للتوافق، لكنه لم يعد surface التفعيل الأشمل لوحده
- الفصل المحدد يجب أن ينتمي إلى السنة المحددة

## Student Academic Enrollments

هذه الطبقة أصبحت هي التمثيل المؤسسي للحالة الأكاديمية للطالب عبر السنوات.

ما الذي تعنيه:
- هوية الطالب تبقى في `students`
- الحالة الأكاديمية المرتبطة بسنة معينة تبقى في `student academic enrollments`
- الترقية المنظمة تكتب enrollment جديدة بدل الاعتماد فقط على تعديل `students.class_id`

### GET `/students/academic-enrollments`
- surface إدارية أكاديمية لجلب enrollments مع filters مثل:
  - `studentId`
  - `academicYearId`
  - `classId`

### POST `/students/academic-enrollments/bulk`
- surface مؤسسية للترقية أو التجهيز المنظم للسنة الجديدة على دفعات
- تقوم بإنشاء أو تحديث enrollments بدل النقل العشوائي للطلاب

### PATCH `/students/academic-enrollments/:enrollmentId`
- تعديل enrollment موجودة

### POST `/students/:id/academic-enrollments`
- إنشاء أو upsert enrollment واحدة لطالب محدد

### GET `/students/:id/academic-enrollments`
- جلب التاريخ الأكاديمي المرتبط بالطالب عبر السنوات

قواعد مهمة:
- البيانات التاريخية التشغيلية مثل:
  - attendance
  - assessments
  - behavior
  - homework
  لا تُنسخ عند إنشاء enrollment جديدة
- الترقية إلى سنة جديدة تعني إنشاء الحالة الأكاديمية الجديدة، لا نسخ السجلات اليومية القديمة
- `students.class_id` ما زال موجودًا كطبقة توافق انتقالية، لكنه لم يعد النموذج المؤسسي الوحيد للحالة الأكاديمية

## Operational Active-Only Notes

### Students
- `GET /students` أصبح surface تشغيلية قائمة على السنة النشطة
- إذا أُرسل `academicYearId`، فيجب أن يطابق السنة النشطة
- `GET /students/:id` يقرأ الحالة الحالية للطالب من السياق النشط

### Attendance / Assessments / Behavior / Homework
- هذه المسارات أصبحت `active-context-first`
- يمكن ترك `academicYearId` و`semesterId` فارغين في المسارات التي تدعم ذلك، وسيحلها الباك من السياق النشط
- إذا أُرسلت قيم غير مطابقة للسياق النشط، فسيُرفض الطلب بخطأ validation واضح
- `subject offerings` تبقى شرطًا تشغيليًا رسميًا على مستوى الفصل
### Wave 1 Deferred Items

The following items are not part of backend Wave 1:
- Firebase / realtime bus streaming
- FCM push delivery
- Google Maps ETA
- AI analytics / prediction
- 2FA
- advanced system settings
- microservices split

### Frontend Handoff Note

Use the following source-of-truth order before implementing any new frontend screen:
1. live backend code
2. `src/docs/BACKEND_WAVE1_STATUS.md`
3. current OpenAPI and Postman artifacts
4. `src/docs/API_REFERENCE.md`
5. older academic documentation


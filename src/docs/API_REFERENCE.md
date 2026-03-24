# Ishraf Platform Backend API Reference

هذا الملف هو المرجع البشري الكامل للـ endpoints الجاهزة حاليًا.

الملفات الجاهزة للاستخدام:
- Postman Collection: `src/docs/postman/ishraf-platform.postman_collection.json`
- Postman Staging Environment: `src/docs/postman/ishraf-platform.staging.postman_environment.json`
- OpenAPI Spec: `src/docs/openapi/ishraf-platform.openapi.json`
- Testing Guide: `src/docs/TESTING_WITH_OPENAPI_AND_POSTMAN.md`

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
  "identifier": "admin@eshraf.local",
  "password": "ChangeMe123!"
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
      "fullName": "System Administrator",
      "email": "admin@eshraf.local",
      "phone": "700000001",
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
  "currentPassword": "ChangeMe123!",
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
    "fullName": "System Administrator",
    "email": "admin@eshraf.local",
    "phone": "700000001",
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
  "email": "newteacher@eshraf.local",
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
  "email": "newparent@eshraf.local",
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
  "email": "newadmin@eshraf.local",
  "phone": "700000012",
  "password": "StrongPass123",
  "role": "admin"
}
```

Supervisor:

```json
{
  "fullName": "New Supervisor",
  "email": "newsupervisor@eshraf.local",
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
  "email": "newdriver@eshraf.local",
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
    "email": "newteacher@eshraf.local",
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
        "fullName": "System Administrator",
        "email": "admin@eshraf.local",
        "phone": "700000001",
        "role": "admin",
        "isActive": true,
        "lastLoginAt": "2026-03-13T10:00:00.000Z",
        "createdAt": "2026-03-13T03:44:07.985Z",
        "updatedAt": "2026-03-13T03:44:07.985Z",
        "profile": null
      },
      {
        "id": "3",
        "fullName": "Sara Teacher",
        "email": "teacher1@eshraf.local",
        "phone": "700000003",
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
GET /api/v1/users/3
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "id": "3",
    "fullName": "Sara Teacher",
    "email": "teacher1@eshraf.local",
    "phone": "700000003",
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
PATCH /api/v1/users/3
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
    "id": "3",
    "fullName": "Updated Teacher",
    "email": "teacher1@eshraf.local",
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
PATCH /api/v1/users/5/status
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
    "id": "5",
    "fullName": "Ali Driver",
    "email": "driver1@eshraf.local",
    "phone": "700000005",
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

#### POST `/academic-structure/subjects`

الهدف: إنشاء مادة دراسية مرتبطة بمستوى.

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

#### POST `/academic-structure/teacher-assignments`

الهدف: توزيع معلم على فصل + مادة + سنة، مع تحقق service من توافق الصف مع السنة والمادة مع المستوى.

```http
POST /api/v1/academic-structure/teacher-assignments
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "teacherId": "1",
  "classId": "1",
  "subjectId": "1",
  "academicYearId": "1"
}
```

مهم: `teacherId` هنا هو معرّف جدول `teachers.id` وليس `users.id`.

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
      "userId": "3",
      "fullName": "Sara Teacher",
      "email": "teacher1@eshraf.local",
      "phone": "700000003"
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
        "userId": "3",
        "fullName": "Sara Teacher",
        "email": "teacher1@eshraf.local",
        "phone": "700000003"
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
  "supervisorId": "1",
  "classId": "1",
  "academicYearId": "1"
}
```

مهم: `supervisorId` هنا هو معرّف جدول `supervisors.id` وليس `users.id`.

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
      "userId": "5",
      "fullName": "Mona Supervisor",
      "email": "supervisor@example.com",
      "phone": "01000000005"
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
        "userId": "5",
        "fullName": "Mona Supervisor",
        "email": "supervisor@example.com",
        "phone": "01000000005"
      },
      "createdAt": "2026-03-13T12:50:00.000Z"
    }
  ]
}
```

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

## Important Notes For Frontend Developers

- كل المعرفات `id` تعاد كسلاسل `string` حتى لو كانت في PostgreSQL من نوع `bigint`.
- جميع الردود تلتزم envelope ثابت: `success`, `message`, `data` أو `errors`.
- Users وAcademic Structure حاليًا `admin-only`.
- `PATCH /users/:id` لا يغير `role` ولا `password`.
- `PATCH /users/:id/status` يعطّل refresh tokens مباشرة، لكن access token الحالي يبقى صالحًا حتى انتهاء صلاحيته القصيرة.
- `teacherId` و`supervisorId` في assignment endpoints هما profile ids من جدولي `teachers` و`supervisors`، وليس user ids.
- Users API الحالية لا تعيد profile table ids بعد، لذلك إذا احتجت أول assignment جديد فستحتاج هذه المعرفات من قاعدة البيانات أو من بيانات موجودة مسبقًا.



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
- the teacher must be assigned to `class + subject + academicYear`
- the selected `semester` must belong to the selected `academicYear`
- the selected subject must belong to the grade level of the selected class

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
3. `src/docs/API_REFERENCE.md`
4. current OpenAPI and Postman artifacts
5. older academic documentation

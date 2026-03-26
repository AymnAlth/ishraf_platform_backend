# شاشات ومهام تطبيق السائق

## ترتيب التنفيذ المقترح

1. auth + app shell
2. my route assignments
3. ensure daily trip
4. trip detail
5. trip roster
6. trip start / end actions
7. location updates
8. student events
9. transport summary
10. communication
11. profile/password

## الشاشات المطلوبة

### 1. تسجيل الدخول والجلسة

- login
- forgot/reset password
- logout
- me bootstrap
- change password

### 2. My Route Assignments

- جلب route assignments النشطة الخاصة بالسائق
- اختيار الخط التشغيلي الصحيح قبل بدء اليوم

### 3. Ensure Daily Trip

- اختيار `tripType`
- اختيار `tripDate`
- استدعاء `POST /transport/trips/ensure-daily`
- استخدام `trip.id` الناتج للانتقال إلى الرحلة

### 4. Trip Detail

- قائمة الرحلات المسموح بها للسائق
- فلاتر الحالة/النوع/التاريخ
- إظهار current state لكل رحلة

- trip header
- route stops
- latest location
- event summary
- timeline مختصر للأحداث

### 5. Trip Roster

- جلب roster الطلاب من endpoint الرحلة المخصص
- group / sort بحسب stop order
- إظهار currentTripEventType لكل طالب
- استخدام roster كمصدر اختيار الطالب عند إنشاء event
- إظهار stop coordinates
- إظهار home location إن كانت Approved فقط

### 6. Trip Actions

- start trip
- end trip

### 7. Location Updates

- إرسال latitude/longitude
- إظهار آخر موقع مرسل
- إدارة حالة الإرسال والنجاح/الفشل

### 8. Student Events

- create `boarded`
- create `dropped_off`
- create `absent`
- list trip events

### 9. Transport Summary

- عرض الرحلات النشطة الخاصة بالسائق
- latest location
- آخر أحداث الطلاب

### 10. Communication

- available recipients directory
- inbox
- sent
- conversation
- notifications
- active announcements

### 11. Profile / Password

- current user
- change password
- logout

## ملاحظات تنفيذية

- `Wave 1` لا يتضمن Firebase أو realtime أو ETA
- اعتمدوا على polling والطلبات الصريحة
- لا تبنوا التطبيق على افتراض رؤية كل الرحلات؛ السائق يرى فقط رحلاته
- البداية اليومية الصحيحة هي:
  - `GET /transport/route-assignments/me`
  - ثم `POST /transport/trips/ensure-daily`
- لا تبنوا شاشة student events على `GET /transport/trips/:id/events` وحده
- roster الحقيقي يأتي من `GET /transport/trips/:id/students`
- لا تعتمدوا على `POST /transport/trips` كمسار يومي أساسي للسائق

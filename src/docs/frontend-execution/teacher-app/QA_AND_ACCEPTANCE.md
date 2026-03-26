# التحقق والقبول لتطبيق المعلم

## Happy Paths

- teacher login ثم dashboard load بنجاح
- create attendance session ثم save records
- create assessment ثم save scores
- create behavior record ثم edit record
- create homework ثم view detail ثم update submissions
- send message ثم ظهورها في sent/conversation
- notifications تظهر وتُعلَّم كمقروءة
- active announcements تظهر حسب الدور

## Negative / Authorization Cases

- teacher لا يستطيع الوصول إلى admin-only endpoints
- teacher لا يرى أو يعدل بيانات خارج assignments الخاصة به
- create session/assessment/behavior/homework خارج النطاق يجب أن يفشل برسالة مفهومة

## Empty States

- dashboard بلا بيانات
- لا توجد attendance sessions
- لا توجد assessments
- لا توجد behavior records
- لا توجد homework items
- inbox/notifications فارغة

## Pagination / Filtering Cases

- attendance sessions
- assessments
- behavior records
- messages inbox/sent/conversation
- notifications
- homework list

## Auth / Session Cases

- access token منتهي ثم refresh success
- refresh failure ثم redirect إلى login
- change password ثم إعادة مصادقة
- `429` على login/forgot/reset يعالج برسالة واضحة

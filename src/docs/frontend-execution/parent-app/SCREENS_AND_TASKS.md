# Parent App Screens And Tasks

## 1. Core flow

1. login
2. hydrate current parent session
3. load `GET /reporting/dashboards/parent/me`

## 2. Child follow-up flow

1. render linked children only
2. open one child profile
3. inspect attendance, assessment, and behavior summaries
4. inspect transport live status when needed
5. read student homework

قواعد:

- لا تبنِ UI على افتراض أن parent ترى كل الطلاب.
- الطالب غير المرتبط ليس edge case بل denial path طبيعي.

## 3. Communication

1. send direct messages to available recipients
2. inspect inbox and sent history
3. read active announcements
4. mark notifications/messages as read

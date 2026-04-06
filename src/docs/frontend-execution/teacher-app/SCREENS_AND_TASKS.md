# Teacher App Screens And Tasks

## 1. Core flow

1. login
2. hydrate session with `GET /auth/me`
3. load `GET /reporting/dashboards/teacher/me`

## 2. Attendance flow

1. open attendance creation screen
2. choose class and subject
3. optionally omit `academicYearId` and `semesterId` and let the backend resolve active context
4. create session with `POST /attendance/sessions`
5. load detail with `GET /attendance/sessions/:id`
6. submit full roster snapshot with `PUT /attendance/sessions/:id/records`
7. use `PATCH /attendance/records/:attendanceId` only for individual correction

قواعد:

- لا ترسل `teacherId`.
- roster payload يجب أن تحتوي كل الطلاب active مرة واحدة بالضبط.

## 3. Assessment flow

1. load assessment types
2. create assessment
3. load scores roster
4. save scores
5. patch individual score only when needed

قواعد:

- لا ترسل `teacherId`.
- لا ترسل score أكبر من `maxScore`.
- لا ترسل طلابًا خارج roster الاختبار.

## 4. Behavior flow

1. load categories
2. create behavior record for an accessible student
3. inspect behavior timeline
4. patch behavior record when needed

## 5. Homework flow

1. create homework
2. load homework detail/roster
3. save submissions
4. inspect one student homework list when following up

قواعد:

- لا ترسل `teacherId`.
- submissions payload لا تقبل طلابًا خارج roster الواجب.

## 6. Student follow-up

1. inspect `GET /reporting/students/:studentId/profile`
2. open attendance / assessment / behavior summaries
3. use homework student list for task tracking

## 7. Communication

1. send direct messages
2. review inbox and sent items
3. read active announcements
4. mark notifications and messages as read

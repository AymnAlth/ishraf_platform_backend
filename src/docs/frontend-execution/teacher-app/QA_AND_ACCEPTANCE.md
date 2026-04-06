# Teacher App QA And Acceptance

## Happy paths

- teacher login succeeds
- teacher dashboard loads
- teacher can create attendance session without `teacherId`
- teacher can save attendance roster only when payload covers the full roster exactly once
- teacher can create assessment without `teacherId`
- teacher can save scores for roster students only
- teacher can create behavior records for accessible students
- teacher can create homework without `teacherId`
- teacher can save homework submissions for roster students only
- student reporting surfaces load for teacher-accessible students
- messaging and notifications work

## Expected validation failures

- sending `teacherId` in teacher-created assessment returns `TEACHER_ID_NOT_ALLOWED`
- sending `teacherId` in teacher-created homework returns `TEACHER_ID_NOT_ALLOWED`
- attendance payload with duplicates returns `ATTENDANCE_DUPLICATE_STUDENT`
- attendance payload missing a roster student returns `ATTENDANCE_ROSTER_STUDENT_MISSING`
- attendance payload containing a foreign student returns `ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED`
- score above `maxScore` returns `ASSESSMENT_SCORE_EXCEEDS_MAX_SCORE`
- score payload with a foreign student returns `STUDENT_ASSESSMENT_STUDENT_NOT_ALLOWED`
- homework payload with a foreign student returns `HOMEWORK_SUBMISSION_STUDENT_NOT_ALLOWED`

## Expected denials

- teacher cannot access admin-only `users`, `academic-structure`, `students`, `admin-imports`
- teacher cannot manage announcements or bulk communication endpoints
- teacher cannot access admin preview reporting

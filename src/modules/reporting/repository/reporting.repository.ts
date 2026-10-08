import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { databaseTables, databaseViews } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  ActivePeriodRow,
  ActiveStudentTransportAssignmentRow,
  ActiveTripLiveStatusRow,
  AdminDashboardSummaryRow,
  AnnouncementRow,
  DriverProfileRow,
  NotificationRow,
  NotificationSummaryRow,
  ParentProfileRow,
  RecentAssessmentRow,
  RecentAttendanceSessionRow,
  RecentBehaviorRecordRow,
  RecentStudentRow,
  ReportingStudentParentRow,
  ReportingStudentRow,
  StudentProfileSummarySnapshotByStudentRow,
  StudentProfileSummarySnapshotRow,
  StudentAssessmentSummaryRow,
  StudentAttendanceSummaryRow,
  StudentBehaviorSummaryRow,
  SupervisorAssignmentRow,
  SupervisorProfileRow,
  TeacherAssignmentRow,
  TeacherProfileRow,
  TripStudentEventRow
} from "../types/reporting.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const studentSelect = `
  SELECT
    sp.student_id AS "studentId",
    sp.academic_no AS "academicNo",
    sp.student_name AS "fullName",
    sp.date_of_birth AS "dateOfBirth",
    sp.gender,
    sp.student_status AS status,
    sp.enrollment_date AS "enrollmentDate",
    sp.class_id AS "classId",
    sp.class_name AS "className",
    sp.section,
    sp.grade_level_id AS "gradeLevelId",
    sp.grade_level_name AS "gradeLevelName",
    sp.academic_year_id AS "academicYearId",
    sp.academic_year_name AS "academicYearName"
  FROM ${databaseViews.studentProfiles} sp
`;

const parentLinkSelect = `
  SELECT
    sp.id AS "linkId",
    p.id AS "parentId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    sp.relation_type AS "relationType",
    sp.is_primary AS "isPrimary",
    p.address
  FROM ${databaseTables.studentParents} sp
  JOIN ${databaseTables.parents} p ON p.id = sp.parent_id
  JOIN ${databaseTables.users} u ON u.id = p.user_id
`;

const parentProfileSelect = `
  SELECT
    p.id AS "parentId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    p.address,
    p.relation_type AS "relationType"
  FROM ${databaseTables.parents} p
  JOIN ${databaseTables.users} u ON u.id = p.user_id
`;

const teacherProfileSelect = `
  SELECT
    t.id AS "teacherId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    t.specialization,
    t.qualification,
    t.hire_date AS "hireDate"
  FROM ${databaseTables.teachers} t
  JOIN ${databaseTables.users} u ON u.id = t.user_id
`;

const supervisorProfileSelect = `
  SELECT
    s.id AS "supervisorId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    s.department
  FROM ${databaseTables.supervisors} s
  JOIN ${databaseTables.users} u ON u.id = s.user_id
`;

const driverProfileSelect = `
  SELECT
    d.id AS "driverId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    d.license_number AS "licenseNumber",
    d.driver_status AS "driverStatus"
  FROM ${databaseTables.drivers} d
  JOIN ${databaseTables.users} u ON u.id = d.user_id
`;

const buildStudentAttendanceSummarySelect = (
  studentFilterSql: string,
  academicYearParamSql: string,
  semesterParamSql: string
) => `
  SELECT
    st.id AS "studentId",
    st.academic_no AS "academicNo",
    st.full_name AS "studentName",
    c.id AS "classId",
    c.class_name AS "className",
    c.section,
    ay.id AS "academicYearId",
    ay.name AS "academicYearName",
    sem.id AS "semesterId",
    sem.name AS "semesterName",
    COALESCE(att.total_sessions, 0)::int AS "totalSessions",
    COALESCE(att.present_count, 0)::int AS "presentCount",
    COALESCE(att.absent_count, 0)::int AS "absentCount",
    COALESCE(att.late_count, 0)::int AS "lateCount",
    COALESCE(att.excused_count, 0)::int AS "excusedCount",
    att.attendance_percentage AS "attendancePercentage"
  FROM ${databaseTables.students} st
  JOIN ${databaseTables.studentAcademicEnrollments} sae
    ON sae.student_id = st.id
   AND sae.academic_year_id = ${academicYearParamSql}
  JOIN ${databaseTables.classes} c ON c.id = sae.class_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = sae.academic_year_id
  JOIN ${databaseTables.semesters} sem
    ON sem.id = ${semesterParamSql}
   AND sem.academic_year_id = ay.id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(att.id)::int AS total_sessions,
      COUNT(*) FILTER (WHERE att.status = 'present')::int AS present_count,
      COUNT(*) FILTER (WHERE att.status = 'absent')::int AS absent_count,
      COUNT(*) FILTER (WHERE att.status = 'late')::int AS late_count,
      COUNT(*) FILTER (WHERE att.status = 'excused')::int AS excused_count,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE att.status = 'present') / NULLIF(COUNT(att.id), 0),
        2
      ) AS attendance_percentage
    FROM ${databaseTables.attendance} att
    JOIN ${databaseTables.attendanceSessions} ats ON ats.id = att.attendance_session_id
    WHERE att.student_id = st.id
      AND ats.academic_year_id = ${academicYearParamSql}
      AND ats.semester_id = ${semesterParamSql}
  ) att ON true
  WHERE ${studentFilterSql}
`;

const buildStudentAssessmentSummarySelect = (
  studentFilterSql: string,
  academicYearParamSql: string,
  semesterParamSql: string
) => `
  SELECT
    st.id AS "studentId",
    st.academic_no AS "academicNo",
    st.full_name AS "studentName",
    c.id AS "classId",
    c.class_name AS "className",
    c.section,
    ay.id AS "academicYearId",
    ay.name AS "academicYearName",
    sem.id AS "semesterId",
    sem.name AS "semesterName",
    subj.id AS "subjectId",
    subj.name AS "subjectName",
    COUNT(sa.id)::int AS "totalAssessments",
    SUM(sa.score) AS "totalScore",
    SUM(a.max_score) AS "totalMaxScore",
    ROUND(100.0 * SUM(sa.score) / NULLIF(SUM(a.max_score), 0), 2) AS "overallPercentage"
  FROM ${databaseTables.students} st
  JOIN ${databaseTables.studentAcademicEnrollments} sae
    ON sae.student_id = st.id
   AND sae.academic_year_id = ${academicYearParamSql}
  JOIN ${databaseTables.classes} c ON c.id = sae.class_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = sae.academic_year_id
  JOIN ${databaseTables.semesters} sem
    ON sem.id = ${semesterParamSql}
   AND sem.academic_year_id = ay.id
  JOIN ${databaseTables.studentAssessments} sa ON sa.student_id = st.id
  JOIN ${databaseTables.assessments} a
    ON a.id = sa.assessment_id
   AND a.academic_year_id = ${academicYearParamSql}
   AND a.semester_id = ${semesterParamSql}
  JOIN ${databaseTables.subjects} subj ON subj.id = a.subject_id
  WHERE ${studentFilterSql}
  GROUP BY
    st.id, st.academic_no, st.full_name,
    c.id, c.class_name, c.section,
    ay.id, ay.name,
    sem.id, sem.name,
    subj.id, subj.name
`;

const buildStudentBehaviorSummarySelect = (
  studentFilterSql: string,
  academicYearParamSql: string,
  semesterParamSql: string
) => `
  SELECT
    st.id AS "studentId",
    st.academic_no AS "academicNo",
    st.full_name AS "studentName",
    ay.id AS "academicYearId",
    ay.name AS "academicYearName",
    sem.id AS "semesterId",
    sem.name AS "semesterName",
    COUNT(br.id)::int AS "totalBehaviorRecords",
    COUNT(*) FILTER (WHERE bc.behavior_type = 'positive')::int AS "positiveCount",
    COUNT(*) FILTER (WHERE bc.behavior_type = 'negative')::int AS "negativeCount",
    COALESCE(
      SUM(br.severity) FILTER (WHERE bc.behavior_type = 'negative'),
      0
    )::int AS "negativeSeverityTotal"
  FROM ${databaseTables.students} st
  JOIN ${databaseTables.academicYears} ay ON ay.id = ${academicYearParamSql}
  JOIN ${databaseTables.semesters} sem
    ON sem.id = ${semesterParamSql}
   AND sem.academic_year_id = ay.id
  LEFT JOIN ${databaseTables.behaviorRecords} br
    ON br.student_id = st.id
   AND br.academic_year_id = ${academicYearParamSql}
   AND br.semester_id = ${semesterParamSql}
  LEFT JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
  WHERE ${studentFilterSql}
  GROUP BY st.id, st.academic_no, st.full_name, ay.id, ay.name, sem.id, sem.name
`;

const recentBehaviorRecordReadSelect = `
  SELECT
    br.id AS id,
    st.id AS "studentId",
    st.academic_no AS "academicNo",
    st.full_name AS "studentFullName",
    bc.id AS "behaviorCategoryId",
    bc.code AS "behaviorCode",
    bc.name AS "behaviorName",
    bc.behavior_type AS "behaviorType",
    br.description,
    br.severity,
    br.behavior_date AS "behaviorDate",
    br.created_at AS "createdAt"
  FROM ${databaseTables.behaviorRecords} br
  JOIN ${databaseTables.students} st ON st.id = br.student_id
  JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
`;

export class ReportingRepository {
  async findActivePeriod(queryable: Queryable = db): Promise<ActivePeriodRow | null> {
    const result = await queryable.query<ActivePeriodRow>(
      `
        SELECT
          ay.id AS "academicYearId",
          ay.name AS "academicYearName",
          sem.id AS "semesterId",
          sem.name AS "semesterName"
        FROM ${databaseTables.academicYears} ay
        JOIN ${databaseTables.semesters} sem
          ON sem.academic_year_id = ay.id
        WHERE ay.is_active = true
          AND sem.is_active = true
        ORDER BY sem.id DESC
        LIMIT 1
      `
    );

    return mapSingleRow(result.rows);
  }

  async findStudentById(
    studentId: string,
    queryable: Queryable = db
  ): Promise<ReportingStudentRow | null> {
    const result = await queryable.query<ReportingStudentRow>(
      `
        ${studentSelect}
        WHERE sp.student_id = $1
        LIMIT 1
      `,
      [studentId]
    );

    return mapSingleRow(result.rows);
  }

  async findStudentByIdForParent(
    parentId: string,
    studentId: string,
    queryable: Queryable = db
  ): Promise<ReportingStudentRow | null> {
    const result = await queryable.query<ReportingStudentRow>(
      `
        ${studentSelect}
        WHERE sp.student_id = $2
          AND EXISTS (
            SELECT 1
            FROM ${databaseTables.studentParents} spl
            WHERE spl.parent_id = $1
              AND spl.student_id = sp.student_id
          )
        LIMIT 1
      `,
      [parentId, studentId]
    );

    return mapSingleRow(result.rows);
  }

  async findStudentByIdForTeacher(
    teacherId: string,
    studentId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<ReportingStudentRow | null> {
    const result = await queryable.query<ReportingStudentRow>(
      `
        ${studentSelect}
        WHERE sp.student_id = $2
          AND sp.academic_year_id = $3
          AND EXISTS (
            SELECT 1
            FROM ${databaseTables.teacherClasses} tc
            WHERE tc.teacher_id = $1
              AND tc.class_id = sp.class_id
              AND tc.academic_year_id = sp.academic_year_id
          )
        LIMIT 1
      `,
      [teacherId, studentId, academicYearId]
    );

    return mapSingleRow(result.rows);
  }

  async findStudentByIdForSupervisor(
    supervisorId: string,
    studentId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<ReportingStudentRow | null> {
    const result = await queryable.query<ReportingStudentRow>(
      `
        ${studentSelect}
        WHERE sp.student_id = $2
          AND sp.academic_year_id = $3
          AND EXISTS (
            SELECT 1
            FROM ${databaseTables.supervisorClasses} sc
            WHERE sc.supervisor_id = $1
              AND sc.class_id = sp.class_id
              AND sc.academic_year_id = sp.academic_year_id
          )
        LIMIT 1
      `,
      [supervisorId, studentId, academicYearId]
    );

    return mapSingleRow(result.rows);
  }

  async listStudentParents(
    studentId: string,
    queryable: Queryable = db
  ): Promise<ReportingStudentParentRow[]> {
    const result = await queryable.query<ReportingStudentParentRow>(
      `
        ${parentLinkSelect}
        WHERE sp.student_id = $1
        ORDER BY sp.is_primary DESC, sp.created_at ASC, sp.id ASC
      `,
      [studentId]
    );

    return result.rows;
  }

  async findStudentAttendanceSummary(
    studentId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<StudentAttendanceSummaryRow | null> {
    const result = await queryable.query<StudentAttendanceSummaryRow>(
      `
        ${buildStudentAttendanceSummarySelect("st.id = $1", "$2", "$3")}
        LIMIT 1
      `,
      [studentId, academicYearId, semesterId]
    );

    return mapSingleRow(result.rows);
  }

  async listStudentAttendanceSummaries(
    studentIds: string[],
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<StudentAttendanceSummaryRow[]> {
    if (studentIds.length === 0) {
      return [];
    }

    const result = await queryable.query<StudentAttendanceSummaryRow>(
      `
        SELECT
          student_id AS "studentId",
          academic_no AS "academicNo",
          student_name AS "studentName",
          class_id AS "classId",
          class_name AS "className",
          section,
          academic_year_id AS "academicYearId",
          academic_year_name AS "academicYearName",
          semester_id AS "semesterId",
          semester_name AS "semesterName",
          total_sessions AS "totalSessions",
          present_count AS "presentCount",
          absent_count AS "absentCount",
          late_count AS "lateCount",
          excused_count AS "excusedCount",
          attendance_percentage AS "attendancePercentage"
        FROM ${databaseViews.studentAttendanceSummary}
        WHERE student_id = ANY($1::bigint[])
          AND academic_year_id = $2
          AND semester_id = $3
      `,
      [studentIds, academicYearId, semesterId]
    );

    return result.rows;
  }

  async listStudentAssessmentSummaries(
    studentId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<StudentAssessmentSummaryRow[]> {
    const result = await queryable.query<StudentAssessmentSummaryRow>(
      `
        ${buildStudentAssessmentSummarySelect("st.id = $1", "$2", "$3")}
        ORDER BY "subjectName" ASC, "subjectId" ASC
      `,
      [studentId, academicYearId, semesterId]
    );

    return result.rows;
  }

  async listStudentAssessmentSummariesByStudentIds(
    studentIds: string[],
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<StudentAssessmentSummaryRow[]> {
    if (studentIds.length === 0) {
      return [];
    }

    const result = await queryable.query<StudentAssessmentSummaryRow>(
      `
        SELECT
          student_id AS "studentId",
          academic_no AS "academicNo",
          student_name AS "studentName",
          class_id AS "classId",
          class_name AS "className",
          section,
          academic_year_id AS "academicYearId",
          academic_year_name AS "academicYearName",
          semester_id AS "semesterId",
          semester_name AS "semesterName",
          subject_id AS "subjectId",
          subject_name AS "subjectName",
          total_assessments AS "totalAssessments",
          total_score AS "totalScore",
          total_max_score AS "totalMaxScore",
          overall_percentage AS "overallPercentage"
        FROM ${databaseViews.studentAssessmentSummary}
        WHERE student_id = ANY($1::bigint[])
          AND academic_year_id = $2
          AND semester_id = $3
        ORDER BY subject_name ASC, subject_id ASC
      `,
      [studentIds, academicYearId, semesterId]
    );

    return result.rows;
  }

  async findStudentBehaviorSummary(
    studentId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<StudentBehaviorSummaryRow | null> {
    const result = await queryable.query<StudentBehaviorSummaryRow>(
      `
        ${buildStudentBehaviorSummarySelect("st.id = $1", "$2", "$3")}
        LIMIT 1
      `,
      [studentId, academicYearId, semesterId]
    );

    return mapSingleRow(result.rows);
  }

  async findStudentProfileSummarySnapshot(
    studentId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<StudentProfileSummarySnapshotRow | null> {
    const result = await queryable.query<StudentProfileSummarySnapshotRow>(
      `
        WITH attendance_summary AS (
          SELECT
            COUNT(att.id)::int AS "totalSessions",
            COUNT(*) FILTER (WHERE att.status = 'present')::int AS "presentCount",
            COUNT(*) FILTER (WHERE att.status = 'absent')::int AS "absentCount",
            COUNT(*) FILTER (WHERE att.status = 'late')::int AS "lateCount",
            COUNT(*) FILTER (WHERE att.status = 'excused')::int AS "excusedCount",
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE att.status = 'present') / NULLIF(COUNT(att.id), 0),
              2
            ) AS "attendancePercentage"
          FROM ${databaseTables.attendance} att
          JOIN ${databaseTables.attendanceSessions} ats ON ats.id = att.attendance_session_id
          WHERE att.student_id = $1
            AND ats.academic_year_id = $2
            AND ats.semester_id = $3
        ),
        behavior_summary AS (
          SELECT
            COUNT(br.id)::int AS "totalBehaviorRecords",
            COUNT(*) FILTER (WHERE bc.behavior_type = 'positive')::int AS "positiveCount",
            COUNT(*) FILTER (WHERE bc.behavior_type = 'negative')::int AS "negativeCount",
            COALESCE(
              SUM(br.severity) FILTER (WHERE bc.behavior_type = 'negative'),
              0
            )::int AS "negativeSeverityTotal"
          FROM ${databaseTables.behaviorRecords} br
          LEFT JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
          WHERE br.student_id = $1
            AND br.academic_year_id = $2
            AND br.semester_id = $3
        ),
        assessment_subjects AS (
          SELECT
            subj.id::text AS "subjectId",
            subj.name AS "subjectName",
            COUNT(sa.id)::int AS "totalAssessments",
            SUM(sa.score) AS "totalScore",
            SUM(a.max_score) AS "totalMaxScore",
            ROUND(100.0 * SUM(sa.score) / NULLIF(SUM(a.max_score), 0), 2) AS "overallPercentage"
          FROM ${databaseTables.studentAssessments} sa
          JOIN ${databaseTables.assessments} a ON a.id = sa.assessment_id
          JOIN ${databaseTables.subjects} subj ON subj.id = a.subject_id
          WHERE sa.student_id = $1
            AND a.academic_year_id = $2
            AND a.semester_id = $3
          GROUP BY subj.id, subj.name
        )
        SELECT
          attendance_summary."totalSessions",
          attendance_summary."presentCount",
          attendance_summary."absentCount",
          attendance_summary."lateCount",
          attendance_summary."excusedCount",
          attendance_summary."attendancePercentage",
          behavior_summary."totalBehaviorRecords",
          behavior_summary."positiveCount",
          behavior_summary."negativeCount",
          behavior_summary."negativeSeverityTotal",
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'subjectId', assessment_subjects."subjectId",
                  'subjectName', assessment_subjects."subjectName",
                  'totalAssessments', assessment_subjects."totalAssessments",
                  'totalScore', assessment_subjects."totalScore",
                  'totalMaxScore', assessment_subjects."totalMaxScore",
                  'overallPercentage', assessment_subjects."overallPercentage"
                )
                ORDER BY assessment_subjects."subjectName" ASC, assessment_subjects."subjectId" ASC
              )
              FROM assessment_subjects
            ),
            '[]'::json
          ) AS "assessmentSubjects"
        FROM attendance_summary
        CROSS JOIN behavior_summary
      `,
      [studentId, academicYearId, semesterId]
    );

    return mapSingleRow(result.rows);
  }

  async listStudentProfileSummarySnapshotsByStudentIds(
    studentIds: string[],
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<StudentProfileSummarySnapshotByStudentRow[]> {
    if (studentIds.length === 0) {
      return [];
    }

    const result = await queryable.query<StudentProfileSummarySnapshotByStudentRow>(
      `
        WITH target_students AS (
          SELECT DISTINCT UNNEST($1::bigint[])::text AS "studentId"
        ),
        attendance_summary AS (
          SELECT
            att.student_id::text AS "studentId",
            COUNT(att.id)::int AS "totalSessions",
            COUNT(*) FILTER (WHERE att.status = 'present')::int AS "presentCount",
            COUNT(*) FILTER (WHERE att.status = 'absent')::int AS "absentCount",
            COUNT(*) FILTER (WHERE att.status = 'late')::int AS "lateCount",
            COUNT(*) FILTER (WHERE att.status = 'excused')::int AS "excusedCount",
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE att.status = 'present') / NULLIF(COUNT(att.id), 0),
              2
            ) AS "attendancePercentage"
          FROM ${databaseTables.attendance} att
          JOIN ${databaseTables.attendanceSessions} ats ON ats.id = att.attendance_session_id
          JOIN target_students ts ON ts."studentId" = att.student_id::text
          WHERE ats.academic_year_id = $2
            AND ats.semester_id = $3
          GROUP BY att.student_id
        ),
        behavior_summary AS (
          SELECT
            br.student_id::text AS "studentId",
            COUNT(br.id)::int AS "totalBehaviorRecords",
            COUNT(*) FILTER (WHERE bc.behavior_type = 'positive')::int AS "positiveCount",
            COUNT(*) FILTER (WHERE bc.behavior_type = 'negative')::int AS "negativeCount",
            COALESCE(
              SUM(br.severity) FILTER (WHERE bc.behavior_type = 'negative'),
              0
            )::int AS "negativeSeverityTotal"
          FROM ${databaseTables.behaviorRecords} br
          LEFT JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
          JOIN target_students ts ON ts."studentId" = br.student_id::text
          WHERE br.academic_year_id = $2
            AND br.semester_id = $3
          GROUP BY br.student_id
        ),
        assessment_subjects AS (
          SELECT
            sa.student_id::text AS "studentId",
            subj.id::text AS "subjectId",
            subj.name AS "subjectName",
            COUNT(sa.id)::int AS "totalAssessments",
            SUM(sa.score) AS "totalScore",
            SUM(a.max_score) AS "totalMaxScore",
            ROUND(100.0 * SUM(sa.score) / NULLIF(SUM(a.max_score), 0), 2) AS "overallPercentage"
          FROM ${databaseTables.studentAssessments} sa
          JOIN ${databaseTables.assessments} a ON a.id = sa.assessment_id
          JOIN ${databaseTables.subjects} subj ON subj.id = a.subject_id
          JOIN target_students ts ON ts."studentId" = sa.student_id::text
          WHERE a.academic_year_id = $2
            AND a.semester_id = $3
          GROUP BY sa.student_id, subj.id, subj.name
        ),
        assessment_summary AS (
          SELECT
            "studentId",
            json_agg(
              json_build_object(
                'subjectId', "subjectId",
                'subjectName', "subjectName",
                'totalAssessments', "totalAssessments",
                'totalScore', "totalScore",
                'totalMaxScore', "totalMaxScore",
                'overallPercentage', "overallPercentage"
              )
              ORDER BY "subjectName" ASC, "subjectId" ASC
            ) AS "assessmentSubjects"
          FROM assessment_subjects
          GROUP BY "studentId"
        )
        SELECT
          ts."studentId",
          COALESCE(att."totalSessions", 0)::int AS "totalSessions",
          COALESCE(att."presentCount", 0)::int AS "presentCount",
          COALESCE(att."absentCount", 0)::int AS "absentCount",
          COALESCE(att."lateCount", 0)::int AS "lateCount",
          COALESCE(att."excusedCount", 0)::int AS "excusedCount",
          att."attendancePercentage",
          COALESCE(beh."totalBehaviorRecords", 0)::int AS "totalBehaviorRecords",
          COALESCE(beh."positiveCount", 0)::int AS "positiveCount",
          COALESCE(beh."negativeCount", 0)::int AS "negativeCount",
          COALESCE(beh."negativeSeverityTotal", 0)::int AS "negativeSeverityTotal",
          COALESCE(ass."assessmentSubjects", '[]'::json) AS "assessmentSubjects"
        FROM target_students ts
        LEFT JOIN attendance_summary att ON att."studentId" = ts."studentId"
        LEFT JOIN behavior_summary beh ON beh."studentId" = ts."studentId"
        LEFT JOIN assessment_summary ass ON ass."studentId" = ts."studentId"
        ORDER BY ts."studentId" ASC
      `,
      [studentIds, academicYearId, semesterId]
    );

    return result.rows;
  }

  async listStudentBehaviorSummaries(
    studentIds: string[],
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<StudentBehaviorSummaryRow[]> {
    if (studentIds.length === 0) {
      return [];
    }

    const result = await queryable.query<StudentBehaviorSummaryRow>(
      `
        SELECT
          student_id AS "studentId",
          academic_no AS "academicNo",
          student_name AS "studentName",
          academic_year_id AS "academicYearId",
          academic_year_name AS "academicYearName",
          semester_id AS "semesterId",
          semester_name AS "semesterName",
          total_behavior_records AS "totalBehaviorRecords",
          positive_count AS "positiveCount",
          negative_count AS "negativeCount",
          negative_severity_total AS "negativeSeverityTotal"
        FROM ${databaseViews.studentBehaviorSummary}
        WHERE student_id = ANY($1::bigint[])
          AND academic_year_id = $2
          AND semester_id = $3
      `,
      [studentIds, academicYearId, semesterId]
    );

    return result.rows;
  }

  async findParentProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<ParentProfileRow | null> {
    const result = await queryable.query<ParentProfileRow>(
      `
        ${parentProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async findTeacherProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<TeacherProfileRow | null> {
    const result = await queryable.query<TeacherProfileRow>(
      `
        ${teacherProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async findSupervisorProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<SupervisorProfileRow | null> {
    const result = await queryable.query<SupervisorProfileRow>(
      `
        ${supervisorProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async findDriverProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<DriverProfileRow | null> {
    const result = await queryable.query<DriverProfileRow>(
      `
        ${driverProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async hasTeacherStudentAccess(
    teacherId: string,
    classId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.teacherClasses}
          WHERE teacher_id = $1
            AND class_id = $2
            AND academic_year_id = $3
        ) AS exists
      `,
      [teacherId, classId, academicYearId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async hasSupervisorStudentAccess(
    supervisorId: string,
    classId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.supervisorClasses}
          WHERE supervisor_id = $1
            AND class_id = $2
            AND academic_year_id = $3
        ) AS exists
      `,
      [supervisorId, classId, academicYearId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async listStudentsByClass(
    classId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<ReportingStudentRow[]> {
    const result = await queryable.query<ReportingStudentRow>(
      `
        SELECT
          spv.student_id AS "studentId",
          spv.academic_no AS "academicNo",
          spv.student_name AS "fullName",
          spv.date_of_birth AS "dateOfBirth",
          spv.gender,
          spv.student_status AS status,
          spv.enrollment_date AS "enrollmentDate",
          spv.class_id AS "classId",
          spv.class_name AS "className",
          spv.section,
          spv.grade_level_id AS "gradeLevelId",
          spv.grade_level_name AS "gradeLevelName",
          spv.academic_year_id AS "academicYearId",
          spv.academic_year_name AS "academicYearName"
        FROM ${databaseViews.studentProfiles} spv
        WHERE spv.class_id = $1
          AND spv.academic_year_id = $2
        ORDER BY spv.academic_no ASC, spv.student_id ASC
      `,
      [classId, academicYearId]
    );

    return result.rows;
  }

  async listChildrenForParent(
    parentId: string,
    queryable: Queryable = db
  ): Promise<ReportingStudentRow[]> {
    const result = await queryable.query<ReportingStudentRow>(
      `
        SELECT
          spv.student_id AS "studentId",
          spv.academic_no AS "academicNo",
          spv.student_name AS "fullName",
          spv.date_of_birth AS "dateOfBirth",
          spv.gender,
          spv.student_status AS status,
          spv.enrollment_date AS "enrollmentDate",
          spv.class_id AS "classId",
          spv.class_name AS "className",
          spv.section,
          spv.grade_level_id AS "gradeLevelId",
          spv.grade_level_name AS "gradeLevelName",
          spv.academic_year_id AS "academicYearId",
          spv.academic_year_name AS "academicYearName"
        FROM ${databaseTables.studentParents} sp
        JOIN ${databaseViews.studentProfiles} spv ON spv.student_id = sp.student_id
        WHERE sp.parent_id = $1
        ORDER BY sp.student_id ASC
      `,
      [parentId]
    );

    return result.rows;
  }

  async listLatestNotificationsByUserId(
    userId: string,
    limit: number,
    queryable: Queryable = db
  ): Promise<NotificationRow[]> {
    const result = await queryable.query<NotificationRow>(
      `
        SELECT
          notification_id AS id,
          user_id AS "userId",
          user_name AS "userName",
          title,
          message,
          notification_type AS "notificationType",
          reference_type AS "referenceType",
          reference_id AS "referenceId",
          is_read AS "isRead",
          created_at AS "createdAt",
          read_at AS "readAt"
        FROM ${databaseViews.vwNotificationDetails}
        WHERE user_id = $1
        ORDER BY created_at DESC, notification_id DESC
        LIMIT $2
      `,
      [userId, limit]
    );

    return result.rows;
  }

  async findNotificationSummaryByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<NotificationSummaryRow | null> {
    const result = await queryable.query<NotificationSummaryRow>(
      `
        SELECT
          total_notifications AS "totalNotifications",
          unread_notifications AS "unreadNotifications"
        FROM ${databaseViews.vwUserNotificationSummary}
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async listTeacherAssignments(
    teacherId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<TeacherAssignmentRow[]> {
    const result = await queryable.query<TeacherAssignmentRow>(
      `
        SELECT
          tc.id AS "teacherClassId",
          c.id AS "classId",
          c.class_name AS "className",
          c.section,
          gl.id AS "gradeLevelId",
          gl.name AS "gradeLevelName",
          subj.id AS "subjectId",
          subj.name AS "subjectName",
          subj.code AS "subjectCode",
          ay.id AS "academicYearId",
          ay.name AS "academicYearName",
          tc.created_at AS "createdAt"
        FROM ${databaseTables.teacherClasses} tc
        JOIN ${databaseTables.classes} c ON c.id = tc.class_id
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
        JOIN ${databaseTables.subjects} subj ON subj.id = tc.subject_id
        JOIN ${databaseTables.academicYears} ay ON ay.id = tc.academic_year_id
        WHERE tc.teacher_id = $1
          AND tc.academic_year_id = $2
        ORDER BY tc.created_at DESC, tc.id DESC
      `,
      [teacherId, academicYearId]
    );

    return result.rows;
  }

  async listRecentTeacherAttendanceSessions(
    teacherId: string,
    academicYearId: string,
    semesterId: string,
    academicYearName: string,
    semesterName: string,
    limit: number,
    queryable: Queryable = db
  ): Promise<RecentAttendanceSessionRow[]> {
    const result = await queryable.query<RecentAttendanceSessionRow>(
      `
        WITH recent_sessions AS (
          SELECT
            ats.id,
            ats.class_id,
            c.class_name,
            c.section,
            ats.subject_id,
            subj.name AS subject_name,
            ats.academic_year_id,
            ats.semester_id,
            ats.session_date,
            ats.period_no,
            ats.title
          FROM ${databaseTables.attendanceSessions} ats
          JOIN ${databaseTables.classes} c ON c.id = ats.class_id
          JOIN ${databaseTables.subjects} subj ON subj.id = ats.subject_id
          WHERE ats.teacher_id = $1
            AND ats.academic_year_id = $2
            AND ats.semester_id = $3
          ORDER BY ats.session_date DESC, ats.period_no DESC, ats.id DESC
          LIMIT $4
        )
        SELECT
          rs.id,
          rs.class_id AS "classId",
          rs.class_name AS "className",
          rs.section,
          rs.subject_id AS "subjectId",
          rs.subject_name AS "subjectName",
          rs.academic_year_id AS "academicYearId",
          $5::text AS "academicYearName",
          rs.semester_id AS "semesterId",
          $6::text AS "semesterName",
          rs.session_date AS "sessionDate",
          rs.period_no AS "periodNo",
          rs.title,
          COALESCE(ac.present_count, 0)::int AS "presentCount",
          COALESCE(ac.absent_count, 0)::int AS "absentCount",
          COALESCE(ac.late_count, 0)::int AS "lateCount",
          COALESCE(ac.excused_count, 0)::int AS "excusedCount",
          COALESCE(ac.recorded_count, 0)::int AS "recordedCount",
          COALESCE(rc.expected_count, 0)::int AS "expectedCount"
        FROM recent_sessions rs
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE att.status = 'present')::int AS present_count,
            COUNT(*) FILTER (WHERE att.status = 'absent')::int AS absent_count,
            COUNT(*) FILTER (WHERE att.status = 'late')::int AS late_count,
            COUNT(*) FILTER (WHERE att.status = 'excused')::int AS excused_count,
            COUNT(*)::int AS recorded_count
          FROM ${databaseTables.attendance} att
          WHERE att.attendance_session_id = rs.id
        ) ac ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS expected_count
          FROM ${databaseTables.studentAcademicEnrollments} sae
          JOIN ${databaseTables.students} st ON st.id = sae.student_id
          WHERE sae.class_id = rs.class_id
            AND sae.academic_year_id = rs.academic_year_id
            AND st.status = 'active'
        ) rc ON true
        ORDER BY rs.session_date DESC, rs.period_no DESC, rs.id DESC
      `,
      [teacherId, academicYearId, semesterId, limit, academicYearName, semesterName]
    );

    return result.rows;
  }

  async listRecentTeacherAssessments(
    teacherId: string,
    academicYearId: string,
    semesterId: string,
    limit: number,
    queryable: Queryable = db
  ): Promise<RecentAssessmentRow[]> {
    const result = await queryable.query<RecentAssessmentRow>(
      `
        WITH recent_assessments AS (
          SELECT
            a.id,
            a.assessment_type_id,
            a.class_id,
            a.subject_id,
            a.academic_year_id,
            a.title,
            a.max_score,
            a.assessment_date
          FROM ${databaseTables.assessments} a
          WHERE a.teacher_id = $1
            AND a.academic_year_id = $2
            AND a.semester_id = $3
          ORDER BY a.assessment_date DESC, a.id DESC
          LIMIT $4
        ),
        recent_classes AS (
          SELECT DISTINCT
            ra.class_id,
            ra.academic_year_id
          FROM recent_assessments ra
        ),
        roster_counts AS (
          SELECT
            sae.class_id,
            sae.academic_year_id,
            COUNT(*)::int AS expected_count
          FROM ${databaseTables.studentAcademicEnrollments} sae
          JOIN ${databaseTables.students} st ON st.id = sae.student_id
          JOIN recent_classes rc
            ON rc.class_id = sae.class_id
           AND rc.academic_year_id = sae.academic_year_id
          WHERE st.status = 'active'
          GROUP BY sae.class_id, sae.academic_year_id
        ),
        assessment_scores AS (
          SELECT
            ra.id AS assessment_id,
            COUNT(sa.id)::int AS graded_count,
            ROUND(AVG(sa.score), 2) AS average_score,
            ROUND(AVG((sa.score / NULLIF(ra.max_score, 0)) * 100), 2) AS average_percentage
          FROM recent_assessments ra
          LEFT JOIN ${databaseTables.studentAssessments} sa ON sa.assessment_id = ra.id
          GROUP BY ra.id
        )
        SELECT
          ra.id,
          at.id AS "assessmentTypeId",
          at.code AS "assessmentTypeCode",
          at.name AS "assessmentTypeName",
          c.id AS "classId",
          c.class_name AS "className",
          c.section,
          gl.id AS "gradeLevelId",
          gl.name AS "gradeLevelName",
          subj.id AS "subjectId",
          subj.name AS "subjectName",
          subj.code AS "subjectCode",
          ra.title,
          ra.assessment_date AS "assessmentDate",
          COALESCE(ascore.graded_count, 0)::int AS "gradedCount",
          COALESCE(rc.expected_count, 0)::int AS "expectedCount",
          ascore.average_score AS "averageScore",
          ascore.average_percentage AS "averagePercentage"
        FROM recent_assessments ra
        JOIN ${databaseTables.assessmentTypes} at ON at.id = ra.assessment_type_id
        JOIN ${databaseTables.classes} c ON c.id = ra.class_id
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
        JOIN ${databaseTables.subjects} subj ON subj.id = ra.subject_id
        LEFT JOIN assessment_scores ascore ON ascore.assessment_id = ra.id
        LEFT JOIN roster_counts rc
          ON rc.class_id = ra.class_id
         AND rc.academic_year_id = ra.academic_year_id
        ORDER BY ra.assessment_date DESC, ra.id DESC
      `,
      [teacherId, academicYearId, semesterId, limit]
    );

    return result.rows;
  }

  async listRecentTeacherBehaviorRecords(
    teacherId: string,
    academicYearId: string,
    semesterId: string,
    limit: number,
    queryable: Queryable = db
  ): Promise<RecentBehaviorRecordRow[]> {
    const result = await queryable.query<RecentBehaviorRecordRow>(
      `
        ${recentBehaviorRecordReadSelect}
        WHERE br.teacher_id = $1
          AND br.academic_year_id = $2
          AND br.semester_id = $3
        ORDER BY br.behavior_date DESC, br.created_at DESC, br.id DESC
        LIMIT $4
      `,
      [teacherId, academicYearId, semesterId, limit]
    );

    return result.rows;
  }

  async findAdminDashboardSummary(
    queryable: Queryable = db
  ): Promise<AdminDashboardSummaryRow | null> {
    const result = await queryable.query<AdminDashboardSummaryRow>(
      `
        SELECT
          total_active_users AS "totalActiveUsers",
          total_active_students AS "totalActiveStudents",
          total_teachers AS "totalTeachers",
          total_supervisors AS "totalSupervisors",
          total_drivers AS "totalDrivers",
          total_active_classes AS "totalActiveClasses",
          total_active_routes AS "totalActiveRoutes",
          total_active_buses AS "totalActiveBuses",
          total_active_trips AS "totalActiveTrips"
        FROM ${databaseViews.adminDashboardSummary}
        LIMIT 1
      `
    );

    return mapSingleRow(result.rows);
  }

  async listRecentStudents(
    limit: number,
    queryable: Queryable = db
  ): Promise<RecentStudentRow[]> {
    const result = await queryable.query<RecentStudentRow>(
      `
        SELECT
          sp.student_id AS "studentId",
          sp.academic_no AS "academicNo",
          sp.student_name AS "fullName",
          sp.student_status AS status,
          sp.class_id AS "classId",
          sp.class_name AS "className",
          sp.section,
          sp.grade_level_id AS "gradeLevelId",
          sp.grade_level_name AS "gradeLevelName",
          sp.academic_year_id AS "academicYearId",
          sp.academic_year_name AS "academicYearName",
          st.created_at AS "createdAt"
        FROM ${databaseTables.students} st
        JOIN ${databaseViews.studentProfiles} sp ON sp.student_id = st.id
        ORDER BY st.created_at DESC, st.id DESC
        LIMIT $1
      `,
      [limit]
    );

    return result.rows;
  }

  async listRecentAnnouncements(
    limit: number,
    queryable: Queryable = db
  ): Promise<AnnouncementRow[]> {
    const result = await queryable.query<AnnouncementRow>(
      `
        SELECT
          announcement_id AS id,
          title,
          content,
          target_role AS "targetRole",
          published_at AS "publishedAt",
          expires_at AS "expiresAt",
          created_by AS "createdBy",
          created_by_name AS "createdByName"
        FROM ${databaseViews.vwAnnouncementDetails}
        ORDER BY published_at DESC, announcement_id DESC
        LIMIT $1
      `,
      [limit]
    );

    return result.rows;
  }

  async listActiveTrips(
    scope: {
      driverId?: string;
    } = {},
    limit?: number,
    queryable: Queryable = db
  ): Promise<ActiveTripLiveStatusRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (scope.driverId) {
      values.push(scope.driverId);
      conditions.push(`driver_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitClause =
      typeof limit === "number"
        ? (() => {
            values.push(limit);
            return `LIMIT $${values.length}`;
          })()
        : "";

    const result = await queryable.query<ActiveTripLiveStatusRow>(
      `
        SELECT
          trip_id AS "tripId",
          trip_date AS "tripDate",
          trip_type AS "tripType",
          trip_status AS "tripStatus",
          bus_id AS "busId",
          plate_number AS "plateNumber",
          driver_id AS "driverId",
          driver_name AS "driverName",
          route_id AS "routeId",
          route_name AS "routeName",
          latitude,
          longitude,
          last_location_at AS "lastLocationAt"
        FROM ${databaseViews.activeTripLiveStatus}
        ${whereClause}
        ORDER BY trip_date DESC, trip_id DESC
        ${limitClause}
      `,
      values
    );

    return result.rows;
  }

  async listLatestTripEventsByTripIds(
    tripIds: string[],
    limitPerTrip: number,
    queryable: Queryable = db
  ): Promise<TripStudentEventRow[]> {
    if (tripIds.length === 0) {
      return [];
    }

    const result = await queryable.query<TripStudentEventRow>(
      `
        WITH ranked_events AS (
          SELECT
            trip_student_event_id AS "tripStudentEventId",
            trip_id AS "tripId",
            trip_date AS "tripDate",
            trip_type AS "tripType",
            trip_status AS "tripStatus",
            student_id AS "studentId",
            academic_no AS "academicNo",
            student_name AS "studentName",
            event_type AS "eventType",
            event_time AS "eventTime",
            stop_id AS "stopId",
            stop_name AS "stopName",
            notes,
            ROW_NUMBER() OVER (
              PARTITION BY trip_id
              ORDER BY event_time DESC, trip_student_event_id DESC
            ) AS row_number
          FROM ${databaseViews.tripStudentEventDetails}
          WHERE trip_id = ANY($1::bigint[])
        )
        SELECT
          "tripStudentEventId",
          "tripId",
          "tripDate",
          "tripType",
          "tripStatus",
          "studentId",
          "academicNo",
          "studentName",
          "eventType",
          "eventTime",
          "stopId",
          "stopName",
          notes
        FROM ranked_events
        WHERE row_number <= $2
        ORDER BY "tripId" ASC, "eventTime" DESC, "tripStudentEventId" DESC
      `,
      [tripIds, limitPerTrip]
    );

    return result.rows;
  }
  async listSupervisorAssignments(
    supervisorId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<SupervisorAssignmentRow[]> {
    const result = await queryable.query<SupervisorAssignmentRow>(
      `
        SELECT
          sc.id AS "supervisorClassId",
          c.id AS "classId",
          c.class_name AS "className",
          c.section,
          gl.id AS "gradeLevelId",
          gl.name AS "gradeLevelName",
          ay.id AS "academicYearId",
          ay.name AS "academicYearName",
          sc.created_at AS "createdAt"
        FROM ${databaseTables.supervisorClasses} sc
        JOIN ${databaseTables.classes} c ON c.id = sc.class_id
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
        JOIN ${databaseTables.academicYears} ay ON ay.id = sc.academic_year_id
        WHERE sc.supervisor_id = $1
          AND sc.academic_year_id = $2
        ORDER BY sc.created_at DESC, sc.id DESC
      `,
      [supervisorId, academicYearId]
    );

    return result.rows;
  }

  async listStudentsForSupervisor(
    supervisorId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<ReportingStudentRow[]> {
    const result = await queryable.query<ReportingStudentRow>(
      `
        SELECT
          sp.student_id AS "studentId",
          sp.academic_no AS "academicNo",
          sp.student_name AS "fullName",
          sp.date_of_birth AS "dateOfBirth",
          sp.gender,
          sp.student_status AS status,
          sp.enrollment_date AS "enrollmentDate",
          sp.class_id AS "classId",
          sp.class_name AS "className",
          sp.section,
          sp.grade_level_id AS "gradeLevelId",
          sp.grade_level_name AS "gradeLevelName",
          sp.academic_year_id AS "academicYearId",
          sp.academic_year_name AS "academicYearName"
        FROM ${databaseTables.supervisorClasses} sc
        JOIN ${databaseViews.studentProfiles} sp
          ON sp.class_id = sc.class_id
         AND sp.academic_year_id = sc.academic_year_id
        WHERE sc.supervisor_id = $1
          AND sc.academic_year_id = $2
        ORDER BY sp.student_id ASC, sp.academic_no ASC
      `,
      [supervisorId, academicYearId]
    );

    return result.rows;
  }

  async listRecentSupervisorBehaviorRecords(
    supervisorId: string,
    academicYearId: string,
    semesterId: string,
    limit: number,
    queryable: Queryable = db
  ): Promise<RecentBehaviorRecordRow[]> {
    const result = await queryable.query<RecentBehaviorRecordRow>(
      `
        ${recentBehaviorRecordReadSelect}
        WHERE br.supervisor_id = $1
          AND br.academic_year_id = $2
          AND br.semester_id = $3
        ORDER BY br.behavior_date DESC, br.created_at DESC, br.id DESC
        LIMIT $4
      `,
      [supervisorId, academicYearId, semesterId, limit]
    );

    return result.rows;
  }

  async findActiveStudentTransportAssignmentByStudentId(
    studentId: string,
    queryable: Queryable = db
  ): Promise<ActiveStudentTransportAssignmentRow | null> {
    const result = await queryable.query<ActiveStudentTransportAssignmentRow>(
      `
        SELECT
          assignment_id AS "assignmentId",
          student_id AS "studentId",
          academic_no AS "academicNo",
          student_name AS "studentName",
          route_id AS "routeId",
          route_name AS "routeName",
          stop_id AS "stopId",
          stop_name AS "stopName",
          start_date AS "startDate",
          end_date AS "endDate",
          is_active AS "isActive"
        FROM ${databaseViews.activeStudentBusAssignments}
        WHERE student_id = $1
        LIMIT 1
      `,
      [studentId]
    );

    return mapSingleRow(result.rows);
  }

  async findActiveTripByRouteId(
    routeId: string,
    queryable: Queryable = db
  ): Promise<ActiveTripLiveStatusRow | null> {
    const result = await queryable.query<ActiveTripLiveStatusRow>(
      `
        SELECT
          trip_id AS "tripId",
          trip_date AS "tripDate",
          trip_type AS "tripType",
          trip_status AS "tripStatus",
          bus_id AS "busId",
          plate_number AS "plateNumber",
          driver_id AS "driverId",
          driver_name AS "driverName",
          route_id AS "routeId",
          route_name AS "routeName",
          latitude,
          longitude,
          last_location_at AS "lastLocationAt"
        FROM ${databaseViews.activeTripLiveStatus}
        WHERE route_id = $1
        ORDER BY trip_id DESC
        LIMIT 1
      `,
      [routeId]
    );

    return mapSingleRow(result.rows);
  }

  async listLatestTripEventsByTripIdForStudent(
    tripId: string,
    studentId: string,
    limit: number,
    queryable: Queryable = db
  ): Promise<TripStudentEventRow[]> {
    const result = await queryable.query<TripStudentEventRow>(
      `
        SELECT
          trip_student_event_id AS "tripStudentEventId",
          trip_id AS "tripId",
          trip_date AS "tripDate",
          trip_type AS "tripType",
          trip_status AS "tripStatus",
          student_id AS "studentId",
          academic_no AS "academicNo",
          student_name AS "studentName",
          event_type AS "eventType",
          event_time AS "eventTime",
          stop_id AS "stopId",
          stop_name AS "stopName",
          notes
        FROM ${databaseViews.tripStudentEventDetails}
        WHERE trip_id = $1
          AND student_id = $2
        ORDER BY event_time DESC, trip_student_event_id DESC
        LIMIT $3
      `,
      [tripId, studentId, limit]
    );

    return result.rows;
  }
}


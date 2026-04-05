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

const buildActiveRosterCountLateralSelect = (
  classIdSql: string,
  academicYearIdSql: string,
  outputAlias: string
) => `
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS "expectedCount"
    FROM ${databaseTables.studentAcademicEnrollments} sae
    JOIN ${databaseTables.students} st ON st.id = sae.student_id
    WHERE sae.class_id = ${classIdSql}
      AND sae.academic_year_id = ${academicYearIdSql}
      AND st.status = 'active'
  ) ${outputAlias} ON true
`;

const buildAttendanceCountsLateralSelect = (sessionIdSql: string, outputAlias: string) => `
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE att.status = 'present')::int AS "presentCount",
      COUNT(*) FILTER (WHERE att.status = 'absent')::int AS "absentCount",
      COUNT(*) FILTER (WHERE att.status = 'late')::int AS "lateCount",
      COUNT(*) FILTER (WHERE att.status = 'excused')::int AS "excusedCount",
      COUNT(*)::int AS "recordedCount"
    FROM ${databaseTables.attendance} att
    WHERE att.attendance_session_id = ${sessionIdSql}
  ) ${outputAlias} ON true
`;

const buildAssessmentSummaryLateralSelect = (
  assessmentIdSql: string,
  maxScoreSql: string,
  outputAlias: string
) => `
  LEFT JOIN LATERAL (
    SELECT
      COUNT(sa.id)::int AS "gradedCount",
      ROUND(AVG(sa.score), 2) AS "averageScore",
      ROUND(AVG((sa.score / NULLIF(${maxScoreSql}, 0)) * 100), 2) AS "averagePercentage"
    FROM ${databaseTables.studentAssessments} sa
    WHERE sa.assessment_id = ${assessmentIdSql}
  ) ${outputAlias} ON true
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
    br.teacher_id AS "teacherId",
    tu.full_name AS "teacherFullName",
    br.supervisor_id AS "supervisorId",
    su.full_name AS "supervisorFullName",
    ay.id AS "academicYearId",
    ay.name AS "academicYearName",
    sem.id AS "semesterId",
    sem.name AS "semesterName",
    br.description,
    br.severity,
    br.behavior_date AS "behaviorDate",
    br.created_at AS "createdAt"
  FROM ${databaseTables.behaviorRecords} br
  JOIN ${databaseTables.students} st ON st.id = br.student_id
  JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
  LEFT JOIN ${databaseTables.teachers} t ON t.id = br.teacher_id
  LEFT JOIN ${databaseTables.users} tu ON tu.id = t.user_id
  LEFT JOIN ${databaseTables.supervisors} sp ON sp.id = br.supervisor_id
  LEFT JOIN ${databaseTables.users} su ON su.id = sp.user_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = br.academic_year_id
  JOIN ${databaseTables.semesters} sem ON sem.id = br.semester_id
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

  async listChildrenForParent(
    parentId: string,
    queryable: Queryable = db
  ): Promise<ReportingStudentRow[]> {
    const result = await queryable.query<ReportingStudentRow>(
      `
        SELECT DISTINCT ON (sp.student_id)
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
        ORDER BY sp.student_id, sp.is_primary DESC, sp.created_at ASC
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
    limit: number,
    queryable: Queryable = db
  ): Promise<RecentAttendanceSessionRow[]> {
    const result = await queryable.query<RecentAttendanceSessionRow>(
      `
        SELECT
          ats.id,
          ats.class_id AS "classId",
          c.class_name AS "className",
          c.section,
          ats.subject_id AS "subjectId",
          subj.name AS "subjectName",
          ats.academic_year_id AS "academicYearId",
          ay.name AS "academicYearName",
          ats.semester_id AS "semesterId",
          sem.name AS "semesterName",
          ats.session_date AS "sessionDate",
          ats.period_no AS "periodNo",
          ats.title,
          COALESCE(ac."presentCount", 0)::int AS "presentCount",
          COALESCE(ac."absentCount", 0)::int AS "absentCount",
          COALESCE(ac."lateCount", 0)::int AS "lateCount",
          COALESCE(ac."excusedCount", 0)::int AS "excusedCount",
          COALESCE(ac."recordedCount", 0)::int AS "recordedCount",
          COALESCE(rc."expectedCount", 0)::int AS "expectedCount"
        FROM ${databaseTables.attendanceSessions} ats
        JOIN ${databaseTables.classes} c ON c.id = ats.class_id
        JOIN ${databaseTables.subjects} subj ON subj.id = ats.subject_id
        JOIN ${databaseTables.academicYears} ay ON ay.id = ats.academic_year_id
        JOIN ${databaseTables.semesters} sem ON sem.id = ats.semester_id
        ${buildAttendanceCountsLateralSelect("ats.id", "ac")}
        ${buildActiveRosterCountLateralSelect("ats.class_id", "ats.academic_year_id", "rc")}
        WHERE ats.teacher_id = $1
          AND ats.academic_year_id = $2
          AND ats.semester_id = $3
        ORDER BY ats.session_date DESC, ats.period_no DESC, ats.id DESC
        LIMIT $4
      `,
      [teacherId, academicYearId, semesterId, limit]
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
        SELECT
          a.id,
          at.id AS "assessmentTypeId",
          at.code AS "assessmentTypeCode",
          at.name AS "assessmentTypeName",
          c.id AS "classId",
          c.class_name AS "className",
          c.section,
          c.grade_level_id AS "gradeLevelId",
          gl.name AS "gradeLevelName",
          subj.id AS "subjectId",
          subj.name AS "subjectName",
          subj.code AS "subjectCode",
          t.id AS "teacherId",
          t.user_id AS "teacherUserId",
          tu.full_name AS "teacherFullName",
          tu.email AS "teacherEmail",
          tu.phone AS "teacherPhone",
          a.academic_year_id AS "academicYearId",
          ay.name AS "academicYearName",
          a.semester_id AS "semesterId",
          sem.name AS "semesterName",
          a.title,
          a.description,
          a.max_score AS "maxScore",
          a.weight,
          a.assessment_date AS "assessmentDate",
          a.is_published AS "isPublished",
          a.created_at AS "createdAt",
          a.updated_at AS "updatedAt",
          COALESCE(sa."gradedCount", 0)::int AS "gradedCount",
          COALESCE(rc."expectedCount", 0)::int AS "expectedCount",
          sa."averageScore",
          sa."averagePercentage"
        FROM ${databaseTables.assessments} a
        JOIN ${databaseTables.assessmentTypes} at ON at.id = a.assessment_type_id
        JOIN ${databaseTables.classes} c ON c.id = a.class_id
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
        JOIN ${databaseTables.subjects} subj ON subj.id = a.subject_id
        JOIN ${databaseTables.teachers} t ON t.id = a.teacher_id
        JOIN ${databaseTables.users} tu ON tu.id = t.user_id
        JOIN ${databaseTables.academicYears} ay ON ay.id = a.academic_year_id
        JOIN ${databaseTables.semesters} sem ON sem.id = a.semester_id
        ${buildAssessmentSummaryLateralSelect("a.id", "a.max_score", "sa")}
        ${buildActiveRosterCountLateralSelect("a.class_id", "a.academic_year_id", "rc")}
        WHERE a.teacher_id = $1
          AND a.academic_year_id = $2
          AND a.semester_id = $3
        ORDER BY a.assessment_date DESC, a.id DESC
        LIMIT $4
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
        SELECT DISTINCT ON (sp.student_id)
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
        JOIN ${databaseViews.studentProfiles} sp ON sp.class_id = sc.class_id
        WHERE sc.supervisor_id = $1
          AND sc.academic_year_id = $2
        ORDER BY sp.student_id, sp.academic_no ASC
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

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

const attendanceCountsSelect = `
  SELECT
    attendance_session_id,
    COUNT(*) FILTER (WHERE status = 'present')::int AS "presentCount",
    COUNT(*) FILTER (WHERE status = 'absent')::int AS "absentCount",
    COUNT(*) FILTER (WHERE status = 'late')::int AS "lateCount",
    COUNT(*) FILTER (WHERE status = 'excused')::int AS "excusedCount",
    COUNT(*)::int AS "recordedCount"
  FROM ${databaseTables.attendance}
  GROUP BY attendance_session_id
`;

const attendanceRosterCountsSelect = `
  SELECT
    class_id,
    COUNT(*) FILTER (WHERE student_status = 'active')::int AS "expectedCount"
  FROM ${databaseViews.classStudents}
  GROUP BY class_id
`;

const assessmentSummarySelect = `
  SELECT
    a.id AS assessment_id,
    COUNT(sa.id)::int AS "gradedCount",
    COALESCE(rc."expectedCount", 0)::int AS "expectedCount",
    ROUND(AVG(sa.score), 2) AS "averageScore",
    ROUND(AVG((sa.score / NULLIF(a.max_score, 0)) * 100), 2) AS "averagePercentage"
  FROM ${databaseTables.assessments} a
  LEFT JOIN ${databaseTables.studentAssessments} sa ON sa.assessment_id = a.id
  LEFT JOIN (${attendanceRosterCountsSelect}) rc ON rc.class_id = a.class_id
  GROUP BY a.id, rc."expectedCount"
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
        WHERE student_id = $1
          AND academic_year_id = $2
          AND semester_id = $3
        LIMIT 1
      `,
      [studentId, academicYearId, semesterId]
    );

    return mapSingleRow(result.rows);
  }

  async listStudentAssessmentSummaries(
    studentId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<StudentAssessmentSummaryRow[]> {
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
        WHERE student_id = $1
          AND academic_year_id = $2
          AND semester_id = $3
        ORDER BY subject_name ASC, subject_id ASC
      `,
      [studentId, academicYearId, semesterId]
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
        WHERE student_id = $1
          AND academic_year_id = $2
          AND semester_id = $3
        LIMIT 1
      `,
      [studentId, academicYearId, semesterId]
    );

    return mapSingleRow(result.rows);
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
        LEFT JOIN (${attendanceCountsSelect}) ac
          ON ac.attendance_session_id = ats.id
        LEFT JOIN (${attendanceRosterCountsSelect}) rc
          ON rc.class_id = ats.class_id
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
          ad.assessment_id AS id,
          a.assessment_type_id AS "assessmentTypeId",
          ad.assessment_type_code AS "assessmentTypeCode",
          ad.assessment_type_name AS "assessmentTypeName",
          ad.class_id AS "classId",
          ad.class_name AS "className",
          ad.section,
          c.grade_level_id AS "gradeLevelId",
          gl.name AS "gradeLevelName",
          ad.subject_id AS "subjectId",
          ad.subject_name AS "subjectName",
          subj.code AS "subjectCode",
          ad.teacher_id AS "teacherId",
          t.user_id AS "teacherUserId",
          ad.teacher_name AS "teacherFullName",
          tu.email AS "teacherEmail",
          tu.phone AS "teacherPhone",
          ad.academic_year_id AS "academicYearId",
          ad.academic_year_name AS "academicYearName",
          ad.semester_id AS "semesterId",
          ad.semester_name AS "semesterName",
          ad.title,
          ad.description,
          ad.max_score AS "maxScore",
          ad.weight,
          ad.assessment_date AS "assessmentDate",
          ad.is_published AS "isPublished",
          a.created_at AS "createdAt",
          a.updated_at AS "updatedAt",
          COALESCE(sa."gradedCount", 0)::int AS "gradedCount",
          COALESCE(sa."expectedCount", 0)::int AS "expectedCount",
          sa."averageScore",
          sa."averagePercentage"
        FROM ${databaseViews.assessmentDetails} ad
        JOIN ${databaseTables.assessments} a ON a.id = ad.assessment_id
        JOIN ${databaseTables.classes} c ON c.id = ad.class_id
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
        JOIN ${databaseTables.subjects} subj ON subj.id = ad.subject_id
        JOIN ${databaseTables.teachers} t ON t.id = ad.teacher_id
        JOIN ${databaseTables.users} tu ON tu.id = t.user_id
        LEFT JOIN (${assessmentSummarySelect}) sa ON sa.assessment_id = ad.assessment_id
        WHERE ad.teacher_id = $1
          AND ad.academic_year_id = $2
          AND ad.semester_id = $3
        ORDER BY ad.assessment_date DESC, ad.assessment_id DESC
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
        SELECT
          vd.behavior_record_id AS id,
          vd.student_id AS "studentId",
          vd.academic_no AS "academicNo",
          vd.student_name AS "studentFullName",
          vd.behavior_category_id AS "behaviorCategoryId",
          vd.behavior_code AS "behaviorCode",
          vd.behavior_name AS "behaviorName",
          vd.behavior_type AS "behaviorType",
          vd.teacher_id AS "teacherId",
          vd.teacher_name AS "teacherFullName",
          vd.supervisor_id AS "supervisorId",
          vd.supervisor_name AS "supervisorFullName",
          vd.academic_year_id AS "academicYearId",
          vd.academic_year_name AS "academicYearName",
          vd.semester_id AS "semesterId",
          vd.semester_name AS "semesterName",
          vd.description,
          vd.severity,
          vd.behavior_date AS "behaviorDate",
          br.created_at AS "createdAt"
        FROM ${databaseViews.behaviorDetails} vd
        JOIN ${databaseTables.behaviorRecords} br ON br.id = vd.behavior_record_id
        WHERE vd.teacher_id = $1
          AND vd.academic_year_id = $2
          AND vd.semester_id = $3
        ORDER BY vd.behavior_date DESC, br.created_at DESC, vd.behavior_record_id DESC
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
        SELECT
          vd.behavior_record_id AS id,
          vd.student_id AS "studentId",
          vd.academic_no AS "academicNo",
          vd.student_name AS "studentFullName",
          vd.behavior_category_id AS "behaviorCategoryId",
          vd.behavior_code AS "behaviorCode",
          vd.behavior_name AS "behaviorName",
          vd.behavior_type AS "behaviorType",
          vd.teacher_id AS "teacherId",
          vd.teacher_name AS "teacherFullName",
          vd.supervisor_id AS "supervisorId",
          vd.supervisor_name AS "supervisorFullName",
          vd.academic_year_id AS "academicYearId",
          vd.academic_year_name AS "academicYearName",
          vd.semester_id AS "semesterId",
          vd.semester_name AS "semesterName",
          vd.description,
          vd.severity,
          vd.behavior_date AS "behaviorDate",
          br.created_at AS "createdAt"
        FROM ${databaseViews.behaviorDetails} vd
        JOIN ${databaseTables.behaviorRecords} br ON br.id = vd.behavior_record_id
        WHERE vd.supervisor_id = $1
          AND vd.academic_year_id = $2
          AND vd.semester_id = $3
        ORDER BY vd.behavior_date DESC, br.created_at DESC, vd.behavior_record_id DESC
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

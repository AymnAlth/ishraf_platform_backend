import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { databaseTables } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  AcademicYearRow,
  AcademicYearUpdateInput,
  AcademicYearWriteInput,
  ClassRow,
  ClassWriteInput,
  GradeLevelRow,
  GradeLevelWriteInput,
  SemesterRow,
  SemesterUpdateInput,
  SemesterWriteInput,
  SubjectOfferingFilters,
  SubjectOfferingRow,
  SubjectOfferingUpdateInput,
  SubjectOfferingWriteInput,
  SubjectRow,
  SubjectWriteInput,
  SupervisorAssignmentRow,
  SupervisorAssignmentWriteInput,
  SupervisorSummaryRow,
  TeacherAssignmentRow,
  TeacherAssignmentWriteInput,
  TeacherSummaryRow
} from "../types/academic-structure.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const buildAssignments = (updates: Record<string, unknown>, startIndex = 2) => {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  return {
    assignments: entries.map(([column], index) => `${column} = $${index + startIndex}`),
    values: entries.map(([, value]) => value)
  };
};

const academicYearSelect = `
  SELECT
    id,
    name,
    start_date AS "startDate",
    end_date AS "endDate",
    is_active AS "isActive",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM ${databaseTables.academicYears}
`;

const semesterSelect = `
  SELECT
    s.id,
    s.academic_year_id AS "academicYearId",
    ay.name AS "academicYearName",
    s.name,
    s.start_date AS "startDate",
    s.end_date AS "endDate",
    s.is_active AS "isActive",
    s.created_at AS "createdAt",
    s.updated_at AS "updatedAt"
  FROM ${databaseTables.semesters} s
  JOIN ${databaseTables.academicYears} ay ON ay.id = s.academic_year_id
`;

const gradeLevelSelect = `
  SELECT
    id,
    name,
    level_order AS "levelOrder",
    created_at AS "createdAt"
  FROM ${databaseTables.gradeLevels}
`;

const classSelect = `
  SELECT
    c.id,
    c.class_name AS "className",
    c.section,
    c.capacity,
    c.is_active AS "isActive",
    c.academic_year_id AS "academicYearId",
    ay.name AS "academicYearName",
    c.grade_level_id AS "gradeLevelId",
    gl.name AS "gradeLevelName",
    gl.level_order AS "gradeLevelOrder",
    c.created_at AS "createdAt",
    c.updated_at AS "updatedAt"
  FROM ${databaseTables.classes} c
  JOIN ${databaseTables.academicYears} ay ON ay.id = c.academic_year_id
  JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
`;

const subjectSelect = `
  SELECT
    s.id,
    s.name,
    s.code,
    s.is_active AS "isActive",
    s.grade_level_id AS "gradeLevelId",
    gl.name AS "gradeLevelName",
    gl.level_order AS "gradeLevelOrder",
    s.created_at AS "createdAt",
    s.updated_at AS "updatedAt"
  FROM ${databaseTables.subjects} s
  JOIN ${databaseTables.gradeLevels} gl ON gl.id = s.grade_level_id
`;

const subjectOfferingSelect = `
  SELECT
    so.id,
    so.is_active AS "isActive",
    so.subject_id AS "subjectId",
    subj.name AS "subjectName",
    subj.code AS "subjectCode",
    subj.is_active AS "subjectIsActive",
    gl.id AS "subjectGradeLevelId",
    gl.name AS "subjectGradeLevelName",
    gl.level_order AS "subjectGradeLevelOrder",
    so.semester_id AS "semesterId",
    sem.name AS "semesterName",
    sem.start_date AS "semesterStartDate",
    sem.end_date AS "semesterEndDate",
    sem.is_active AS "semesterIsActive",
    ay.id AS "academicYearId",
    ay.name AS "academicYearName",
    so.created_at AS "createdAt",
    so.updated_at AS "updatedAt"
  FROM ${databaseTables.subjectOfferings} so
  JOIN ${databaseTables.subjects} subj ON subj.id = so.subject_id
  JOIN ${databaseTables.gradeLevels} gl ON gl.id = subj.grade_level_id
  JOIN ${databaseTables.semesters} sem ON sem.id = so.semester_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = sem.academic_year_id
`;

const teacherAssignmentSelect = `
  SELECT
    tc.id,
    tc.academic_year_id AS "academicYearId",
    ay.name AS "academicYearName",
    tc.class_id AS "classId",
    c.class_name AS "className",
    c.section AS "classSection",
    c.is_active AS "classIsActive",
    c.academic_year_id AS "classAcademicYearId",
    c.grade_level_id AS "classGradeLevelId",
    gl.name AS "classGradeLevelName",
    gl.level_order AS "classGradeLevelOrder",
    tc.subject_id AS "subjectId",
    s.name AS "subjectName",
    s.code AS "subjectCode",
    s.is_active AS "subjectIsActive",
    s.grade_level_id AS "subjectGradeLevelId",
    tc.teacher_id AS "teacherId",
    t.user_id AS "teacherUserId",
    u.full_name AS "teacherFullName",
    u.email AS "teacherEmail",
    u.phone AS "teacherPhone",
    tc.created_at AS "createdAt"
  FROM ${databaseTables.teacherClasses} tc
  JOIN ${databaseTables.academicYears} ay ON ay.id = tc.academic_year_id
  JOIN ${databaseTables.classes} c ON c.id = tc.class_id
  JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
  JOIN ${databaseTables.subjects} s ON s.id = tc.subject_id
  JOIN ${databaseTables.teachers} t ON t.id = tc.teacher_id
  JOIN ${databaseTables.users} u ON u.id = t.user_id
`;

const supervisorAssignmentSelect = `
  SELECT
    sc.id,
    sc.academic_year_id AS "academicYearId",
    ay.name AS "academicYearName",
    sc.class_id AS "classId",
    c.class_name AS "className",
    c.section AS "classSection",
    c.is_active AS "classIsActive",
    c.academic_year_id AS "classAcademicYearId",
    c.grade_level_id AS "classGradeLevelId",
    gl.name AS "classGradeLevelName",
    gl.level_order AS "classGradeLevelOrder",
    sc.supervisor_id AS "supervisorId",
    sv.user_id AS "supervisorUserId",
    u.full_name AS "supervisorFullName",
    u.email AS "supervisorEmail",
    u.phone AS "supervisorPhone",
    sc.created_at AS "createdAt"
  FROM ${databaseTables.supervisorClasses} sc
  JOIN ${databaseTables.academicYears} ay ON ay.id = sc.academic_year_id
  JOIN ${databaseTables.classes} c ON c.id = sc.class_id
  JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
  JOIN ${databaseTables.supervisors} sv ON sv.id = sc.supervisor_id
  JOIN ${databaseTables.users} u ON u.id = sv.user_id
`;

export class AcademicStructureRepository {
  async listAcademicYears(queryable: Queryable = db): Promise<AcademicYearRow[]> {
    const result = await queryable.query<AcademicYearRow>(
      `
        ${academicYearSelect}
        ORDER BY start_date DESC, id DESC
      `
    );

    return result.rows;
  }

  async findAcademicYearById(
    id: string,
    queryable: Queryable = db
  ): Promise<AcademicYearRow | null> {
    const result = await queryable.query<AcademicYearRow>(
      `
        ${academicYearSelect}
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }

  async createAcademicYear(
    input: AcademicYearWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.academicYears} (
          name,
          start_date,
          end_date,
          is_active
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [input.name, input.startDate, input.endDate, input.isActive]
    );

    return result.rows[0].id;
  }

  async updateAcademicYear(
    id: string,
    input: AcademicYearUpdateInput,
    queryable: Queryable = db
  ): Promise<void> {
    const { assignments, values } = buildAssignments({
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      is_active: input.isActive
    });

    if (assignments.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.academicYears}
        SET ${assignments.join(", ")}
        WHERE id = $1
      `,
      [id, ...values]
    );
  }

  async deactivateAllAcademicYears(queryable: Queryable = db): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.academicYears}
        SET is_active = false
        WHERE is_active = true
      `
    );
  }

  async listSemestersByAcademicYear(
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<SemesterRow[]> {
    const result = await queryable.query<SemesterRow>(
      `
        ${semesterSelect}
        WHERE s.academic_year_id = $1
        ORDER BY s.start_date ASC, s.id ASC
      `,
      [academicYearId]
    );

    return result.rows;
  }

  async findSemesterById(
    id: string,
    queryable: Queryable = db
  ): Promise<SemesterRow | null> {
    const result = await queryable.query<SemesterRow>(
      `
        ${semesterSelect}
        WHERE s.id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }

  async createSemester(
    input: SemesterWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.semesters} (
          academic_year_id,
          name,
          start_date,
          end_date,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [input.academicYearId, input.name, input.startDate, input.endDate, input.isActive]
    );

    return result.rows[0].id;
  }

  async updateSemester(
    id: string,
    input: SemesterUpdateInput,
    queryable: Queryable = db
  ): Promise<void> {
    const { assignments, values } = buildAssignments({
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      is_active: input.isActive
    });

    if (assignments.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.semesters}
        SET ${assignments.join(", ")}
        WHERE id = $1
      `,
      [id, ...values]
    );
  }

  async listGradeLevels(queryable: Queryable = db): Promise<GradeLevelRow[]> {
    const result = await queryable.query<GradeLevelRow>(
      `
        ${gradeLevelSelect}
        ORDER BY level_order ASC, id ASC
      `
    );

    return result.rows;
  }

  async findGradeLevelById(
    id: string,
    queryable: Queryable = db
  ): Promise<GradeLevelRow | null> {
    const result = await queryable.query<GradeLevelRow>(
      `
        ${gradeLevelSelect}
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }

  async createGradeLevel(
    input: GradeLevelWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.gradeLevels} (
          name,
          level_order
        )
        VALUES ($1, $2)
        RETURNING id
      `,
      [input.name, input.levelOrder]
    );

    return result.rows[0].id;
  }

  async listClasses(queryable: Queryable = db): Promise<ClassRow[]> {
    const result = await queryable.query<ClassRow>(
      `
        ${classSelect}
        ORDER BY c.academic_year_id DESC, gl.level_order ASC, c.class_name ASC, c.section ASC
      `
    );

    return result.rows;
  }

  async findClassById(id: string, queryable: Queryable = db): Promise<ClassRow | null> {
    const result = await queryable.query<ClassRow>(
      `
        ${classSelect}
        WHERE c.id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }

  async createClass(input: ClassWriteInput, queryable: Queryable = db): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.classes} (
          grade_level_id,
          academic_year_id,
          class_name,
          section,
          capacity,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        input.gradeLevelId,
        input.academicYearId,
        input.className,
        input.section,
        input.capacity,
        input.isActive
      ]
    );

    return result.rows[0].id;
  }

  async listSubjects(queryable: Queryable = db): Promise<SubjectRow[]> {
    const result = await queryable.query<SubjectRow>(
      `
        ${subjectSelect}
        ORDER BY gl.level_order ASC, s.name ASC, s.id ASC
      `
    );

    return result.rows;
  }

  async findSubjectById(
    id: string,
    queryable: Queryable = db
  ): Promise<SubjectRow | null> {
    const result = await queryable.query<SubjectRow>(
      `
        ${subjectSelect}
        WHERE s.id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }

  async createSubject(
    input: SubjectWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.subjects} (
          name,
          grade_level_id,
          code,
          is_active
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [input.name, input.gradeLevelId, input.code, input.isActive]
    );

    return result.rows[0].id;
  }

  async listSubjectOfferings(
    filters: SubjectOfferingFilters = {},
    queryable: Queryable = db
  ): Promise<SubjectOfferingRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const addCondition = (template: string, value: unknown): void => {
      values.push(value);
      conditions.push(template.replace("?", `$${values.length}`));
    };

    if (filters.academicYearId) {
      addCondition("sem.academic_year_id = ?", filters.academicYearId);
    }

    if (filters.semesterId) {
      addCondition("so.semester_id = ?", filters.semesterId);
    }

    if (filters.gradeLevelId) {
      addCondition("subj.grade_level_id = ?", filters.gradeLevelId);
    }

    if (filters.subjectId) {
      addCondition("so.subject_id = ?", filters.subjectId);
    }

    if (filters.isActive !== undefined) {
      addCondition("so.is_active = ?", filters.isActive);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await queryable.query<SubjectOfferingRow>(
      `
        ${subjectOfferingSelect}
        ${whereClause}
        ORDER BY
          ay.start_date DESC,
          gl.level_order ASC,
          subj.name ASC,
          sem.start_date ASC,
          so.id ASC
      `,
      values
    );

    return result.rows;
  }

  async findSubjectOfferingById(
    id: string,
    queryable: Queryable = db
  ): Promise<SubjectOfferingRow | null> {
    const result = await queryable.query<SubjectOfferingRow>(
      `
        ${subjectOfferingSelect}
        WHERE so.id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }

  async findSubjectOfferingBySubjectAndSemester(
    subjectId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<SubjectOfferingRow | null> {
    const result = await queryable.query<SubjectOfferingRow>(
      `
        ${subjectOfferingSelect}
        WHERE so.subject_id = $1
          AND so.semester_id = $2
        LIMIT 1
      `,
      [subjectId, semesterId]
    );

    return mapSingleRow(result.rows);
  }

  async createSubjectOffering(
    input: SubjectOfferingWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.subjectOfferings} (
          subject_id,
          semester_id,
          is_active
        )
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [input.subjectId, input.semesterId, input.isActive]
    );

    return result.rows[0].id;
  }

  async updateSubjectOffering(
    id: string,
    input: SubjectOfferingUpdateInput,
    queryable: Queryable = db
  ): Promise<void> {
    const { assignments, values } = buildAssignments({
      is_active: input.isActive
    });

    if (assignments.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.subjectOfferings}
        SET ${assignments.join(", ")}
        WHERE id = $1
      `,
      [id, ...values]
    );
  }

  async findTeacherById(
    id: string,
    queryable: Queryable = db
  ): Promise<TeacherSummaryRow | null> {
    const result = await queryable.query<TeacherSummaryRow>(
      `
        SELECT
          t.id AS "teacherId",
          t.user_id AS "teacherUserId",
          u.full_name AS "teacherFullName",
          u.email AS "teacherEmail",
          u.phone AS "teacherPhone"
        FROM ${databaseTables.teachers} t
        JOIN ${databaseTables.users} u ON u.id = t.user_id
        WHERE t.id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }

  async findSupervisorById(
    id: string,
    queryable: Queryable = db
  ): Promise<SupervisorSummaryRow | null> {
    const result = await queryable.query<SupervisorSummaryRow>(
      `
        SELECT
          s.id AS "supervisorId",
          s.user_id AS "supervisorUserId",
          u.full_name AS "supervisorFullName",
          u.email AS "supervisorEmail",
          u.phone AS "supervisorPhone"
        FROM ${databaseTables.supervisors} s
        JOIN ${databaseTables.users} u ON u.id = s.user_id
        WHERE s.id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }

  async createTeacherAssignment(
    input: TeacherAssignmentWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.teacherClasses} (
          teacher_id,
          class_id,
          subject_id,
          academic_year_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [input.teacherId, input.classId, input.subjectId, input.academicYearId]
    );

    return result.rows[0].id;
  }

  async listTeacherAssignments(
    queryable: Queryable = db
  ): Promise<TeacherAssignmentRow[]> {
    const result = await queryable.query<TeacherAssignmentRow>(
      `
        ${teacherAssignmentSelect}
        ORDER BY tc.created_at DESC, tc.id DESC
      `
    );

    return result.rows;
  }

  async findTeacherAssignmentById(
    id: string,
    queryable: Queryable = db
  ): Promise<TeacherAssignmentRow | null> {
    const result = await queryable.query<TeacherAssignmentRow>(
      `
        ${teacherAssignmentSelect}
        WHERE tc.id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }

  async createSupervisorAssignment(
    input: SupervisorAssignmentWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.supervisorClasses} (
          supervisor_id,
          class_id,
          academic_year_id
        )
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [input.supervisorId, input.classId, input.academicYearId]
    );

    return result.rows[0].id;
  }

  async listSupervisorAssignments(
    queryable: Queryable = db
  ): Promise<SupervisorAssignmentRow[]> {
    const result = await queryable.query<SupervisorAssignmentRow>(
      `
        ${supervisorAssignmentSelect}
        ORDER BY sc.created_at DESC, sc.id DESC
      `
    );

    return result.rows;
  }

  async findSupervisorAssignmentById(
    id: string,
    queryable: Queryable = db
  ): Promise<SupervisorAssignmentRow | null> {
    const result = await queryable.query<SupervisorAssignmentRow>(
      `
        ${supervisorAssignmentSelect}
        WHERE sc.id = $1
        LIMIT 1
      `,
      [id]
    );

    return mapSingleRow(result.rows);
  }
}

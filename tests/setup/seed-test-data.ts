import type { Pool } from "pg";

import { hashPassword } from "../../src/common/utils/password.util";
import { AUTH_TEST_FIXTURES } from "../fixtures/auth.fixture";

type SeedQueryable = Pick<Pool, "query">;

export const SEEDED_DRIVER = {
  id: "1004",
  fullName: "Ali Driver",
  email: "driver@example.com",
  phone: "01000000004",
  password: "Driver123!",
  role: "driver" as const,
  profile: {
    licenseNumber: "DRV-0001",
    driverStatus: "active" as const
  }
};

export const SEEDED_SUPERVISOR = {
  id: "1005",
  fullName: "Mona Supervisor",
  email: "supervisor@example.com",
  phone: "01000000005",
  password: "Supervisor123!",
  role: "supervisor" as const,
  profile: {
    department: "Student Affairs"
  }
};

export const SEEDED_STUDENTS = [
  {
    academicNo: "STU-1001",
    fullName: "Student One",
    dateOfBirth: "2016-09-01",
    gender: "male",
    classId: 1,
    status: "active",
    enrollmentDate: "2025-09-01"
  },
  {
    academicNo: "STU-1002",
    fullName: "Student Two",
    dateOfBirth: "2016-10-15",
    gender: "female",
    classId: 1,
    status: "active",
    enrollmentDate: "2025-09-01"
  },
  {
    academicNo: "STU-1003",
    fullName: "Student Three",
    dateOfBirth: "2015-11-20",
    gender: "male",
    classId: 2,
    status: "active",
    enrollmentDate: "2025-09-01"
  }
] as const;

export const seedUsers = async (queryable: SeedQueryable): Promise<void> => {
  const activeEmailPasswordHash = await hashPassword(AUTH_TEST_FIXTURES.activeEmailUser.password);
  const activePhonePasswordHash = await hashPassword(AUTH_TEST_FIXTURES.activePhoneUser.password);
  const inactivePasswordHash = await hashPassword(AUTH_TEST_FIXTURES.inactiveUser.password);
  const driverPasswordHash = await hashPassword(SEEDED_DRIVER.password);
  const supervisorPasswordHash = await hashPassword(SEEDED_SUPERVISOR.password);

  await queryable.query(
    `
      INSERT INTO users (
        id,
        full_name,
        email,
        phone,
        password_hash,
        role,
        is_active
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, true),
        ($7, $8, $9, $10, $11, $12, true),
        ($13, $14, $15, $16, $17, $18, false),
        ($19, $20, $21, $22, $23, $24, true),
        ($25, $26, $27, $28, $29, $30, true)
    `,
    [
      AUTH_TEST_FIXTURES.activeEmailUser.id,
      AUTH_TEST_FIXTURES.activeEmailUser.fullName,
      AUTH_TEST_FIXTURES.activeEmailUser.email,
      AUTH_TEST_FIXTURES.activeEmailUser.phone,
      activeEmailPasswordHash,
      AUTH_TEST_FIXTURES.activeEmailUser.role,
      AUTH_TEST_FIXTURES.activePhoneUser.id,
      AUTH_TEST_FIXTURES.activePhoneUser.fullName,
      AUTH_TEST_FIXTURES.activePhoneUser.email,
      AUTH_TEST_FIXTURES.activePhoneUser.phone,
      activePhonePasswordHash,
      AUTH_TEST_FIXTURES.activePhoneUser.role,
      AUTH_TEST_FIXTURES.inactiveUser.id,
      AUTH_TEST_FIXTURES.inactiveUser.fullName,
      AUTH_TEST_FIXTURES.inactiveUser.email,
      AUTH_TEST_FIXTURES.inactiveUser.phone,
      inactivePasswordHash,
      AUTH_TEST_FIXTURES.inactiveUser.role,
      SEEDED_DRIVER.id,
      SEEDED_DRIVER.fullName,
      SEEDED_DRIVER.email,
      SEEDED_DRIVER.phone,
      driverPasswordHash,
      SEEDED_DRIVER.role,
      SEEDED_SUPERVISOR.id,
      SEEDED_SUPERVISOR.fullName,
      SEEDED_SUPERVISOR.email,
      SEEDED_SUPERVISOR.phone,
      supervisorPasswordHash,
      SEEDED_SUPERVISOR.role
    ]
  );

  await queryable.query(
    `
      SELECT setval(
        pg_get_serial_sequence('users', 'id'),
        (SELECT MAX(id) FROM users),
        true
      )
    `
  );

  await queryable.query(
    `
      INSERT INTO teachers (
        user_id,
        specialization,
        qualification,
        hire_date
      )
      VALUES ($1, $2, $3, $4)
    `,
    [AUTH_TEST_FIXTURES.activePhoneUser.id, "Mathematics", "Bachelor", "2025-09-01"]
  );

  await queryable.query(
    `
      INSERT INTO parents (
        user_id,
        address,
        relation_type
      )
      VALUES ($1, $2, $3)
    `,
    [AUTH_TEST_FIXTURES.inactiveUser.id, "Dhamar", "father"]
  );

  await queryable.query(
    `
      INSERT INTO drivers (
        user_id,
        license_number,
        driver_status
      )
      VALUES ($1, $2, $3)
    `,
    [SEEDED_DRIVER.id, SEEDED_DRIVER.profile.licenseNumber, SEEDED_DRIVER.profile.driverStatus]
  );

  await queryable.query(
    `
      INSERT INTO supervisors (
        user_id,
        department
      )
      VALUES ($1, $2)
    `,
    [SEEDED_SUPERVISOR.id, SEEDED_SUPERVISOR.profile.department]
  );
};

export const seedAcademicStructure = async (queryable: SeedQueryable): Promise<void> => {
  await queryable.query(
    `
      INSERT INTO academic_years (
        name,
        start_date,
        end_date,
        is_active
      )
      VALUES ($1, $2, $3, $4)
    `,
    ["2025-2026", "2025-09-01", "2026-06-30", true]
  );

  await queryable.query(
    `
      INSERT INTO semesters (
        academic_year_id,
        name,
        start_date,
        end_date,
        is_active
      )
      VALUES
        ($1, $2, $3, $4, false),
        ($5, $6, $7, $8, true)
    `,
    [1, "Semester 1", "2025-09-01", "2026-01-31", 1, "Semester 2", "2026-02-01", "2026-06-30"]
  );

  await queryable.query(
    `
      INSERT INTO grade_levels (
        name,
        level_order
      )
      VALUES
        ($1, $2),
        ($3, $4),
        ($5, $6)
    `,
    ["Grade 1", 1, "Grade 2", 2, "Grade 3", 3]
  );

  await queryable.query(
    `
      INSERT INTO classes (
        grade_level_id,
        academic_year_id,
        class_name,
        section,
        capacity,
        is_active
      )
      VALUES
        ($1, $2, $3, $4, $5, true),
        ($6, $7, $8, $9, $10, true),
        ($11, $12, $13, $14, $15, true)
    `,
    [1, 1, "A", "A", 40, 2, 1, "A", "A", 40, 3, 1, "A", "A", 40]
  );

  await queryable.query(
    `
      INSERT INTO subjects (
        name,
        grade_level_id,
        code,
        is_active
      )
      VALUES
        ($1, $2, $3, true),
        ($4, $5, $6, true),
        ($7, $8, $9, true),
        ($10, $11, $12, true),
        ($13, $14, $15, true),
        ($16, $17, $18, true),
        ($19, $20, $21, true),
        ($22, $23, $24, true),
        ($25, $26, $27, true)
    `,
    [
      "Science",
      1,
      "SCI-G1",
      "Arabic",
      1,
      "AR-G1",
      "Mathematics",
      1,
      "MATH-G1",
      "Science",
      2,
      "SCI-G2",
      "Arabic",
      2,
      "AR-G2",
      "Mathematics",
      2,
      "MATH-G2",
      "Science",
      3,
      "SCI-G3",
      "Arabic",
      3,
      "AR-G3",
      "Mathematics",
      3,
      "MATH-G3"
    ]
  );

  await seedSubjectOfferings(queryable);
};

export const seedSubjectOfferings = async (queryable: SeedQueryable): Promise<void> => {
  await queryable.query(
    `
      INSERT INTO subject_offerings (
        subject_id,
        semester_id,
        is_active
      )
      SELECT
        s.id,
        sem.id,
        true
      FROM subjects s
      CROSS JOIN semesters sem
      WHERE sem.academic_year_id = 1
    `
  );
};

export const seedStudents = async (queryable: SeedQueryable): Promise<void> => {
  await queryable.query(
    `
      INSERT INTO students (
        academic_no,
        full_name,
        date_of_birth,
        gender,
        class_id,
        status,
        enrollment_date
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7),
        ($8, $9, $10, $11, $12, $13, $14),
        ($15, $16, $17, $18, $19, $20, $21)
    `,
    [
      SEEDED_STUDENTS[0].academicNo,
      SEEDED_STUDENTS[0].fullName,
      SEEDED_STUDENTS[0].dateOfBirth,
      SEEDED_STUDENTS[0].gender,
      SEEDED_STUDENTS[0].classId,
      SEEDED_STUDENTS[0].status,
      SEEDED_STUDENTS[0].enrollmentDate,
      SEEDED_STUDENTS[1].academicNo,
      SEEDED_STUDENTS[1].fullName,
      SEEDED_STUDENTS[1].dateOfBirth,
      SEEDED_STUDENTS[1].gender,
      SEEDED_STUDENTS[1].classId,
      SEEDED_STUDENTS[1].status,
      SEEDED_STUDENTS[1].enrollmentDate,
      SEEDED_STUDENTS[2].academicNo,
      SEEDED_STUDENTS[2].fullName,
      SEEDED_STUDENTS[2].dateOfBirth,
      SEEDED_STUDENTS[2].gender,
      SEEDED_STUDENTS[2].classId,
      SEEDED_STUDENTS[2].status,
      SEEDED_STUDENTS[2].enrollmentDate
    ]
  );

  await queryable.query(
    `
      INSERT INTO student_parents (
        student_id,
        parent_id,
        relation_type,
        is_primary
      )
      VALUES ($1, $2, $3, $4)
    `,
    [1, 1, "father", true]
  );
};

export const seedAssessmentTypes = async (queryable: SeedQueryable): Promise<void> => {
  await queryable.query(
    `
      INSERT INTO assessment_types (
        code,
        name,
        description,
        is_active
      )
      VALUES
        ($1, $2, $3, true),
        ($4, $5, $6, true),
        ($7, $8, $9, true),
        ($10, $11, $12, true),
        ($13, $14, $15, true),
        ($16, $17, $18, true)
    `,
    [
      "exam",
      "Exam",
      "Formal exams",
      "quiz",
      "Quiz",
      "Short quizzes",
      "homework",
      "Homework",
      "Homework assessments",
      "attendance",
      "Attendance",
      "Attendance-based assessment",
      "behavior",
      "Behavior",
      "Behavioral assessment",
      "participation",
      "Participation",
      "Participation assessment"
    ]
  );
};

export const seedBehaviorCategories = async (queryable: SeedQueryable): Promise<void> => {
  await queryable.query(
    `
      INSERT INTO behavior_categories (
        code,
        name,
        behavior_type,
        default_severity,
        is_active
      )
      VALUES
        ($1, $2, $3, $4, true),
        ($5, $6, $7, $8, true),
        ($9, $10, $11, $12, true),
        ($13, $14, $15, $16, true),
        ($17, $18, $19, $20, true),
        ($21, $22, $23, $24, true),
        ($25, $26, $27, $28, true),
        ($29, $30, $31, $32, true)
    `,
    [
      "respect",
      "Respect",
      "positive",
      1,
      "participation",
      "Participation",
      "positive",
      1,
      "leadership",
      "Leadership",
      "positive",
      2,
      "discipline",
      "Discipline",
      "positive",
      1,
      "lateness",
      "Lateness",
      "negative",
      2,
      "disruption",
      "Disruption",
      "negative",
      3,
      "bullying",
      "Bullying",
      "negative",
      5,
      "absence_misconduct",
      "Absence Misconduct",
      "negative",
      3
    ]
  );
};

export const seedBaseTestData = async (queryable: SeedQueryable): Promise<void> => {
  await seedUsers(queryable);
  await seedAcademicStructure(queryable);
  await seedStudents(queryable);
  await seedAssessmentTypes(queryable);
  await seedBehaviorCategories(queryable);
};

export const createAdditionalParentAccount = async (
  queryable: SeedQueryable,
  overrides: Partial<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    relationType: string;
  }> = {}
): Promise<{
  userId: string;
  parentId: string;
  email: string;
  password: string;
}> => {
  const email = overrides.email ?? "second-parent@example.com";
  const password = overrides.password ?? "ParentTwo123!";
  const passwordHash = await hashPassword(password);

  const userResult = await queryable.query<{ id: string }>(
    `
      INSERT INTO users (
        full_name,
        email,
        phone,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id
    `,
    [overrides.fullName ?? "Second Parent", email, overrides.phone ?? "01000000006", passwordHash, "parent"]
  );

  const parentResult = await queryable.query<{ id: string }>(
    `
      INSERT INTO parents (
        user_id,
        address,
        relation_type
      )
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [userResult.rows[0].id, overrides.address ?? "Sanaa", overrides.relationType ?? "mother"]
  );

  return {
    userId: userResult.rows[0].id,
    parentId: parentResult.rows[0].id,
    email,
    password
  };
};

export const createAdditionalTeacher = async (
  queryable: SeedQueryable
): Promise<{
  userId: string;
  teacherId: string;
  email: string;
  password: string;
}> => {
  const email = "second-teacher@example.com";
  const password = "TeacherTwo123!";
  const passwordHash = await hashPassword(password);

  const userResult = await queryable.query<{ id: string }>(
    `
      INSERT INTO users (
        full_name,
        email,
        phone,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id
    `,
    ["Second Teacher", email, "01000000007", passwordHash, "teacher"]
  );

  const teacherResult = await queryable.query<{ id: string }>(
    `
      INSERT INTO teachers (
        user_id,
        specialization,
        qualification,
        hire_date
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [userResult.rows[0].id, "Science", "Bachelor", "2025-09-01"]
  );

  return {
    userId: userResult.rows[0].id,
    teacherId: teacherResult.rows[0].id,
    email,
    password
  };
};

export const seedTeacherAssignment = async (
  queryable: SeedQueryable,
  teacherId = "1",
  classId = "1",
  subjectId = "1",
  academicYearId = "1"
): Promise<void> => {
  await queryable.query(
    `
      INSERT INTO teacher_classes (
        teacher_id,
        class_id,
        subject_id,
        academic_year_id
      )
      VALUES ($1, $2, $3, $4)
    `,
    [teacherId, classId, subjectId, academicYearId]
  );
};

export const seedSupervisorAssignment = async (
  queryable: SeedQueryable,
  supervisorId = "1",
  classId = "1",
  academicYearId = "1"
): Promise<void> => {
  await queryable.query(
    `
      INSERT INTO supervisor_classes (
        supervisor_id,
        class_id,
        academic_year_id
      )
      VALUES ($1, $2, $3)
    `,
    [supervisorId, classId, academicYearId]
  );
};

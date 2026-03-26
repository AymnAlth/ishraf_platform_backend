BEGIN;

SET search_path TO public, pg_temp;

-- =========================================================
-- Seed users and role profiles
-- Shared password for all seed accounts:
-- SeedDev123!
-- bcrypt hash:
-- $2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO
-- =========================================================

CREATE TEMP TABLE seed_users (
  email text PRIMARY KEY,
  full_name text NOT NULL,
  phone text NOT NULL,
  password_hash text NOT NULL,
  role varchar(30) NOT NULL,
  is_active boolean NOT NULL DEFAULT true
) ON COMMIT DROP;

INSERT INTO seed_users (email, full_name, phone, password_hash, role, is_active)
VALUES
  ('seed-admin-01@ishraf.local', 'Seed Admin 01', '770100001', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'admin', true),
  ('seed-admin-02@ishraf.local', 'Seed Admin 02', '770100002', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'admin', true),
  ('seed-parent-01@ishraf.local', 'Seed Parent 01', '770200001', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'parent', true),
  ('seed-parent-02@ishraf.local', 'Seed Parent 02', '770200002', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'parent', true),
  ('seed-parent-03@ishraf.local', 'Seed Parent 03', '770200003', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'parent', true),
  ('seed-teacher-01@ishraf.local', 'Seed Teacher 01', '770300001', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'teacher', true),
  ('seed-teacher-02@ishraf.local', 'Seed Teacher 02', '770300002', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'teacher', true),
  ('seed-teacher-03@ishraf.local', 'Seed Teacher 03', '770300003', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'teacher', true),
  ('seed-supervisor-01@ishraf.local', 'Seed Supervisor 01', '770400001', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'supervisor', true),
  ('seed-supervisor-02@ishraf.local', 'Seed Supervisor 02', '770400002', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'supervisor', true),
  ('seed-supervisor-03@ishraf.local', 'Seed Supervisor 03', '770400003', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'supervisor', true),
  ('seed-driver-01@ishraf.local', 'Seed Driver 01', '770500001', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'driver', true),
  ('seed-driver-02@ishraf.local', 'Seed Driver 02', '770500002', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'driver', true),
  ('seed-driver-03@ishraf.local', 'Seed Driver 03', '770500003', '$2b$12$oauEwjnwE9Cl.BtNScMfA.B8C2mfHUL6ntmy6xah3CcQHYr8la/xO', 'driver', true);

INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
SELECT full_name, email, phone, password_hash, role, is_active
FROM seed_users
ON CONFLICT DO NOTHING;

UPDATE users u
SET
  full_name = su.full_name,
  phone = su.phone,
  password_hash = su.password_hash,
  role = su.role,
  is_active = su.is_active
FROM seed_users su
WHERE LOWER(u.email) = LOWER(su.email);

CREATE TEMP TABLE seed_parent_profiles (
  email text PRIMARY KEY,
  address text NOT NULL,
  relation_type varchar(50) NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_parent_profiles (email, address, relation_type)
VALUES
  ('seed-parent-01@ishraf.local', 'Sanaa - Seed District 01', 'father'),
  ('seed-parent-02@ishraf.local', 'Taiz - Seed District 02', 'mother'),
  ('seed-parent-03@ishraf.local', 'Aden - Seed District 03', 'guardian');

INSERT INTO parents (user_id, address, relation_type)
SELECT u.id, spp.address, spp.relation_type
FROM seed_parent_profiles spp
JOIN users u ON LOWER(u.email) = LOWER(spp.email)
ON CONFLICT DO NOTHING;

UPDATE parents p
SET
  address = spp.address,
  relation_type = spp.relation_type
FROM seed_parent_profiles spp
JOIN users u ON LOWER(u.email) = LOWER(spp.email)
WHERE p.user_id = u.id;

CREATE TEMP TABLE seed_teacher_profiles (
  email text PRIMARY KEY,
  specialization text,
  qualification text,
  hire_date date
) ON COMMIT DROP;

INSERT INTO seed_teacher_profiles (email, specialization, qualification, hire_date)
VALUES
  ('seed-teacher-01@ishraf.local', 'Mathematics', 'Bachelor of Education', DATE '2024-09-01'),
  ('seed-teacher-02@ishraf.local', 'Science', 'Bachelor of Science', DATE '2024-09-01'),
  ('seed-teacher-03@ishraf.local', 'Arabic', 'Bachelor of Arts', DATE '2024-09-01');

INSERT INTO teachers (user_id, specialization, qualification, hire_date)
SELECT u.id, stp.specialization, stp.qualification, stp.hire_date
FROM seed_teacher_profiles stp
JOIN users u ON LOWER(u.email) = LOWER(stp.email)
ON CONFLICT DO NOTHING;

UPDATE teachers t
SET
  specialization = stp.specialization,
  qualification = stp.qualification,
  hire_date = stp.hire_date
FROM seed_teacher_profiles stp
JOIN users u ON LOWER(u.email) = LOWER(stp.email)
WHERE t.user_id = u.id;

CREATE TEMP TABLE seed_supervisor_profiles (
  email text PRIMARY KEY,
  department text NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_supervisor_profiles (email, department)
VALUES
  ('seed-supervisor-01@ishraf.local', 'Student Affairs'),
  ('seed-supervisor-02@ishraf.local', 'Quality Assurance'),
  ('seed-supervisor-03@ishraf.local', 'Academic Follow-up');

INSERT INTO supervisors (user_id, department)
SELECT u.id, ssp.department
FROM seed_supervisor_profiles ssp
JOIN users u ON LOWER(u.email) = LOWER(ssp.email)
ON CONFLICT DO NOTHING;

UPDATE supervisors s
SET department = ssp.department
FROM seed_supervisor_profiles ssp
JOIN users u ON LOWER(u.email) = LOWER(ssp.email)
WHERE s.user_id = u.id;

CREATE TEMP TABLE seed_driver_profiles (
  email text PRIMARY KEY,
  license_number varchar(100) NOT NULL,
  driver_status varchar(30) NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_driver_profiles (email, license_number, driver_status)
VALUES
  ('seed-driver-01@ishraf.local', 'SEED-DRV-001', 'active'),
  ('seed-driver-02@ishraf.local', 'SEED-DRV-002', 'active'),
  ('seed-driver-03@ishraf.local', 'SEED-DRV-003', 'active');

INSERT INTO drivers (user_id, license_number, driver_status)
SELECT u.id, sdp.license_number, sdp.driver_status
FROM seed_driver_profiles sdp
JOIN users u ON LOWER(u.email) = LOWER(sdp.email)
ON CONFLICT DO NOTHING;

UPDATE drivers d
SET
  license_number = sdp.license_number,
  driver_status = sdp.driver_status
FROM seed_driver_profiles sdp
JOIN users u ON LOWER(u.email) = LOWER(sdp.email)
WHERE d.user_id = u.id;

-- =========================================================
-- Academic structure
-- =========================================================

CREATE TEMP TABLE seed_academic_years (
  name varchar(50) PRIMARY KEY,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_academic_years (name, start_date, end_date, is_active)
VALUES
  ('SEED AY 2024-2025', DATE '2024-09-01', DATE '2025-06-30', false),
  ('SEED AY 2025-2026', DATE '2025-09-01', DATE '2026-06-30', true),
  ('SEED AY 2026-2027', DATE '2026-09-01', DATE '2027-06-30', false);

UPDATE academic_years
SET is_active = FALSE
WHERE is_active = TRUE
  AND name <> 'SEED AY 2025-2026';

INSERT INTO academic_years (name, start_date, end_date, is_active)
SELECT name, start_date, end_date, is_active
FROM seed_academic_years
ON CONFLICT DO NOTHING;

UPDATE academic_years ay
SET
  start_date = say.start_date,
  end_date = say.end_date,
  is_active = say.is_active
FROM seed_academic_years say
WHERE ay.name = say.name;

CREATE TEMP TABLE seed_semesters (
  academic_year_name varchar(50) NOT NULL,
  name varchar(50) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL,
  PRIMARY KEY (academic_year_name, name)
) ON COMMIT DROP;

INSERT INTO seed_semesters (academic_year_name, name, start_date, end_date, is_active)
VALUES
  ('SEED AY 2024-2025', 'SEED Semester 1', DATE '2024-09-01', DATE '2025-01-31', false),
  ('SEED AY 2024-2025', 'SEED Semester 2', DATE '2025-02-01', DATE '2025-06-30', false),
  ('SEED AY 2025-2026', 'SEED Semester 1', DATE '2025-09-01', DATE '2026-01-31', false),
  ('SEED AY 2025-2026', 'SEED Semester 2', DATE '2026-02-01', DATE '2026-06-30', true),
  ('SEED AY 2026-2027', 'SEED Semester 1', DATE '2026-09-01', DATE '2027-01-31', false),
  ('SEED AY 2026-2027', 'SEED Semester 2', DATE '2027-02-01', DATE '2027-06-30', false);

UPDATE semesters SET is_active = FALSE WHERE is_active = TRUE;

INSERT INTO semesters (academic_year_id, name, start_date, end_date, is_active)
SELECT ay.id, ss.name, ss.start_date, ss.end_date, ss.is_active
FROM seed_semesters ss
JOIN academic_years ay ON ay.name = ss.academic_year_name
ON CONFLICT DO NOTHING;

UPDATE semesters sem
SET
  start_date = ss.start_date,
  end_date = ss.end_date,
  is_active = ss.is_active
FROM seed_semesters ss
JOIN academic_years ay ON ay.name = ss.academic_year_name
WHERE sem.academic_year_id = ay.id
  AND sem.name = ss.name;

CREATE TEMP TABLE seed_grade_levels (
  name varchar(100) PRIMARY KEY,
  level_order integer NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_grade_levels (name, level_order)
VALUES
  ('SEED Grade 1', 1),
  ('SEED Grade 2', 2),
  ('SEED Grade 3', 3);

INSERT INTO grade_levels (name, level_order)
SELECT name, level_order
FROM seed_grade_levels
ON CONFLICT DO NOTHING;

UPDATE grade_levels gl
SET level_order = sgl.level_order
FROM seed_grade_levels sgl
WHERE gl.name = sgl.name;

CREATE TEMP TABLE seed_classes (
  grade_level_name varchar(100) NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  class_name varchar(50) NOT NULL,
  section varchar(50) NOT NULL,
  capacity integer NOT NULL,
  is_active boolean NOT NULL,
  PRIMARY KEY (grade_level_name, academic_year_name, class_name, section)
) ON COMMIT DROP;

INSERT INTO seed_classes (grade_level_name, academic_year_name, class_name, section, capacity, is_active)
VALUES
  ('SEED Grade 1', 'SEED AY 2025-2026', 'SEED-A', 'A', 35, true),
  ('SEED Grade 2', 'SEED AY 2025-2026', 'SEED-B', 'A', 35, true),
  ('SEED Grade 3', 'SEED AY 2025-2026', 'SEED-C', 'A', 35, true);

INSERT INTO classes (grade_level_id, academic_year_id, class_name, section, capacity, is_active)
SELECT gl.id, ay.id, sc.class_name, sc.section, sc.capacity, sc.is_active
FROM seed_classes sc
JOIN grade_levels gl ON gl.name = sc.grade_level_name
JOIN academic_years ay ON ay.name = sc.academic_year_name
ON CONFLICT DO NOTHING;

UPDATE classes c
SET
  capacity = sc.capacity,
  is_active = sc.is_active
FROM seed_classes sc
JOIN grade_levels gl ON gl.name = sc.grade_level_name
JOIN academic_years ay ON ay.name = sc.academic_year_name
WHERE c.grade_level_id = gl.id
  AND c.academic_year_id = ay.id
  AND c.class_name = sc.class_name
  AND c.section = sc.section;

CREATE TEMP TABLE seed_subjects (
  code varchar(50) PRIMARY KEY,
  name varchar(100) NOT NULL,
  grade_level_name varchar(100) NOT NULL,
  is_active boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_subjects (code, name, grade_level_name, is_active)
VALUES
  ('SEED-SCI-G1', 'Science', 'SEED Grade 1', true),
  ('SEED-AR-G1', 'Arabic', 'SEED Grade 1', true),
  ('SEED-MATH-G1', 'Mathematics', 'SEED Grade 1', true),
  ('SEED-SCI-G2', 'Science', 'SEED Grade 2', true),
  ('SEED-AR-G2', 'Arabic', 'SEED Grade 2', true),
  ('SEED-MATH-G2', 'Mathematics', 'SEED Grade 2', true),
  ('SEED-SCI-G3', 'Science', 'SEED Grade 3', true),
  ('SEED-AR-G3', 'Arabic', 'SEED Grade 3', true),
  ('SEED-MATH-G3', 'Mathematics', 'SEED Grade 3', true);

INSERT INTO subjects (name, grade_level_id, code, is_active)
SELECT ss.name, gl.id, ss.code, ss.is_active
FROM seed_subjects ss
JOIN grade_levels gl ON gl.name = ss.grade_level_name
ON CONFLICT DO NOTHING;

UPDATE subjects s
SET
  name = ss.name,
  is_active = ss.is_active
FROM seed_subjects ss
JOIN grade_levels gl ON gl.name = ss.grade_level_name
WHERE s.code = ss.code
  AND s.grade_level_id = gl.id;

CREATE TEMP TABLE seed_teacher_assignments (
  teacher_email text NOT NULL,
  class_name varchar(50) NOT NULL,
  section varchar(50) NOT NULL,
  subject_code varchar(50) NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  PRIMARY KEY (teacher_email, class_name, section, subject_code, academic_year_name)
) ON COMMIT DROP;

INSERT INTO seed_teacher_assignments (teacher_email, class_name, section, subject_code, academic_year_name)
VALUES
  ('seed-teacher-01@ishraf.local', 'SEED-A', 'A', 'SEED-MATH-G1', 'SEED AY 2025-2026'),
  ('seed-teacher-02@ishraf.local', 'SEED-B', 'A', 'SEED-SCI-G2', 'SEED AY 2025-2026'),
  ('seed-teacher-03@ishraf.local', 'SEED-C', 'A', 'SEED-AR-G3', 'SEED AY 2025-2026');

INSERT INTO teacher_classes (teacher_id, class_id, subject_id, academic_year_id)
SELECT t.id, c.id, subj.id, ay.id
FROM seed_teacher_assignments sta
JOIN users u ON LOWER(u.email) = LOWER(sta.teacher_email)
JOIN teachers t ON t.user_id = u.id
JOIN academic_years ay ON ay.name = sta.academic_year_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = sta.class_name AND c.section = sta.section
JOIN subjects subj ON subj.code = sta.subject_code
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE seed_supervisor_assignments (
  supervisor_email text NOT NULL,
  class_name varchar(50) NOT NULL,
  section varchar(50) NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  PRIMARY KEY (supervisor_email, class_name, section, academic_year_name)
) ON COMMIT DROP;

INSERT INTO seed_supervisor_assignments (supervisor_email, class_name, section, academic_year_name)
VALUES
  ('seed-supervisor-01@ishraf.local', 'SEED-A', 'A', 'SEED AY 2025-2026'),
  ('seed-supervisor-02@ishraf.local', 'SEED-B', 'A', 'SEED AY 2025-2026'),
  ('seed-supervisor-03@ishraf.local', 'SEED-C', 'A', 'SEED AY 2025-2026');

INSERT INTO supervisor_classes (supervisor_id, class_id, academic_year_id)
SELECT s.id, c.id, ay.id
FROM seed_supervisor_assignments ssa
JOIN users u ON LOWER(u.email) = LOWER(ssa.supervisor_email)
JOIN supervisors s ON s.user_id = u.id
JOIN academic_years ay ON ay.name = ssa.academic_year_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = ssa.class_name AND c.section = ssa.section
ON CONFLICT DO NOTHING;

-- =========================================================
-- Students and parent links
-- =========================================================

CREATE TEMP TABLE seed_students (
  academic_no varchar(50) PRIMARY KEY,
  full_name varchar(150) NOT NULL,
  date_of_birth date NOT NULL,
  gender varchar(20) NOT NULL,
  class_name varchar(50) NOT NULL,
  section varchar(50) NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  status varchar(30) NOT NULL,
  enrollment_date date NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_students (academic_no, full_name, date_of_birth, gender, class_name, section, academic_year_name, status, enrollment_date)
VALUES
  ('SEED-STU-001', 'Seed Student 001', DATE '2017-01-10', 'male', 'SEED-A', 'A', 'SEED AY 2025-2026', 'active', DATE '2025-09-01'),
  ('SEED-STU-002', 'Seed Student 002', DATE '2017-03-12', 'female', 'SEED-A', 'A', 'SEED AY 2025-2026', 'active', DATE '2025-09-01'),
  ('SEED-STU-003', 'Seed Student 003', DATE '2017-05-08', 'male', 'SEED-A', 'A', 'SEED AY 2025-2026', 'active', DATE '2025-09-01'),
  ('SEED-STU-004', 'Seed Student 004', DATE '2016-02-11', 'female', 'SEED-B', 'A', 'SEED AY 2025-2026', 'active', DATE '2025-09-01'),
  ('SEED-STU-005', 'Seed Student 005', DATE '2016-04-18', 'male', 'SEED-B', 'A', 'SEED AY 2025-2026', 'active', DATE '2025-09-01'),
  ('SEED-STU-006', 'Seed Student 006', DATE '2016-06-22', 'female', 'SEED-B', 'A', 'SEED AY 2025-2026', 'active', DATE '2025-09-01'),
  ('SEED-STU-007', 'Seed Student 007', DATE '2015-01-09', 'male', 'SEED-C', 'A', 'SEED AY 2025-2026', 'active', DATE '2025-09-01'),
  ('SEED-STU-008', 'Seed Student 008', DATE '2015-03-17', 'female', 'SEED-C', 'A', 'SEED AY 2025-2026', 'active', DATE '2025-09-01'),
  ('SEED-STU-009', 'Seed Student 009', DATE '2015-07-25', 'male', 'SEED-C', 'A', 'SEED AY 2025-2026', 'active', DATE '2025-09-01');

INSERT INTO students (academic_no, full_name, date_of_birth, gender, class_id, status, enrollment_date)
SELECT ss.academic_no, ss.full_name, ss.date_of_birth, ss.gender, c.id, ss.status, ss.enrollment_date
FROM seed_students ss
JOIN academic_years ay ON ay.name = ss.academic_year_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = ss.class_name AND c.section = ss.section
ON CONFLICT DO NOTHING;

UPDATE students s
SET
  full_name = ss.full_name,
  date_of_birth = ss.date_of_birth,
  gender = ss.gender,
  class_id = c.id,
  status = ss.status,
  enrollment_date = ss.enrollment_date
FROM seed_students ss
JOIN academic_years ay ON ay.name = ss.academic_year_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = ss.class_name AND c.section = ss.section
WHERE s.academic_no = ss.academic_no;

CREATE TEMP TABLE seed_student_parents (
  student_academic_no varchar(50) NOT NULL,
  parent_email text NOT NULL,
  relation_type varchar(50) NOT NULL,
  is_primary boolean NOT NULL,
  PRIMARY KEY (student_academic_no, parent_email)
) ON COMMIT DROP;

INSERT INTO seed_student_parents (student_academic_no, parent_email, relation_type, is_primary)
VALUES
  ('SEED-STU-001', 'seed-parent-01@ishraf.local', 'father', true),
  ('SEED-STU-002', 'seed-parent-01@ishraf.local', 'father', true),
  ('SEED-STU-003', 'seed-parent-01@ishraf.local', 'father', true),
  ('SEED-STU-004', 'seed-parent-02@ishraf.local', 'mother', true),
  ('SEED-STU-005', 'seed-parent-02@ishraf.local', 'mother', true),
  ('SEED-STU-006', 'seed-parent-02@ishraf.local', 'mother', true),
  ('SEED-STU-007', 'seed-parent-03@ishraf.local', 'guardian', true),
  ('SEED-STU-008', 'seed-parent-03@ishraf.local', 'guardian', true),
  ('SEED-STU-009', 'seed-parent-03@ishraf.local', 'guardian', true);

INSERT INTO student_parents (student_id, parent_id, relation_type, is_primary)
SELECT st.id, p.id, ssp.relation_type, ssp.is_primary
FROM seed_student_parents ssp
JOIN students st ON st.academic_no = ssp.student_academic_no
JOIN users u ON LOWER(u.email) = LOWER(ssp.parent_email)
JOIN parents p ON p.user_id = u.id
ON CONFLICT DO NOTHING;

UPDATE student_parents sp
SET
  relation_type = ssp.relation_type,
  is_primary = ssp.is_primary
FROM seed_student_parents ssp
JOIN students st ON st.academic_no = ssp.student_academic_no
JOIN users u ON LOWER(u.email) = LOWER(ssp.parent_email)
JOIN parents p ON p.user_id = u.id
WHERE sp.student_id = st.id
  AND sp.parent_id = p.id;

CREATE TEMP TABLE seed_student_promotions (
  student_academic_no varchar(50) PRIMARY KEY,
  from_class_name varchar(50) NOT NULL,
  from_section varchar(50) NOT NULL,
  to_class_name varchar(50) NOT NULL,
  to_section varchar(50) NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  promoted_at timestamptz NOT NULL,
  notes text
) ON COMMIT DROP;

INSERT INTO seed_student_promotions (student_academic_no, from_class_name, from_section, to_class_name, to_section, academic_year_name, promoted_at, notes)
VALUES
  ('SEED-STU-004', 'SEED-A', 'A', 'SEED-B', 'A', 'SEED AY 2025-2026', TIMESTAMPTZ '2025-09-05 08:00:00+03', '[Seed PR-01] Promotion history'),
  ('SEED-STU-005', 'SEED-A', 'A', 'SEED-B', 'A', 'SEED AY 2025-2026', TIMESTAMPTZ '2025-09-05 08:05:00+03', '[Seed PR-02] Promotion history'),
  ('SEED-STU-006', 'SEED-A', 'A', 'SEED-B', 'A', 'SEED AY 2025-2026', TIMESTAMPTZ '2025-09-05 08:10:00+03', '[Seed PR-03] Promotion history');

INSERT INTO student_promotions (student_id, from_class_id, to_class_id, academic_year_id, promoted_at, notes)
SELECT st.id, fc.id, tc.id, ay.id, ssp.promoted_at, ssp.notes
FROM seed_student_promotions ssp
JOIN students st ON st.academic_no = ssp.student_academic_no
JOIN academic_years ay ON ay.name = ssp.academic_year_name
JOIN classes fc ON fc.academic_year_id = ay.id AND fc.class_name = ssp.from_class_name AND fc.section = ssp.from_section
JOIN classes tc ON tc.academic_year_id = ay.id AND tc.class_name = ssp.to_class_name AND tc.section = ssp.to_section
ON CONFLICT DO NOTHING;

-- =========================================================
-- Static operational references
-- =========================================================

CREATE TEMP TABLE seed_assessment_types (
  code varchar(30) PRIMARY KEY,
  name varchar(100) NOT NULL,
  description text,
  is_active boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_assessment_types (code, name, description, is_active)
VALUES
  ('exam', 'Exam', 'Formal exams', true),
  ('quiz', 'Quiz', 'Short quizzes', true),
  ('homework', 'Homework', 'Homework assessments', true),
  ('attendance', 'Attendance', 'Attendance-based assessment', true),
  ('behavior', 'Behavior', 'Behavioral assessment', true),
  ('participation', 'Participation', 'Participation assessment', true);

INSERT INTO assessment_types (code, name, description, is_active)
SELECT code, name, description, is_active
FROM seed_assessment_types
ON CONFLICT DO NOTHING;

UPDATE assessment_types a
SET
  name = sat.name,
  description = sat.description,
  is_active = sat.is_active
FROM seed_assessment_types sat
WHERE a.code = sat.code;

CREATE TEMP TABLE seed_behavior_categories (
  code varchar(30) PRIMARY KEY,
  name varchar(100) NOT NULL,
  behavior_type varchar(20) NOT NULL,
  default_severity integer NOT NULL,
  is_active boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_behavior_categories (code, name, behavior_type, default_severity, is_active)
VALUES
  ('respect', 'Respect', 'positive', 1, true),
  ('participation', 'Participation', 'positive', 1, true),
  ('leadership', 'Leadership', 'positive', 2, true),
  ('discipline', 'Discipline', 'positive', 1, true),
  ('lateness', 'Lateness', 'negative', 2, true),
  ('disruption', 'Disruption', 'negative', 3, true),
  ('bullying', 'Bullying', 'negative', 5, true),
  ('absence_misconduct', 'Absence Misconduct', 'negative', 3, true);

INSERT INTO behavior_categories (code, name, behavior_type, default_severity, is_active)
SELECT code, name, behavior_type, default_severity, is_active
FROM seed_behavior_categories
ON CONFLICT DO NOTHING;

UPDATE behavior_categories bc
SET
  name = sbc.name,
  behavior_type = sbc.behavior_type,
  default_severity = sbc.default_severity,
  is_active = sbc.is_active
FROM seed_behavior_categories sbc
WHERE bc.code = sbc.code;

-- =========================================================
-- Assessments, attendance, homework, behavior
-- =========================================================

CREATE TEMP TABLE seed_assessments (
  title varchar(200) PRIMARY KEY,
  assessment_type_code varchar(30) NOT NULL,
  class_name varchar(50) NOT NULL,
  section varchar(50) NOT NULL,
  subject_code varchar(50) NOT NULL,
  teacher_email text NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  semester_name varchar(50) NOT NULL,
  description text,
  max_score numeric(6,2) NOT NULL,
  weight numeric(6,2) NOT NULL,
  assessment_date date NOT NULL,
  is_published boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_assessments (
  title, assessment_type_code, class_name, section, subject_code, teacher_email,
  academic_year_name, semester_name, description, max_score, weight, assessment_date, is_published
)
VALUES
  ('[Seed AST-01] Grade 1 Mathematics Diagnostic', 'exam', 'SEED-A', 'A', 'SEED-MATH-G1', 'seed-teacher-01@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', 'Seed assessment for class 1 mathematics', 100, 30, DATE '2026-03-10', true),
  ('[Seed AST-02] Grade 2 Science Quiz', 'quiz', 'SEED-B', 'A', 'SEED-SCI-G2', 'seed-teacher-02@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', 'Seed science quiz for class 2', 25, 10, DATE '2026-03-11', true),
  ('[Seed AST-03] Grade 3 Arabic Review', 'participation', 'SEED-C', 'A', 'SEED-AR-G3', 'seed-teacher-03@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', 'Seed Arabic review for class 3', 20, 5, DATE '2026-03-12', true);

INSERT INTO assessments (
  assessment_type_id, class_id, subject_id, teacher_id, academic_year_id, semester_id,
  title, description, max_score, weight, assessment_date, is_published
)
SELECT
  at.id, c.id, subj.id, t.id, ay.id, sem.id,
  sa.title, sa.description, sa.max_score, sa.weight, sa.assessment_date, sa.is_published
FROM seed_assessments sa
JOIN assessment_types at ON at.code = sa.assessment_type_code
JOIN academic_years ay ON ay.name = sa.academic_year_name
JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.name = sa.semester_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = sa.class_name AND c.section = sa.section
JOIN subjects subj ON subj.code = sa.subject_code
JOIN users tu ON LOWER(tu.email) = LOWER(sa.teacher_email)
JOIN teachers t ON t.user_id = tu.id
WHERE NOT EXISTS (
  SELECT 1
  FROM assessments a
  WHERE a.title = sa.title
)
ON CONFLICT DO NOTHING;

UPDATE assessments a
SET
  assessment_type_id = at.id,
  class_id = c.id,
  subject_id = subj.id,
  teacher_id = t.id,
  academic_year_id = ay.id,
  semester_id = sem.id,
  description = sa.description,
  max_score = sa.max_score,
  weight = sa.weight,
  assessment_date = sa.assessment_date,
  is_published = sa.is_published
FROM seed_assessments sa
JOIN assessment_types at ON at.code = sa.assessment_type_code
JOIN academic_years ay ON ay.name = sa.academic_year_name
JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.name = sa.semester_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = sa.class_name AND c.section = sa.section
JOIN subjects subj ON subj.code = sa.subject_code
JOIN users tu ON LOWER(tu.email) = LOWER(sa.teacher_email)
JOIN teachers t ON t.user_id = tu.id
WHERE a.title = sa.title;

CREATE TEMP TABLE seed_student_assessments (
  assessment_title varchar(200) NOT NULL,
  student_academic_no varchar(50) NOT NULL,
  score numeric(6,2) NOT NULL,
  remarks text,
  graded_at timestamptz,
  PRIMARY KEY (assessment_title, student_academic_no)
) ON COMMIT DROP;

INSERT INTO seed_student_assessments (assessment_title, student_academic_no, score, remarks, graded_at)
VALUES
  ('[Seed AST-01] Grade 1 Mathematics Diagnostic', 'SEED-STU-001', 78, 'Good baseline', TIMESTAMPTZ '2026-03-10 10:00:00+03'),
  ('[Seed AST-01] Grade 1 Mathematics Diagnostic', 'SEED-STU-002', 84, 'Strong performance', TIMESTAMPTZ '2026-03-10 10:02:00+03'),
  ('[Seed AST-01] Grade 1 Mathematics Diagnostic', 'SEED-STU-003', 66, 'Needs reinforcement', TIMESTAMPTZ '2026-03-10 10:04:00+03'),
  ('[Seed AST-02] Grade 2 Science Quiz', 'SEED-STU-004', 20, 'Solid work', TIMESTAMPTZ '2026-03-11 10:00:00+03'),
  ('[Seed AST-02] Grade 2 Science Quiz', 'SEED-STU-005', 18, 'Late but accurate', TIMESTAMPTZ '2026-03-11 10:02:00+03'),
  ('[Seed AST-02] Grade 2 Science Quiz', 'SEED-STU-006', 22, 'Excellent recall', TIMESTAMPTZ '2026-03-11 10:04:00+03'),
  ('[Seed AST-03] Grade 3 Arabic Review', 'SEED-STU-007', 16, 'Strong reading', TIMESTAMPTZ '2026-03-12 10:00:00+03'),
  ('[Seed AST-03] Grade 3 Arabic Review', 'SEED-STU-008', 14, 'Good effort', TIMESTAMPTZ '2026-03-12 10:02:00+03'),
  ('[Seed AST-03] Grade 3 Arabic Review', 'SEED-STU-009', 12, 'Needs vocabulary practice', TIMESTAMPTZ '2026-03-12 10:04:00+03');

INSERT INTO student_assessments (assessment_id, student_id, score, remarks, graded_at)
SELECT a.id, st.id, ssa.score, ssa.remarks, ssa.graded_at
FROM seed_student_assessments ssa
JOIN assessments a ON a.title = ssa.assessment_title
JOIN students st ON st.academic_no = ssa.student_academic_no
ON CONFLICT DO NOTHING;

UPDATE student_assessments sa
SET
  score = ssa.score,
  remarks = ssa.remarks,
  graded_at = ssa.graded_at
FROM seed_student_assessments ssa
JOIN assessments a ON a.title = ssa.assessment_title
JOIN students st ON st.academic_no = ssa.student_academic_no
WHERE sa.assessment_id = a.id
  AND sa.student_id = st.id;

CREATE TEMP TABLE seed_attendance_sessions (
  title varchar(200) PRIMARY KEY,
  class_name varchar(50) NOT NULL,
  section varchar(50) NOT NULL,
  subject_code varchar(50) NOT NULL,
  teacher_email text NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  semester_name varchar(50) NOT NULL,
  session_date date NOT NULL,
  period_no integer NOT NULL,
  notes text
) ON COMMIT DROP;

INSERT INTO seed_attendance_sessions (title, class_name, section, subject_code, teacher_email, academic_year_name, semester_name, session_date, period_no, notes)
VALUES
  ('[Seed ATS-01] Grade 1 Morning Attendance', 'SEED-A', 'A', 'SEED-MATH-G1', 'seed-teacher-01@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', DATE '2026-03-13', 1, 'Seed attendance session 01'),
  ('[Seed ATS-02] Grade 2 Science Attendance', 'SEED-B', 'A', 'SEED-SCI-G2', 'seed-teacher-02@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', DATE '2026-03-14', 2, 'Seed attendance session 02'),
  ('[Seed ATS-03] Grade 3 Arabic Attendance', 'SEED-C', 'A', 'SEED-AR-G3', 'seed-teacher-03@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', DATE '2026-03-15', 3, 'Seed attendance session 03');

INSERT INTO attendance_sessions (
  class_id, subject_id, teacher_id, academic_year_id, semester_id,
  session_date, period_no, title, notes
)
SELECT
  c.id, subj.id, t.id, ay.id, sem.id,
  sas.session_date, sas.period_no, sas.title, sas.notes
FROM seed_attendance_sessions sas
JOIN academic_years ay ON ay.name = sas.academic_year_name
JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.name = sas.semester_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = sas.class_name AND c.section = sas.section
JOIN subjects subj ON subj.code = sas.subject_code
JOIN users tu ON LOWER(tu.email) = LOWER(sas.teacher_email)
JOIN teachers t ON t.user_id = tu.id
ON CONFLICT DO NOTHING;

UPDATE attendance_sessions ats
SET
  title = sas.title,
  notes = sas.notes
FROM seed_attendance_sessions sas
JOIN academic_years ay ON ay.name = sas.academic_year_name
JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.name = sas.semester_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = sas.class_name AND c.section = sas.section
JOIN subjects subj ON subj.code = sas.subject_code
JOIN users tu ON LOWER(tu.email) = LOWER(sas.teacher_email)
JOIN teachers t ON t.user_id = tu.id
WHERE ats.class_id = c.id
  AND ats.subject_id = subj.id
  AND ats.teacher_id = t.id
  AND ats.academic_year_id = ay.id
  AND ats.semester_id = sem.id
  AND ats.session_date = sas.session_date
  AND ats.period_no = sas.period_no;

CREATE TEMP TABLE seed_attendance (
  session_title varchar(200) NOT NULL,
  student_academic_no varchar(50) NOT NULL,
  status varchar(20) NOT NULL,
  notes text,
  recorded_at timestamptz NOT NULL,
  PRIMARY KEY (session_title, student_academic_no)
) ON COMMIT DROP;

INSERT INTO seed_attendance (session_title, student_academic_no, status, notes, recorded_at)
VALUES
  ('[Seed ATS-01] Grade 1 Morning Attendance', 'SEED-STU-001', 'absent', '[Seed ATT-01] Absent sample', TIMESTAMPTZ '2026-03-13 08:10:00+03'),
  ('[Seed ATS-01] Grade 1 Morning Attendance', 'SEED-STU-002', 'present', '[Seed ATT-02] Present sample', TIMESTAMPTZ '2026-03-13 08:11:00+03'),
  ('[Seed ATS-01] Grade 1 Morning Attendance', 'SEED-STU-003', 'present', '[Seed ATT-03] Present sample', TIMESTAMPTZ '2026-03-13 08:12:00+03'),
  ('[Seed ATS-02] Grade 2 Science Attendance', 'SEED-STU-004', 'present', '[Seed ATT-04] Present sample', TIMESTAMPTZ '2026-03-14 09:10:00+03'),
  ('[Seed ATS-02] Grade 2 Science Attendance', 'SEED-STU-005', 'late', '[Seed ATT-05] Late sample', TIMESTAMPTZ '2026-03-14 09:11:00+03'),
  ('[Seed ATS-02] Grade 2 Science Attendance', 'SEED-STU-006', 'present', '[Seed ATT-06] Present sample', TIMESTAMPTZ '2026-03-14 09:12:00+03'),
  ('[Seed ATS-03] Grade 3 Arabic Attendance', 'SEED-STU-007', 'present', '[Seed ATT-07] Present sample', TIMESTAMPTZ '2026-03-15 10:10:00+03'),
  ('[Seed ATS-03] Grade 3 Arabic Attendance', 'SEED-STU-008', 'present', '[Seed ATT-08] Present sample', TIMESTAMPTZ '2026-03-15 10:11:00+03'),
  ('[Seed ATS-03] Grade 3 Arabic Attendance', 'SEED-STU-009', 'excused', '[Seed ATT-09] Excused sample', TIMESTAMPTZ '2026-03-15 10:12:00+03');

INSERT INTO attendance (attendance_session_id, student_id, status, notes, recorded_at)
SELECT ats.id, st.id, sa.status, sa.notes, sa.recorded_at
FROM seed_attendance sa
JOIN attendance_sessions ats ON ats.title = sa.session_title
JOIN students st ON st.academic_no = sa.student_academic_no
ON CONFLICT DO NOTHING;

UPDATE attendance a
SET
  status = sa.status,
  notes = sa.notes,
  recorded_at = sa.recorded_at
FROM seed_attendance sa
JOIN attendance_sessions ats ON ats.title = sa.session_title
JOIN students st ON st.academic_no = sa.student_academic_no
WHERE a.attendance_session_id = ats.id
  AND a.student_id = st.id;

CREATE TEMP TABLE seed_homework (
  title varchar(200) PRIMARY KEY,
  teacher_email text NOT NULL,
  class_name varchar(50) NOT NULL,
  section varchar(50) NOT NULL,
  subject_code varchar(50) NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  semester_name varchar(50) NOT NULL,
  description text,
  assigned_date date NOT NULL,
  due_date date NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_homework (title, teacher_email, class_name, section, subject_code, academic_year_name, semester_name, description, assigned_date, due_date)
VALUES
  ('[Seed HW-01] Grade 1 Math Practice', 'seed-teacher-01@ishraf.local', 'SEED-A', 'A', 'SEED-MATH-G1', 'SEED AY 2025-2026', 'SEED Semester 2', 'Practice addition and subtraction', DATE '2026-03-16', DATE '2026-03-20'),
  ('[Seed HW-02] Grade 2 Science Observation', 'seed-teacher-02@ishraf.local', 'SEED-B', 'A', 'SEED-SCI-G2', 'SEED AY 2025-2026', 'SEED Semester 2', 'Observe plant growth at home', DATE '2026-03-16', DATE '2026-03-21'),
  ('[Seed HW-03] Grade 3 Arabic Reading', 'seed-teacher-03@ishraf.local', 'SEED-C', 'A', 'SEED-AR-G3', 'SEED AY 2025-2026', 'SEED Semester 2', 'Read and summarize the short passage', DATE '2026-03-17', DATE '2026-03-22');

INSERT INTO homework (
  teacher_id, class_id, subject_id, academic_year_id, semester_id,
  title, description, assigned_date, due_date
)
SELECT
  t.id, c.id, subj.id, ay.id, sem.id,
  sh.title, sh.description, sh.assigned_date, sh.due_date
FROM seed_homework sh
JOIN users tu ON LOWER(tu.email) = LOWER(sh.teacher_email)
JOIN teachers t ON t.user_id = tu.id
JOIN academic_years ay ON ay.name = sh.academic_year_name
JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.name = sh.semester_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = sh.class_name AND c.section = sh.section
JOIN subjects subj ON subj.code = sh.subject_code
WHERE NOT EXISTS (
  SELECT 1
  FROM homework h
  WHERE h.title = sh.title
)
ON CONFLICT DO NOTHING;

UPDATE homework h
SET
  teacher_id = t.id,
  class_id = c.id,
  subject_id = subj.id,
  academic_year_id = ay.id,
  semester_id = sem.id,
  description = sh.description,
  assigned_date = sh.assigned_date,
  due_date = sh.due_date
FROM seed_homework sh
JOIN users tu ON LOWER(tu.email) = LOWER(sh.teacher_email)
JOIN teachers t ON t.user_id = tu.id
JOIN academic_years ay ON ay.name = sh.academic_year_name
JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.name = sh.semester_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = sh.class_name AND c.section = sh.section
JOIN subjects subj ON subj.code = sh.subject_code
WHERE h.title = sh.title;

CREATE TEMP TABLE seed_homework_submissions (
  homework_title varchar(200) NOT NULL,
  student_academic_no varchar(50) NOT NULL,
  status varchar(30) NOT NULL,
  submitted_at timestamptz,
  notes text,
  PRIMARY KEY (homework_title, student_academic_no)
) ON COMMIT DROP;

INSERT INTO seed_homework_submissions (homework_title, student_academic_no, status, submitted_at, notes)
VALUES
  ('[Seed HW-01] Grade 1 Math Practice', 'SEED-STU-001', 'not_submitted', NULL, '[Seed HWS-01] Pending'),
  ('[Seed HW-01] Grade 1 Math Practice', 'SEED-STU-002', 'submitted', TIMESTAMPTZ '2026-03-18 17:00:00+03', '[Seed HWS-02] Submitted on time'),
  ('[Seed HW-01] Grade 1 Math Practice', 'SEED-STU-003', 'late', TIMESTAMPTZ '2026-03-21 08:00:00+03', '[Seed HWS-03] Late submission'),
  ('[Seed HW-02] Grade 2 Science Observation', 'SEED-STU-004', 'submitted', TIMESTAMPTZ '2026-03-20 18:00:00+03', '[Seed HWS-04] Submitted'),
  ('[Seed HW-02] Grade 2 Science Observation', 'SEED-STU-005', 'not_submitted', NULL, '[Seed HWS-05] Missing'),
  ('[Seed HW-02] Grade 2 Science Observation', 'SEED-STU-006', 'submitted', TIMESTAMPTZ '2026-03-20 19:00:00+03', '[Seed HWS-06] Submitted'),
  ('[Seed HW-03] Grade 3 Arabic Reading', 'SEED-STU-007', 'submitted', TIMESTAMPTZ '2026-03-21 17:30:00+03', '[Seed HWS-07] Submitted'),
  ('[Seed HW-03] Grade 3 Arabic Reading', 'SEED-STU-008', 'late', TIMESTAMPTZ '2026-03-23 08:00:00+03', '[Seed HWS-08] Late'),
  ('[Seed HW-03] Grade 3 Arabic Reading', 'SEED-STU-009', 'not_submitted', NULL, '[Seed HWS-09] Pending');

INSERT INTO homework_submissions (homework_id, student_id, status, submitted_at, notes)
SELECT h.id, st.id, shs.status, shs.submitted_at, shs.notes
FROM seed_homework_submissions shs
JOIN homework h ON h.title = shs.homework_title
JOIN students st ON st.academic_no = shs.student_academic_no
ON CONFLICT DO NOTHING;

UPDATE homework_submissions hs
SET
  status = shs.status,
  submitted_at = shs.submitted_at,
  notes = shs.notes
FROM seed_homework_submissions shs
JOIN homework h ON h.title = shs.homework_title
JOIN students st ON st.academic_no = shs.student_academic_no
WHERE hs.homework_id = h.id
  AND hs.student_id = st.id;

CREATE TEMP TABLE seed_behavior_records (
  seed_key text PRIMARY KEY,
  student_academic_no varchar(50) NOT NULL,
  category_code varchar(30) NOT NULL,
  actor_role varchar(20) NOT NULL,
  actor_email text NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  semester_name varchar(50) NOT NULL,
  description text NOT NULL,
  severity integer NOT NULL,
  behavior_date date NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_behavior_records (
  seed_key, student_academic_no, category_code, actor_role, actor_email,
  academic_year_name, semester_name, description, severity, behavior_date
)
VALUES
  ('BR-01', 'SEED-STU-001', 'lateness', 'teacher', 'seed-teacher-01@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', '[Seed BR-01] Repeated lateness noted by teacher', 2, DATE '2026-03-13'),
  ('BR-02', 'SEED-STU-002', 'respect', 'teacher', 'seed-teacher-01@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', '[Seed BR-02] Positive respectful participation', 1, DATE '2026-03-13'),
  ('BR-03', 'SEED-STU-004', 'disruption', 'supervisor', 'seed-supervisor-02@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', '[Seed BR-03] Disruption observed during supervision', 3, DATE '2026-03-14'),
  ('BR-04', 'SEED-STU-005', 'leadership', 'supervisor', 'seed-supervisor-02@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', '[Seed BR-04] Leadership shown in group work', 2, DATE '2026-03-14'),
  ('BR-05', 'SEED-STU-007', 'bullying', 'teacher', 'seed-teacher-03@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', '[Seed BR-05] Bullying incident recorded for testing', 5, DATE '2026-03-15'),
  ('BR-06', 'SEED-STU-008', 'participation', 'supervisor', 'seed-supervisor-03@ishraf.local', 'SEED AY 2025-2026', 'SEED Semester 2', '[Seed BR-06] Strong participation in supervised activity', 1, DATE '2026-03-15');

INSERT INTO behavior_records (
  student_id, behavior_category_id, teacher_id, supervisor_id,
  academic_year_id, semester_id, description, severity, behavior_date
)
SELECT
  st.id,
  bc.id,
  CASE WHEN sbr.actor_role = 'teacher' THEN t.id ELSE NULL END,
  CASE WHEN sbr.actor_role = 'supervisor' THEN sup.id ELSE NULL END,
  ay.id,
  sem.id,
  sbr.description,
  sbr.severity,
  sbr.behavior_date
FROM seed_behavior_records sbr
JOIN students st ON st.academic_no = sbr.student_academic_no
JOIN behavior_categories bc ON bc.code = sbr.category_code
JOIN academic_years ay ON ay.name = sbr.academic_year_name
JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.name = sbr.semester_name
LEFT JOIN users tu ON sbr.actor_role = 'teacher' AND LOWER(tu.email) = LOWER(sbr.actor_email)
LEFT JOIN teachers t ON t.user_id = tu.id
LEFT JOIN users su ON sbr.actor_role = 'supervisor' AND LOWER(su.email) = LOWER(sbr.actor_email)
LEFT JOIN supervisors sup ON sup.user_id = su.id
WHERE NOT EXISTS (
  SELECT 1
  FROM behavior_records br
  WHERE br.description = sbr.description
)
ON CONFLICT DO NOTHING;

-- =========================================================
-- Transport
-- =========================================================

CREATE TEMP TABLE seed_buses (
  plate_number varchar(30) PRIMARY KEY,
  driver_email text NOT NULL,
  capacity integer NOT NULL,
  status varchar(30) NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_buses (plate_number, driver_email, capacity, status)
VALUES
  ('SEED-BUS-001', 'seed-driver-01@ishraf.local', 30, 'active'),
  ('SEED-BUS-002', 'seed-driver-02@ishraf.local', 30, 'active'),
  ('SEED-BUS-003', 'seed-driver-03@ishraf.local', 30, 'active');

INSERT INTO buses (plate_number, driver_id, capacity, status)
SELECT sb.plate_number, d.id, sb.capacity, sb.status
FROM seed_buses sb
JOIN users du ON LOWER(du.email) = LOWER(sb.driver_email)
JOIN drivers d ON d.user_id = du.id
ON CONFLICT DO NOTHING;

UPDATE buses b
SET
  driver_id = d.id,
  capacity = sb.capacity,
  status = sb.status
FROM seed_buses sb
JOIN users du ON LOWER(du.email) = LOWER(sb.driver_email)
JOIN drivers d ON d.user_id = du.id
WHERE b.plate_number = sb.plate_number;

CREATE TEMP TABLE seed_routes (
  route_name varchar(100) PRIMARY KEY,
  start_point text NOT NULL,
  end_point text NOT NULL,
  estimated_duration_minutes integer NOT NULL,
  is_active boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_routes (route_name, start_point, end_point, estimated_duration_minutes, is_active)
VALUES
  ('SEED-ROUTE-01', 'North District', 'Campus Gate', 35, true),
  ('SEED-ROUTE-02', 'Central District', 'Campus Gate', 40, true),
  ('SEED-ROUTE-03', 'South District', 'Campus Gate', 45, true);

INSERT INTO routes (route_name, start_point, end_point, estimated_duration_minutes, is_active)
SELECT route_name, start_point, end_point, estimated_duration_minutes, is_active
FROM seed_routes
ON CONFLICT DO NOTHING;

UPDATE routes r
SET
  start_point = sr.start_point,
  end_point = sr.end_point,
  estimated_duration_minutes = sr.estimated_duration_minutes,
  is_active = sr.is_active
FROM seed_routes sr
WHERE r.route_name = sr.route_name;

CREATE TEMP TABLE seed_transport_route_assignments (
  bus_plate varchar(30) PRIMARY KEY,
  route_name varchar(100) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_transport_route_assignments (bus_plate, route_name, start_date, end_date, is_active)
VALUES
  ('SEED-BUS-001', 'SEED-ROUTE-01', DATE '2026-01-01', NULL, true),
  ('SEED-BUS-002', 'SEED-ROUTE-02', DATE '2026-01-01', NULL, true),
  ('SEED-BUS-003', 'SEED-ROUTE-03', DATE '2026-01-01', NULL, true);

INSERT INTO transport_route_assignments (bus_id, route_id, start_date, end_date, is_active)
SELECT b.id, r.id, stra.start_date, stra.end_date, stra.is_active
FROM seed_transport_route_assignments stra
JOIN buses b ON b.plate_number = stra.bus_plate
JOIN routes r ON r.route_name = stra.route_name
WHERE NOT EXISTS (
  SELECT 1
  FROM transport_route_assignments tra
  WHERE tra.bus_id = b.id
)
ON CONFLICT DO NOTHING;

UPDATE transport_route_assignments tra
SET
  route_id = r.id,
  start_date = stra.start_date,
  end_date = stra.end_date,
  is_active = stra.is_active
FROM seed_transport_route_assignments stra
JOIN buses b ON b.plate_number = stra.bus_plate
JOIN routes r ON r.route_name = stra.route_name
WHERE tra.bus_id = b.id;

CREATE TEMP TABLE seed_bus_stops (
  route_name varchar(100) NOT NULL,
  stop_name varchar(100) NOT NULL,
  latitude numeric(10,7) NOT NULL,
  longitude numeric(10,7) NOT NULL,
  stop_order integer NOT NULL,
  PRIMARY KEY (route_name, stop_order)
) ON COMMIT DROP;

INSERT INTO seed_bus_stops (route_name, stop_name, latitude, longitude, stop_order)
VALUES
  ('SEED-ROUTE-01', 'Seed Stop 01-1', 15.4101000, 44.2001000, 1),
  ('SEED-ROUTE-01', 'Seed Stop 01-2', 15.4201000, 44.2101000, 2),
  ('SEED-ROUTE-01', 'Seed Stop 01-3', 15.4301000, 44.2201000, 3),
  ('SEED-ROUTE-02', 'Seed Stop 02-1', 15.5101000, 44.3001000, 1),
  ('SEED-ROUTE-02', 'Seed Stop 02-2', 15.5201000, 44.3101000, 2),
  ('SEED-ROUTE-02', 'Seed Stop 02-3', 15.5301000, 44.3201000, 3),
  ('SEED-ROUTE-03', 'Seed Stop 03-1', 15.6101000, 44.4001000, 1),
  ('SEED-ROUTE-03', 'Seed Stop 03-2', 15.6201000, 44.4101000, 2),
  ('SEED-ROUTE-03', 'Seed Stop 03-3', 15.6301000, 44.4201000, 3);

INSERT INTO bus_stops (route_id, stop_name, latitude, longitude, stop_order)
SELECT r.id, sbs.stop_name, sbs.latitude, sbs.longitude, sbs.stop_order
FROM seed_bus_stops sbs
JOIN routes r ON r.route_name = sbs.route_name
ON CONFLICT DO NOTHING;

UPDATE bus_stops bs
SET
  stop_name = sbs.stop_name,
  latitude = sbs.latitude,
  longitude = sbs.longitude
FROM seed_bus_stops sbs
JOIN routes r ON r.route_name = sbs.route_name
WHERE bs.route_id = r.id
  AND bs.stop_order = sbs.stop_order;

CREATE TEMP TABLE seed_student_bus_assignments (
  student_academic_no varchar(50) PRIMARY KEY,
  route_name varchar(100) NOT NULL,
  stop_order integer NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_student_bus_assignments (student_academic_no, route_name, stop_order, start_date, end_date, is_active)
VALUES
  ('SEED-STU-001', 'SEED-ROUTE-01', 1, DATE '2026-01-01', NULL, true),
  ('SEED-STU-002', 'SEED-ROUTE-01', 2, DATE '2026-01-01', NULL, true),
  ('SEED-STU-003', 'SEED-ROUTE-01', 3, DATE '2026-01-01', NULL, true),
  ('SEED-STU-004', 'SEED-ROUTE-02', 1, DATE '2026-01-01', NULL, true),
  ('SEED-STU-005', 'SEED-ROUTE-02', 2, DATE '2026-01-01', NULL, true),
  ('SEED-STU-006', 'SEED-ROUTE-02', 3, DATE '2026-01-01', NULL, true),
  ('SEED-STU-007', 'SEED-ROUTE-03', 1, DATE '2026-01-01', NULL, true),
  ('SEED-STU-008', 'SEED-ROUTE-03', 2, DATE '2026-01-01', NULL, true),
  ('SEED-STU-009', 'SEED-ROUTE-03', 3, DATE '2026-01-01', NULL, true);

INSERT INTO student_bus_assignments (student_id, route_id, stop_id, start_date, end_date, is_active)
SELECT st.id, r.id, bs.id, ssba.start_date, ssba.end_date, ssba.is_active
FROM seed_student_bus_assignments ssba
JOIN students st ON st.academic_no = ssba.student_academic_no
JOIN routes r ON r.route_name = ssba.route_name
JOIN bus_stops bs ON bs.route_id = r.id AND bs.stop_order = ssba.stop_order
WHERE NOT EXISTS (
  SELECT 1
  FROM student_bus_assignments sba
  WHERE sba.student_id = st.id
    AND sba.is_active = TRUE
)
ON CONFLICT DO NOTHING;

UPDATE student_bus_assignments sba
SET
  route_id = r.id,
  stop_id = bs.id,
  start_date = ssba.start_date,
  end_date = ssba.end_date,
  is_active = ssba.is_active
FROM seed_student_bus_assignments ssba
JOIN students st ON st.academic_no = ssba.student_academic_no
JOIN routes r ON r.route_name = ssba.route_name
JOIN bus_stops bs ON bs.route_id = r.id AND bs.stop_order = ssba.stop_order
WHERE sba.student_id = st.id
  AND sba.is_active = TRUE;

CREATE TEMP TABLE seed_student_transport_home_locations (
  student_academic_no varchar(50) PRIMARY KEY,
  address_label varchar(150),
  address_text text,
  latitude numeric(10,7) NOT NULL,
  longitude numeric(10,7) NOT NULL,
  status varchar(20) NOT NULL,
  notes text
) ON COMMIT DROP;

INSERT INTO seed_student_transport_home_locations (
  student_academic_no, address_label, address_text, latitude, longitude, status, notes
)
VALUES
  ('SEED-STU-001', 'Seed Home 001', 'Seed Home Address 001', 15.4111000, 44.2011000, 'approved', '[Seed HL-01] Approved home location'),
  ('SEED-STU-002', 'Seed Home 002', 'Seed Home Address 002', 15.4211000, 44.2111000, 'approved', '[Seed HL-02] Approved home location'),
  ('SEED-STU-003', 'Seed Home 003', 'Seed Home Address 003', 15.4311000, 44.2211000, 'approved', '[Seed HL-03] Approved home location'),
  ('SEED-STU-004', 'Seed Home 004', 'Seed Home Address 004', 15.5111000, 44.3011000, 'approved', '[Seed HL-04] Approved home location'),
  ('SEED-STU-005', 'Seed Home 005', 'Seed Home Address 005', 15.5211000, 44.3111000, 'approved', '[Seed HL-05] Approved home location'),
  ('SEED-STU-006', 'Seed Home 006', 'Seed Home Address 006', 15.5311000, 44.3211000, 'approved', '[Seed HL-06] Approved home location'),
  ('SEED-STU-007', 'Seed Home 007', 'Seed Home Address 007', 15.6111000, 44.4011000, 'approved', '[Seed HL-07] Approved home location'),
  ('SEED-STU-008', 'Seed Home 008', 'Seed Home Address 008', 15.6211000, 44.4111000, 'approved', '[Seed HL-08] Approved home location'),
  ('SEED-STU-009', 'Seed Home 009', 'Seed Home Address 009', 15.6311000, 44.4211000, 'approved', '[Seed HL-09] Approved home location');

INSERT INTO student_transport_home_locations (
  student_id,
  address_label,
  address_text,
  latitude,
  longitude,
  source,
  status,
  submitted_by_user_id,
  approved_by_user_id,
  approved_at,
  notes
)
SELECT
  st.id,
  shl.address_label,
  shl.address_text,
  shl.latitude,
  shl.longitude,
  'admin',
  shl.status,
  admin_user.id,
  admin_user.id,
  TIMESTAMPTZ '2026-03-18 07:30:00+03',
  shl.notes
FROM seed_student_transport_home_locations shl
JOIN students st ON st.academic_no = shl.student_academic_no
JOIN users admin_user ON LOWER(admin_user.email) = LOWER('seed-admin-01@ishraf.local')
ON CONFLICT (student_id) DO NOTHING;

UPDATE student_transport_home_locations sthl
SET
  address_label = shl.address_label,
  address_text = shl.address_text,
  latitude = shl.latitude,
  longitude = shl.longitude,
  source = 'admin',
  status = shl.status,
  submitted_by_user_id = admin_user.id,
  approved_by_user_id = admin_user.id,
  approved_at = TIMESTAMPTZ '2026-03-18 07:30:00+03',
  notes = shl.notes
FROM seed_student_transport_home_locations shl
JOIN students st ON st.academic_no = shl.student_academic_no
JOIN users admin_user ON LOWER(admin_user.email) = LOWER('seed-admin-01@ishraf.local')
WHERE sthl.student_id = st.id;

CREATE TEMP TABLE seed_trips (
  bus_plate varchar(30) NOT NULL,
  route_name varchar(100) NOT NULL,
  trip_date date NOT NULL,
  trip_type varchar(20) NOT NULL,
  trip_status varchar(30) NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  PRIMARY KEY (bus_plate, route_name, trip_date, trip_type)
) ON COMMIT DROP;

INSERT INTO seed_trips (bus_plate, route_name, trip_date, trip_type, trip_status, started_at, ended_at)
VALUES
  ('SEED-BUS-001', 'SEED-ROUTE-01', DATE '2026-03-20', 'pickup', 'scheduled', NULL, NULL),
  ('SEED-BUS-002', 'SEED-ROUTE-02', DATE '2026-03-20', 'pickup', 'started', TIMESTAMPTZ '2026-03-20 06:30:00+03', NULL),
  ('SEED-BUS-003', 'SEED-ROUTE-03', DATE '2026-03-20', 'dropoff', 'ended', TIMESTAMPTZ '2026-03-20 13:00:00+03', TIMESTAMPTZ '2026-03-20 14:15:00+03');

INSERT INTO trips (bus_id, route_id, trip_date, trip_type, trip_status, started_at, ended_at)
SELECT b.id, r.id, st.trip_date, st.trip_type, st.trip_status, st.started_at, st.ended_at
FROM seed_trips st
JOIN buses b ON b.plate_number = st.bus_plate
JOIN routes r ON r.route_name = st.route_name
WHERE NOT EXISTS (
  SELECT 1
  FROM trips tr
  WHERE tr.bus_id = b.id
    AND tr.route_id = r.id
    AND tr.trip_date = st.trip_date
    AND tr.trip_type = st.trip_type
)
ON CONFLICT DO NOTHING;

UPDATE trips tr
SET
  trip_status = CASE
    WHEN (
      CASE tr.trip_status
        WHEN 'cancelled' THEN 0
        WHEN 'scheduled' THEN 1
        WHEN 'started' THEN 2
        WHEN 'ended' THEN 3
        ELSE -1
      END
    ) > (
      CASE st.trip_status
        WHEN 'cancelled' THEN 0
        WHEN 'scheduled' THEN 1
        WHEN 'started' THEN 2
        WHEN 'ended' THEN 3
        ELSE -1
      END
    )
      THEN tr.trip_status
    ELSE st.trip_status
  END,
  started_at = CASE
    WHEN (
      CASE tr.trip_status
        WHEN 'cancelled' THEN 0
        WHEN 'scheduled' THEN 1
        WHEN 'started' THEN 2
        WHEN 'ended' THEN 3
        ELSE -1
      END
    ) > (
      CASE st.trip_status
        WHEN 'cancelled' THEN 0
        WHEN 'scheduled' THEN 1
        WHEN 'started' THEN 2
        WHEN 'ended' THEN 3
        ELSE -1
      END
    )
      THEN COALESCE(tr.started_at, st.started_at)
    ELSE COALESCE(st.started_at, tr.started_at)
  END,
  ended_at = CASE
    WHEN (
      CASE tr.trip_status
        WHEN 'cancelled' THEN 0
        WHEN 'scheduled' THEN 1
        WHEN 'started' THEN 2
        WHEN 'ended' THEN 3
        ELSE -1
      END
    ) > (
      CASE st.trip_status
        WHEN 'cancelled' THEN 0
        WHEN 'scheduled' THEN 1
        WHEN 'started' THEN 2
        WHEN 'ended' THEN 3
        ELSE -1
      END
    )
      THEN COALESCE(tr.ended_at, st.ended_at)
    ELSE COALESCE(st.ended_at, tr.ended_at)
  END
FROM seed_trips st
JOIN buses b ON b.plate_number = st.bus_plate
JOIN routes r ON r.route_name = st.route_name
WHERE tr.bus_id = b.id
  AND tr.route_id = r.id
  AND tr.trip_date = st.trip_date
  AND tr.trip_type = st.trip_type;

CREATE TEMP TABLE seed_bus_locations (
  bus_plate varchar(30) NOT NULL,
  route_name varchar(100) NOT NULL,
  trip_date date NOT NULL,
  trip_type varchar(20) NOT NULL,
  latitude numeric(10,7) NOT NULL,
  longitude numeric(10,7) NOT NULL,
  recorded_at timestamptz NOT NULL,
  PRIMARY KEY (bus_plate, route_name, trip_date, trip_type, recorded_at)
) ON COMMIT DROP;

INSERT INTO seed_bus_locations (bus_plate, route_name, trip_date, trip_type, latitude, longitude, recorded_at)
VALUES
  ('SEED-BUS-002', 'SEED-ROUTE-02', DATE '2026-03-20', 'pickup', 15.5151000, 44.3051000, TIMESTAMPTZ '2026-03-20 06:40:00+03'),
  ('SEED-BUS-002', 'SEED-ROUTE-02', DATE '2026-03-20', 'pickup', 15.5221000, 44.3121000, TIMESTAMPTZ '2026-03-20 06:50:00+03'),
  ('SEED-BUS-002', 'SEED-ROUTE-02', DATE '2026-03-20', 'pickup', 15.5281000, 44.3181000, TIMESTAMPTZ '2026-03-20 07:00:00+03');

INSERT INTO bus_location_history (trip_id, latitude, longitude, recorded_at)
SELECT tr.id, sbl.latitude, sbl.longitude, sbl.recorded_at
FROM seed_bus_locations sbl
JOIN buses b ON b.plate_number = sbl.bus_plate
JOIN routes r ON r.route_name = sbl.route_name
JOIN trips tr ON tr.bus_id = b.id AND tr.route_id = r.id AND tr.trip_date = sbl.trip_date AND tr.trip_type = sbl.trip_type
WHERE NOT EXISTS (
  SELECT 1
  FROM bus_location_history blh
  WHERE blh.trip_id = tr.id
    AND blh.recorded_at = sbl.recorded_at
);

CREATE TEMP TABLE seed_trip_student_events (
  seed_key text PRIMARY KEY,
  bus_plate varchar(30) NOT NULL,
  route_name varchar(100) NOT NULL,
  trip_date date NOT NULL,
  trip_type varchar(20) NOT NULL,
  student_academic_no varchar(50) NOT NULL,
  event_type varchar(20) NOT NULL,
  stop_order integer,
  event_time timestamptz NOT NULL,
  notes text
) ON COMMIT DROP;

INSERT INTO seed_trip_student_events (seed_key, bus_plate, route_name, trip_date, trip_type, student_academic_no, event_type, stop_order, event_time, notes)
VALUES
  ('EVT-01', 'SEED-BUS-002', 'SEED-ROUTE-02', DATE '2026-03-20', 'pickup', 'SEED-STU-004', 'boarded', 1, TIMESTAMPTZ '2026-03-20 06:42:00+03', '[Seed EVT-01] Student boarded'),
  ('EVT-02', 'SEED-BUS-002', 'SEED-ROUTE-02', DATE '2026-03-20', 'pickup', 'SEED-STU-005', 'boarded', 2, TIMESTAMPTZ '2026-03-20 06:51:00+03', '[Seed EVT-02] Student boarded'),
  ('EVT-03', 'SEED-BUS-002', 'SEED-ROUTE-02', DATE '2026-03-20', 'pickup', 'SEED-STU-006', 'boarded', 3, TIMESTAMPTZ '2026-03-20 07:01:00+03', '[Seed EVT-03] Student boarded'),
  ('EVT-04', 'SEED-BUS-003', 'SEED-ROUTE-03', DATE '2026-03-20', 'dropoff', 'SEED-STU-007', 'dropped_off', 2, TIMESTAMPTZ '2026-03-20 13:35:00+03', '[Seed EVT-04] Student dropped off'),
  ('EVT-05', 'SEED-BUS-003', 'SEED-ROUTE-03', DATE '2026-03-20', 'dropoff', 'SEED-STU-008', 'dropped_off', 3, TIMESTAMPTZ '2026-03-20 13:50:00+03', '[Seed EVT-05] Student dropped off'),
  ('EVT-06', 'SEED-BUS-003', 'SEED-ROUTE-03', DATE '2026-03-20', 'dropoff', 'SEED-STU-009', 'absent', NULL, TIMESTAMPTZ '2026-03-20 13:55:00+03', '[Seed EVT-06] Student absent');

INSERT INTO trip_student_events (trip_id, student_id, event_type, event_time, stop_id, notes)
SELECT
  tr.id,
  st.id,
  sete.event_type,
  sete.event_time,
  bs.id,
  sete.notes
FROM seed_trip_student_events sete
JOIN buses b ON b.plate_number = sete.bus_plate
JOIN routes r ON r.route_name = sete.route_name
JOIN trips tr ON tr.bus_id = b.id AND tr.route_id = r.id AND tr.trip_date = sete.trip_date AND tr.trip_type = sete.trip_type
JOIN students st ON st.academic_no = sete.student_academic_no
LEFT JOIN bus_stops bs ON bs.route_id = r.id AND bs.stop_order = sete.stop_order
WHERE NOT EXISTS (
  SELECT 1
  FROM trip_student_events tse
  WHERE tse.notes = sete.notes
);

-- =========================================================
-- Communication
-- =========================================================

CREATE TEMP TABLE seed_messages (
  seed_key text PRIMARY KEY,
  sender_email text NOT NULL,
  receiver_email text NOT NULL,
  message_body text NOT NULL,
  sent_at timestamptz NOT NULL,
  read_at timestamptz
) ON COMMIT DROP;

INSERT INTO seed_messages (seed_key, sender_email, receiver_email, message_body, sent_at, read_at)
VALUES
  ('MSG-01', 'seed-teacher-01@ishraf.local', 'seed-parent-01@ishraf.local', '[Seed MSG-01] Weekly follow-up for student 001.', TIMESTAMPTZ '2026-03-18 09:00:00+03', TIMESTAMPTZ '2026-03-18 09:30:00+03'),
  ('MSG-02', 'seed-parent-01@ishraf.local', 'seed-teacher-01@ishraf.local', '[Seed MSG-02] Thank you, I reviewed the update.', TIMESTAMPTZ '2026-03-18 09:40:00+03', TIMESTAMPTZ '2026-03-18 10:00:00+03'),
  ('MSG-03', 'seed-admin-01@ishraf.local', 'seed-teacher-02@ishraf.local', '[Seed MSG-03] Please review the new science quiz setup.', TIMESTAMPTZ '2026-03-18 10:15:00+03', NULL),
  ('MSG-04', 'seed-driver-02@ishraf.local', 'seed-admin-01@ishraf.local', '[Seed MSG-04] Route 02 started successfully.', TIMESTAMPTZ '2026-03-20 06:35:00+03', TIMESTAMPTZ '2026-03-20 06:40:00+03'),
  ('MSG-05', 'seed-supervisor-02@ishraf.local', 'seed-admin-02@ishraf.local', '[Seed MSG-05] Behavior review completed for class SEED-B.', TIMESTAMPTZ '2026-03-19 11:00:00+03', NULL),
  ('MSG-06', 'seed-parent-03@ishraf.local', 'seed-supervisor-03@ishraf.local', '[Seed MSG-06] Requesting a short behavior summary update.', TIMESTAMPTZ '2026-03-19 12:00:00+03', NULL);

INSERT INTO messages (sender_user_id, receiver_user_id, message_body, sent_at, read_at)
SELECT su.id, ru.id, sm.message_body, sm.sent_at, sm.read_at
FROM seed_messages sm
JOIN users su ON LOWER(su.email) = LOWER(sm.sender_email)
JOIN users ru ON LOWER(ru.email) = LOWER(sm.receiver_email)
WHERE NOT EXISTS (
  SELECT 1
  FROM messages m
  WHERE m.message_body = sm.message_body
);

CREATE TEMP TABLE seed_announcements (
  title varchar(150) PRIMARY KEY,
  created_by_email text NOT NULL,
  content text NOT NULL,
  target_role varchar(30),
  published_at timestamptz NOT NULL,
  expires_at timestamptz
) ON COMMIT DROP;

INSERT INTO seed_announcements (title, created_by_email, content, target_role, published_at, expires_at)
VALUES
  ('[Seed ANN-01] General platform notice', 'seed-admin-01@ishraf.local', 'This is a general announcement for all users during frontend development.', NULL, TIMESTAMPTZ '2026-03-18 08:00:00+03', NULL),
  ('[Seed ANN-02] Teachers only reminder', 'seed-admin-01@ishraf.local', 'Please review attendance and homework entries before the end of the week.', 'teacher', TIMESTAMPTZ '2026-03-18 08:15:00+03', TIMESTAMPTZ '2026-04-15 23:59:59+03'),
  ('[Seed ANN-03] Parents only reminder', 'seed-admin-02@ishraf.local', 'Please monitor notifications and homework submissions regularly.', 'parent', TIMESTAMPTZ '2026-03-18 08:30:00+03', TIMESTAMPTZ '2026-04-15 23:59:59+03');

INSERT INTO announcements (created_by, title, content, target_role, published_at, expires_at)
SELECT u.id, sa.title, sa.content, sa.target_role, sa.published_at, sa.expires_at
FROM seed_announcements sa
JOIN users u ON LOWER(u.email) = LOWER(sa.created_by_email)
WHERE NOT EXISTS (
  SELECT 1
  FROM announcements a
  WHERE a.title = sa.title
);

CREATE TEMP TABLE seed_notifications (
  title varchar(150) PRIMARY KEY,
  user_email text NOT NULL,
  message text NOT NULL,
  notification_type varchar(50) NOT NULL,
  reference_type varchar(50),
  reference_id bigint,
  is_read boolean NOT NULL,
  created_at timestamptz NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_notifications (title, user_email, message, notification_type, reference_type, reference_id, is_read, created_at)
VALUES
  ('[Seed NTF-01] Parent attendance alert', 'seed-parent-01@ishraf.local', 'Student 001 was marked absent in the seed attendance dataset.', 'attendance_absent', 'attendance_record', NULL, false, TIMESTAMPTZ '2026-03-13 08:20:00+03'),
  ('[Seed NTF-02] Parent behavior alert', 'seed-parent-02@ishraf.local', 'A behavior note was recorded for Student 004.', 'behavior_negative', 'behavior_record', NULL, false, TIMESTAMPTZ '2026-03-14 11:30:00+03'),
  ('[Seed NTF-03] Parent transport alert', 'seed-parent-03@ishraf.local', 'Student 007 transport activity was updated.', 'transport_student_dropped_off', 'trip_student_event', NULL, true, TIMESTAMPTZ '2026-03-20 13:40:00+03'),
  ('[Seed NTF-04] Teacher message reminder', 'seed-teacher-01@ishraf.local', 'You have unread communication items in the seed dataset.', 'communication_unread', 'message', NULL, false, TIMESTAMPTZ '2026-03-18 09:45:00+03'),
  ('[Seed NTF-05] Teacher operations reminder', 'seed-teacher-02@ishraf.local', 'Seed assessments and homework are available for review.', 'system_alert', NULL, NULL, false, TIMESTAMPTZ '2026-03-18 10:20:00+03'),
  ('[Seed NTF-06] Teacher dashboard note', 'seed-teacher-03@ishraf.local', 'Recent seed behavior and attendance data are ready.', 'system_alert', NULL, NULL, true, TIMESTAMPTZ '2026-03-18 10:25:00+03'),
  ('[Seed NTF-07] Supervisor review note', 'seed-supervisor-02@ishraf.local', 'Behavior review items were seeded for class SEED-B.', 'system_alert', NULL, NULL, false, TIMESTAMPTZ '2026-03-19 11:05:00+03'),
  ('[Seed NTF-08] Driver trip note', 'seed-driver-02@ishraf.local', 'Your seed trip is currently marked as started.', 'transport_trip_started', 'trip', NULL, false, TIMESTAMPTZ '2026-03-20 06:32:00+03'),
  ('[Seed NTF-09] Admin inbox note', 'seed-admin-01@ishraf.local', 'Seed messages, trips, and reporting data are available.', 'system_alert', NULL, NULL, false, TIMESTAMPTZ '2026-03-20 07:10:00+03');

INSERT INTO notifications (user_id, title, message, notification_type, reference_type, reference_id, is_read, created_at)
SELECT u.id, sn.title, sn.message, sn.notification_type, sn.reference_type, sn.reference_id, sn.is_read, sn.created_at
FROM seed_notifications sn
JOIN users u ON LOWER(u.email) = LOWER(sn.user_email)
WHERE NOT EXISTS (
  SELECT 1
  FROM notifications n
  WHERE n.title = sn.title
);

COMMIT;

BEGIN;

SET search_path TO public, pg_temp;

-- =========================================================
-- Arabic staging seed
-- This seed does not create or modify user accounts/passwords.
-- It assumes the current minimal accounts already exist and builds
-- a complete Arabic demo dataset on top of them.
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(email) = LOWER('mod87521@gmail.com') AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Required admin account mod87521@gmail.com was not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(email) = LOWER('marwan-amin-shaban@ishraf.local') AND role = 'teacher'
  ) THEN
    RAISE EXCEPTION 'Required teacher account marwan-amin-shaban@ishraf.local was not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(email) = LOWER('khaled-alarami@ishraf.local') AND role = 'parent'
  ) THEN
    RAISE EXCEPTION 'Required parent account khaled-alarami@ishraf.local was not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(email) = LOWER('hilal-abdullah-almolsi@ishraf.local') AND role = 'driver'
  ) THEN
    RAISE EXCEPTION 'Required driver account hilal-abdullah-almolsi@ishraf.local was not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(email) = LOWER('idris-mashwir@ishraf.local') AND role = 'supervisor'
  ) THEN
    RAISE EXCEPTION 'Required supervisor account idris-mashwir@ishraf.local was not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(email) = LOWER('bassam-ali-ali-nuhailah@ishraf.local') AND role = 'supervisor'
  ) THEN
    RAISE EXCEPTION 'Required supervisor account bassam-ali-ali-nuhailah@ishraf.local was not found.';
  END IF;
END
$$;

-- =========================================================
-- Role profiles
-- =========================================================

CREATE TEMP TABLE seed_parent_profiles (
  email text PRIMARY KEY,
  address text NOT NULL,
  relation_type varchar(50) NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_parent_profiles (email, address, relation_type)
VALUES
  ('khaled-alarami@ishraf.local', 'صنعاء - حي النهضة - شارع الأربعين', 'father');

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
  ('marwan-amin-shaban@ishraf.local', 'اللغة العربية', 'بكالوريوس تربية - لغة عربية', DATE '2024-09-01');

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
  ('idris-mashwir@ishraf.local', 'شؤون الطلاب'),
  ('bassam-ali-ali-nuhailah@ishraf.local', 'المتابعة الأكاديمية');

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
  ('hilal-abdullah-almolsi@ishraf.local', 'DRV-HILAL-001', 'active');

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
  ('العام الدراسي 2024-2025', DATE '2024-09-01', DATE '2025-06-30', false),
  ('العام الدراسي 2025-2026', DATE '2025-09-01', DATE '2026-06-30', true),
  ('العام الدراسي 2026-2027', DATE '2026-09-01', DATE '2027-06-30', false);

UPDATE academic_years
SET is_active = FALSE
WHERE is_active = TRUE
  AND name <> 'العام الدراسي 2025-2026';

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
  ('العام الدراسي 2024-2025', 'الفصل الأول', DATE '2024-09-01', DATE '2025-01-31', false),
  ('العام الدراسي 2024-2025', 'الفصل الثاني', DATE '2025-02-01', DATE '2025-06-30', false),
  ('العام الدراسي 2025-2026', 'الفصل الأول', DATE '2025-09-01', DATE '2026-01-31', false),
  ('العام الدراسي 2025-2026', 'الفصل الثاني', DATE '2026-02-01', DATE '2026-06-30', true),
  ('العام الدراسي 2026-2027', 'الفصل الأول', DATE '2026-09-01', DATE '2027-01-31', false),
  ('العام الدراسي 2026-2027', 'الفصل الثاني', DATE '2027-02-01', DATE '2027-06-30', false);

UPDATE semesters
SET is_active = FALSE
WHERE is_active = TRUE;

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
  ('الصف الثالث', 3),
  ('الصف الرابع', 4),
  ('الصف الخامس', 5),
  ('الصف السادس', 6);

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
  ('الصف الثالث', 'العام الدراسي 2024-2025', 'الثالث', 'أ', 30, false),
  ('الصف الرابع', 'العام الدراسي 2024-2025', 'الرابع', 'أ', 30, false),
  ('الصف الرابع', 'العام الدراسي 2025-2026', 'الرابع', 'أ', 30, true),
  ('الصف الخامس', 'العام الدراسي 2025-2026', 'الخامس', 'أ', 30, true),
  ('الصف الخامس', 'العام الدراسي 2026-2027', 'الخامس', 'أ', 30, true),
  ('الصف السادس', 'العام الدراسي 2026-2027', 'السادس', 'أ', 30, true);

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
  ('AR-G3', 'اللغة العربية', 'الصف الثالث', true),
  ('MA-G3', 'الرياضيات', 'الصف الثالث', true),
  ('SC-G3', 'العلوم', 'الصف الثالث', true),
  ('AR-G4', 'اللغة العربية', 'الصف الرابع', true),
  ('MA-G4', 'الرياضيات', 'الصف الرابع', true),
  ('SC-G4', 'العلوم', 'الصف الرابع', true),
  ('AR-G5', 'اللغة العربية', 'الصف الخامس', true),
  ('MA-G5', 'الرياضيات', 'الصف الخامس', true),
  ('SC-G5', 'العلوم', 'الصف الخامس', true),
  ('AR-G6', 'اللغة العربية', 'الصف السادس', true),
  ('MA-G6', 'الرياضيات', 'الصف السادس', true),
  ('SC-G6', 'العلوم', 'الصف السادس', true);

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

CREATE TEMP TABLE seed_subject_offerings (
  subject_code varchar(50) NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  semester_name varchar(50) NOT NULL,
  is_active boolean NOT NULL,
  PRIMARY KEY (subject_code, academic_year_name, semester_name)
) ON COMMIT DROP;

INSERT INTO seed_subject_offerings (subject_code, academic_year_name, semester_name, is_active)
VALUES
  ('AR-G4', 'العام الدراسي 2025-2026', 'الفصل الأول', true),
  ('MA-G4', 'العام الدراسي 2025-2026', 'الفصل الأول', true),
  ('SC-G4', 'العام الدراسي 2025-2026', 'الفصل الأول', true),
  ('AR-G5', 'العام الدراسي 2025-2026', 'الفصل الأول', true),
  ('MA-G5', 'العام الدراسي 2025-2026', 'الفصل الأول', true),
  ('SC-G5', 'العام الدراسي 2025-2026', 'الفصل الأول', true),
  ('AR-G4', 'العام الدراسي 2025-2026', 'الفصل الثاني', true),
  ('MA-G4', 'العام الدراسي 2025-2026', 'الفصل الثاني', true),
  ('SC-G4', 'العام الدراسي 2025-2026', 'الفصل الثاني', true),
  ('AR-G5', 'العام الدراسي 2025-2026', 'الفصل الثاني', true),
  ('MA-G5', 'العام الدراسي 2025-2026', 'الفصل الثاني', true),
  ('SC-G5', 'العام الدراسي 2025-2026', 'الفصل الثاني', true),
  ('AR-G5', 'العام الدراسي 2026-2027', 'الفصل الأول', true),
  ('MA-G5', 'العام الدراسي 2026-2027', 'الفصل الأول', true),
  ('SC-G5', 'العام الدراسي 2026-2027', 'الفصل الأول', true),
  ('AR-G6', 'العام الدراسي 2026-2027', 'الفصل الأول', true),
  ('MA-G6', 'العام الدراسي 2026-2027', 'الفصل الأول', true),
  ('SC-G6', 'العام الدراسي 2026-2027', 'الفصل الأول', true);

INSERT INTO subject_offerings (subject_id, semester_id, is_active)
SELECT subj.id, sem.id, sso.is_active
FROM seed_subject_offerings sso
JOIN subjects subj ON subj.code = sso.subject_code
JOIN academic_years ay ON ay.name = sso.academic_year_name
JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.name = sso.semester_name
ON CONFLICT DO NOTHING;

UPDATE subject_offerings so
SET is_active = sso.is_active
FROM seed_subject_offerings sso
JOIN subjects subj ON subj.code = sso.subject_code
JOIN academic_years ay ON ay.name = sso.academic_year_name
JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.name = sso.semester_name
WHERE so.subject_id = subj.id
  AND so.semester_id = sem.id;

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
  ('marwan-amin-shaban@ishraf.local', 'الرابع', 'أ', 'AR-G4', 'العام الدراسي 2025-2026'),
  ('marwan-amin-shaban@ishraf.local', 'الرابع', 'أ', 'MA-G4', 'العام الدراسي 2025-2026'),
  ('marwan-amin-shaban@ishraf.local', 'الخامس', 'أ', 'AR-G5', 'العام الدراسي 2025-2026'),
  ('marwan-amin-shaban@ishraf.local', 'الخامس', 'أ', 'SC-G5', 'العام الدراسي 2025-2026'),
  ('marwan-amin-shaban@ishraf.local', 'الخامس', 'أ', 'AR-G5', 'العام الدراسي 2026-2027'),
  ('marwan-amin-shaban@ishraf.local', 'السادس', 'أ', 'AR-G6', 'العام الدراسي 2026-2027');

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
  ('idris-mashwir@ishraf.local', 'الرابع', 'أ', 'العام الدراسي 2025-2026'),
  ('bassam-ali-ali-nuhailah@ishraf.local', 'الخامس', 'أ', 'العام الدراسي 2025-2026'),
  ('idris-mashwir@ishraf.local', 'الخامس', 'أ', 'العام الدراسي 2026-2027'),
  ('bassam-ali-ali-nuhailah@ishraf.local', 'السادس', 'أ', 'العام الدراسي 2026-2027');

INSERT INTO supervisor_classes (supervisor_id, class_id, academic_year_id)
SELECT s.id, c.id, ay.id
FROM seed_supervisor_assignments ssa
JOIN users u ON LOWER(u.email) = LOWER(ssa.supervisor_email)
JOIN supervisors s ON s.user_id = u.id
JOIN academic_years ay ON ay.name = ssa.academic_year_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = ssa.class_name AND c.section = ssa.section
ON CONFLICT DO NOTHING;

-- =========================================================
-- Students, enrollments, parent links, promotions
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
  ('AR-STU-401', 'أحمد خالد العرامي', DATE '2015-01-14', 'male', 'الرابع', 'أ', 'العام الدراسي 2025-2026', 'active', DATE '2025-09-01'),
  ('AR-STU-402', 'ريم خالد العرامي', DATE '2015-03-22', 'female', 'الرابع', 'أ', 'العام الدراسي 2025-2026', 'active', DATE '2025-09-01'),
  ('AR-STU-403', 'يوسف خالد العرامي', DATE '2015-06-05', 'male', 'الرابع', 'أ', 'العام الدراسي 2025-2026', 'active', DATE '2025-09-01'),
  ('AR-STU-501', 'سارة خالد العرامي', DATE '2014-02-11', 'female', 'الخامس', 'أ', 'العام الدراسي 2025-2026', 'active', DATE '2025-09-01'),
  ('AR-STU-502', 'عبد الرحمن خالد العرامي', DATE '2014-05-18', 'male', 'الخامس', 'أ', 'العام الدراسي 2025-2026', 'active', DATE '2025-09-01'),
  ('AR-STU-503', 'جنى خالد العرامي', DATE '2014-09-09', 'female', 'الخامس', 'أ', 'العام الدراسي 2025-2026', 'active', DATE '2025-09-01');

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

CREATE TEMP TABLE seed_student_enrollments (
  student_academic_no varchar(50) NOT NULL,
  academic_year_name varchar(50) NOT NULL,
  class_name varchar(50) NOT NULL,
  section varchar(50) NOT NULL,
  PRIMARY KEY (student_academic_no, academic_year_name)
) ON COMMIT DROP;

INSERT INTO seed_student_enrollments (student_academic_no, academic_year_name, class_name, section)
VALUES
  ('AR-STU-401', 'العام الدراسي 2024-2025', 'الثالث', 'أ'),
  ('AR-STU-401', 'العام الدراسي 2025-2026', 'الرابع', 'أ'),
  ('AR-STU-401', 'العام الدراسي 2026-2027', 'الخامس', 'أ'),
  ('AR-STU-402', 'العام الدراسي 2024-2025', 'الثالث', 'أ'),
  ('AR-STU-402', 'العام الدراسي 2025-2026', 'الرابع', 'أ'),
  ('AR-STU-402', 'العام الدراسي 2026-2027', 'الخامس', 'أ'),
  ('AR-STU-403', 'العام الدراسي 2024-2025', 'الثالث', 'أ'),
  ('AR-STU-403', 'العام الدراسي 2025-2026', 'الرابع', 'أ'),
  ('AR-STU-403', 'العام الدراسي 2026-2027', 'الخامس', 'أ'),
  ('AR-STU-501', 'العام الدراسي 2024-2025', 'الرابع', 'أ'),
  ('AR-STU-501', 'العام الدراسي 2025-2026', 'الخامس', 'أ'),
  ('AR-STU-501', 'العام الدراسي 2026-2027', 'السادس', 'أ'),
  ('AR-STU-502', 'العام الدراسي 2024-2025', 'الرابع', 'أ'),
  ('AR-STU-502', 'العام الدراسي 2025-2026', 'الخامس', 'أ'),
  ('AR-STU-502', 'العام الدراسي 2026-2027', 'السادس', 'أ'),
  ('AR-STU-503', 'العام الدراسي 2024-2025', 'الرابع', 'أ'),
  ('AR-STU-503', 'العام الدراسي 2025-2026', 'الخامس', 'أ'),
  ('AR-STU-503', 'العام الدراسي 2026-2027', 'السادس', 'أ');

INSERT INTO student_academic_enrollments (student_id, academic_year_id, class_id)
SELECT st.id, ay.id, c.id
FROM seed_student_enrollments sse
JOIN students st ON st.academic_no = sse.student_academic_no
JOIN academic_years ay ON ay.name = sse.academic_year_name
JOIN classes c ON c.academic_year_id = ay.id AND c.class_name = sse.class_name AND c.section = sse.section
ON CONFLICT (student_id, academic_year_id) DO UPDATE
SET
  class_id = EXCLUDED.class_id,
  updated_at = CURRENT_TIMESTAMP;

CREATE TEMP TABLE seed_student_parents (
  student_academic_no varchar(50) NOT NULL,
  parent_email text NOT NULL,
  relation_type varchar(50) NOT NULL,
  is_primary boolean NOT NULL,
  PRIMARY KEY (student_academic_no, parent_email)
) ON COMMIT DROP;

INSERT INTO seed_student_parents (student_academic_no, parent_email, relation_type, is_primary)
VALUES
  ('AR-STU-401', 'khaled-alarami@ishraf.local', 'father', true),
  ('AR-STU-402', 'khaled-alarami@ishraf.local', 'father', true),
  ('AR-STU-403', 'khaled-alarami@ishraf.local', 'father', true),
  ('AR-STU-501', 'khaled-alarami@ishraf.local', 'father', true),
  ('AR-STU-502', 'khaled-alarami@ishraf.local', 'father', true),
  ('AR-STU-503', 'khaled-alarami@ishraf.local', 'father', true);

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
  ('AR-STU-501', 'الرابع', 'أ', 'الخامس', 'أ', 'العام الدراسي 2025-2026', TIMESTAMPTZ '2025-09-05 08:00:00+03', '[تهيئة:ترقية-01] ترقية مع بداية العام الدراسي.'),
  ('AR-STU-502', 'الرابع', 'أ', 'الخامس', 'أ', 'العام الدراسي 2025-2026', TIMESTAMPTZ '2025-09-05 08:05:00+03', '[تهيئة:ترقية-02] ترقية مع بداية العام الدراسي.'),
  ('AR-STU-503', 'الرابع', 'أ', 'الخامس', 'أ', 'العام الدراسي 2025-2026', TIMESTAMPTZ '2025-09-05 08:10:00+03', '[تهيئة:ترقية-03] ترقية مع بداية العام الدراسي.');

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
  ('exam', 'اختبار', 'اختبار تحصيلي رئيسي داخل الفصل', true),
  ('quiz', 'اختبار قصير', 'اختبار قصير لقياس الفهم السريع', true),
  ('participation', 'مشاركة صفية', 'تقييم المشاركة والواجبات الشفهية', true);

INSERT INTO assessment_types (code, name, description, is_active)
SELECT code, name, description, is_active
FROM seed_assessment_types
ON CONFLICT DO NOTHING;

UPDATE assessment_types at
SET
  name = sat.name,
  description = sat.description,
  is_active = sat.is_active
FROM seed_assessment_types sat
WHERE at.code = sat.code;

CREATE TEMP TABLE seed_behavior_categories (
  code varchar(30) PRIMARY KEY,
  name varchar(100) NOT NULL,
  behavior_type varchar(20) NOT NULL,
  default_severity integer NOT NULL,
  is_active boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_behavior_categories (code, name, behavior_type, default_severity, is_active)
VALUES
  ('lateness', 'تأخر صباحي', 'negative', 2, true),
  ('participation', 'مشاركة إيجابية', 'positive', 1, true),
  ('disruption', 'إزعاج أثناء الحصة', 'negative', 3, true),
  ('leadership', 'قيادة إيجابية', 'positive', 2, true),
  ('homework_neglect', 'إهمال الواجب', 'negative', 2, true);

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
  ('[تهيئة:تقييم-01] اختبار تشخيصي في اللغة العربية - الصف الرابع أ', 'exam', 'الرابع', 'أ', 'AR-G4', 'marwan-amin-shaban@ishraf.local', 'العام الدراسي 2025-2026', 'الفصل الثاني', 'اختبار تأسيسي لقياس مهارات القراءة والفهم في بداية النصف الثاني.', 100, 30, DATE '2026-03-16', true),
  ('[تهيئة:تقييم-02] اختبار قصير في العلوم - الصف الخامس أ', 'quiz', 'الخامس', 'أ', 'SC-G5', 'marwan-amin-shaban@ishraf.local', 'العام الدراسي 2025-2026', 'الفصل الثاني', 'اختبار قصير حول دورة الماء وأثرها في البيئة.', 25, 10, DATE '2026-03-18', true);

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
  ('[تهيئة:تقييم-01] اختبار تشخيصي في اللغة العربية - الصف الرابع أ', 'AR-STU-401', 86, 'قراءة جيدة مع حاجة بسيطة لتحسين الهمزات.', TIMESTAMPTZ '2026-03-16 10:15:00+03'),
  ('[تهيئة:تقييم-01] اختبار تشخيصي في اللغة العربية - الصف الرابع أ', 'AR-STU-402', 92, 'أداء قوي جدًا في الفهم القرائي.', TIMESTAMPTZ '2026-03-16 10:17:00+03'),
  ('[تهيئة:تقييم-01] اختبار تشخيصي في اللغة العربية - الصف الرابع أ', 'AR-STU-403', 74, 'يحتاج إلى مراجعة علامات الترقيم.', TIMESTAMPTZ '2026-03-16 10:19:00+03'),
  ('[تهيئة:تقييم-02] اختبار قصير في العلوم - الصف الخامس أ', 'AR-STU-501', 21, 'إجابة دقيقة ومنظمة.', TIMESTAMPTZ '2026-03-18 11:05:00+03'),
  ('[تهيئة:تقييم-02] اختبار قصير في العلوم - الصف الخامس أ', 'AR-STU-502', 18, 'فهم جيد مع بعض الأخطاء في المصطلحات.', TIMESTAMPTZ '2026-03-18 11:07:00+03'),
  ('[تهيئة:تقييم-02] اختبار قصير في العلوم - الصف الخامس أ', 'AR-STU-503', 23, 'ممتازة في الشرح العلمي.', TIMESTAMPTZ '2026-03-18 11:09:00+03');

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
  ('[تهيئة:حضور-01] الحصة الأولى - اللغة العربية - الصف الرابع أ', 'الرابع', 'أ', 'AR-G4', 'marwan-amin-shaban@ishraf.local', 'العام الدراسي 2025-2026', 'الفصل الثاني', DATE '2026-03-19', 1, 'جلسة حضور صباحية لمتابعة الانضباط والقراءة.'),
  ('[تهيئة:حضور-02] الحصة الثانية - العلوم - الصف الخامس أ', 'الخامس', 'أ', 'SC-G5', 'marwan-amin-shaban@ishraf.local', 'العام الدراسي 2025-2026', 'الفصل الثاني', DATE '2026-03-20', 2, 'جلسة حضور مرتبطة بتجربة صفية في مادة العلوم.');

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
  ('[تهيئة:حضور-01] الحصة الأولى - اللغة العربية - الصف الرابع أ', 'AR-STU-401', 'late', '[تهيئة:سجل-حضور-01] وصل متأخرًا خمس دقائق.', TIMESTAMPTZ '2026-03-19 08:06:00+03'),
  ('[تهيئة:حضور-01] الحصة الأولى - اللغة العربية - الصف الرابع أ', 'AR-STU-402', 'present', '[تهيئة:سجل-حضور-02] حاضر ومنضبط.', TIMESTAMPTZ '2026-03-19 08:07:00+03'),
  ('[تهيئة:حضور-01] الحصة الأولى - اللغة العربية - الصف الرابع أ', 'AR-STU-403', 'absent', '[تهيئة:سجل-حضور-03] غياب بدون عذر.', TIMESTAMPTZ '2026-03-19 08:08:00+03'),
  ('[تهيئة:حضور-02] الحصة الثانية - العلوم - الصف الخامس أ', 'AR-STU-501', 'present', '[تهيئة:سجل-حضور-04] مشاركة جيدة أثناء التجربة.', TIMESTAMPTZ '2026-03-20 09:12:00+03'),
  ('[تهيئة:حضور-02] الحصة الثانية - العلوم - الصف الخامس أ', 'AR-STU-502', 'excused', '[تهيئة:سجل-حضور-05] عذر صحي موثق.', TIMESTAMPTZ '2026-03-20 09:13:00+03'),
  ('[تهيئة:حضور-02] الحصة الثانية - العلوم - الصف الخامس أ', 'AR-STU-503', 'present', '[تهيئة:سجل-حضور-06] حضرت الجلسة كاملة.', TIMESTAMPTZ '2026-03-20 09:14:00+03');

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
  ('[تهيئة:واجب-01] واجب القراءة المنزلية - الصف الرابع أ', 'marwan-amin-shaban@ishraf.local', 'الرابع', 'أ', 'AR-G4', 'العام الدراسي 2025-2026', 'الفصل الثاني', 'قراءة نص قصير عن الصدق وكتابة خمس جمل تلخص الفكرة الرئيسة.', DATE '2026-03-21', DATE '2026-03-25'),
  ('[تهيئة:واجب-02] واجب الملاحظة العلمية - الصف الخامس أ', 'marwan-amin-shaban@ishraf.local', 'الخامس', 'أ', 'SC-G5', 'العام الدراسي 2025-2026', 'الفصل الثاني', 'ملاحظة تبخر الماء في المنزل وكتابة ثلاث نتائج مختصرة.', DATE '2026-03-22', DATE '2026-03-26');

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
  ('[تهيئة:واجب-01] واجب القراءة المنزلية - الصف الرابع أ', 'AR-STU-401', 'submitted', TIMESTAMPTZ '2026-03-24 18:15:00+03', '[تهيئة:تسليم-01] سُلِّم في الوقت المحدد.'),
  ('[تهيئة:واجب-01] واجب القراءة المنزلية - الصف الرابع أ', 'AR-STU-402', 'submitted', TIMESTAMPTZ '2026-03-24 19:00:00+03', '[تهيئة:تسليم-02] ملخص منظم وواضح.'),
  ('[تهيئة:واجب-01] واجب القراءة المنزلية - الصف الرابع أ', 'AR-STU-403', 'late', TIMESTAMPTZ '2026-03-26 08:30:00+03', '[تهيئة:تسليم-03] تأخر في التسليم يومًا واحدًا.'),
  ('[تهيئة:واجب-02] واجب الملاحظة العلمية - الصف الخامس أ', 'AR-STU-501', 'submitted', TIMESTAMPTZ '2026-03-25 17:40:00+03', '[تهيئة:تسليم-04] إجابة علمية دقيقة.'),
  ('[تهيئة:واجب-02] واجب الملاحظة العلمية - الصف الخامس أ', 'AR-STU-502', 'not_submitted', NULL, '[تهيئة:تسليم-05] لم يصل التسليم حتى الآن.'),
  ('[تهيئة:واجب-02] واجب الملاحظة العلمية - الصف الخامس أ', 'AR-STU-503', 'submitted', TIMESTAMPTZ '2026-03-25 18:05:00+03', '[تهيئة:تسليم-06] تسليم ممتاز مع ملاحظات إضافية.');

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
  ('BR-AR-01', 'AR-STU-401', 'lateness', 'teacher', 'marwan-amin-shaban@ishraf.local', 'العام الدراسي 2025-2026', 'الفصل الثاني', '[تهيئة:سلوك-01] تأخر متكرر في بداية الحصة الأولى.', 2, DATE '2026-03-19'),
  ('BR-AR-02', 'AR-STU-402', 'participation', 'supervisor', 'idris-mashwir@ishraf.local', 'العام الدراسي 2025-2026', 'الفصل الثاني', '[تهيئة:سلوك-02] مشاركة إيجابية وتعاون واضح مع الزميلات.', 1, DATE '2026-03-20'),
  ('BR-AR-03', 'AR-STU-501', 'disruption', 'supervisor', 'bassam-ali-ali-nuhailah@ishraf.local', 'العام الدراسي 2025-2026', 'الفصل الثاني', '[تهيئة:سلوك-03] مقاطعة متكررة أثناء الشرح العملي.', 3, DATE '2026-03-21'),
  ('BR-AR-04', 'AR-STU-502', 'leadership', 'teacher', 'marwan-amin-shaban@ishraf.local', 'العام الدراسي 2025-2026', 'الفصل الثاني', '[تهيئة:سلوك-04] قاد مجموعة العمل بهدوء وتنظيم.', 2, DATE '2026-03-21');

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
  ('BUS-HILAL-01', 'hilal-abdullah-almolsi@ishraf.local', 28, 'active');

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
  ('خط حي النهضة - بوابة المدرسة', 'حي النهضة', 'بوابة المدرسة', 35, true);

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
  ('BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-02-01', NULL, true);

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
  ('خط حي النهضة - بوابة المدرسة', 'محطة مسجد الرحمة', 15.4101000, 44.2001000, 1),
  ('خط حي النهضة - بوابة المدرسة', 'محطة السوق الشرقي', 15.4186000, 44.2084000, 2),
  ('خط حي النهضة - بوابة المدرسة', 'بوابة المدرسة', 15.4253000, 44.2155000, 3);

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
  ('AR-STU-401', 'خط حي النهضة - بوابة المدرسة', 1, DATE '2026-02-01', NULL, true),
  ('AR-STU-402', 'خط حي النهضة - بوابة المدرسة', 2, DATE '2026-02-01', NULL, true),
  ('AR-STU-403', 'خط حي النهضة - بوابة المدرسة', 3, DATE '2026-02-01', NULL, true),
  ('AR-STU-501', 'خط حي النهضة - بوابة المدرسة', 1, DATE '2026-02-01', NULL, true),
  ('AR-STU-502', 'خط حي النهضة - بوابة المدرسة', 2, DATE '2026-02-01', NULL, true),
  ('AR-STU-503', 'خط حي النهضة - بوابة المدرسة', 3, DATE '2026-02-01', NULL, true);

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
  ('AR-STU-401', 'منزل أحمد', 'صنعاء - حي النهضة - جوار مسجد الرحمة', 15.4112000, 44.2011000, 'approved', '[تهيئة:منزل-01] موقع معتمد من الإدارة.'),
  ('AR-STU-402', 'منزل ريم', 'صنعاء - حي النهضة - خلف السوق الشرقي', 15.4189000, 44.2091000, 'approved', '[تهيئة:منزل-02] موقع معتمد من الإدارة.'),
  ('AR-STU-403', 'منزل يوسف', 'صنعاء - حي النهضة - شارع المدارس', 15.4249000, 44.2142000, 'approved', '[تهيئة:منزل-03] موقع معتمد من الإدارة.'),
  ('AR-STU-501', 'منزل سارة', 'صنعاء - حي النهضة - جوار مسجد الرحمة', 15.4118000, 44.2015000, 'approved', '[تهيئة:منزل-04] موقع معتمد من الإدارة.'),
  ('AR-STU-502', 'منزل عبد الرحمن', 'صنعاء - حي النهضة - خلف السوق الشرقي', 15.4192000, 44.2088000, 'approved', '[تهيئة:منزل-05] موقع معتمد من الإدارة.'),
  ('AR-STU-503', 'منزل جنى', 'صنعاء - حي النهضة - شارع المدارس', 15.4251000, 44.2149000, 'approved', '[تهيئة:منزل-06] موقع معتمد من الإدارة.');

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
JOIN users admin_user ON LOWER(admin_user.email) = LOWER('mod87521@gmail.com')
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
JOIN users admin_user ON LOWER(admin_user.email) = LOWER('mod87521@gmail.com')
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
  ('BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'pickup', 'ended', TIMESTAMPTZ '2026-03-31 06:15:00+03', TIMESTAMPTZ '2026-03-31 07:05:00+03'),
  ('BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'dropoff', 'started', TIMESTAMPTZ '2026-03-31 12:45:00+03', NULL);

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
  ('BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'dropoff', 15.4201000, 44.2099000, TIMESTAMPTZ '2026-03-31 12:50:00+03'),
  ('BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'dropoff', 15.4172000, 44.2067000, TIMESTAMPTZ '2026-03-31 13:00:00+03'),
  ('BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'dropoff', 15.4124000, 44.2021000, TIMESTAMPTZ '2026-03-31 13:10:00+03');

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
  ('EVT-AR-01', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'pickup', 'AR-STU-401', 'boarded', 1, TIMESTAMPTZ '2026-03-31 06:20:00+03', '[تهيئة:نقل-حدث-01] صعد أحمد من المحطة الأولى.'),
  ('EVT-AR-02', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'pickup', 'AR-STU-402', 'boarded', 2, TIMESTAMPTZ '2026-03-31 06:28:00+03', '[تهيئة:نقل-حدث-02] صعدت ريم من المحطة الثانية.'),
  ('EVT-AR-03', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'pickup', 'AR-STU-403', 'boarded', 3, TIMESTAMPTZ '2026-03-31 06:35:00+03', '[تهيئة:نقل-حدث-03] صعد يوسف من بوابة المدرسة.'),
  ('EVT-AR-04', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'pickup', 'AR-STU-501', 'boarded', 1, TIMESTAMPTZ '2026-03-31 06:42:00+03', '[تهيئة:نقل-حدث-04] صعدت سارة من المحطة الأولى.'),
  ('EVT-AR-05', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'pickup', 'AR-STU-502', 'boarded', 2, TIMESTAMPTZ '2026-03-31 06:49:00+03', '[تهيئة:نقل-حدث-05] صعد عبد الرحمن من المحطة الثانية.'),
  ('EVT-AR-06', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'pickup', 'AR-STU-503', 'boarded', 3, TIMESTAMPTZ '2026-03-31 06:55:00+03', '[تهيئة:نقل-حدث-06] صعدت جنى من بوابة المدرسة.'),
  ('EVT-AR-07', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'dropoff', 'AR-STU-401', 'dropped_off', 1, TIMESTAMPTZ '2026-03-31 13:05:00+03', '[تهيئة:نقل-حدث-07] نزل أحمد في المحطة الأولى.'),
  ('EVT-AR-08', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'dropoff', 'AR-STU-402', 'dropped_off', 2, TIMESTAMPTZ '2026-03-31 13:12:00+03', '[تهيئة:نقل-حدث-08] نزلت ريم في المحطة الثانية.'),
  ('EVT-AR-09', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'dropoff', 'AR-STU-403', 'dropped_off', 3, TIMESTAMPTZ '2026-03-31 13:18:00+03', '[تهيئة:نقل-حدث-09] نزل يوسف عند بوابة المدرسة.'),
  ('EVT-AR-10', 'BUS-HILAL-01', 'خط حي النهضة - بوابة المدرسة', DATE '2026-03-31', 'dropoff', 'AR-STU-502', 'absent', NULL, TIMESTAMPTZ '2026-03-31 13:20:00+03', '[تهيئة:نقل-حدث-10] عبد الرحمن غاب عن رحلة العودة.');

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

DELETE FROM announcement_target_roles
WHERE announcement_id IN (
  SELECT id
  FROM announcements
  WHERE title LIKE '[تهيئة:%'
);

DELETE FROM announcements
WHERE title LIKE '[تهيئة:%';

DELETE FROM notifications
WHERE title LIKE '[تهيئة:%';

DELETE FROM messages
WHERE message_body LIKE '[تهيئة]%';

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
  ('MSG-AR-01', 'marwan-amin-shaban@ishraf.local', 'khaled-alarami@ishraf.local', '[تهيئة] متابعة الحضور: أحمد تأخر اليوم عن الحصة الأولى ونحتاج تعاون الأسرة.', TIMESTAMPTZ '2026-03-19 11:00:00+03', TIMESTAMPTZ '2026-03-19 11:20:00+03'),
  ('MSG-AR-02', 'khaled-alarami@ishraf.local', 'marwan-amin-shaban@ishraf.local', '[تهيئة] شكرًا، سأتابع الأمر معه هذا المساء وأوافيك بالمستجدات.', TIMESTAMPTZ '2026-03-19 11:35:00+03', TIMESTAMPTZ '2026-03-19 12:00:00+03'),
  ('MSG-AR-03', 'mod87521@gmail.com', 'idris-mashwir@ishraf.local', '[تهيئة] يرجى مراجعة ملاحظات السلوك للصف الرابع أ قبل نهاية اليوم.', TIMESTAMPTZ '2026-03-20 08:30:00+03', NULL),
  ('MSG-AR-04', 'bassam-ali-ali-nuhailah@ishraf.local', 'mod87521@gmail.com', '[تهيئة] تم تحديث متابعة الصف الخامس أ واعتماد جميع الملاحظات.', TIMESTAMPTZ '2026-03-21 10:15:00+03', NULL),
  ('MSG-AR-05', 'hilal-abdullah-almolsi@ishraf.local', 'mod87521@gmail.com', '[تهيئة] انطلقت رحلة الظهيرة من بوابة المدرسة وتم تسجيل أولى النقاط الميدانية.', TIMESTAMPTZ '2026-03-31 12:47:00+03', TIMESTAMPTZ '2026-03-31 12:55:00+03'),
  ('MSG-AR-06', 'mod87521@gmail.com', 'marwan-amin-shaban@ishraf.local', '[تهيئة] تم اعتماد الخطة التشغيلية الحالية للفصل الثاني ويمكنك المتابعة على النظام.', TIMESTAMPTZ '2026-03-18 08:05:00+03', NULL);

INSERT INTO messages (sender_user_id, receiver_user_id, message_body, sent_at, read_at)
SELECT su.id, ru.id, sm.message_body, sm.sent_at, sm.read_at
FROM seed_messages sm
JOIN users su ON LOWER(su.email) = LOWER(sm.sender_email)
JOIN users ru ON LOWER(ru.email) = LOWER(sm.receiver_email);

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
  ('[تهيئة:إعلان-01] إطلاق البيئة العربية التجريبية', 'mod87521@gmail.com', 'تم تجهيز بيئة عربية متكاملة تشمل الهيكل الأكاديمي والطلاب والتشغيل اليومي والنقل والتواصل.', NULL, TIMESTAMPTZ '2026-03-18 07:45:00+03', NULL),
  ('[تهيئة:إعلان-02] متابعة الانضباط والحصص', 'mod87521@gmail.com', 'يرجى من المعلمين والمشرفين مراجعة الحضور والسلوك يوميًا ضمن السياق الأكاديمي النشط.', NULL, TIMESTAMPTZ '2026-03-18 08:00:00+03', TIMESTAMPTZ '2026-04-15 23:59:59+03'),
  ('[تهيئة:إعلان-03] متابعة الأسرة للواجبات', 'mod87521@gmail.com', 'يرجى من أولياء الأمور متابعة الواجبات المنزلية والإشعارات بشكل يومي.', 'parent', TIMESTAMPTZ '2026-03-18 08:10:00+03', TIMESTAMPTZ '2026-04-15 23:59:59+03');

INSERT INTO announcements (created_by, title, content, target_role, published_at, expires_at)
SELECT u.id, sa.title, sa.content, sa.target_role, sa.published_at, sa.expires_at
FROM seed_announcements sa
JOIN users u ON LOWER(u.email) = LOWER(sa.created_by_email);

CREATE TEMP TABLE seed_announcement_target_roles (
  announcement_title varchar(150) NOT NULL,
  target_role varchar(30) NOT NULL,
  PRIMARY KEY (announcement_title, target_role)
) ON COMMIT DROP;

INSERT INTO seed_announcement_target_roles (announcement_title, target_role)
VALUES
  ('[تهيئة:إعلان-02] متابعة الانضباط والحصص', 'teacher'),
  ('[تهيئة:إعلان-02] متابعة الانضباط والحصص', 'supervisor'),
  ('[تهيئة:إعلان-03] متابعة الأسرة للواجبات', 'parent');

INSERT INTO announcement_target_roles (announcement_id, target_role)
SELECT a.id, satr.target_role
FROM seed_announcement_target_roles satr
JOIN announcements a ON a.title = satr.announcement_title
ON CONFLICT (announcement_id, target_role) DO NOTHING;

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
  ('[تهيئة:إشعار-01] تنبيه حضور ولي الأمر', 'khaled-alarami@ishraf.local', 'تم تسجيل غياب يوسف خالد العرامي في حصة اللغة العربية.', 'attendance_absent', 'attendance_record', NULL, false, TIMESTAMPTZ '2026-03-19 08:20:00+03'),
  ('[تهيئة:إشعار-02] تنبيه سلوك ولي الأمر', 'khaled-alarami@ishraf.local', 'تمت إضافة ملاحظة سلوكية تتعلق بسارة خالد العرامي.', 'behavior_negative', 'behavior_record', NULL, false, TIMESTAMPTZ '2026-03-21 10:45:00+03'),
  ('[تهيئة:إشعار-03] تذكير للمعلم', 'marwan-amin-shaban@ishraf.local', 'لديك رسائل غير مقروءة ومهام تشغيلية محدثة للفصل الثاني.', 'communication_unread', 'message', NULL, false, TIMESTAMPTZ '2026-03-19 11:40:00+03'),
  ('[تهيئة:إشعار-04] تنبيه للمشرف', 'idris-mashwir@ishraf.local', 'توجد ملاحظة سلوك إيجابية جديدة في الصف الرابع أ بحاجة للمراجعة.', 'system_alert', NULL, NULL, false, TIMESTAMPTZ '2026-03-20 09:10:00+03'),
  ('[تهيئة:إشعار-05] تنبيه للسائق', 'hilal-abdullah-almolsi@ishraf.local', 'رحلة العودة النشطة لهذا اليوم قيد المتابعة الميدانية.', 'transport_trip_started', 'trip', NULL, false, TIMESTAMPTZ '2026-03-31 12:46:00+03'),
  ('[تهيئة:إشعار-06] ملاحظة للأدمن', 'mod87521@gmail.com', 'تمت تهيئة البيئة العربية الكاملة وأصبحت جاهزة لاختبارات الفرونت.', 'system_alert', NULL, NULL, false, TIMESTAMPTZ '2026-03-31 14:00:00+03');

INSERT INTO notifications (user_id, title, message, notification_type, reference_type, reference_id, is_read, created_at)
SELECT u.id, sn.title, sn.message, sn.notification_type, sn.reference_type, sn.reference_id, sn.is_read, sn.created_at
FROM seed_notifications sn
JOIN users u ON LOWER(u.email) = LOWER(sn.user_email);

COMMIT;

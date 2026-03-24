
---

## DDL PostgreSQL v1 — Part 1

### Core Schema + Users + Academic Structure + Students

```sql
BEGIN;

CREATE SCHEMA IF NOT EXISTS eshraf;
SET search_path TO eshraf, public;

-- =========================================================
-- EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- GENERIC UPDATED_AT FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE users (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name           VARCHAR(150) NOT NULL,
    email               VARCHAR(150),
    phone               VARCHAR(20),
    password_hash       TEXT NOT NULL,
    role                VARCHAR(30) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_users_role
        CHECK (role IN ('admin', 'parent', 'teacher', 'supervisor', 'driver')),

    CONSTRAINT chk_users_email_not_blank
        CHECK (email IS NULL OR btrim(email) <> ''),

    CONSTRAINT chk_users_phone_not_blank
        CHECK (phone IS NULL OR btrim(phone) <> '')
);

CREATE UNIQUE INDEX uq_users_email_not_null
    ON users (lower(email))
    WHERE email IS NOT NULL;

CREATE UNIQUE INDEX uq_users_phone_not_null
    ON users (phone)
    WHERE phone IS NOT NULL;

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_is_active ON users (is_active);

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- PROFILE TABLES
-- =========================================================
CREATE TABLE parents (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE,
    address             TEXT,
    relation_type       VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_parents_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_parents_user_id ON parents (user_id);

CREATE TABLE teachers (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE,
    specialization      VARCHAR(100),
    qualification       VARCHAR(100),
    hire_date           DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_teachers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_teachers_user_id ON teachers (user_id);

CREATE TABLE supervisors (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE,
    department          VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_supervisors_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_supervisors_user_id ON supervisors (user_id);

CREATE TABLE drivers (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE,
    license_number      VARCHAR(50) NOT NULL,
    driver_status       VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_drivers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_drivers_license_number UNIQUE (license_number),

    CONSTRAINT chk_drivers_status
        CHECK (driver_status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX idx_drivers_user_id ON drivers (user_id);
CREATE INDEX idx_drivers_status ON drivers (driver_status);

-- =========================================================
-- ACADEMIC STRUCTURE
-- =========================================================
CREATE TABLE academic_years (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR(50) NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_academic_years_name UNIQUE (name),
    CONSTRAINT chk_academic_years_dates CHECK (end_date > start_date)
);

CREATE UNIQUE INDEX uq_academic_years_one_active
    ON academic_years ((is_active))
    WHERE is_active = TRUE;

CREATE TRIGGER trg_academic_years_set_updated_at
BEFORE UPDATE ON academic_years
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE semesters (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    academic_year_id    BIGINT NOT NULL,
    name                VARCHAR(50) NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_semesters_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_semesters_year_name UNIQUE (academic_year_id, name),
    CONSTRAINT chk_semesters_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_semesters_academic_year_id ON semesters (academic_year_id);
CREATE INDEX idx_semesters_is_active ON semesters (is_active);

CREATE TRIGGER trg_semesters_set_updated_at
BEFORE UPDATE ON semesters
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE grade_levels (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR(50) NOT NULL,
    level_order         INT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_grade_levels_name UNIQUE (name),
    CONSTRAINT uq_grade_levels_order UNIQUE (level_order),
    CONSTRAINT chk_grade_levels_order CHECK (level_order > 0)
);

CREATE TABLE classes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grade_level_id      BIGINT NOT NULL,
    academic_year_id    BIGINT NOT NULL,
    class_name          VARCHAR(100) NOT NULL,
    section             VARCHAR(20) NOT NULL,
    capacity            INT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_classes_grade_level
        FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_classes_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_classes_unique_in_year
        UNIQUE (grade_level_id, academic_year_id, class_name, section),

    CONSTRAINT chk_classes_capacity
        CHECK (capacity IS NULL OR capacity > 0)
);

CREATE INDEX idx_classes_grade_level_id ON classes (grade_level_id);
CREATE INDEX idx_classes_academic_year_id ON classes (academic_year_id);
CREATE INDEX idx_classes_is_active ON classes (is_active);

CREATE TRIGGER trg_classes_set_updated_at
BEFORE UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE subjects (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    grade_level_id      BIGINT NOT NULL,
    code                VARCHAR(30),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_subjects_grade_level
        FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_subjects_grade_level_name
        UNIQUE (grade_level_id, name),

    CONSTRAINT uq_subjects_code UNIQUE (code)
);

CREATE INDEX idx_subjects_grade_level_id ON subjects (grade_level_id);
CREATE INDEX idx_subjects_is_active ON subjects (is_active);

CREATE TRIGGER trg_subjects_set_updated_at
BEFORE UPDATE ON subjects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE teacher_classes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    teacher_id          BIGINT NOT NULL,
    class_id            BIGINT NOT NULL,
    subject_id          BIGINT NOT NULL,
    academic_year_id    BIGINT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_teacher_classes_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_teacher_classes_class
        FOREIGN KEY (class_id) REFERENCES classes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_teacher_classes_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_teacher_classes_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_teacher_classes_teacher_assignment
        UNIQUE (teacher_id, class_id, subject_id, academic_year_id),

    CONSTRAINT uq_teacher_classes_single_teacher_per_subject
        UNIQUE (class_id, subject_id, academic_year_id)
);

CREATE INDEX idx_teacher_classes_teacher_id ON teacher_classes (teacher_id);
CREATE INDEX idx_teacher_classes_class_id ON teacher_classes (class_id);
CREATE INDEX idx_teacher_classes_subject_id ON teacher_classes (subject_id);
CREATE INDEX idx_teacher_classes_academic_year_id ON teacher_classes (academic_year_id);

CREATE TABLE supervisor_classes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supervisor_id       BIGINT NOT NULL,
    class_id            BIGINT NOT NULL,
    academic_year_id    BIGINT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_supervisor_classes_supervisor
        FOREIGN KEY (supervisor_id) REFERENCES supervisors(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_supervisor_classes_class
        FOREIGN KEY (class_id) REFERENCES classes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_supervisor_classes_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_supervisor_classes_assignment
        UNIQUE (supervisor_id, class_id, academic_year_id)
);

CREATE INDEX idx_supervisor_classes_supervisor_id ON supervisor_classes (supervisor_id);
CREATE INDEX idx_supervisor_classes_class_id ON supervisor_classes (class_id);
CREATE INDEX idx_supervisor_classes_academic_year_id ON supervisor_classes (academic_year_id);

-- =========================================================
-- STUDENTS
-- =========================================================
CREATE TABLE students (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    academic_no         VARCHAR(50) NOT NULL,
    full_name           VARCHAR(150) NOT NULL,
    date_of_birth       DATE NOT NULL,
    gender              VARCHAR(10) NOT NULL,
    class_id            BIGINT NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'active',
    enrollment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_students_class
        FOREIGN KEY (class_id) REFERENCES classes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_students_academic_no UNIQUE (academic_no),

    CONSTRAINT chk_students_gender
        CHECK (gender IN ('male', 'female')),

    CONSTRAINT chk_students_status
        CHECK (status IN ('active', 'transferred', 'graduated', 'dropped', 'suspended'))
);

CREATE INDEX idx_students_class_id ON students (class_id);
CREATE INDEX idx_students_status ON students (status);

CREATE TRIGGER trg_students_set_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE student_parents (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    parent_id           BIGINT NOT NULL,
    relation_type       VARCHAR(50) NOT NULL,
    is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_student_parents_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_student_parents_parent
        FOREIGN KEY (parent_id) REFERENCES parents(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_student_parents_pair UNIQUE (student_id, parent_id)
);

CREATE UNIQUE INDEX uq_student_primary_parent
    ON student_parents (student_id)
    WHERE is_primary = TRUE;

CREATE INDEX idx_student_parents_student_id ON student_parents (student_id);
CREATE INDEX idx_student_parents_parent_id ON student_parents (parent_id);

CREATE TABLE student_promotions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    from_class_id       BIGINT NOT NULL,
    to_class_id         BIGINT NOT NULL,
    academic_year_id    BIGINT NOT NULL,
    promoted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes               TEXT,

    CONSTRAINT fk_student_promotions_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_student_promotions_from_class
        FOREIGN KEY (from_class_id) REFERENCES classes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_student_promotions_to_class
        FOREIGN KEY (to_class_id) REFERENCES classes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_student_promotions_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_student_promotions_different_classes
        CHECK (from_class_id <> to_class_id),

    CONSTRAINT uq_student_promotions_unique
        UNIQUE (student_id, from_class_id, to_class_id, academic_year_id)
);

CREATE INDEX idx_student_promotions_student_id ON student_promotions (student_id);
CREATE INDEX idx_student_promotions_academic_year_id ON student_promotions (academic_year_id);

COMMIT;
```

---

## DDL PostgreSQL v1 — Part 2

### Assessments + Attendance + Homework + Behavior

```sql
BEGIN;

SET search_path TO eshraf, public;

-- =========================================================
-- ASSESSMENT TYPES
-- =========================================================
CREATE TABLE assessment_types (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                VARCHAR(30) NOT NULL,
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_assessment_types_code UNIQUE (code),
    CONSTRAINT uq_assessment_types_name UNIQUE (name)
);

-- =========================================================
-- ASSESSMENTS
-- =========================================================
CREATE TABLE assessments (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assessment_type_id  BIGINT NOT NULL,
    class_id            BIGINT NOT NULL,
    subject_id          BIGINT NOT NULL,
    teacher_id          BIGINT NOT NULL,
    academic_year_id    BIGINT NOT NULL,
    semester_id         BIGINT NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    max_score           NUMERIC(6,2) NOT NULL,
    weight              NUMERIC(6,2) NOT NULL DEFAULT 0,
    assessment_date     DATE NOT NULL,
    is_published        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_assessments_type
        FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_assessments_class
        FOREIGN KEY (class_id) REFERENCES classes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_assessments_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_assessments_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_assessments_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_assessments_semester
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_assessments_max_score
        CHECK (max_score > 0),

    CONSTRAINT chk_assessments_weight
        CHECK (weight >= 0)
);

CREATE INDEX idx_assessments_type_id ON assessments (assessment_type_id);
CREATE INDEX idx_assessments_class_id ON assessments (class_id);
CREATE INDEX idx_assessments_subject_id ON assessments (subject_id);
CREATE INDEX idx_assessments_teacher_id ON assessments (teacher_id);
CREATE INDEX idx_assessments_academic_year_id ON assessments (academic_year_id);
CREATE INDEX idx_assessments_semester_id ON assessments (semester_id);
CREATE INDEX idx_assessments_date ON assessments (assessment_date);

CREATE TRIGGER trg_assessments_set_updated_at
BEFORE UPDATE ON assessments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- STUDENT ASSESSMENTS
-- =========================================================
CREATE TABLE student_assessments (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assessment_id       BIGINT NOT NULL,
    student_id          BIGINT NOT NULL,
    score               NUMERIC(6,2) NOT NULL,
    remarks             TEXT,
    graded_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_student_assessments_assessment
        FOREIGN KEY (assessment_id) REFERENCES assessments(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_student_assessments_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_student_assessments_unique
        UNIQUE (assessment_id, student_id),

    CONSTRAINT chk_student_assessments_score_non_negative
        CHECK (score >= 0)
);

CREATE INDEX idx_student_assessments_assessment_id ON student_assessments (assessment_id);
CREATE INDEX idx_student_assessments_student_id ON student_assessments (student_id);

CREATE TRIGGER trg_student_assessments_set_updated_at
BEFORE UPDATE ON student_assessments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- ATTENDANCE SESSIONS
-- =========================================================
CREATE TABLE attendance_sessions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id            BIGINT NOT NULL,
    subject_id          BIGINT NOT NULL,
    teacher_id          BIGINT NOT NULL,
    academic_year_id    BIGINT NOT NULL,
    semester_id         BIGINT NOT NULL,
    session_date        DATE NOT NULL,
    period_no           INT NOT NULL,
    title               VARCHAR(200),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_attendance_sessions_class
        FOREIGN KEY (class_id) REFERENCES classes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_attendance_sessions_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_attendance_sessions_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_attendance_sessions_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_attendance_sessions_semester
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_attendance_sessions_unique
        UNIQUE (class_id, subject_id, teacher_id, academic_year_id, semester_id, session_date, period_no),

    CONSTRAINT chk_attendance_sessions_period_no
        CHECK (period_no > 0)
);

CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions (class_id);
CREATE INDEX idx_attendance_sessions_subject_id ON attendance_sessions (subject_id);
CREATE INDEX idx_attendance_sessions_teacher_id ON attendance_sessions (teacher_id);
CREATE INDEX idx_attendance_sessions_session_date ON attendance_sessions (session_date);

-- =========================================================
-- ATTENDANCE
-- =========================================================
CREATE TABLE attendance (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attendance_session_id   BIGINT NOT NULL,
    student_id              BIGINT NOT NULL,
    status                  VARCHAR(20) NOT NULL,
    notes                   TEXT,
    recorded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_attendance_session
        FOREIGN KEY (attendance_session_id) REFERENCES attendance_sessions(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_attendance_unique
        UNIQUE (attendance_session_id, student_id),

    CONSTRAINT chk_attendance_status
        CHECK (status IN ('present', 'absent', 'late', 'excused'))
);

CREATE INDEX idx_attendance_session_id ON attendance (attendance_session_id);
CREATE INDEX idx_attendance_student_id ON attendance (student_id);
CREATE INDEX idx_attendance_status ON attendance (status);

-- =========================================================
-- HOMEWORK
-- =========================================================
CREATE TABLE homework (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    teacher_id          BIGINT NOT NULL,
    class_id            BIGINT NOT NULL,
    subject_id          BIGINT NOT NULL,
    academic_year_id    BIGINT NOT NULL,
    semester_id         BIGINT NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    assigned_date       DATE NOT NULL,
    due_date            DATE NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_homework_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_homework_class
        FOREIGN KEY (class_id) REFERENCES classes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_homework_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_homework_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_homework_semester
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_homework_dates
        CHECK (due_date >= assigned_date)
);

CREATE INDEX idx_homework_teacher_id ON homework (teacher_id);
CREATE INDEX idx_homework_class_id ON homework (class_id);
CREATE INDEX idx_homework_subject_id ON homework (subject_id);
CREATE INDEX idx_homework_due_date ON homework (due_date);

CREATE TRIGGER trg_homework_set_updated_at
BEFORE UPDATE ON homework
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- HOMEWORK SUBMISSIONS
-- =========================================================
CREATE TABLE homework_submissions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    homework_id         BIGINT NOT NULL,
    student_id          BIGINT NOT NULL,
    status              VARCHAR(30) NOT NULL,
    submitted_at        TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_homework_submissions_homework
        FOREIGN KEY (homework_id) REFERENCES homework(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_homework_submissions_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_homework_submissions_unique
        UNIQUE (homework_id, student_id),

    CONSTRAINT chk_homework_submissions_status
        CHECK (status IN ('submitted', 'not_submitted', 'late'))
);

CREATE INDEX idx_homework_submissions_homework_id ON homework_submissions (homework_id);
CREATE INDEX idx_homework_submissions_student_id ON homework_submissions (student_id);

CREATE TRIGGER trg_homework_submissions_set_updated_at
BEFORE UPDATE ON homework_submissions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- BEHAVIOR CATEGORIES
-- =========================================================
CREATE TABLE behavior_categories (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                VARCHAR(30) NOT NULL,
    name                VARCHAR(100) NOT NULL,
    behavior_type       VARCHAR(20) NOT NULL,
    default_severity    INT NOT NULL DEFAULT 1,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_behavior_categories_code UNIQUE (code),
    CONSTRAINT uq_behavior_categories_name UNIQUE (name),

    CONSTRAINT chk_behavior_categories_type
        CHECK (behavior_type IN ('positive', 'negative')),

    CONSTRAINT chk_behavior_categories_severity
        CHECK (default_severity BETWEEN 1 AND 5)
);

-- =========================================================
-- BEHAVIOR RECORDS
-- =========================================================
CREATE TABLE behavior_records (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id              BIGINT NOT NULL,
    behavior_category_id    BIGINT NOT NULL,
    teacher_id              BIGINT,
    supervisor_id           BIGINT,
    academic_year_id        BIGINT NOT NULL,
    semester_id             BIGINT NOT NULL,
    description             TEXT,
    severity                INT NOT NULL,
    behavior_date           DATE NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_behavior_records_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_behavior_records_category
        FOREIGN KEY (behavior_category_id) REFERENCES behavior_categories(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_behavior_records_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_behavior_records_supervisor
        FOREIGN KEY (supervisor_id) REFERENCES supervisors(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_behavior_records_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_behavior_records_semester
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_behavior_records_actor
        CHECK (teacher_id IS NOT NULL OR supervisor_id IS NOT NULL),

    CONSTRAINT chk_behavior_records_severity
        CHECK (severity BETWEEN 1 AND 5)
);

CREATE INDEX idx_behavior_records_student_id ON behavior_records (student_id);
CREATE INDEX idx_behavior_records_behavior_date ON behavior_records (behavior_date);
CREATE INDEX idx_behavior_records_teacher_id ON behavior_records (teacher_id);
CREATE INDEX idx_behavior_records_supervisor_id ON behavior_records (supervisor_id);
CREATE INDEX idx_behavior_records_category_id ON behavior_records (behavior_category_id);

COMMIT;
```

---

## DDL PostgreSQL v1 — Part 3

### Transport + Communication

```sql
BEGIN;

SET search_path TO eshraf, public;

-- =========================================================
-- BUSES
-- =========================================================
CREATE TABLE buses (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plate_number                VARCHAR(30) NOT NULL,
    driver_id                   BIGINT,
    capacity                    INT NOT NULL,
    status                      VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_buses_driver
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT uq_buses_plate_number UNIQUE (plate_number),

    CONSTRAINT chk_buses_capacity
        CHECK (capacity > 0),

    CONSTRAINT chk_buses_status
        CHECK (status IN ('active', 'inactive', 'maintenance'))
);

CREATE INDEX idx_buses_driver_id ON buses (driver_id);
CREATE INDEX idx_buses_status ON buses (status);

CREATE TRIGGER trg_buses_set_updated_at
BEFORE UPDATE ON buses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- ROUTES
-- =========================================================
CREATE TABLE routes (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    route_name                  VARCHAR(100) NOT NULL,
    start_point                 TEXT NOT NULL,
    end_point                   TEXT NOT NULL,
    estimated_duration_minutes  INT NOT NULL DEFAULT 0,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_routes_name UNIQUE (route_name),

    CONSTRAINT chk_routes_estimated_duration
        CHECK (estimated_duration_minutes >= 0)
);

CREATE INDEX idx_routes_is_active ON routes (is_active);

CREATE TRIGGER trg_routes_set_updated_at
BEFORE UPDATE ON routes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- BUS STOPS
-- =========================================================
CREATE TABLE bus_stops (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    route_id            BIGINT NOT NULL,
    stop_name           VARCHAR(100) NOT NULL,
    latitude            NUMERIC(10,7) NOT NULL,
    longitude           NUMERIC(10,7) NOT NULL,
    stop_order          INT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_bus_stops_route
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_bus_stops_route_order UNIQUE (route_id, stop_order),

    CONSTRAINT chk_bus_stops_latitude
        CHECK (latitude BETWEEN -90 AND 90),

    CONSTRAINT chk_bus_stops_longitude
        CHECK (longitude BETWEEN -180 AND 180),

    CONSTRAINT chk_bus_stops_order
        CHECK (stop_order > 0)
);

CREATE INDEX idx_bus_stops_route_id ON bus_stops (route_id);

-- =========================================================
-- STUDENT BUS ASSIGNMENTS
-- =========================================================
CREATE TABLE student_bus_assignments (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    route_id            BIGINT NOT NULL,
    stop_id             BIGINT NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_student_bus_assignments_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_student_bus_assignments_route
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_student_bus_assignments_stop
        FOREIGN KEY (stop_id) REFERENCES bus_stops(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_student_bus_assignments_dates
        CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE UNIQUE INDEX uq_student_bus_assignments_one_active
    ON student_bus_assignments (student_id)
    WHERE is_active = TRUE;

CREATE INDEX idx_student_bus_assignments_route_id ON student_bus_assignments (route_id);
CREATE INDEX idx_student_bus_assignments_stop_id ON student_bus_assignments (stop_id);

CREATE TRIGGER trg_student_bus_assignments_set_updated_at
BEFORE UPDATE ON student_bus_assignments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TRIPS
-- =========================================================
CREATE TABLE trips (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bus_id              BIGINT NOT NULL,
    route_id            BIGINT NOT NULL,
    trip_date           DATE NOT NULL,
    trip_type           VARCHAR(20) NOT NULL,
    trip_status         VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    started_at          TIMESTAMPTZ,
    ended_at            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_trips_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_trips_route
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_trips_type
        CHECK (trip_type IN ('pickup', 'dropoff')),

    CONSTRAINT chk_trips_status
        CHECK (trip_status IN ('scheduled', 'started', 'ended', 'cancelled')),

    CONSTRAINT chk_trips_time_order
        CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX idx_trips_bus_id ON trips (bus_id);
CREATE INDEX idx_trips_route_id ON trips (route_id);
CREATE INDEX idx_trips_trip_date ON trips (trip_date);
CREATE INDEX idx_trips_trip_status ON trips (trip_status);

CREATE TRIGGER trg_trips_set_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- BUS LOCATION HISTORY
-- =========================================================
CREATE TABLE bus_location_history (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id             BIGINT NOT NULL,
    latitude            NUMERIC(10,7) NOT NULL,
    longitude           NUMERIC(10,7) NOT NULL,
    recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_bus_location_history_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_bus_location_history_latitude
        CHECK (latitude BETWEEN -90 AND 90),

    CONSTRAINT chk_bus_location_history_longitude
        CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX idx_bus_location_history_trip_id ON bus_location_history (trip_id);
CREATE INDEX idx_bus_location_history_trip_recorded_at ON bus_location_history (trip_id, recorded_at);

-- =========================================================
-- TRIP STUDENT EVENTS
-- =========================================================
CREATE TABLE trip_student_events (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id             BIGINT NOT NULL,
    student_id          BIGINT NOT NULL,
    event_type          VARCHAR(20) NOT NULL,
    event_time          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stop_id             BIGINT,
    notes               TEXT,

    CONSTRAINT fk_trip_student_events_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_trip_student_events_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_trip_student_events_stop
        FOREIGN KEY (stop_id) REFERENCES bus_stops(id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT chk_trip_student_events_type
        CHECK (event_type IN ('boarded', 'dropped_off', 'absent'))
);

CREATE INDEX idx_trip_student_events_trip_id ON trip_student_events (trip_id);
CREATE INDEX idx_trip_student_events_student_id ON trip_student_events (student_id);
CREATE INDEX idx_trip_student_events_event_time ON trip_student_events (event_time);

-- =========================================================
-- MESSAGES
-- =========================================================
CREATE TABLE messages (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_user_id      BIGINT NOT NULL,
    receiver_user_id    BIGINT NOT NULL,
    message_body        TEXT NOT NULL,
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at             TIMESTAMPTZ,

    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_messages_receiver
        FOREIGN KEY (receiver_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_messages_not_self
        CHECK (sender_user_id <> receiver_user_id),

    CONSTRAINT chk_messages_body_not_blank
        CHECK (btrim(message_body) <> '')
);

CREATE INDEX idx_messages_sender_user_id ON messages (sender_user_id);
CREATE INDEX idx_messages_receiver_user_id ON messages (receiver_user_id);
CREATE INDEX idx_messages_sent_at ON messages (sent_at);

-- =========================================================
-- ANNOUNCEMENTS
-- =========================================================
CREATE TABLE announcements (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_by          BIGINT NOT NULL,
    title               VARCHAR(150) NOT NULL,
    content             TEXT NOT NULL,
    target_role         VARCHAR(30),
    published_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_announcements_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_announcements_title_not_blank
        CHECK (btrim(title) <> ''),

    CONSTRAINT chk_announcements_content_not_blank
        CHECK (btrim(content) <> ''),

    CONSTRAINT chk_announcements_target_role
        CHECK (
            target_role IS NULL
            OR target_role IN ('admin', 'parent', 'teacher', 'supervisor', 'driver')
        ),

    CONSTRAINT chk_announcements_expiry
        CHECK (expires_at IS NULL OR expires_at >= published_at)
);

CREATE INDEX idx_announcements_created_by ON announcements (created_by);
CREATE INDEX idx_announcements_target_role ON announcements (target_role);
CREATE INDEX idx_announcements_published_at ON announcements (published_at);

CREATE TRIGGER trg_announcements_set_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE notifications (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    title               VARCHAR(150) NOT NULL,
    message             TEXT NOT NULL,
    notification_type   VARCHAR(50) NOT NULL,
    reference_type      VARCHAR(50),
    reference_id        BIGINT,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at             TIMESTAMPTZ,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_notifications_title_not_blank
        CHECK (btrim(title) <> ''),

    CONSTRAINT chk_notifications_message_not_blank
        CHECK (btrim(message) <> ''),

    CONSTRAINT chk_notifications_read_consistency
        CHECK (
            (is_read = FALSE AND read_at IS NULL)
            OR (is_read = TRUE)
        )
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_is_read ON notifications (is_read);
CREATE INDEX idx_notifications_type ON notifications (notification_type);
CREATE INDEX idx_notifications_created_at ON notifications (created_at);

COMMIT;
```

---

# Functions / Triggers v1

```sql
BEGIN;

SET search_path TO eshraf, public;

-- =========================================================
-- 1) ROLE VALIDATION FOR PROFILE TABLES
-- =========================================================

CREATE OR REPLACE FUNCTION validate_user_role(expected_role TEXT, target_user_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    actual_role TEXT;
BEGIN
    SELECT role INTO actual_role
    FROM users
    WHERE id = target_user_id;

    IF actual_role IS NULL THEN
        RAISE EXCEPTION 'User % does not exist', target_user_id;
    END IF;

    IF actual_role <> expected_role THEN
        RAISE EXCEPTION 'User % role mismatch. Expected %, found %',
            target_user_id, expected_role, actual_role;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_validate_parent_role()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM validate_user_role('parent', NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_validate_teacher_role()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM validate_user_role('teacher', NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_validate_supervisor_role()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM validate_user_role('supervisor', NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_validate_driver_role()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM validate_user_role('driver', NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_parent_role_before_ins_upd ON parents;
CREATE TRIGGER validate_parent_role_before_ins_upd
BEFORE INSERT OR UPDATE ON parents
FOR EACH ROW
EXECUTE FUNCTION trg_validate_parent_role();

DROP TRIGGER IF EXISTS validate_teacher_role_before_ins_upd ON teachers;
CREATE TRIGGER validate_teacher_role_before_ins_upd
BEFORE INSERT OR UPDATE ON teachers
FOR EACH ROW
EXECUTE FUNCTION trg_validate_teacher_role();

DROP TRIGGER IF EXISTS validate_supervisor_role_before_ins_upd ON supervisors;
CREATE TRIGGER validate_supervisor_role_before_ins_upd
BEFORE INSERT OR UPDATE ON supervisors
FOR EACH ROW
EXECUTE FUNCTION trg_validate_supervisor_role();

DROP TRIGGER IF EXISTS validate_driver_role_before_ins_upd ON drivers;
CREATE TRIGGER validate_driver_role_before_ins_upd
BEFORE INSERT OR UPDATE ON drivers
FOR EACH ROW
EXECUTE FUNCTION trg_validate_driver_role();

-- =========================================================
-- 2) SEMESTER DATE RANGE MUST FIT ACADEMIC YEAR
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_semester_within_academic_year()
RETURNS TRIGGER AS $$
DECLARE
    ay_start DATE;
    ay_end DATE;
BEGIN
    SELECT start_date, end_date
      INTO ay_start, ay_end
    FROM academic_years
    WHERE id = NEW.academic_year_id;

    IF ay_start IS NULL OR ay_end IS NULL THEN
        RAISE EXCEPTION 'Academic year % not found', NEW.academic_year_id;
    END IF;

    IF NEW.start_date < ay_start OR NEW.end_date > ay_end THEN
        RAISE EXCEPTION
            'Semester dates (%) - (%) must be within academic year dates (%) - (%)',
            NEW.start_date, NEW.end_date, ay_start, ay_end;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_semester_within_academic_year_before_ins_upd ON semesters;
CREATE TRIGGER validate_semester_within_academic_year_before_ins_upd
BEFORE INSERT OR UPDATE ON semesters
FOR EACH ROW
EXECUTE FUNCTION trg_validate_semester_within_academic_year();

-- =========================================================
-- 3) STUDENT ASSESSMENT SCORE MUST NOT EXCEED MAX_SCORE
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_student_assessment_score()
RETURNS TRIGGER AS $$
DECLARE
    v_max_score NUMERIC(6,2);
BEGIN
    SELECT max_score
      INTO v_max_score
    FROM assessments
    WHERE id = NEW.assessment_id;

    IF v_max_score IS NULL THEN
        RAISE EXCEPTION 'Assessment % not found', NEW.assessment_id;
    END IF;

    IF NEW.score > v_max_score THEN
        RAISE EXCEPTION
            'Score % exceeds max_score % for assessment %',
            NEW.score, v_max_score, NEW.assessment_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_student_assessment_score_before_ins_upd ON student_assessments;
CREATE TRIGGER validate_student_assessment_score_before_ins_upd
BEFORE INSERT OR UPDATE ON student_assessments
FOR EACH ROW
EXECUTE FUNCTION trg_validate_student_assessment_score();

-- =========================================================
-- 4) ASSESSMENT SEMESTER MUST BELONG TO SAME ACADEMIC YEAR
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_assessment_semester_year()
RETURNS TRIGGER AS $$
DECLARE
    v_semester_year_id BIGINT;
BEGIN
    SELECT academic_year_id
      INTO v_semester_year_id
    FROM semesters
    WHERE id = NEW.semester_id;

    IF v_semester_year_id IS NULL THEN
        RAISE EXCEPTION 'Semester % not found', NEW.semester_id;
    END IF;

    IF v_semester_year_id <> NEW.academic_year_id THEN
        RAISE EXCEPTION
            'Assessment semester % belongs to academic year %, not %',
            NEW.semester_id, v_semester_year_id, NEW.academic_year_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_assessment_semester_year_before_ins_upd ON assessments;
CREATE TRIGGER validate_assessment_semester_year_before_ins_upd
BEFORE INSERT OR UPDATE ON assessments
FOR EACH ROW
EXECUTE FUNCTION trg_validate_assessment_semester_year();

-- =========================================================
-- 5) ATTENDANCE SESSION SEMESTER MUST BELONG TO SAME ACADEMIC YEAR
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_attendance_session_semester_year()
RETURNS TRIGGER AS $$
DECLARE
    v_semester_year_id BIGINT;
BEGIN
    SELECT academic_year_id
      INTO v_semester_year_id
    FROM semesters
    WHERE id = NEW.semester_id;

    IF v_semester_year_id IS NULL THEN
        RAISE EXCEPTION 'Semester % not found', NEW.semester_id;
    END IF;

    IF v_semester_year_id <> NEW.academic_year_id THEN
        RAISE EXCEPTION
            'Attendance session semester % belongs to academic year %, not %',
            NEW.semester_id, v_semester_year_id, NEW.academic_year_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_attendance_session_semester_year_before_ins_upd ON attendance_sessions;
CREATE TRIGGER validate_attendance_session_semester_year_before_ins_upd
BEFORE INSERT OR UPDATE ON attendance_sessions
FOR EACH ROW
EXECUTE FUNCTION trg_validate_attendance_session_semester_year();

-- =========================================================
-- 6) HOMEWORK SEMESTER MUST BELONG TO SAME ACADEMIC YEAR
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_homework_semester_year()
RETURNS TRIGGER AS $$
DECLARE
    v_semester_year_id BIGINT;
BEGIN
    SELECT academic_year_id
      INTO v_semester_year_id
    FROM semesters
    WHERE id = NEW.semester_id;

    IF v_semester_year_id IS NULL THEN
        RAISE EXCEPTION 'Semester % not found', NEW.semester_id;
    END IF;

    IF v_semester_year_id <> NEW.academic_year_id THEN
        RAISE EXCEPTION
            'Homework semester % belongs to academic year %, not %',
            NEW.semester_id, v_semester_year_id, NEW.academic_year_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_homework_semester_year_before_ins_upd ON homework;
CREATE TRIGGER validate_homework_semester_year_before_ins_upd
BEFORE INSERT OR UPDATE ON homework
FOR EACH ROW
EXECUTE FUNCTION trg_validate_homework_semester_year();

-- =========================================================
-- 7) BEHAVIOR RECORD SEMESTER MUST BELONG TO SAME ACADEMIC YEAR
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_behavior_semester_year()
RETURNS TRIGGER AS $$
DECLARE
    v_semester_year_id BIGINT;
BEGIN
    SELECT academic_year_id
      INTO v_semester_year_id
    FROM semesters
    WHERE id = NEW.semester_id;

    IF v_semester_year_id IS NULL THEN
        RAISE EXCEPTION 'Semester % not found', NEW.semester_id;
    END IF;

    IF v_semester_year_id <> NEW.academic_year_id THEN
        RAISE EXCEPTION
            'Behavior record semester % belongs to academic year %, not %',
            NEW.semester_id, v_semester_year_id, NEW.academic_year_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_behavior_semester_year_before_ins_upd ON behavior_records;
CREATE TRIGGER validate_behavior_semester_year_before_ins_upd
BEFORE INSERT OR UPDATE ON behavior_records
FOR EACH ROW
EXECUTE FUNCTION trg_validate_behavior_semester_year();

-- =========================================================
-- 8) STOP MUST BELONG TO ROUTE IN STUDENT BUS ASSIGNMENTS
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_student_bus_assignment_stop_route()
RETURNS TRIGGER AS $$
DECLARE
    v_route_id BIGINT;
BEGIN
    SELECT route_id
      INTO v_route_id
    FROM bus_stops
    WHERE id = NEW.stop_id;

    IF v_route_id IS NULL THEN
        RAISE EXCEPTION 'Bus stop % not found', NEW.stop_id;
    END IF;

    IF v_route_id <> NEW.route_id THEN
        RAISE EXCEPTION
            'Bus stop % belongs to route %, not route %',
            NEW.stop_id, v_route_id, NEW.route_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_student_bus_assignment_stop_route_before_ins_upd ON student_bus_assignments;
CREATE TRIGGER validate_student_bus_assignment_stop_route_before_ins_upd
BEFORE INSERT OR UPDATE ON student_bus_assignments
FOR EACH ROW
EXECUTE FUNCTION trg_validate_student_bus_assignment_stop_route();

-- =========================================================
-- 9) BUS LOCATION CANNOT BE ADDED TO ENDED/CANCELLED TRIP
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_bus_location_trip_status()
RETURNS TRIGGER AS $$
DECLARE
    v_status VARCHAR(30);
BEGIN
    SELECT trip_status
      INTO v_status
    FROM trips
    WHERE id = NEW.trip_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Trip % not found', NEW.trip_id;
    END IF;

    IF v_status IN ('ended', 'cancelled') THEN
        RAISE EXCEPTION
            'Cannot insert location history for trip % with status %',
            NEW.trip_id, v_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_bus_location_trip_status_before_ins ON bus_location_history;
CREATE TRIGGER validate_bus_location_trip_status_before_ins
BEFORE INSERT ON bus_location_history
FOR EACH ROW
EXECUTE FUNCTION trg_validate_bus_location_trip_status();

-- =========================================================
-- 10) TRIP STATUS TRANSITION VALIDATION
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_trip_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.trip_status NOT IN ('scheduled', 'started', 'ended', 'cancelled') THEN
            RAISE EXCEPTION 'Invalid trip status: %', NEW.trip_status;
        END IF;

        IF NEW.trip_status = 'started' AND NEW.started_at IS NULL THEN
            NEW.started_at := NOW();
        END IF;

        IF NEW.trip_status = 'ended' THEN
            IF NEW.started_at IS NULL THEN
                RAISE EXCEPTION 'Cannot create ended trip without started_at';
            END IF;
            IF NEW.ended_at IS NULL THEN
                NEW.ended_at := NOW();
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.trip_status = 'scheduled' AND NEW.trip_status = 'started' THEN
            IF NEW.started_at IS NULL THEN
                NEW.started_at := NOW();
            END IF;

        ELSIF OLD.trip_status = 'started' AND NEW.trip_status = 'ended' THEN
            IF COALESCE(NEW.started_at, OLD.started_at) IS NULL THEN
                RAISE EXCEPTION 'Cannot end trip without started_at';
            END IF;

            IF NEW.ended_at IS NULL THEN
                NEW.ended_at := NOW();
            END IF;

        ELSIF OLD.trip_status = 'scheduled' AND NEW.trip_status = 'cancelled' THEN
            NULL;

        ELSIF OLD.trip_status = NEW.trip_status THEN
            NULL;

        ELSE
            RAISE EXCEPTION
                'Invalid trip status transition from % to %',
                OLD.trip_status, NEW.trip_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_trip_status_transition_before_ins_upd ON trips;
CREATE TRIGGER validate_trip_status_transition_before_ins_upd
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION trg_validate_trip_status_transition();

-- =========================================================
-- 11) TRIP STUDENT EVENT VALIDATION
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_trip_student_event()
RETURNS TRIGGER AS $$
DECLARE
    v_trip_status VARCHAR(30);
    v_trip_route_id BIGINT;
    v_assignment_route_id BIGINT;
    v_stop_route_id BIGINT;
BEGIN
    SELECT trip_status, route_id
      INTO v_trip_status, v_trip_route_id
    FROM trips
    WHERE id = NEW.trip_id;

    IF v_trip_status IS NULL THEN
        RAISE EXCEPTION 'Trip % not found', NEW.trip_id;
    END IF;

    IF v_trip_status NOT IN ('started', 'ended') THEN
        RAISE EXCEPTION
            'Cannot record trip student event for trip % with status %',
            NEW.trip_id, v_trip_status;
    END IF;

    SELECT route_id
      INTO v_assignment_route_id
    FROM student_bus_assignments
    WHERE student_id = NEW.student_id
      AND is_active = TRUE
    ORDER BY id DESC
    LIMIT 1;

    IF v_assignment_route_id IS NULL THEN
        RAISE EXCEPTION
            'Student % has no active bus assignment',
            NEW.student_id;
    END IF;

    IF v_assignment_route_id <> v_trip_route_id THEN
        RAISE EXCEPTION
            'Student % is assigned to route %, but trip % is on route %',
            NEW.student_id, v_assignment_route_id, NEW.trip_id, v_trip_route_id;
    END IF;

    IF NEW.stop_id IS NOT NULL THEN
        SELECT route_id
          INTO v_stop_route_id
        FROM bus_stops
        WHERE id = NEW.stop_id;

        IF v_stop_route_id IS NULL THEN
            RAISE EXCEPTION 'Stop % not found', NEW.stop_id;
        END IF;

        IF v_stop_route_id <> v_trip_route_id THEN
            RAISE EXCEPTION
                'Stop % belongs to route %, not trip route %',
                NEW.stop_id, v_stop_route_id, v_trip_route_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_trip_student_event_before_ins_upd ON trip_student_events;
CREATE TRIGGER validate_trip_student_event_before_ins_upd
BEFORE INSERT OR UPDATE ON trip_student_events
FOR EACH ROW
EXECUTE FUNCTION trg_validate_trip_student_event();

-- =========================================================
-- 12) ATTENDANCE STUDENT MUST BELONG TO SESSION CLASS
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_attendance_student_class()
RETURNS TRIGGER AS $$
DECLARE
    v_session_class_id BIGINT;
    v_student_class_id BIGINT;
BEGIN
    SELECT class_id
      INTO v_session_class_id
    FROM attendance_sessions
    WHERE id = NEW.attendance_session_id;

    IF v_session_class_id IS NULL THEN
        RAISE EXCEPTION 'Attendance session % not found', NEW.attendance_session_id;
    END IF;

    SELECT class_id
      INTO v_student_class_id
    FROM students
    WHERE id = NEW.student_id;

    IF v_student_class_id IS NULL THEN
        RAISE EXCEPTION 'Student % not found', NEW.student_id;
    END IF;

    IF v_session_class_id <> v_student_class_id THEN
        RAISE EXCEPTION
            'Student % belongs to class %, but attendance session % is for class %',
            NEW.student_id, v_student_class_id, NEW.attendance_session_id, v_session_class_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_attendance_student_class_before_ins_upd ON attendance;
CREATE TRIGGER validate_attendance_student_class_before_ins_upd
BEFORE INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION trg_validate_attendance_student_class();

-- =========================================================
-- 13) STUDENT ASSESSMENT STUDENT MUST BELONG TO ASSESSMENT CLASS
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_student_assessment_class()
RETURNS TRIGGER AS $$
DECLARE
    v_assessment_class_id BIGINT;
    v_student_class_id BIGINT;
BEGIN
    SELECT class_id
      INTO v_assessment_class_id
    FROM assessments
    WHERE id = NEW.assessment_id;

    IF v_assessment_class_id IS NULL THEN
        RAISE EXCEPTION 'Assessment % not found', NEW.assessment_id;
    END IF;

    SELECT class_id
      INTO v_student_class_id
    FROM students
    WHERE id = NEW.student_id;

    IF v_student_class_id IS NULL THEN
        RAISE EXCEPTION 'Student % not found', NEW.student_id;
    END IF;

    IF v_assessment_class_id <> v_student_class_id THEN
        RAISE EXCEPTION
            'Student % belongs to class %, but assessment % is for class %',
            NEW.student_id, v_student_class_id, NEW.assessment_id, v_assessment_class_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_student_assessment_class_before_ins_upd ON student_assessments;
CREATE TRIGGER validate_student_assessment_class_before_ins_upd
BEFORE INSERT OR UPDATE ON student_assessments
FOR EACH ROW
EXECUTE FUNCTION trg_validate_student_assessment_class();

-- =========================================================
-- 14) HOMEWORK SUBMISSION STUDENT MUST BELONG TO HOMEWORK CLASS
-- =========================================================

CREATE OR REPLACE FUNCTION trg_validate_homework_submission_class()
RETURNS TRIGGER AS $$
DECLARE
    v_homework_class_id BIGINT;
    v_student_class_id BIGINT;
BEGIN
    SELECT class_id
      INTO v_homework_class_id
    FROM homework
    WHERE id = NEW.homework_id;

    IF v_homework_class_id IS NULL THEN
        RAISE EXCEPTION 'Homework % not found', NEW.homework_id;
    END IF;

    SELECT class_id
      INTO v_student_class_id
    FROM students
    WHERE id = NEW.student_id;

    IF v_student_class_id IS NULL THEN
        RAISE EXCEPTION 'Student % not found', NEW.student_id;
    END IF;

    IF v_homework_class_id <> v_student_class_id THEN
        RAISE EXCEPTION
            'Student % belongs to class %, but homework % is for class %',
            NEW.student_id, v_student_class_id, NEW.homework_id, v_homework_class_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_homework_submission_class_before_ins_upd ON homework_submissions;
CREATE TRIGGER validate_homework_submission_class_before_ins_upd
BEFORE INSERT OR UPDATE ON homework_submissions
FOR EACH ROW
EXECUTE FUNCTION trg_validate_homework_submission_class();

-- =========================================================
-- 15) NOTIFICATIONS READ_AT AUTO-HANDLING
-- =========================================================

CREATE OR REPLACE FUNCTION trg_manage_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND NEW.read_at IS NULL THEN
        NEW.read_at := NOW();
    ELSIF NEW.is_read = FALSE THEN
        NEW.read_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manage_notification_read_at_before_ins_upd ON notifications;
CREATE TRIGGER manage_notification_read_at_before_ins_upd
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION trg_manage_notification_read_at();

COMMIT;
```

---

# Views v1

```sql
BEGIN;

SET search_path TO eshraf, public;

-- =========================================================
-- 1) ACTIVE ACADEMIC YEAR
-- =========================================================
CREATE OR REPLACE VIEW vw_active_academic_year AS
SELECT
    ay.id,
    ay.name,
    ay.start_date,
    ay.end_date,
    ay.is_active,
    ay.created_at,
    ay.updated_at
FROM academic_years ay
WHERE ay.is_active = TRUE;

-- =========================================================
-- 2) ACTIVE SEMESTERS
-- =========================================================
CREATE OR REPLACE VIEW vw_active_semesters AS
SELECT
    s.id,
    s.academic_year_id,
    ay.name AS academic_year_name,
    s.name AS semester_name,
    s.start_date,
    s.end_date,
    s.is_active
FROM semesters s
JOIN academic_years ay
  ON ay.id = s.academic_year_id
WHERE s.is_active = TRUE;

-- =========================================================
-- 3) STUDENT BASIC PROFILE
-- =========================================================
CREATE OR REPLACE VIEW vw_student_profiles AS
SELECT
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    st.date_of_birth,
    st.gender,
    st.status AS student_status,
    st.enrollment_date,
    c.id AS class_id,
    c.class_name,
    c.section,
    gl.id AS grade_level_id,
    gl.name AS grade_level_name,
    ay.id AS academic_year_id,
    ay.name AS academic_year_name
FROM students st
JOIN classes c
  ON c.id = st.class_id
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN academic_years ay
  ON ay.id = c.academic_year_id;

-- =========================================================
-- 4) STUDENT PRIMARY PARENT
-- =========================================================
CREATE OR REPLACE VIEW vw_student_primary_parent AS
SELECT
    st.id AS student_id,
    st.full_name AS student_name,
    p.id AS parent_id,
    u.full_name AS parent_name,
    u.email AS parent_email,
    u.phone AS parent_phone,
    sp.relation_type
FROM student_parents sp
JOIN students st
  ON st.id = sp.student_id
JOIN parents p
  ON p.id = sp.parent_id
JOIN users u
  ON u.id = p.user_id
WHERE sp.is_primary = TRUE;

-- =========================================================
-- 5) CLASS STUDENTS
-- =========================================================
CREATE OR REPLACE VIEW vw_class_students AS
SELECT
    c.id AS class_id,
    c.class_name,
    c.section,
    gl.name AS grade_level_name,
    ay.name AS academic_year_name,
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    st.gender,
    st.status AS student_status
FROM classes c
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN academic_years ay
  ON ay.id = c.academic_year_id
JOIN students st
  ON st.class_id = c.id;

-- =========================================================
-- 6) TEACHER CLASS SUBJECT ASSIGNMENTS
-- =========================================================
CREATE OR REPLACE VIEW vw_teacher_assignments AS
SELECT
    tc.id AS teacher_assignment_id,
    t.id AS teacher_id,
    u.full_name AS teacher_name,
    c.id AS class_id,
    c.class_name,
    c.section,
    gl.name AS grade_level_name,
    s.id AS subject_id,
    s.name AS subject_name,
    ay.id AS academic_year_id,
    ay.name AS academic_year_name
FROM teacher_classes tc
JOIN teachers t
  ON t.id = tc.teacher_id
JOIN users u
  ON u.id = t.user_id
JOIN classes c
  ON c.id = tc.class_id
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN subjects s
  ON s.id = tc.subject_id
JOIN academic_years ay
  ON ay.id = tc.academic_year_id;

-- =========================================================
-- 7) SUPERVISOR CLASS ASSIGNMENTS
-- =========================================================
CREATE OR REPLACE VIEW vw_supervisor_assignments AS
SELECT
    sc.id AS supervisor_assignment_id,
    sp.id AS supervisor_id,
    u.full_name AS supervisor_name,
    c.id AS class_id,
    c.class_name,
    c.section,
    gl.name AS grade_level_name,
    ay.id AS academic_year_id,
    ay.name AS academic_year_name
FROM supervisor_classes sc
JOIN supervisors sp
  ON sp.id = sc.supervisor_id
JOIN users u
  ON u.id = sp.user_id
JOIN classes c
  ON c.id = sc.class_id
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN academic_years ay
  ON ay.id = sc.academic_year_id;

-- =========================================================
-- 8) ATTENDANCE DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_attendance_details AS
SELECT
    a.id AS attendance_id,
    ats.id AS attendance_session_id,
    ats.session_date,
    ats.period_no,
    ats.title AS session_title,
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    c.id AS class_id,
    c.class_name,
    c.section,
    subj.id AS subject_id,
    subj.name AS subject_name,
    t.id AS teacher_id,
    tu.full_name AS teacher_name,
    a.status,
    a.notes,
    a.recorded_at,
    ats.academic_year_id,
    ay.name AS academic_year_name,
    ats.semester_id,
    sem.name AS semester_name
FROM attendance a
JOIN attendance_sessions ats
  ON ats.id = a.attendance_session_id
JOIN students st
  ON st.id = a.student_id
JOIN classes c
  ON c.id = ats.class_id
JOIN subjects subj
  ON subj.id = ats.subject_id
JOIN teachers t
  ON t.id = ats.teacher_id
JOIN users tu
  ON tu.id = t.user_id
JOIN academic_years ay
  ON ay.id = ats.academic_year_id
JOIN semesters sem
  ON sem.id = ats.semester_id;

-- =========================================================
-- 9) STUDENT ATTENDANCE SUMMARY
-- =========================================================
CREATE OR REPLACE VIEW vw_student_attendance_summary AS
SELECT
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    c.id AS class_id,
    c.class_name,
    c.section,
    ats.academic_year_id,
    ay.name AS academic_year_name,
    ats.semester_id,
    sem.name AS semester_name,
    COUNT(a.id) AS total_sessions,
    COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE a.status = 'absent') AS absent_count,
    COUNT(*) FILTER (WHERE a.status = 'late') AS late_count,
    COUNT(*) FILTER (WHERE a.status = 'excused') AS excused_count,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE a.status = 'present') / NULLIF(COUNT(a.id), 0),
        2
    ) AS attendance_percentage
FROM attendance a
JOIN attendance_sessions ats
  ON ats.id = a.attendance_session_id
JOIN students st
  ON st.id = a.student_id
JOIN classes c
  ON c.id = st.class_id
JOIN academic_years ay
  ON ay.id = ats.academic_year_id
JOIN semesters sem
  ON sem.id = ats.semester_id
GROUP BY
    st.id, st.academic_no, st.full_name,
    c.id, c.class_name, c.section,
    ats.academic_year_id, ay.name,
    ats.semester_id, sem.name;

-- =========================================================
-- 10) CLASS ATTENDANCE SUMMARY
-- =========================================================
CREATE OR REPLACE VIEW vw_class_attendance_summary AS
SELECT
    c.id AS class_id,
    c.class_name,
    c.section,
    gl.name AS grade_level_name,
    ats.academic_year_id,
    ay.name AS academic_year_name,
    ats.semester_id,
    sem.name AS semester_name,
    subj.id AS subject_id,
    subj.name AS subject_name,
    COUNT(a.id) AS total_records,
    COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE a.status = 'absent') AS absent_count,
    COUNT(*) FILTER (WHERE a.status = 'late') AS late_count,
    COUNT(*) FILTER (WHERE a.status = 'excused') AS excused_count
FROM attendance a
JOIN attendance_sessions ats
  ON ats.id = a.attendance_session_id
JOIN classes c
  ON c.id = ats.class_id
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN subjects subj
  ON subj.id = ats.subject_id
JOIN academic_years ay
  ON ay.id = ats.academic_year_id
JOIN semesters sem
  ON sem.id = ats.semester_id
GROUP BY
    c.id, c.class_name, c.section, gl.name,
    ats.academic_year_id, ay.name,
    ats.semester_id, sem.name,
    subj.id, subj.name;

-- =========================================================
-- 11) ASSESSMENT DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_assessment_details AS
SELECT
    a.id AS assessment_id,
    at.code AS assessment_type_code,
    at.name AS assessment_type_name,
    a.title,
    a.description,
    a.max_score,
    a.weight,
    a.assessment_date,
    a.is_published,
    c.id AS class_id,
    c.class_name,
    c.section,
    subj.id AS subject_id,
    subj.name AS subject_name,
    t.id AS teacher_id,
    tu.full_name AS teacher_name,
    a.academic_year_id,
    ay.name AS academic_year_name,
    a.semester_id,
    sem.name AS semester_name
FROM assessments a
JOIN assessment_types at
  ON at.id = a.assessment_type_id
JOIN classes c
  ON c.id = a.class_id
JOIN subjects subj
  ON subj.id = a.subject_id
JOIN teachers t
  ON t.id = a.teacher_id
JOIN users tu
  ON tu.id = t.user_id
JOIN academic_years ay
  ON ay.id = a.academic_year_id
JOIN semesters sem
  ON sem.id = a.semester_id;

-- =========================================================
-- 12) STUDENT ASSESSMENT DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_student_assessment_details AS
SELECT
    sa.id AS student_assessment_id,
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    a.id AS assessment_id,
    at.code AS assessment_type_code,
    at.name AS assessment_type_name,
    a.title AS assessment_title,
    a.max_score,
    a.weight,
    sa.score,
    ROUND((sa.score / NULLIF(a.max_score, 0)) * 100, 2) AS score_percentage,
    sa.remarks,
    sa.graded_at,
    c.id AS class_id,
    c.class_name,
    c.section,
    subj.id AS subject_id,
    subj.name AS subject_name,
    a.academic_year_id,
    ay.name AS academic_year_name,
    a.semester_id,
    sem.name AS semester_name
FROM student_assessments sa
JOIN assessments a
  ON a.id = sa.assessment_id
JOIN assessment_types at
  ON at.id = a.assessment_type_id
JOIN students st
  ON st.id = sa.student_id
JOIN classes c
  ON c.id = a.class_id
JOIN subjects subj
  ON subj.id = a.subject_id
JOIN academic_years ay
  ON ay.id = a.academic_year_id
JOIN semesters sem
  ON sem.id = a.semester_id;

-- =========================================================
-- 13) STUDENT OVERALL ASSESSMENT SUMMARY
-- =========================================================
CREATE OR REPLACE VIEW vw_student_assessment_summary AS
SELECT
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    c.id AS class_id,
    c.class_name,
    c.section,
    a.academic_year_id,
    ay.name AS academic_year_name,
    a.semester_id,
    sem.name AS semester_name,
    subj.id AS subject_id,
    subj.name AS subject_name,
    COUNT(sa.id) AS total_assessments,
    SUM(sa.score) AS total_score,
    SUM(a.max_score) AS total_max_score,
    ROUND(
        100.0 * SUM(sa.score) / NULLIF(SUM(a.max_score), 0),
        2
    ) AS overall_percentage
FROM student_assessments sa
JOIN assessments a
  ON a.id = sa.assessment_id
JOIN students st
  ON st.id = sa.student_id
JOIN classes c
  ON c.id = a.class_id
JOIN subjects subj
  ON subj.id = a.subject_id
JOIN academic_years ay
  ON ay.id = a.academic_year_id
JOIN semesters sem
  ON sem.id = a.semester_id
GROUP BY
    st.id, st.academic_no, st.full_name,
    c.id, c.class_name, c.section,
    a.academic_year_id, ay.name,
    a.semester_id, sem.name,
    subj.id, subj.name;

-- =========================================================
-- 14) HOMEWORK DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_homework_details AS
SELECT
    h.id AS homework_id,
    h.title,
    h.description,
    h.assigned_date,
    h.due_date,
    c.id AS class_id,
    c.class_name,
    c.section,
    subj.id AS subject_id,
    subj.name AS subject_name,
    t.id AS teacher_id,
    tu.full_name AS teacher_name,
    h.academic_year_id,
    ay.name AS academic_year_name,
    h.semester_id,
    sem.name AS semester_name
FROM homework h
JOIN classes c
  ON c.id = h.class_id
JOIN subjects subj
  ON subj.id = h.subject_id
JOIN teachers t
  ON t.id = h.teacher_id
JOIN users tu
  ON tu.id = t.user_id
JOIN academic_years ay
  ON ay.id = h.academic_year_id
JOIN semesters sem
  ON sem.id = h.semester_id;

-- =========================================================
-- 15) HOMEWORK SUBMISSION DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_homework_submission_details AS
SELECT
    hs.id AS submission_id,
    h.id AS homework_id,
    h.title AS homework_title,
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    hs.status,
    hs.submitted_at,
    hs.notes,
    c.id AS class_id,
    c.class_name,
    c.section,
    subj.id AS subject_id,
    subj.name AS subject_name,
    h.academic_year_id,
    ay.name AS academic_year_name,
    h.semester_id,
    sem.name AS semester_name
FROM homework_submissions hs
JOIN homework h
  ON h.id = hs.homework_id
JOIN students st
  ON st.id = hs.student_id
JOIN classes c
  ON c.id = h.class_id
JOIN subjects subj
  ON subj.id = h.subject_id
JOIN academic_years ay
  ON ay.id = h.academic_year_id
JOIN semesters sem
  ON sem.id = h.semester_id;

-- =========================================================
-- 16) BEHAVIOR DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_behavior_details AS
SELECT
    br.id AS behavior_record_id,
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    bc.id AS behavior_category_id,
    bc.code AS behavior_code,
    bc.name AS behavior_name,
    bc.behavior_type,
    br.severity,
    br.description,
    br.behavior_date,
    br.teacher_id,
    tu.full_name AS teacher_name,
    br.supervisor_id,
    su.full_name AS supervisor_name,
    br.academic_year_id,
    ay.name AS academic_year_name,
    br.semester_id,
    sem.name AS semester_name
FROM behavior_records br
JOIN students st
  ON st.id = br.student_id
JOIN behavior_categories bc
  ON bc.id = br.behavior_category_id
LEFT JOIN teachers t
  ON t.id = br.teacher_id
LEFT JOIN users tu
  ON tu.id = t.user_id
LEFT JOIN supervisors sp
  ON sp.id = br.supervisor_id
LEFT JOIN users su
  ON su.id = sp.user_id
JOIN academic_years ay
  ON ay.id = br.academic_year_id
JOIN semesters sem
  ON sem.id = br.semester_id;

-- =========================================================
-- 17) STUDENT BEHAVIOR SUMMARY
-- =========================================================
CREATE OR REPLACE VIEW vw_student_behavior_summary AS
SELECT
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    br.academic_year_id,
    ay.name AS academic_year_name,
    br.semester_id,
    sem.name AS semester_name,
    COUNT(br.id) AS total_behavior_records,
    COUNT(*) FILTER (WHERE bc.behavior_type = 'positive') AS positive_count,
    COUNT(*) FILTER (WHERE bc.behavior_type = 'negative') AS negative_count,
    COALESCE(SUM(br.severity) FILTER (WHERE bc.behavior_type = 'negative'), 0) AS negative_severity_total
FROM behavior_records br
JOIN students st
  ON st.id = br.student_id
JOIN behavior_categories bc
  ON bc.id = br.behavior_category_id
JOIN academic_years ay
  ON ay.id = br.academic_year_id
JOIN semesters sem
  ON sem.id = br.semester_id
GROUP BY
    st.id, st.academic_no, st.full_name,
    br.academic_year_id, ay.name,
    br.semester_id, sem.name;

-- =========================================================
-- 18) BUS ROUTE STOPS
-- =========================================================
CREATE OR REPLACE VIEW vw_route_stops AS
SELECT
    r.id AS route_id,
    r.route_name,
    bs.id AS stop_id,
    bs.stop_name,
    bs.latitude,
    bs.longitude,
    bs.stop_order
FROM routes r
JOIN bus_stops bs
  ON bs.route_id = r.id;

-- =========================================================
-- 19) ACTIVE STUDENT BUS ASSIGNMENTS
-- =========================================================
CREATE OR REPLACE VIEW vw_active_student_bus_assignments AS
SELECT
    sba.id AS assignment_id,
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    r.id AS route_id,
    r.route_name,
    bs.id AS stop_id,
    bs.stop_name,
    sba.start_date,
    sba.end_date,
    sba.is_active
FROM student_bus_assignments sba
JOIN students st
  ON st.id = sba.student_id
JOIN routes r
  ON r.id = sba.route_id
JOIN bus_stops bs
  ON bs.id = sba.stop_id
WHERE sba.is_active = TRUE;

-- =========================================================
-- 20) TRIP DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_trip_details AS
SELECT
    tr.id AS trip_id,
    tr.trip_date,
    tr.trip_type,
    tr.trip_status,
    tr.started_at,
    tr.ended_at,
    b.id AS bus_id,
    b.plate_number,
    d.id AS driver_id,
    du.full_name AS driver_name,
    r.id AS route_id,
    r.route_name
FROM trips tr
JOIN buses b
  ON b.id = tr.bus_id
LEFT JOIN drivers d
  ON d.id = b.driver_id
LEFT JOIN users du
  ON du.id = d.user_id
JOIN routes r
  ON r.id = tr.route_id;

-- =========================================================
-- 21) LATEST TRIP LOCATION
-- =========================================================
CREATE OR REPLACE VIEW vw_latest_trip_location AS
SELECT DISTINCT ON (blh.trip_id)
    blh.trip_id,
    blh.latitude,
    blh.longitude,
    blh.recorded_at
FROM bus_location_history blh
ORDER BY blh.trip_id, blh.recorded_at DESC;

-- =========================================================
-- 22) ACTIVE TRIP LIVE STATUS
-- =========================================================
CREATE OR REPLACE VIEW vw_active_trip_live_status AS
SELECT
    td.trip_id,
    td.trip_date,
    td.trip_type,
    td.trip_status,
    td.bus_id,
    td.plate_number,
    td.driver_id,
    td.driver_name,
    td.route_id,
    td.route_name,
    l.latitude,
    l.longitude,
    l.recorded_at AS last_location_at
FROM vw_trip_details td
LEFT JOIN vw_latest_trip_location l
  ON l.trip_id = td.trip_id
WHERE td.trip_status = 'started';

-- =========================================================
-- 23) TRIP STUDENT EVENT DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_trip_student_event_details AS
SELECT
    tse.id AS trip_student_event_id,
    tr.id AS trip_id,
    tr.trip_date,
    tr.trip_type,
    tr.trip_status,
    st.id AS student_id,
    st.academic_no,
    st.full_name AS student_name,
    tse.event_type,
    tse.event_time,
    bs.id AS stop_id,
    bs.stop_name,
    tse.notes
FROM trip_student_events tse
JOIN trips tr
  ON tr.id = tse.trip_id
JOIN students st
  ON st.id = tse.student_id
LEFT JOIN bus_stops bs
  ON bs.id = tse.stop_id;

-- =========================================================
-- 24) MESSAGE DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_message_details AS
SELECT
    m.id AS message_id,
    m.sender_user_id,
    su.full_name AS sender_name,
    m.receiver_user_id,
    ru.full_name AS receiver_name,
    m.message_body,
    m.sent_at,
    m.read_at
FROM messages m
JOIN users su
  ON su.id = m.sender_user_id
JOIN users ru
  ON ru.id = m.receiver_user_id;

-- =========================================================
-- 25) USER INBOX SUMMARY
-- =========================================================
CREATE OR REPLACE VIEW vw_user_inbox_summary AS
SELECT
    receiver_user_id AS user_id,
    COUNT(*) AS total_received_messages,
    COUNT(*) FILTER (WHERE read_at IS NULL) AS unread_messages
FROM messages
GROUP BY receiver_user_id;

-- =========================================================
-- 26) ANNOUNCEMENT DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_announcement_details AS
SELECT
    a.id AS announcement_id,
    a.title,
    a.content,
    a.target_role,
    a.published_at,
    a.expires_at,
    a.created_by,
    u.full_name AS created_by_name
FROM announcements a
JOIN users u
  ON u.id = a.created_by;

-- =========================================================
-- 27) ACTIVE ANNOUNCEMENTS
-- =========================================================
CREATE OR REPLACE VIEW vw_active_announcements AS
SELECT
    *
FROM vw_announcement_details
WHERE expires_at IS NULL OR expires_at >= NOW();

-- =========================================================
-- 28) NOTIFICATION DETAILS
-- =========================================================
CREATE OR REPLACE VIEW vw_notification_details AS
SELECT
    n.id AS notification_id,
    n.user_id,
    u.full_name AS user_name,
    n.title,
    n.message,
    n.notification_type,
    n.reference_type,
    n.reference_id,
    n.is_read,
    n.created_at,
    n.read_at
FROM notifications n
JOIN users u
  ON u.id = n.user_id;

-- =========================================================
-- 29) USER NOTIFICATION SUMMARY
-- =========================================================
CREATE OR REPLACE VIEW vw_user_notification_summary AS
SELECT
    user_id,
    COUNT(*) AS total_notifications,
    COUNT(*) FILTER (WHERE is_read = FALSE) AS unread_notifications
FROM notifications
GROUP BY user_id;

-- =========================================================
-- 30) ADMIN DASHBOARD SUMMARY
-- =========================================================
CREATE OR REPLACE VIEW vw_admin_dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_active_users,
    (SELECT COUNT(*) FROM students WHERE status = 'active') AS total_active_students,
    (SELECT COUNT(*) FROM teachers) AS total_teachers,
    (SELECT COUNT(*) FROM supervisors) AS total_supervisors,
    (SELECT COUNT(*) FROM drivers) AS total_drivers,
    (SELECT COUNT(*) FROM classes WHERE is_active = TRUE) AS total_active_classes,
    (SELECT COUNT(*) FROM routes WHERE is_active = TRUE) AS total_active_routes,
    (SELECT COUNT(*) FROM buses WHERE status = 'active') AS total_active_buses,
    (SELECT COUNT(*) FROM trips WHERE trip_status = 'started') AS total_active_trips;

COMMIT;
```

---

---

# Seed Data SQL v1

```sql
BEGIN;

SET search_path TO eshraf, public;

-- =========================================================
-- 1) ASSESSMENT TYPES
-- =========================================================
INSERT INTO assessment_types (code, name, description, is_active)
VALUES
    ('exam', 'Exam', 'Formal written or practical exam', TRUE),
    ('quiz', 'Quiz', 'Short periodic quiz', TRUE),
    ('homework', 'Homework', 'Homework-based assessment', TRUE),
    ('attendance', 'Attendance', 'Attendance-based evaluation', TRUE),
    ('behavior', 'Behavior', 'Behavior-based evaluation', TRUE),
    ('participation', 'Participation', 'Class participation evaluation', TRUE)
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- 2) BEHAVIOR CATEGORIES
-- =========================================================
INSERT INTO behavior_categories (code, name, behavior_type, default_severity, is_active)
VALUES
    ('respect', 'Respect', 'positive', 1, TRUE),
    ('participation', 'Participation', 'positive', 1, TRUE),
    ('leadership', 'Leadership', 'positive', 2, TRUE),
    ('discipline', 'Discipline', 'positive', 1, TRUE),
    ('lateness', 'Lateness', 'negative', 2, TRUE),
    ('disruption', 'Disruption', 'negative', 3, TRUE),
    ('bullying', 'Bullying', 'negative', 5, TRUE),
    ('absence_misconduct', 'Absence Misconduct', 'negative', 3, TRUE)
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- 3) GRADE LEVELS
-- =========================================================
INSERT INTO grade_levels (name, level_order)
VALUES
    ('Grade 1', 1),
    ('Grade 2', 2),
    ('Grade 3', 3),
    ('Grade 4', 4),
    ('Grade 5', 5),
    ('Grade 6', 6),
    ('Grade 7', 7),
    ('Grade 8', 8),
    ('Grade 9', 9),
    ('Grade 10', 10),
    ('Grade 11', 11),
    ('Grade 12', 12)
ON CONFLICT (name) DO NOTHING;

-- =========================================================
-- 4) ACADEMIC YEAR
-- =========================================================
INSERT INTO academic_years (name, start_date, end_date, is_active)
VALUES
    ('2025-2026', DATE '2025-09-01', DATE '2026-06-30', TRUE)
ON CONFLICT (name) DO NOTHING;

-- =========================================================
-- 5) SEMESTERS FOR ACTIVE YEAR
-- =========================================================
INSERT INTO semesters (academic_year_id, name, start_date, end_date, is_active)
SELECT ay.id, 'Semester 1', DATE '2025-09-01', DATE '2026-01-31', FALSE
FROM academic_years ay
WHERE ay.name = '2025-2026'
ON CONFLICT (academic_year_id, name) DO NOTHING;

INSERT INTO semesters (academic_year_id, name, start_date, end_date, is_active)
SELECT ay.id, 'Semester 2', DATE '2026-02-01', DATE '2026-06-30', TRUE
FROM academic_years ay
WHERE ay.name = '2025-2026'
ON CONFLICT (academic_year_id, name) DO NOTHING;

-- =========================================================
-- 6) SUBJECTS FOR SAMPLE GRADE LEVELS
-- =========================================================
INSERT INTO subjects (name, grade_level_id, code, is_active)
SELECT x.subject_name, gl.id, x.subject_code, TRUE
FROM grade_levels gl
JOIN (
    VALUES
        ('Grade 1', 'Mathematics', 'MATH-G1'),
        ('Grade 1', 'Arabic', 'AR-G1'),
        ('Grade 1', 'Science', 'SCI-G1'),
        ('Grade 2', 'Mathematics', 'MATH-G2'),
        ('Grade 2', 'Arabic', 'AR-G2'),
        ('Grade 2', 'Science', 'SCI-G2'),
        ('Grade 3', 'Mathematics', 'MATH-G3'),
        ('Grade 3', 'Arabic', 'AR-G3'),
        ('Grade 3', 'Science', 'SCI-G3')
) AS x(grade_name, subject_name, subject_code)
  ON x.grade_name = gl.name
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- 7) ADMIN USER
-- IMPORTANT: replace password_hash later with real bcrypt hash
-- =========================================================
INSERT INTO users (
    full_name,
    email,
    phone,
    password_hash,
    role,
    is_active
)
VALUES (
    'System Administrator',
    'admin@eshraf.local',
    '700000001',
    '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH',
    'admin',
    TRUE
)
ON CONFLICT DO NOTHING;

-- =========================================================
-- 8) SAMPLE USERS FOR TESTING
-- IMPORTANT: replace password hashes later
-- =========================================================
INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
VALUES
    ('Ahmed Parent', 'parent1@eshraf.local', '700000002', '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'parent', TRUE),
    ('Sara Teacher', 'teacher1@eshraf.local', '700000003', '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'teacher', TRUE),
    ('Mona Supervisor', 'supervisor1@eshraf.local', '700000004', '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'supervisor', TRUE),
    ('Ali Driver', 'driver1@eshraf.local', '700000005', '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'driver', TRUE)
ON CONFLICT DO NOTHING;

-- =========================================================
-- 9) PROFILE RECORDS
-- =========================================================
INSERT INTO parents (user_id, address, relation_type)
SELECT u.id, 'Dhamar - Sample Address', 'father'
FROM users u
WHERE u.email = 'parent1@eshraf.local'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO teachers (user_id, specialization, qualification, hire_date)
SELECT u.id, 'Mathematics', 'Bachelor', DATE '2024-09-01'
FROM users u
WHERE u.email = 'teacher1@eshraf.local'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO supervisors (user_id, department)
SELECT u.id, 'Student Affairs'
FROM users u
WHERE u.email = 'supervisor1@eshraf.local'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO drivers (user_id, license_number, driver_status)
SELECT u.id, 'DRV-0001', 'active'
FROM users u
WHERE u.email = 'driver1@eshraf.local'
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================
-- 10) CLASSES
-- =========================================================
INSERT INTO classes (
    grade_level_id,
    academic_year_id,
    class_name,
    section,
    capacity,
    is_active
)
SELECT
    gl.id,
    ay.id,
    'A',
    'A',
    40,
    TRUE
FROM grade_levels gl
JOIN academic_years ay
  ON ay.name = '2025-2026'
WHERE gl.name IN ('Grade 1', 'Grade 2', 'Grade 3')
ON CONFLICT (grade_level_id, academic_year_id, class_name, section) DO NOTHING;

-- =========================================================
-- 11) TEACHER ASSIGNMENTS
-- assign sample teacher to Grade 1 subjects only
-- =========================================================
INSERT INTO teacher_classes (
    teacher_id,
    class_id,
    subject_id,
    academic_year_id
)
SELECT
    t.id,
    c.id,
    s.id,
    ay.id
FROM teachers t
JOIN users u
  ON u.id = t.user_id
JOIN academic_years ay
  ON ay.name = '2025-2026'
JOIN classes c
  ON c.academic_year_id = ay.id
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN subjects s
  ON s.grade_level_id = gl.id
WHERE u.email = 'teacher1@eshraf.local'
  AND gl.name = 'Grade 1'
ON CONFLICT DO NOTHING;

-- =========================================================
-- 12) SUPERVISOR ASSIGNMENTS
-- =========================================================
INSERT INTO supervisor_classes (
    supervisor_id,
    class_id,
    academic_year_id
)
SELECT
    sp.id,
    c.id,
    ay.id
FROM supervisors sp
JOIN users u
  ON u.id = sp.user_id
JOIN academic_years ay
  ON ay.name = '2025-2026'
JOIN classes c
  ON c.academic_year_id = ay.id
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
WHERE u.email = 'supervisor1@eshraf.local'
  AND gl.name = 'Grade 1'
ON CONFLICT DO NOTHING;

-- =========================================================
-- 13) SAMPLE STUDENTS
-- =========================================================
INSERT INTO students (
    academic_no,
    full_name,
    date_of_birth,
    gender,
    class_id,
    status,
    enrollment_date
)
SELECT
    x.academic_no,
    x.full_name,
    x.date_of_birth,
    x.gender,
    c.id,
    'active',
    DATE '2025-09-01'
FROM classes c
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN academic_years ay
  ON ay.id = c.academic_year_id
JOIN (
    VALUES
        ('STU-1001', 'Student One', DATE '2018-01-10', 'male'),
        ('STU-1002', 'Student Two', DATE '2018-03-15', 'female'),
        ('STU-1003', 'Student Three', DATE '2018-05-20', 'male')
) AS x(academic_no, full_name, date_of_birth, gender)
  ON TRUE
WHERE gl.name = 'Grade 1'
  AND ay.name = '2025-2026'
  AND c.class_name = 'A'
LIMIT 3
ON CONFLICT (academic_no) DO NOTHING;

-- =========================================================
-- 14) LINK STUDENTS TO PARENT
-- =========================================================
INSERT INTO student_parents (
    student_id,
    parent_id,
    relation_type,
    is_primary
)
SELECT
    st.id,
    p.id,
    'father',
    TRUE
FROM students st
CROSS JOIN parents p
JOIN users pu
  ON pu.id = p.user_id
WHERE pu.email = 'parent1@eshraf.local'
  AND st.academic_no IN ('STU-1001', 'STU-1002', 'STU-1003')
ON CONFLICT (student_id, parent_id) DO NOTHING;

-- =========================================================
-- 15) BUSES
-- =========================================================
INSERT INTO buses (
    plate_number,
    driver_id,
    capacity,
    status
)
SELECT
    'BUS-001',
    d.id,
    30,
    'active'
FROM drivers d
JOIN users u
  ON u.id = d.user_id
WHERE u.email = 'driver1@eshraf.local'
ON CONFLICT (plate_number) DO NOTHING;

-- =========================================================
-- 16) ROUTES
-- =========================================================
INSERT INTO routes (
    route_name,
    start_point,
    end_point,
    estimated_duration_minutes,
    is_active
)
VALUES
    ('Route 1', 'School', 'North Area', 35, TRUE)
ON CONFLICT (route_name) DO NOTHING;

-- =========================================================
-- 17) BUS STOPS
-- =========================================================
INSERT INTO bus_stops (
    route_id,
    stop_name,
    latitude,
    longitude,
    stop_order
)
SELECT r.id, x.stop_name, x.latitude, x.longitude, x.stop_order
FROM routes r
JOIN (
    VALUES
        ('Stop 1', 14.5500000, 44.4000000, 1),
        ('Stop 2', 14.5600000, 44.4100000, 2),
        ('Stop 3', 14.5700000, 44.4200000, 3)
) AS x(stop_name, latitude, longitude, stop_order)
  ON TRUE
WHERE r.route_name = 'Route 1'
ON CONFLICT (route_id, stop_order) DO NOTHING;

-- =========================================================
-- 18) STUDENT BUS ASSIGNMENTS
-- assign all sample students to first stop on Route 1
-- =========================================================
INSERT INTO student_bus_assignments (
    student_id,
    route_id,
    stop_id,
    start_date,
    end_date,
    is_active
)
SELECT
    st.id,
    r.id,
    bs.id,
    DATE '2025-09-01',
    NULL,
    TRUE
FROM students st
JOIN routes r
  ON r.route_name = 'Route 1'
JOIN bus_stops bs
  ON bs.route_id = r.id
 AND bs.stop_order = 1
WHERE st.academic_no IN ('STU-1001', 'STU-1002', 'STU-1003')
ON CONFLICT DO NOTHING;

-- =========================================================
-- 19) SAMPLE ASSESSMENT
-- =========================================================
INSERT INTO assessments (
    assessment_type_id,
    class_id,
    subject_id,
    teacher_id,
    academic_year_id,
    semester_id,
    title,
    description,
    max_score,
    weight,
    assessment_date,
    is_published
)
SELECT
    at.id,
    c.id,
    s.id,
    t.id,
    ay.id,
    sem.id,
    'Math Quiz 1',
    'First math quiz',
    20,
    10,
    DATE '2026-02-15',
    TRUE
FROM assessment_types at
JOIN academic_years ay
  ON ay.name = '2025-2026'
JOIN semesters sem
  ON sem.academic_year_id = ay.id
 AND sem.name = 'Semester 2'
JOIN classes c
  ON c.academic_year_id = ay.id
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN subjects s
  ON s.grade_level_id = gl.id
 AND s.name = 'Mathematics'
JOIN teachers t
  ON TRUE
JOIN users tu
  ON tu.id = t.user_id
WHERE at.code = 'quiz'
  AND gl.name = 'Grade 1'
  AND c.class_name = 'A'
  AND tu.email = 'teacher1@eshraf.local'
ON CONFLICT DO NOTHING;

-- =========================================================
-- 20) SAMPLE STUDENT ASSESSMENTS
-- =========================================================
INSERT INTO student_assessments (
    assessment_id,
    student_id,
    score,
    remarks,
    graded_at
)
SELECT
    a.id,
    st.id,
    CASE st.academic_no
        WHEN 'STU-1001' THEN 18
        WHEN 'STU-1002' THEN 16
        WHEN 'STU-1003' THEN 14
        ELSE 10
    END,
    'Initial seeded score',
    NOW()
FROM assessments a
JOIN students st
  ON st.academic_no IN ('STU-1001', 'STU-1002', 'STU-1003')
WHERE a.title = 'Math Quiz 1'
ON CONFLICT (assessment_id, student_id) DO NOTHING;

-- =========================================================
-- 21) SAMPLE ATTENDANCE SESSION
-- =========================================================
INSERT INTO attendance_sessions (
    class_id,
    subject_id,
    teacher_id,
    academic_year_id,
    semester_id,
    session_date,
    period_no,
    title,
    notes
)
SELECT
    c.id,
    s.id,
    t.id,
    ay.id,
    sem.id,
    DATE '2026-02-16',
    1,
    'Math Period 1',
    'Seeded attendance session'
FROM academic_years ay
JOIN semesters sem
  ON sem.academic_year_id = ay.id
 AND sem.name = 'Semester 2'
JOIN classes c
  ON c.academic_year_id = ay.id
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN subjects s
  ON s.grade_level_id = gl.id
 AND s.name = 'Mathematics'
JOIN teachers t
  ON TRUE
JOIN users tu
  ON tu.id = t.user_id
WHERE ay.name = '2025-2026'
  AND gl.name = 'Grade 1'
  AND c.class_name = 'A'
  AND tu.email = 'teacher1@eshraf.local'
ON CONFLICT DO NOTHING;

-- =========================================================
-- 22) SAMPLE ATTENDANCE RECORDS
-- =========================================================
INSERT INTO attendance (
    attendance_session_id,
    student_id,
    status,
    notes
)
SELECT
    ats.id,
    st.id,
    CASE st.academic_no
        WHEN 'STU-1001' THEN 'present'
        WHEN 'STU-1002' THEN 'late'
        WHEN 'STU-1003' THEN 'absent'
        ELSE 'present'
    END,
    'Seeded attendance'
FROM attendance_sessions ats
JOIN students st
  ON st.academic_no IN ('STU-1001', 'STU-1002', 'STU-1003')
WHERE ats.title = 'Math Period 1'
ON CONFLICT (attendance_session_id, student_id) DO NOTHING;

-- =========================================================
-- 23) SAMPLE HOMEWORK
-- =========================================================
INSERT INTO homework (
    teacher_id,
    class_id,
    subject_id,
    academic_year_id,
    semester_id,
    title,
    description,
    assigned_date,
    due_date
)
SELECT
    t.id,
    c.id,
    s.id,
    ay.id,
    sem.id,
    'Homework 1',
    'Solve page 10 exercises',
    DATE '2026-02-16',
    DATE '2026-02-20'
FROM academic_years ay
JOIN semesters sem
  ON sem.academic_year_id = ay.id
 AND sem.name = 'Semester 2'
JOIN classes c
  ON c.academic_year_id = ay.id
JOIN grade_levels gl
  ON gl.id = c.grade_level_id
JOIN subjects s
  ON s.grade_level_id = gl.id
 AND s.name = 'Mathematics'
JOIN teachers t
  ON TRUE
JOIN users tu
  ON tu.id = t.user_id
WHERE ay.name = '2025-2026'
  AND gl.name = 'Grade 1'
  AND c.class_name = 'A'
  AND tu.email = 'teacher1@eshraf.local'
ON CONFLICT DO NOTHING;

-- =========================================================
-- 24) SAMPLE HOMEWORK SUBMISSIONS
-- =========================================================
INSERT INTO homework_submissions (
    homework_id,
    student_id,
    status,
    submitted_at,
    notes
)
SELECT
    h.id,
    st.id,
    CASE st.academic_no
        WHEN 'STU-1001' THEN 'submitted'
        WHEN 'STU-1002' THEN 'late'
        WHEN 'STU-1003' THEN 'not_submitted'
        ELSE 'submitted'
    END,
    CASE
        WHEN st.academic_no IN ('STU-1001', 'STU-1002') THEN NOW()
        ELSE NULL
    END,
    'Seeded homework submission'
FROM homework h
JOIN students st
  ON st.academic_no IN ('STU-1001', 'STU-1002', 'STU-1003')
WHERE h.title = 'Homework 1'
ON CONFLICT (homework_id, student_id) DO NOTHING;

-- =========================================================
-- 25) SAMPLE BEHAVIOR RECORDS
-- =========================================================
INSERT INTO behavior_records (
    student_id,
    behavior_category_id,
    teacher_id,
    supervisor_id,
    academic_year_id,
    semester_id,
    description,
    severity,
    behavior_date
)
SELECT
    st.id,
    bc.id,
    t.id,
    NULL,
    ay.id,
    sem.id,
    'Seeded behavior record',
    bc.default_severity,
    DATE '2026-02-17'
FROM students st
JOIN behavior_categories bc
  ON bc.code IN ('respect', 'lateness')
JOIN teachers t
  ON TRUE
JOIN users tu
  ON tu.id = t.user_id
JOIN academic_years ay
  ON ay.name = '2025-2026'
JOIN semesters sem
  ON sem.academic_year_id = ay.id
 AND sem.name = 'Semester 2'
WHERE st.academic_no IN ('STU-1001', 'STU-1002')
  AND tu.email = 'teacher1@eshraf.local'
ON CONFLICT DO NOTHING;

-- =========================================================
-- 26) SAMPLE ANNOUNCEMENT
-- =========================================================
INSERT INTO announcements (
    created_by,
    title,
    content,
    target_role,
    published_at,
    expires_at
)
SELECT
    u.id,
    'Welcome Announcement',
    'Welcome to Eshraf platform initial setup.',
    NULL,
    NOW(),
    NOW() + INTERVAL '30 days'
FROM users u
WHERE u.email = 'admin@eshraf.local'
ON CONFLICT DO NOTHING;

-- =========================================================
-- 27) SAMPLE NOTIFICATIONS
-- =========================================================
INSERT INTO notifications (
    user_id,
    title,
    message,
    notification_type,
    reference_type,
    reference_id,
    is_read
)
SELECT
    u.id,
    'System Ready',
    'Your account has been initialized successfully.',
    'system',
    NULL,
    NULL,
    FALSE
FROM users u
WHERE u.email IN (
    'admin@eshraf.local',
    'parent1@eshraf.local',
    'teacher1@eshraf.local',
    'supervisor1@eshraf.local',
    'driver1@eshraf.local'
)
ON CONFLICT DO NOTHING;

COMMIT;
```

---

### DDL لجدول `auth_refresh_tokens`

```
BEGIN;

SET search_pathTO eshraf,public;

CREATETABLE auth_refresh_tokens (
    id              BIGINT GENERATED ALWAYSASIDENTITYPRIMARYKEY,
    user_id         BIGINTNOTNULL,
    token_hash      TEXTNOTNULL,
    device_info     TEXT,
    ip_address      INET,
    expires_at      TIMESTAMPTZNOTNULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZNOTNULLDEFAULT NOW(),

CONSTRAINT fk_auth_refresh_tokens_user
FOREIGNKEY (user_id)REFERENCES users(id)
ONUPDATECASCADEONDELETECASCADE
);

CREATE INDEX idx_auth_refresh_tokens_user_id
ON auth_refresh_tokens (user_id);

CREATE INDEX idx_auth_refresh_tokens_expires_at
ON auth_refresh_tokens (expires_at);

CREATE INDEX idx_auth_refresh_tokens_revoked_at
ON auth_refresh_tokens (revoked_at);

COMMIT;
```

---
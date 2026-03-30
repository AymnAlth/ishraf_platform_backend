/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("student_academic_enrollments", {
    id: "id",
    student_id: {
      type: "integer",
      notNull: true,
      references: "students",
      onDelete: "CASCADE"
    },
    academic_year_id: {
      type: "integer",
      notNull: true,
      references: "academic_years",
      onDelete: "CASCADE"
    },
    class_id: {
      type: "integer",
      notNull: true,
      references: "classes",
      onDelete: "CASCADE"
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });

  pgm.createIndex("student_academic_enrollments", "student_id", {
    name: "idx_student_academic_enrollments_student_id"
  });
  pgm.createIndex("student_academic_enrollments", "academic_year_id", {
    name: "idx_student_academic_enrollments_academic_year_id"
  });
  pgm.createIndex("student_academic_enrollments", "class_id", {
    name: "idx_student_academic_enrollments_class_id"
  });
  pgm.createIndex("student_academic_enrollments", ["student_id", "academic_year_id"], {
    name: "uq_student_academic_enrollments_student_year",
    unique: true
  });
  pgm.sql(`
    CREATE TRIGGER trg_student_academic_enrollments_set_updated_at
    BEFORE UPDATE ON student_academic_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.sql(`
    INSERT INTO student_academic_enrollments (
      student_id,
      academic_year_id,
      class_id
    )
    SELECT
      st.id,
      c.academic_year_id,
      st.class_id
    FROM students st
    JOIN classes c ON c.id = st.class_id
    ON CONFLICT (student_id, academic_year_id) DO NOTHING;
  `);

  pgm.sql(`
    WITH active_year AS (
      SELECT id
      FROM academic_years
      WHERE is_active = TRUE
      LIMIT 1
    )
    UPDATE semesters
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND academic_year_id <> COALESCE((SELECT id FROM active_year), academic_year_id);
  `);
  pgm.sql(`
    WITH ranked_active_semesters AS (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY academic_year_id DESC, id DESC) AS rn
      FROM semesters
      WHERE is_active = TRUE
    )
    UPDATE semesters sem
    SET is_active = FALSE
    FROM ranked_active_semesters ranked
    WHERE sem.id = ranked.id
      AND ranked.rn > 1;
  `);
  pgm.sql(
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_semesters_one_active ON semesters (is_active) WHERE is_active = true;"
  );

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_active_academic_context AS
    SELECT
      ay.id AS academic_year_id,
      ay.name AS academic_year_name,
      ay.start_date AS academic_year_start_date,
      ay.end_date AS academic_year_end_date,
      ay.created_at AS academic_year_created_at,
      ay.updated_at AS academic_year_updated_at,
      sem.id AS semester_id,
      sem.name AS semester_name,
      sem.start_date AS semester_start_date,
      sem.end_date AS semester_end_date,
      sem.created_at AS semester_created_at,
      sem.updated_at AS semester_updated_at
    FROM academic_years ay
    JOIN semesters sem
      ON sem.academic_year_id = ay.id
     AND sem.is_active = TRUE
    WHERE ay.is_active = TRUE;
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_student_profiles AS
    WITH active_year AS (
      SELECT id
      FROM academic_years
      WHERE is_active = TRUE
      LIMIT 1
    ),
    resolved_student_classes AS (
      SELECT
        st.id AS student_id,
        COALESCE(
          (
            SELECT sae.class_id
            FROM student_academic_enrollments sae
            WHERE sae.student_id = st.id
              AND sae.academic_year_id = (SELECT id FROM active_year)
            LIMIT 1
          ),
          CASE
            WHEN NOT EXISTS (SELECT 1 FROM active_year) THEN st.class_id
            ELSE NULL
          END
        ) AS class_id
      FROM students st
    )
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
    JOIN resolved_student_classes rsc ON rsc.student_id = st.id
    JOIN classes c ON c.id = rsc.class_id
    JOIN grade_levels gl ON gl.id = c.grade_level_id
    JOIN academic_years ay ON ay.id = c.academic_year_id
    WHERE rsc.class_id IS NOT NULL;
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_class_students AS
    SELECT
      sp.class_id,
      sp.class_name,
      sp.section,
      sp.grade_level_name,
      sp.academic_year_name,
      sp.student_id,
      sp.academic_no,
      sp.student_name,
      sp.gender,
      sp.student_status
    FROM vw_student_profiles sp;
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_admin_dashboard_summary AS
    WITH active_year AS (
      SELECT id
      FROM academic_years
      WHERE is_active = TRUE
      LIMIT 1
    )
    SELECT
      (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_active_users,
      (
        SELECT COUNT(*)
        FROM vw_student_profiles
        WHERE student_status = 'active'
      ) AS total_active_students,
      (SELECT COUNT(*) FROM teachers) AS total_teachers,
      (SELECT COUNT(*) FROM supervisors) AS total_supervisors,
      (SELECT COUNT(*) FROM drivers) AS total_drivers,
      (
        SELECT COUNT(*)
        FROM classes
        WHERE is_active = TRUE
          AND academic_year_id = (SELECT id FROM active_year)
      ) AS total_active_classes,
      (SELECT COUNT(*) FROM routes WHERE is_active = TRUE) AS total_active_routes,
      (SELECT COUNT(*) FROM buses WHERE status = 'active') AS total_active_buses,
      (SELECT COUNT(*) FROM trips WHERE trip_status = 'started') AS total_active_trips;
  `);
};

exports.down = (pgm) => {
  pgm.sql("DROP VIEW IF EXISTS vw_active_academic_context;");
  pgm.sql("DROP INDEX IF EXISTS uq_semesters_one_active;");

  pgm.sql(`
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
    JOIN classes c ON c.id = st.class_id
    JOIN grade_levels gl ON gl.id = c.grade_level_id
    JOIN academic_years ay ON ay.id = c.academic_year_id;
  `);

  pgm.sql(`
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
    JOIN grade_levels gl ON gl.id = c.grade_level_id
    JOIN academic_years ay ON ay.id = c.academic_year_id
    JOIN students st ON st.class_id = c.id;
  `);

  pgm.sql(`
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
  `);

  pgm.sql(
    "DROP TRIGGER IF EXISTS trg_student_academic_enrollments_set_updated_at ON student_academic_enrollments;"
  );
  pgm.dropIndex("student_academic_enrollments", ["student_id", "academic_year_id"], {
    name: "uq_student_academic_enrollments_student_year",
    ifExists: true
  });
  pgm.dropIndex("student_academic_enrollments", "class_id", {
    name: "idx_student_academic_enrollments_class_id",
    ifExists: true
  });
  pgm.dropIndex("student_academic_enrollments", "academic_year_id", {
    name: "idx_student_academic_enrollments_academic_year_id",
    ifExists: true
  });
  pgm.dropIndex("student_academic_enrollments", "student_id", {
    name: "idx_student_academic_enrollments_student_id",
    ifExists: true
  });
  pgm.dropTable("student_academic_enrollments", { ifExists: true });
};

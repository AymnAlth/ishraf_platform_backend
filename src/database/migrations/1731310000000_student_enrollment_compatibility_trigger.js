/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION sync_student_academic_enrollment_from_class()
    RETURNS trigger AS $$
    DECLARE
      resolved_academic_year_id integer;
    BEGIN
      IF NEW.class_id IS NULL THEN
        RETURN NEW;
      END IF;

      SELECT academic_year_id
      INTO resolved_academic_year_id
      FROM classes
      WHERE id = NEW.class_id;

      IF resolved_academic_year_id IS NULL THEN
        RETURN NEW;
      END IF;

      INSERT INTO student_academic_enrollments (
        student_id,
        academic_year_id,
        class_id
      )
      VALUES (
        NEW.id,
        resolved_academic_year_id,
        NEW.class_id
      )
      ON CONFLICT (student_id, academic_year_id)
      DO UPDATE SET
        class_id = EXCLUDED.class_id,
        updated_at = CURRENT_TIMESTAMP;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_students_sync_academic_enrollment ON students;
    CREATE TRIGGER trg_students_sync_academic_enrollment
    AFTER INSERT OR UPDATE OF class_id ON students
    FOR EACH ROW
    EXECUTE FUNCTION sync_student_academic_enrollment_from_class();
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
    WHERE st.class_id IS NOT NULL
    ON CONFLICT (student_id, academic_year_id)
    DO UPDATE SET
      class_id = EXCLUDED.class_id,
      updated_at = CURRENT_TIMESTAMP;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_students_sync_academic_enrollment ON students;
    DROP FUNCTION IF EXISTS sync_student_academic_enrollment_from_class();
  `);
};

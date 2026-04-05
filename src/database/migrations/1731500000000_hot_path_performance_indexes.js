/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher_year_semester_date
    ON attendance_sessions (
      teacher_id,
      academic_year_id,
      semester_id,
      session_date DESC,
      period_no DESC,
      id DESC
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_assessments_teacher_year_semester_date
    ON assessments (
      teacher_id,
      academic_year_id,
      semester_id,
      assessment_date DESC,
      id DESC
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_homework_teacher_year_semester_due_date
    ON homework (
      teacher_id,
      academic_year_id,
      semester_id,
      due_date DESC,
      id DESC
    );
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql("DROP INDEX IF EXISTS idx_homework_teacher_year_semester_due_date;");
  pgm.sql("DROP INDEX IF EXISTS idx_assessments_teacher_year_semester_date;");
  pgm.sql("DROP INDEX IF EXISTS idx_attendance_sessions_teacher_year_semester_date;");
};

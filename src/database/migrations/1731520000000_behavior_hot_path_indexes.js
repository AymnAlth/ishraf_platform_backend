/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_behavior_records_student_year_semester_date
    ON behavior_records (
      student_id,
      academic_year_id,
      semester_id,
      behavior_date DESC,
      id DESC
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_behavior_records_teacher_year_semester_date
    ON behavior_records (
      teacher_id,
      academic_year_id,
      semester_id,
      behavior_date DESC,
      id DESC
    )
    WHERE teacher_id IS NOT NULL;
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_behavior_records_supervisor_year_semester_date
    ON behavior_records (
      supervisor_id,
      academic_year_id,
      semester_id,
      behavior_date DESC,
      id DESC
    )
    WHERE supervisor_id IS NOT NULL;
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql("DROP INDEX IF EXISTS idx_behavior_records_supervisor_year_semester_date;");
  pgm.sql("DROP INDEX IF EXISTS idx_behavior_records_teacher_year_semester_date;");
  pgm.sql("DROP INDEX IF EXISTS idx_behavior_records_student_year_semester_date;");
};

exports.up = (pgm) => {
  pgm.noTransaction();

  pgm.createIndex(
    "attendance_sessions",
    [
      "teacher_id",
      "academic_year_id",
      "semester_id",
      { name: "session_date", sort: "DESC" },
      { name: "period_no", sort: "DESC" },
      { name: "id", sort: "DESC" }
    ],
    {
      name: "idx_attendance_sessions_teacher_period_recent",
      concurrently: true,
      ifNotExists: true
    }
  );

  pgm.createIndex(
    "assessments",
    [
      "teacher_id",
      "academic_year_id",
      "semester_id",
      { name: "assessment_date", sort: "DESC" },
      { name: "id", sort: "DESC" }
    ],
    {
      name: "idx_assessments_teacher_period_recent",
      concurrently: true,
      ifNotExists: true
    }
  );

  pgm.createIndex(
    "behavior_records",
    [
      "teacher_id",
      "academic_year_id",
      "semester_id",
      { name: "behavior_date", sort: "DESC" },
      { name: "created_at", sort: "DESC" },
      { name: "id", sort: "DESC" }
    ],
    {
      name: "idx_behavior_records_teacher_period_recent",
      concurrently: true,
      ifNotExists: true,
      where: "teacher_id IS NOT NULL"
    }
  );

  pgm.createIndex(
    "behavior_records",
    [
      "supervisor_id",
      "academic_year_id",
      "semester_id",
      { name: "behavior_date", sort: "DESC" },
      { name: "created_at", sort: "DESC" },
      { name: "id", sort: "DESC" }
    ],
    {
      name: "idx_behavior_records_supervisor_period_recent",
      concurrently: true,
      ifNotExists: true,
      where: "supervisor_id IS NOT NULL"
    }
  );
};

exports.down = (pgm) => {
  pgm.noTransaction();

  pgm.dropIndex(
    "attendance_sessions",
    [
      "teacher_id",
      "academic_year_id",
      "semester_id",
      { name: "session_date", sort: "DESC" },
      { name: "period_no", sort: "DESC" },
      { name: "id", sort: "DESC" }
    ],
    {
      name: "idx_attendance_sessions_teacher_period_recent",
      concurrently: true,
      ifExists: true
    }
  );

  pgm.dropIndex(
    "assessments",
    [
      "teacher_id",
      "academic_year_id",
      "semester_id",
      { name: "assessment_date", sort: "DESC" },
      { name: "id", sort: "DESC" }
    ],
    {
      name: "idx_assessments_teacher_period_recent",
      concurrently: true,
      ifExists: true
    }
  );

  pgm.dropIndex(
    "behavior_records",
    [
      "teacher_id",
      "academic_year_id",
      "semester_id",
      { name: "behavior_date", sort: "DESC" },
      { name: "created_at", sort: "DESC" },
      { name: "id", sort: "DESC" }
    ],
    {
      name: "idx_behavior_records_teacher_period_recent",
      concurrently: true,
      ifExists: true
    }
  );

  pgm.dropIndex(
    "behavior_records",
    [
      "supervisor_id",
      "academic_year_id",
      "semester_id",
      { name: "behavior_date", sort: "DESC" },
      { name: "created_at", sort: "DESC" },
      { name: "id", sort: "DESC" }
    ],
    {
      name: "idx_behavior_records_supervisor_period_recent",
      concurrently: true,
      ifExists: true
    }
  );
};

exports.up = (pgm) => {
  pgm.noTransaction();

  pgm.createIndex("attendance", ["student_id", "attendance_session_id"], {
    name: "idx_attendance_student_session_lookup",
    concurrently: true,
    ifNotExists: true
  });

  pgm.createIndex("student_assessments", ["student_id", "assessment_id"], {
    name: "idx_student_assessments_student_assessment_lookup",
    concurrently: true,
    ifNotExists: true
  });
};

exports.down = (pgm) => {
  pgm.noTransaction();

  pgm.dropIndex("attendance", ["student_id", "attendance_session_id"], {
    name: "idx_attendance_student_session_lookup",
    concurrently: true,
    ifExists: true
  });

  pgm.dropIndex("student_assessments", ["student_id", "assessment_id"], {
    name: "idx_student_assessments_student_assessment_lookup",
    concurrently: true,
    ifExists: true
  });
};

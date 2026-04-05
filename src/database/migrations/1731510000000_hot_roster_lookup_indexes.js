exports.up = (pgm) => {
  pgm.createIndex("student_academic_enrollments", ["class_id", "academic_year_id", "student_id"], {
    name: "idx_student_academic_enrollments_class_year_student"
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("student_academic_enrollments", ["class_id", "academic_year_id", "student_id"], {
    name: "idx_student_academic_enrollments_class_year_student",
    ifExists: true
  });
};

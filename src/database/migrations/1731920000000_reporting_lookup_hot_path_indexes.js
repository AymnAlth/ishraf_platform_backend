exports.up = (pgm) => {
  pgm.noTransaction();

  pgm.createIndex("student_parents", ["parent_id", "student_id"], {
    name: "idx_student_parents_parent_student_lookup",
    concurrently: true,
    ifNotExists: true
  });

  pgm.createIndex("supervisor_classes", ["supervisor_id", "academic_year_id", "class_id"], {
    name: "idx_supervisor_classes_supervisor_year_class_lookup",
    concurrently: true,
    ifNotExists: true
  });
};

exports.down = (pgm) => {
  pgm.noTransaction();

  pgm.dropIndex("student_parents", ["parent_id", "student_id"], {
    name: "idx_student_parents_parent_student_lookup",
    concurrently: true,
    ifExists: true
  });

  pgm.dropIndex("supervisor_classes", ["supervisor_id", "academic_year_id", "class_id"], {
    name: "idx_supervisor_classes_supervisor_year_class_lookup",
    concurrently: true,
    ifExists: true
  });
};

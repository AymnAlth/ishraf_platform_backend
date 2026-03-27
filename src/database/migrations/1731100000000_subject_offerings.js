exports.up = (pgm) => {
  pgm.createTable("subject_offerings", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    subject_id: {
      type: "bigint",
      notNull: true,
      references: "subjects(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    semester_id: {
      type: "bigint",
      notNull: true,
      references: "semesters(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });

  pgm.addConstraint(
    "subject_offerings",
    "uq_subject_offerings_subject_semester",
    "UNIQUE (subject_id, semester_id)"
  );

  pgm.createIndex("subject_offerings", "subject_id", {
    name: "idx_subject_offerings_subject_id"
  });

  pgm.createIndex("subject_offerings", "semester_id", {
    name: "idx_subject_offerings_semester_id"
  });

  pgm.createIndex("subject_offerings", "is_active", {
    name: "idx_subject_offerings_is_active"
  });

  pgm.sql(`
    CREATE TRIGGER trg_subject_offerings_set_updated_at
    BEFORE UPDATE ON subject_offerings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = (pgm) => {
  pgm.sql(
    "DROP TRIGGER IF EXISTS trg_subject_offerings_set_updated_at ON subject_offerings;"
  );
  pgm.dropIndex("subject_offerings", "is_active", {
    name: "idx_subject_offerings_is_active",
    ifExists: true
  });
  pgm.dropIndex("subject_offerings", "semester_id", {
    name: "idx_subject_offerings_semester_id",
    ifExists: true
  });
  pgm.dropIndex("subject_offerings", "subject_id", {
    name: "idx_subject_offerings_subject_id",
    ifExists: true
  });
  pgm.dropConstraint(
    "subject_offerings",
    "uq_subject_offerings_subject_semester",
    { ifExists: true }
  );
  pgm.dropTable("subject_offerings", { ifExists: true });
};

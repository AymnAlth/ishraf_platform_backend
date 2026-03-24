/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable(
    "users",
    {
      id: {
        type: "bigserial",
        primaryKey: true
      },
      full_name: {
        type: "varchar(150)",
        notNull: true
      },
      email: {
        type: "varchar(255)"
      },
      phone: {
        type: "varchar(50)"
      },
      password_hash: {
        type: "text",
        notNull: true
      },
      role: {
        type: "varchar(30)",
        notNull: true
      },
      is_active: {
        type: "boolean",
        notNull: true,
        default: true
      },
      last_login_at: {
        type: "timestamptz"
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
    },
    {
      ifNotExists: true
    }
  );

  pgm.addConstraint(
    "users",
    "chk_users_role",
    "CHECK (role IN ('admin', 'parent', 'teacher', 'supervisor', 'driver'))"
  );
  pgm.addConstraint(
    "users",
    "chk_users_email_not_blank",
    "CHECK (email IS NULL OR BTRIM(email) <> '')"
  );
  pgm.addConstraint(
    "users",
    "chk_users_phone_not_blank",
    "CHECK (phone IS NULL OR BTRIM(phone) <> '')"
  );

  pgm.sql(
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_not_null ON users (LOWER(email)) WHERE email IS NOT NULL;"
  );
  pgm.createIndex("users", "phone", {
    name: "uq_users_phone_not_null",
    unique: true,
    where: "phone IS NOT NULL"
  });
  pgm.createIndex("users", "role", {
    name: "idx_users_role"
  });
  pgm.createIndex("users", "is_active", {
    name: "idx_users_is_active"
  });

  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;
  `);

  pgm.sql(`
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("auth_refresh_tokens", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE"
    },
    token_hash: {
      type: "text",
      notNull: true
    },
    device_info: {
      type: "text"
    },
    ip_address: {
      type: "inet"
    },
    expires_at: {
      type: "timestamptz",
      notNull: true
    },
    revoked_at: {
      type: "timestamptz"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });

  pgm.createIndex("auth_refresh_tokens", "user_id", {
    name: "idx_auth_refresh_tokens_user_id"
  });
  pgm.createIndex("auth_refresh_tokens", "expires_at", {
    name: "idx_auth_refresh_tokens_expires_at"
  });
  pgm.createIndex("auth_refresh_tokens", "revoked_at", {
    name: "idx_auth_refresh_tokens_revoked_at"
  });

  pgm.createTable("password_reset_tokens", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE"
    },
    token_hash: {
      type: "text",
      notNull: true
    },
    expires_at: {
      type: "timestamptz",
      notNull: true
    },
    used_at: {
      type: "timestamptz"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.createIndex("password_reset_tokens", "user_id", {
    name: "idx_password_reset_tokens_user_id"
  });
  pgm.createIndex("password_reset_tokens", "expires_at", {
    name: "idx_password_reset_tokens_expires_at"
  });
  pgm.createIndex("password_reset_tokens", "token_hash", {
    name: "uq_password_reset_tokens_token_hash",
    unique: true
  });

  pgm.createTable("parents", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
      unique: true
    },
    address: {
      type: "text"
    },
    relation_type: {
      type: "varchar(50)"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.createIndex("parents", "user_id", {
    name: "idx_parents_user_id"
  });

  pgm.createTable("teachers", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
      unique: true
    },
    specialization: {
      type: "varchar(255)"
    },
    qualification: {
      type: "varchar(255)"
    },
    hire_date: {
      type: "date"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.createIndex("teachers", "user_id", {
    name: "idx_teachers_user_id"
  });

  pgm.createTable("supervisors", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
      unique: true
    },
    department: {
      type: "varchar(255)"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.createIndex("supervisors", "user_id", {
    name: "idx_supervisors_user_id"
  });

  pgm.createTable("drivers", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
      unique: true
    },
    license_number: {
      type: "varchar(100)",
      notNull: true
    },
    driver_status: {
      type: "varchar(30)",
      notNull: true,
      default: "active"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.addConstraint(
    "drivers",
    "chk_drivers_status",
    "CHECK (driver_status IN ('active', 'inactive', 'suspended'))"
  );
  pgm.createIndex("drivers", "user_id", {
    name: "idx_drivers_user_id"
  });
  pgm.createIndex("drivers", "driver_status", {
    name: "idx_drivers_status"
  });
  pgm.createIndex("drivers", "license_number", {
    name: "uq_drivers_license_number",
    unique: true
  });

  pgm.sql(`
    CREATE OR REPLACE FUNCTION validate_user_role(expected_role text, target_user_id bigint)
    RETURNS boolean
    LANGUAGE plpgsql
    AS $$
    DECLARE
      actual_role text;
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
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_parent_role()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM validate_user_role('parent', NEW.user_id);
      RETURN NEW;
    END;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_teacher_role()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM validate_user_role('teacher', NEW.user_id);
      RETURN NEW;
    END;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_supervisor_role()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM validate_user_role('supervisor', NEW.user_id);
      RETURN NEW;
    END;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_driver_role()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM validate_user_role('driver', NEW.user_id);
      RETURN NEW;
    END;
    $$;
  `);

  pgm.sql(`
    CREATE TRIGGER validate_parent_role_before_ins_upd
    BEFORE INSERT OR UPDATE ON parents
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_parent_role();
  `);

  pgm.sql(`
    CREATE TRIGGER validate_teacher_role_before_ins_upd
    BEFORE INSERT OR UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_teacher_role();
  `);

  pgm.sql(`
    CREATE TRIGGER validate_supervisor_role_before_ins_upd
    BEFORE INSERT OR UPDATE ON supervisors
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_supervisor_role();
  `);

  pgm.sql(`
    CREATE TRIGGER validate_driver_role_before_ins_upd
    BEFORE INSERT OR UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_driver_role();
  `);

  pgm.createTable("academic_years", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    name: {
      type: "varchar(50)",
      notNull: true
    },
    start_date: {
      type: "date",
      notNull: true
    },
    end_date: {
      type: "date",
      notNull: true
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: false
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
    "academic_years",
    "chk_academic_years_dates",
    "CHECK (end_date > start_date)"
  );
  pgm.createIndex("academic_years", "name", {
    name: "uq_academic_years_name",
    unique: true
  });
  pgm.sql(
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_one_active ON academic_years (is_active) WHERE is_active = true;"
  );
  pgm.sql(`
    CREATE TRIGGER trg_academic_years_set_updated_at
    BEFORE UPDATE ON academic_years
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("semesters", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    academic_year_id: {
      type: "bigint",
      notNull: true,
      references: "academic_years(id)",
      onDelete: "CASCADE"
    },
    name: {
      type: "varchar(50)",
      notNull: true
    },
    start_date: {
      type: "date",
      notNull: true
    },
    end_date: {
      type: "date",
      notNull: true
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: false
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
  pgm.addConstraint("semesters", "chk_semesters_dates", "CHECK (end_date > start_date)");
  pgm.createIndex("semesters", "academic_year_id", {
    name: "idx_semesters_academic_year_id"
  });
  pgm.createIndex("semesters", "is_active", {
    name: "idx_semesters_is_active"
  });
  pgm.createIndex("semesters", ["academic_year_id", "name"], {
    name: "uq_semesters_year_name",
    unique: true
  });
  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_semester_within_academic_year()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_semester_within_academic_year_before_ins_upd
    BEFORE INSERT OR UPDATE ON semesters
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_semester_within_academic_year();
  `);
  pgm.sql(`
    CREATE TRIGGER trg_semesters_set_updated_at
    BEFORE UPDATE ON semesters
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("grade_levels", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    name: {
      type: "varchar(100)",
      notNull: true
    },
    level_order: {
      type: "integer",
      notNull: true
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.addConstraint(
    "grade_levels",
    "chk_grade_levels_order",
    "CHECK (level_order > 0)"
  );
  pgm.createIndex("grade_levels", "name", {
    name: "uq_grade_levels_name",
    unique: true
  });
  pgm.createIndex("grade_levels", "level_order", {
    name: "uq_grade_levels_order",
    unique: true
  });

  pgm.createTable("classes", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    grade_level_id: {
      type: "bigint",
      notNull: true,
      references: "grade_levels(id)"
    },
    academic_year_id: {
      type: "bigint",
      notNull: true,
      references: "academic_years(id)"
    },
    class_name: {
      type: "varchar(50)",
      notNull: true
    },
    section: {
      type: "varchar(50)",
      notNull: true
    },
    capacity: {
      type: "integer"
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
    "classes",
    "chk_classes_capacity",
    "CHECK (capacity IS NULL OR capacity > 0)"
  );
  pgm.createIndex("classes", "grade_level_id", {
    name: "idx_classes_grade_level_id"
  });
  pgm.createIndex("classes", "academic_year_id", {
    name: "idx_classes_academic_year_id"
  });
  pgm.createIndex("classes", "is_active", {
    name: "idx_classes_is_active"
  });
  pgm.createIndex(
    "classes",
    ["grade_level_id", "academic_year_id", "class_name", "section"],
    {
      name: "uq_classes_unique_in_year",
      unique: true
    }
  );
  pgm.sql(`
    CREATE TRIGGER trg_classes_set_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("subjects", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    name: {
      type: "varchar(100)",
      notNull: true
    },
    grade_level_id: {
      type: "bigint",
      notNull: true,
      references: "grade_levels(id)"
    },
    code: {
      type: "varchar(50)"
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
  pgm.createIndex("subjects", "grade_level_id", {
    name: "idx_subjects_grade_level_id"
  });
  pgm.createIndex("subjects", "is_active", {
    name: "idx_subjects_is_active"
  });
  pgm.createIndex("subjects", "code", {
    name: "uq_subjects_code",
    unique: true
  });
  pgm.createIndex("subjects", ["grade_level_id", "name"], {
    name: "uq_subjects_grade_level_name",
    unique: true
  });
  pgm.sql(`
    CREATE TRIGGER trg_subjects_set_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("teacher_classes", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    teacher_id: {
      type: "bigint",
      notNull: true,
      references: "teachers(id)",
      onDelete: "CASCADE"
    },
    class_id: {
      type: "bigint",
      notNull: true,
      references: "classes(id)",
      onDelete: "CASCADE"
    },
    subject_id: {
      type: "bigint",
      notNull: true,
      references: "subjects(id)",
      onDelete: "CASCADE"
    },
    academic_year_id: {
      type: "bigint",
      notNull: true,
      references: "academic_years(id)",
      onDelete: "CASCADE"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.createIndex("teacher_classes", "teacher_id", {
    name: "idx_teacher_classes_teacher_id"
  });
  pgm.createIndex("teacher_classes", "class_id", {
    name: "idx_teacher_classes_class_id"
  });
  pgm.createIndex("teacher_classes", "subject_id", {
    name: "idx_teacher_classes_subject_id"
  });
  pgm.createIndex("teacher_classes", "academic_year_id", {
    name: "idx_teacher_classes_academic_year_id"
  });
  pgm.createIndex(
    "teacher_classes",
    ["class_id", "subject_id", "academic_year_id"],
    {
      name: "uq_teacher_classes_single_teacher_per_subject",
      unique: true
    }
  );
  pgm.createIndex(
    "teacher_classes",
    ["teacher_id", "class_id", "subject_id", "academic_year_id"],
    {
      name: "uq_teacher_classes_teacher_assignment",
      unique: true
    }
  );

  pgm.createTable("supervisor_classes", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    supervisor_id: {
      type: "bigint",
      notNull: true,
      references: "supervisors(id)",
      onDelete: "CASCADE"
    },
    class_id: {
      type: "bigint",
      notNull: true,
      references: "classes(id)",
      onDelete: "CASCADE"
    },
    academic_year_id: {
      type: "bigint",
      notNull: true,
      references: "academic_years(id)",
      onDelete: "CASCADE"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.createIndex("supervisor_classes", "supervisor_id", {
    name: "idx_supervisor_classes_supervisor_id"
  });
  pgm.createIndex("supervisor_classes", "class_id", {
    name: "idx_supervisor_classes_class_id"
  });
  pgm.createIndex("supervisor_classes", "academic_year_id", {
    name: "idx_supervisor_classes_academic_year_id"
  });
  pgm.createIndex(
    "supervisor_classes",
    ["supervisor_id", "class_id", "academic_year_id"],
    {
      name: "uq_supervisor_classes_assignment",
      unique: true
    }
  );

  pgm.createTable("students", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    academic_no: {
      type: "varchar(50)",
      notNull: true
    },
    full_name: {
      type: "varchar(150)",
      notNull: true
    },
    date_of_birth: {
      type: "date",
      notNull: true
    },
    gender: {
      type: "varchar(10)",
      notNull: true
    },
    class_id: {
      type: "bigint",
      notNull: true,
      references: "classes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    status: {
      type: "varchar(30)",
      notNull: true,
      default: "active"
    },
    enrollment_date: {
      type: "date",
      notNull: true,
      default: pgm.func("CURRENT_DATE")
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
    "students",
    "uq_students_academic_no",
    "UNIQUE (academic_no)"
  );
  pgm.addConstraint(
    "students",
    "chk_students_gender",
    "CHECK (gender IN ('male', 'female'))"
  );
  pgm.addConstraint(
    "students",
    "chk_students_status",
    "CHECK (status IN ('active', 'transferred', 'graduated', 'dropped', 'suspended'))"
  );
  pgm.createIndex("students", "class_id", {
    name: "idx_students_class_id"
  });
  pgm.createIndex("students", "status", {
    name: "idx_students_status"
  });
  pgm.sql(`
    CREATE TRIGGER trg_students_set_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("student_parents", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    student_id: {
      type: "bigint",
      notNull: true,
      references: "students(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    parent_id: {
      type: "bigint",
      notNull: true,
      references: "parents(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    relation_type: {
      type: "varchar(50)",
      notNull: true
    },
    is_primary: {
      type: "boolean",
      notNull: true,
      default: false
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.addConstraint(
    "student_parents",
    "uq_student_parents_pair",
    "UNIQUE (student_id, parent_id)"
  );
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_student_primary_parent
      ON student_parents (student_id)
      WHERE is_primary = TRUE;
  `);
  pgm.createIndex("student_parents", "student_id", {
    name: "idx_student_parents_student_id"
  });
  pgm.createIndex("student_parents", "parent_id", {
    name: "idx_student_parents_parent_id"
  });

  pgm.createTable("student_promotions", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    student_id: {
      type: "bigint",
      notNull: true,
      references: "students(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    from_class_id: {
      type: "bigint",
      notNull: true,
      references: "classes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    to_class_id: {
      type: "bigint",
      notNull: true,
      references: "classes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    academic_year_id: {
      type: "bigint",
      notNull: true,
      references: "academic_years(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    promoted_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    notes: {
      type: "text"
    }
  });
  pgm.addConstraint(
    "student_promotions",
    "chk_student_promotions_different_classes",
    "CHECK (from_class_id <> to_class_id)"
  );
  pgm.addConstraint(
    "student_promotions",
    "uq_student_promotions_unique",
    "UNIQUE (student_id, from_class_id, to_class_id, academic_year_id)"
  );
  pgm.createIndex("student_promotions", "student_id", {
    name: "idx_student_promotions_student_id"
  });
  pgm.createIndex("student_promotions", "academic_year_id", {
    name: "idx_student_promotions_academic_year_id"
  });

  pgm.createTable("assessment_types", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    code: {
      type: "varchar(30)",
      notNull: true
    },
    name: {
      type: "varchar(100)",
      notNull: true
    },
    description: {
      type: "text"
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true
    }
  });
  pgm.addConstraint(
    "assessment_types",
    "uq_assessment_types_code",
    "UNIQUE (code)"
  );
  pgm.addConstraint(
    "assessment_types",
    "uq_assessment_types_name",
    "UNIQUE (name)"
  );

  pgm.createTable("assessments", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    assessment_type_id: {
      type: "bigint",
      notNull: true,
      references: "assessment_types(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    class_id: {
      type: "bigint",
      notNull: true,
      references: "classes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    subject_id: {
      type: "bigint",
      notNull: true,
      references: "subjects(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    teacher_id: {
      type: "bigint",
      notNull: true,
      references: "teachers(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    academic_year_id: {
      type: "bigint",
      notNull: true,
      references: "academic_years(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    semester_id: {
      type: "bigint",
      notNull: true,
      references: "semesters(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    title: {
      type: "varchar(200)",
      notNull: true
    },
    description: {
      type: "text"
    },
    max_score: {
      type: "numeric(6,2)",
      notNull: true
    },
    weight: {
      type: "numeric(6,2)",
      notNull: true,
      default: 0
    },
    assessment_date: {
      type: "date",
      notNull: true
    },
    is_published: {
      type: "boolean",
      notNull: true,
      default: false
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
    "assessments",
    "chk_assessments_max_score",
    "CHECK (max_score > 0)"
  );
  pgm.addConstraint(
    "assessments",
    "chk_assessments_weight",
    "CHECK (weight >= 0)"
  );
  pgm.createIndex("assessments", "assessment_type_id", {
    name: "idx_assessments_type_id"
  });
  pgm.createIndex("assessments", "class_id", {
    name: "idx_assessments_class_id"
  });
  pgm.createIndex("assessments", "subject_id", {
    name: "idx_assessments_subject_id"
  });
  pgm.createIndex("assessments", "teacher_id", {
    name: "idx_assessments_teacher_id"
  });
  pgm.createIndex("assessments", "academic_year_id", {
    name: "idx_assessments_academic_year_id"
  });
  pgm.createIndex("assessments", "semester_id", {
    name: "idx_assessments_semester_id"
  });
  pgm.createIndex("assessments", "assessment_date", {
    name: "idx_assessments_date"
  });
  pgm.sql(`
    CREATE TRIGGER trg_assessments_set_updated_at
    BEFORE UPDATE ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("student_assessments", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    assessment_id: {
      type: "bigint",
      notNull: true,
      references: "assessments(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    student_id: {
      type: "bigint",
      notNull: true,
      references: "students(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    score: {
      type: "numeric(6,2)",
      notNull: true
    },
    remarks: {
      type: "text"
    },
    graded_at: {
      type: "timestamptz"
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
    "student_assessments",
    "uq_student_assessments_unique",
    "UNIQUE (assessment_id, student_id)"
  );
  pgm.addConstraint(
    "student_assessments",
    "chk_student_assessments_score_non_negative",
    "CHECK (score >= 0)"
  );
  pgm.createIndex("student_assessments", "assessment_id", {
    name: "idx_student_assessments_assessment_id"
  });
  pgm.createIndex("student_assessments", "student_id", {
    name: "idx_student_assessments_student_id"
  });
  pgm.sql(`
    CREATE TRIGGER trg_student_assessments_set_updated_at
    BEFORE UPDATE ON student_assessments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_student_assessment_score()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_student_assessment_score_before_ins_upd
    BEFORE INSERT OR UPDATE ON student_assessments
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_student_assessment_score();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_assessment_semester_year()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_assessment_semester_year_before_ins_upd
    BEFORE INSERT OR UPDATE ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_assessment_semester_year();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_student_assessment_class()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_student_assessment_class_before_ins_upd
    BEFORE INSERT OR UPDATE ON student_assessments
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_student_assessment_class();
  `);

  pgm.createTable("attendance_sessions", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    class_id: {
      type: "bigint",
      notNull: true,
      references: "classes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    subject_id: {
      type: "bigint",
      notNull: true,
      references: "subjects(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    teacher_id: {
      type: "bigint",
      notNull: true,
      references: "teachers(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    academic_year_id: {
      type: "bigint",
      notNull: true,
      references: "academic_years(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    semester_id: {
      type: "bigint",
      notNull: true,
      references: "semesters(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    session_date: {
      type: "date",
      notNull: true
    },
    period_no: {
      type: "integer",
      notNull: true
    },
    title: {
      type: "varchar(200)"
    },
    notes: {
      type: "text"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.addConstraint(
    "attendance_sessions",
    "uq_attendance_sessions_unique",
    "UNIQUE (class_id, subject_id, teacher_id, academic_year_id, semester_id, session_date, period_no)"
  );
  pgm.addConstraint(
    "attendance_sessions",
    "chk_attendance_sessions_period_no",
    "CHECK (period_no > 0)"
  );
  pgm.createIndex("attendance_sessions", "class_id", {
    name: "idx_attendance_sessions_class_id"
  });
  pgm.createIndex("attendance_sessions", "subject_id", {
    name: "idx_attendance_sessions_subject_id"
  });
  pgm.createIndex("attendance_sessions", "teacher_id", {
    name: "idx_attendance_sessions_teacher_id"
  });
  pgm.createIndex("attendance_sessions", "session_date", {
    name: "idx_attendance_sessions_session_date"
  });

  pgm.createTable("attendance", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    attendance_session_id: {
      type: "bigint",
      notNull: true,
      references: "attendance_sessions(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    student_id: {
      type: "bigint",
      notNull: true,
      references: "students(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    status: {
      type: "varchar(20)",
      notNull: true
    },
    notes: {
      type: "text"
    },
    recorded_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.addConstraint(
    "attendance",
    "uq_attendance_unique",
    "UNIQUE (attendance_session_id, student_id)"
  );
  pgm.addConstraint(
    "attendance",
    "chk_attendance_status",
    "CHECK (status IN ('present', 'absent', 'late', 'excused'))"
  );
  pgm.createIndex("attendance", "attendance_session_id", {
    name: "idx_attendance_session_id"
  });
  pgm.createIndex("attendance", "student_id", {
    name: "idx_attendance_student_id"
  });
  pgm.createIndex("attendance", "status", {
    name: "idx_attendance_status"
  });

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_attendance_session_semester_year()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_attendance_session_semester_year_before_ins_upd
    BEFORE INSERT OR UPDATE ON attendance_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_attendance_session_semester_year();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_attendance_student_class()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_attendance_student_class_before_ins_upd
    BEFORE INSERT OR UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_attendance_student_class();
  `);

  pgm.createTable("homework", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    teacher_id: {
      type: "bigint",
      notNull: true,
      references: "teachers(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    class_id: {
      type: "bigint",
      notNull: true,
      references: "classes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    subject_id: {
      type: "bigint",
      notNull: true,
      references: "subjects(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    academic_year_id: {
      type: "bigint",
      notNull: true,
      references: "academic_years(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    semester_id: {
      type: "bigint",
      notNull: true,
      references: "semesters(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    title: {
      type: "varchar(200)",
      notNull: true
    },
    description: {
      type: "text"
    },
    assigned_date: {
      type: "date",
      notNull: true
    },
    due_date: {
      type: "date",
      notNull: true
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
    "homework",
    "chk_homework_dates",
    "CHECK (due_date >= assigned_date)"
  );
  pgm.createIndex("homework", "teacher_id", {
    name: "idx_homework_teacher_id"
  });
  pgm.createIndex("homework", "class_id", {
    name: "idx_homework_class_id"
  });
  pgm.createIndex("homework", "subject_id", {
    name: "idx_homework_subject_id"
  });
  pgm.createIndex("homework", "due_date", {
    name: "idx_homework_due_date"
  });
  pgm.sql(`
    CREATE TRIGGER trg_homework_set_updated_at
    BEFORE UPDATE ON homework
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("homework_submissions", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    homework_id: {
      type: "bigint",
      notNull: true,
      references: "homework(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    student_id: {
      type: "bigint",
      notNull: true,
      references: "students(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    status: {
      type: "varchar(30)",
      notNull: true
    },
    submitted_at: {
      type: "timestamptz"
    },
    notes: {
      type: "text"
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
    "homework_submissions",
    "uq_homework_submissions_unique",
    "UNIQUE (homework_id, student_id)"
  );
  pgm.addConstraint(
    "homework_submissions",
    "chk_homework_submissions_status",
    "CHECK (status IN ('submitted', 'not_submitted', 'late'))"
  );
  pgm.createIndex("homework_submissions", "homework_id", {
    name: "idx_homework_submissions_homework_id"
  });
  pgm.createIndex("homework_submissions", "student_id", {
    name: "idx_homework_submissions_student_id"
  });
  pgm.sql(`
    CREATE TRIGGER trg_homework_submissions_set_updated_at
    BEFORE UPDATE ON homework_submissions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_homework_semester_year()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_homework_semester_year_before_ins_upd
    BEFORE INSERT OR UPDATE ON homework
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_homework_semester_year();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_homework_submission_class()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_homework_submission_class_before_ins_upd
    BEFORE INSERT OR UPDATE ON homework_submissions
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_homework_submission_class();
  `);

  pgm.createTable("behavior_categories", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    code: {
      type: "varchar(30)",
      notNull: true
    },
    name: {
      type: "varchar(100)",
      notNull: true
    },
    behavior_type: {
      type: "varchar(20)",
      notNull: true
    },
    default_severity: {
      type: "integer",
      notNull: true,
      default: 1
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true
    }
  });
  pgm.addConstraint(
    "behavior_categories",
    "uq_behavior_categories_code",
    "UNIQUE (code)"
  );
  pgm.addConstraint(
    "behavior_categories",
    "uq_behavior_categories_name",
    "UNIQUE (name)"
  );
  pgm.addConstraint(
    "behavior_categories",
    "chk_behavior_categories_type",
    "CHECK (behavior_type IN ('positive', 'negative'))"
  );
  pgm.addConstraint(
    "behavior_categories",
    "chk_behavior_categories_severity",
    "CHECK (default_severity BETWEEN 1 AND 5)"
  );

  pgm.createTable("behavior_records", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    student_id: {
      type: "bigint",
      notNull: true,
      references: "students(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    behavior_category_id: {
      type: "bigint",
      notNull: true,
      references: "behavior_categories(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    teacher_id: {
      type: "bigint",
      references: "teachers(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    supervisor_id: {
      type: "bigint",
      references: "supervisors(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    academic_year_id: {
      type: "bigint",
      notNull: true,
      references: "academic_years(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    semester_id: {
      type: "bigint",
      notNull: true,
      references: "semesters(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    description: {
      type: "text"
    },
    severity: {
      type: "integer",
      notNull: true
    },
    behavior_date: {
      type: "date",
      notNull: true
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.addConstraint(
    "behavior_records",
    "chk_behavior_records_actor",
    "CHECK (teacher_id IS NOT NULL OR supervisor_id IS NOT NULL)"
  );
  pgm.addConstraint(
    "behavior_records",
    "chk_behavior_records_severity",
    "CHECK (severity BETWEEN 1 AND 5)"
  );
  pgm.createIndex("behavior_records", "student_id", {
    name: "idx_behavior_records_student_id"
  });
  pgm.createIndex("behavior_records", "behavior_date", {
    name: "idx_behavior_records_behavior_date"
  });
  pgm.createIndex("behavior_records", "teacher_id", {
    name: "idx_behavior_records_teacher_id"
  });
  pgm.createIndex("behavior_records", "supervisor_id", {
    name: "idx_behavior_records_supervisor_id"
  });
  pgm.createIndex("behavior_records", "behavior_category_id", {
    name: "idx_behavior_records_category_id"
  });

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_behavior_semester_year()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_behavior_semester_year_before_ins_upd
    BEFORE INSERT OR UPDATE ON behavior_records
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_behavior_semester_year();
  `);

  pgm.sql(`
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
    JOIN classes c ON c.id = h.class_id
    JOIN subjects subj ON subj.id = h.subject_id
    JOIN teachers t ON t.id = h.teacher_id
    JOIN users tu ON tu.id = t.user_id
    JOIN academic_years ay ON ay.id = h.academic_year_id
    JOIN semesters sem ON sem.id = h.semester_id;
  `);

  pgm.sql(`
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
    JOIN homework h ON h.id = hs.homework_id
    JOIN students st ON st.id = hs.student_id
    JOIN classes c ON c.id = h.class_id
    JOIN subjects subj ON subj.id = h.subject_id
    JOIN academic_years ay ON ay.id = h.academic_year_id
    JOIN semesters sem ON sem.id = h.semester_id;
  `);

  pgm.sql(`
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
    JOIN students st ON st.id = br.student_id
    JOIN behavior_categories bc ON bc.id = br.behavior_category_id
    LEFT JOIN teachers t ON t.id = br.teacher_id
    LEFT JOIN users tu ON tu.id = t.user_id
    LEFT JOIN supervisors sp ON sp.id = br.supervisor_id
    LEFT JOIN users su ON su.id = sp.user_id
    JOIN academic_years ay ON ay.id = br.academic_year_id
    JOIN semesters sem ON sem.id = br.semester_id;
  `);

  pgm.sql(`
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
    JOIN students st ON st.id = br.student_id
    JOIN behavior_categories bc ON bc.id = br.behavior_category_id
    JOIN academic_years ay ON ay.id = br.academic_year_id
    JOIN semesters sem ON sem.id = br.semester_id
    GROUP BY
      st.id, st.academic_no, st.full_name,
      br.academic_year_id, ay.name,
      br.semester_id, sem.name;
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_assessment_details AS
    SELECT
      a.id AS assessment_id,
      at.id AS assessment_type_id,
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
      gl.id AS grade_level_id,
      gl.name AS grade_level_name,
      subj.id AS subject_id,
      subj.name AS subject_name,
      subj.code AS subject_code,
      t.id AS teacher_id,
      tu.id AS teacher_user_id,
      tu.full_name AS teacher_name,
      tu.email AS teacher_email,
      tu.phone AS teacher_phone,
      a.academic_year_id,
      ay.name AS academic_year_name,
      a.semester_id,
      sem.name AS semester_name,
      a.created_at,
      a.updated_at
    FROM assessments a
    JOIN assessment_types at ON at.id = a.assessment_type_id
    JOIN classes c ON c.id = a.class_id
    JOIN grade_levels gl ON gl.id = c.grade_level_id
    JOIN subjects subj ON subj.id = a.subject_id
    JOIN teachers t ON t.id = a.teacher_id
    JOIN users tu ON tu.id = t.user_id
    JOIN academic_years ay ON ay.id = a.academic_year_id
    JOIN semesters sem ON sem.id = a.semester_id;
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_student_assessment_details AS
    SELECT
      sa.id AS student_assessment_id,
      st.id AS student_id,
      st.academic_no,
      st.full_name AS student_name,
      a.id AS assessment_id,
      at.id AS assessment_type_id,
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
    JOIN assessments a ON a.id = sa.assessment_id
    JOIN assessment_types at ON at.id = a.assessment_type_id
    JOIN students st ON st.id = sa.student_id
    JOIN classes c ON c.id = a.class_id
    JOIN subjects subj ON subj.id = a.subject_id
    JOIN academic_years ay ON ay.id = a.academic_year_id
    JOIN semesters sem ON sem.id = a.semester_id;
  `);

  pgm.sql(`
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
      ROUND(100.0 * SUM(sa.score) / NULLIF(SUM(a.max_score), 0), 2) AS overall_percentage
    FROM student_assessments sa
    JOIN assessments a ON a.id = sa.assessment_id
    JOIN students st ON st.id = sa.student_id
    JOIN classes c ON c.id = a.class_id
    JOIN subjects subj ON subj.id = a.subject_id
    JOIN academic_years ay ON ay.id = a.academic_year_id
    JOIN semesters sem ON sem.id = a.semester_id
    GROUP BY
      st.id, st.academic_no, st.full_name,
      c.id, c.class_name, c.section,
      a.academic_year_id, ay.name,
      a.semester_id, sem.name,
      subj.id, subj.name;
  `);

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
    JOIN students st ON st.id = sp.student_id
    JOIN parents p ON p.id = sp.parent_id
    JOIN users u ON u.id = p.user_id
    WHERE sp.is_primary = TRUE;
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
    JOIN attendance_sessions ats ON ats.id = a.attendance_session_id
    JOIN students st ON st.id = a.student_id
    JOIN classes c ON c.id = ats.class_id
    JOIN subjects subj ON subj.id = ats.subject_id
    JOIN teachers t ON t.id = ats.teacher_id
    JOIN users tu ON tu.id = t.user_id
    JOIN academic_years ay ON ay.id = ats.academic_year_id
    JOIN semesters sem ON sem.id = ats.semester_id;
  `);

  pgm.sql(`
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
    JOIN attendance_sessions ats ON ats.id = a.attendance_session_id
    JOIN students st ON st.id = a.student_id
    JOIN classes c ON c.id = st.class_id
    JOIN academic_years ay ON ay.id = ats.academic_year_id
    JOIN semesters sem ON sem.id = ats.semester_id
    GROUP BY
      st.id, st.academic_no, st.full_name,
      c.id, c.class_name, c.section,
      ats.academic_year_id, ay.name,
      ats.semester_id, sem.name;
  `);

  pgm.sql(`
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
    JOIN attendance_sessions ats ON ats.id = a.attendance_session_id
    JOIN classes c ON c.id = ats.class_id
    JOIN grade_levels gl ON gl.id = c.grade_level_id
    JOIN subjects subj ON subj.id = ats.subject_id
    JOIN academic_years ay ON ay.id = ats.academic_year_id
    JOIN semesters sem ON sem.id = ats.semester_id
    GROUP BY
      c.id, c.class_name, c.section, gl.name,
      ats.academic_year_id, ay.name,
      ats.semester_id, sem.name,
      subj.id, subj.name;
  `);

  pgm.createTable("buses", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    plate_number: {
      type: "varchar(30)",
      notNull: true
    },
    driver_id: {
      type: "bigint",
      references: "drivers(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    capacity: {
      type: "integer",
      notNull: true
    },
    status: {
      type: "varchar(30)",
      notNull: true,
      default: "active"
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
  pgm.addConstraint("buses", "uq_buses_plate_number", "UNIQUE (plate_number)");
  pgm.addConstraint("buses", "chk_buses_capacity", "CHECK (capacity > 0)");
  pgm.addConstraint(
    "buses",
    "chk_buses_status",
    "CHECK (status IN ('active', 'inactive', 'maintenance'))"
  );
  pgm.createIndex("buses", "driver_id", {
    name: "idx_buses_driver_id"
  });
  pgm.createIndex("buses", "status", {
    name: "idx_buses_status"
  });
  pgm.sql(`
    CREATE TRIGGER trg_buses_set_updated_at
    BEFORE UPDATE ON buses
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("routes", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    route_name: {
      type: "varchar(100)",
      notNull: true
    },
    start_point: {
      type: "text",
      notNull: true
    },
    end_point: {
      type: "text",
      notNull: true
    },
    estimated_duration_minutes: {
      type: "integer",
      notNull: true,
      default: 0
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
  pgm.addConstraint("routes", "uq_routes_name", "UNIQUE (route_name)");
  pgm.addConstraint(
    "routes",
    "chk_routes_estimated_duration",
    "CHECK (estimated_duration_minutes >= 0)"
  );
  pgm.createIndex("routes", "is_active", {
    name: "idx_routes_is_active"
  });
  pgm.sql(`
    CREATE TRIGGER trg_routes_set_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("bus_stops", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    route_id: {
      type: "bigint",
      notNull: true,
      references: "routes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    stop_name: {
      type: "varchar(100)",
      notNull: true
    },
    latitude: {
      type: "numeric(10,7)",
      notNull: true
    },
    longitude: {
      type: "numeric(10,7)",
      notNull: true
    },
    stop_order: {
      type: "integer",
      notNull: true
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.addConstraint(
    "bus_stops",
    "uq_bus_stops_route_order",
    "UNIQUE (route_id, stop_order)"
  );
  pgm.addConstraint(
    "bus_stops",
    "chk_bus_stops_latitude",
    "CHECK (latitude BETWEEN -90 AND 90)"
  );
  pgm.addConstraint(
    "bus_stops",
    "chk_bus_stops_longitude",
    "CHECK (longitude BETWEEN -180 AND 180)"
  );
  pgm.addConstraint("bus_stops", "chk_bus_stops_order", "CHECK (stop_order > 0)");
  pgm.createIndex("bus_stops", "route_id", {
    name: "idx_bus_stops_route_id"
  });

  pgm.createTable("student_bus_assignments", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    student_id: {
      type: "bigint",
      notNull: true,
      references: "students(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    route_id: {
      type: "bigint",
      notNull: true,
      references: "routes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    stop_id: {
      type: "bigint",
      notNull: true,
      references: "bus_stops(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    start_date: {
      type: "date",
      notNull: true
    },
    end_date: {
      type: "date"
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
    "student_bus_assignments",
    "chk_student_bus_assignments_dates",
    "CHECK (end_date IS NULL OR end_date >= start_date)"
  );
  pgm.sql(`
    CREATE UNIQUE INDEX uq_student_bus_assignments_one_active
    ON student_bus_assignments (student_id)
    WHERE is_active = TRUE;
  `);
  pgm.createIndex("student_bus_assignments", "route_id", {
    name: "idx_student_bus_assignments_route_id"
  });
  pgm.createIndex("student_bus_assignments", "stop_id", {
    name: "idx_student_bus_assignments_stop_id"
  });
  pgm.sql(`
    CREATE TRIGGER trg_student_bus_assignments_set_updated_at
    BEFORE UPDATE ON student_bus_assignments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("trips", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    bus_id: {
      type: "bigint",
      notNull: true,
      references: "buses(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    route_id: {
      type: "bigint",
      notNull: true,
      references: "routes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    trip_date: {
      type: "date",
      notNull: true
    },
    trip_type: {
      type: "varchar(20)",
      notNull: true
    },
    trip_status: {
      type: "varchar(30)",
      notNull: true,
      default: "scheduled"
    },
    started_at: {
      type: "timestamptz"
    },
    ended_at: {
      type: "timestamptz"
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
  pgm.addConstraint("trips", "chk_trips_type", "CHECK (trip_type IN ('pickup', 'dropoff'))");
  pgm.addConstraint(
    "trips",
    "chk_trips_status",
    "CHECK (trip_status IN ('scheduled', 'started', 'ended', 'cancelled'))"
  );
  pgm.addConstraint(
    "trips",
    "chk_trips_time_order",
    "CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)"
  );
  pgm.createIndex("trips", "bus_id", {
    name: "idx_trips_bus_id"
  });
  pgm.createIndex("trips", "route_id", {
    name: "idx_trips_route_id"
  });
  pgm.createIndex("trips", "trip_date", {
    name: "idx_trips_trip_date"
  });
  pgm.createIndex("trips", "trip_status", {
    name: "idx_trips_trip_status"
  });
  pgm.sql(`
    CREATE TRIGGER trg_trips_set_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("bus_location_history", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    trip_id: {
      type: "bigint",
      notNull: true,
      references: "trips(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    latitude: {
      type: "numeric(10,7)",
      notNull: true
    },
    longitude: {
      type: "numeric(10,7)",
      notNull: true
    },
    recorded_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.addConstraint(
    "bus_location_history",
    "chk_bus_location_history_latitude",
    "CHECK (latitude BETWEEN -90 AND 90)"
  );
  pgm.addConstraint(
    "bus_location_history",
    "chk_bus_location_history_longitude",
    "CHECK (longitude BETWEEN -180 AND 180)"
  );
  pgm.createIndex("bus_location_history", "trip_id", {
    name: "idx_bus_location_history_trip_id"
  });
  pgm.createIndex("bus_location_history", ["trip_id", "recorded_at"], {
    name: "idx_bus_location_history_trip_recorded_at"
  });

  pgm.createTable("trip_student_events", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    trip_id: {
      type: "bigint",
      notNull: true,
      references: "trips(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    student_id: {
      type: "bigint",
      notNull: true,
      references: "students(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    event_type: {
      type: "varchar(20)",
      notNull: true
    },
    event_time: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    stop_id: {
      type: "bigint",
      references: "bus_stops(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    notes: {
      type: "text"
    }
  });
  pgm.addConstraint(
    "trip_student_events",
    "chk_trip_student_events_type",
    "CHECK (event_type IN ('boarded', 'dropped_off', 'absent'))"
  );
  pgm.createIndex("trip_student_events", "trip_id", {
    name: "idx_trip_student_events_trip_id"
  });
  pgm.createIndex("trip_student_events", "student_id", {
    name: "idx_trip_student_events_student_id"
  });
  pgm.createIndex("trip_student_events", "event_time", {
    name: "idx_trip_student_events_event_time"
  });

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_student_bus_assignment_stop_route()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_student_bus_assignment_stop_route_before_ins_upd
    BEFORE INSERT OR UPDATE ON student_bus_assignments
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_student_bus_assignment_stop_route();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_bus_location_trip_status()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_bus_location_trip_status_before_ins
    BEFORE INSERT ON bus_location_history
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_bus_location_trip_status();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_trip_status_transition()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_trip_status_transition_before_ins_upd
    BEFORE INSERT OR UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_trip_status_transition();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_trip_student_event()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER validate_trip_student_event_before_ins_upd
    BEFORE INSERT OR UPDATE ON trip_student_events
    FOR EACH ROW
    EXECUTE FUNCTION trg_validate_trip_student_event();
  `);

  pgm.sql(`
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
    JOIN bus_stops bs ON bs.route_id = r.id;
  `);

  pgm.sql(`
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
    JOIN students st ON st.id = sba.student_id
    JOIN routes r ON r.id = sba.route_id
    JOIN bus_stops bs ON bs.id = sba.stop_id
    WHERE sba.is_active = TRUE;
  `);

  pgm.sql(`
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
    JOIN buses b ON b.id = tr.bus_id
    LEFT JOIN drivers d ON d.id = b.driver_id
    LEFT JOIN users du ON du.id = d.user_id
    JOIN routes r ON r.id = tr.route_id;
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_latest_trip_location AS
    SELECT DISTINCT ON (blh.trip_id)
      blh.trip_id,
      blh.latitude,
      blh.longitude,
      blh.recorded_at
    FROM bus_location_history blh
    ORDER BY blh.trip_id, blh.recorded_at DESC;
  `);

  pgm.sql(`
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
    LEFT JOIN vw_latest_trip_location l ON l.trip_id = td.trip_id
    WHERE td.trip_status = 'started';
  `);

  pgm.sql(`
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
    JOIN trips tr ON tr.id = tse.trip_id
    JOIN students st ON st.id = tse.student_id
    LEFT JOIN bus_stops bs ON bs.id = tse.stop_id;
  `);

  pgm.createTable("messages", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    sender_user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    receiver_user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    message_body: {
      type: "text",
      notNull: true
    },
    sent_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    read_at: {
      type: "timestamptz"
    }
  });
  pgm.addConstraint(
    "messages",
    "chk_messages_not_self",
    "CHECK (sender_user_id <> receiver_user_id)"
  );
  pgm.addConstraint(
    "messages",
    "chk_messages_body_not_blank",
    "CHECK (BTRIM(message_body) <> '')"
  );
  pgm.createIndex("messages", "sender_user_id", {
    name: "idx_messages_sender_user_id"
  });
  pgm.createIndex("messages", "receiver_user_id", {
    name: "idx_messages_receiver_user_id"
  });
  pgm.createIndex("messages", "sent_at", {
    name: "idx_messages_sent_at"
  });

  pgm.createTable("announcements", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    created_by: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    title: {
      type: "varchar(150)",
      notNull: true
    },
    content: {
      type: "text",
      notNull: true
    },
    target_role: {
      type: "varchar(30)"
    },
    published_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    expires_at: {
      type: "timestamptz"
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
    "announcements",
    "chk_announcements_title_not_blank",
    "CHECK (BTRIM(title) <> '')"
  );
  pgm.addConstraint(
    "announcements",
    "chk_announcements_content_not_blank",
    "CHECK (BTRIM(content) <> '')"
  );
  pgm.addConstraint(
    "announcements",
    "chk_announcements_target_role",
    "CHECK (target_role IS NULL OR target_role IN ('admin', 'parent', 'teacher', 'supervisor', 'driver'))"
  );
  pgm.addConstraint(
    "announcements",
    "chk_announcements_expiry",
    "CHECK (expires_at IS NULL OR expires_at >= published_at)"
  );
  pgm.createIndex("announcements", "created_by", {
    name: "idx_announcements_created_by"
  });
  pgm.createIndex("announcements", "target_role", {
    name: "idx_announcements_target_role"
  });
  pgm.createIndex("announcements", "published_at", {
    name: "idx_announcements_published_at"
  });
  pgm.sql(`
    CREATE TRIGGER trg_announcements_set_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("notifications", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    title: {
      type: "varchar(150)",
      notNull: true
    },
    message: {
      type: "text",
      notNull: true
    },
    notification_type: {
      type: "varchar(50)",
      notNull: true
    },
    reference_type: {
      type: "varchar(50)"
    },
    reference_id: {
      type: "bigint"
    },
    is_read: {
      type: "boolean",
      notNull: true,
      default: false
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    read_at: {
      type: "timestamptz"
    }
  });
  pgm.addConstraint(
    "notifications",
    "chk_notifications_title_not_blank",
    "CHECK (BTRIM(title) <> '')"
  );
  pgm.addConstraint(
    "notifications",
    "chk_notifications_message_not_blank",
    "CHECK (BTRIM(message) <> '')"
  );
  pgm.addConstraint(
    "notifications",
    "chk_notifications_read_consistency",
    "CHECK ((is_read = FALSE AND read_at IS NULL) OR (is_read = TRUE))"
  );
  pgm.createIndex("notifications", "user_id", {
    name: "idx_notifications_user_id"
  });
  pgm.createIndex("notifications", "is_read", {
    name: "idx_notifications_is_read"
  });
  pgm.createIndex("notifications", "notification_type", {
    name: "idx_notifications_type"
  });
  pgm.createIndex("notifications", "created_at", {
    name: "idx_notifications_created_at"
  });
  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_manage_notification_read_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW.is_read = TRUE AND NEW.read_at IS NULL THEN
        NEW.read_at := NOW();
      ELSIF NEW.is_read = FALSE THEN
        NEW.read_at := NULL;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER manage_notification_read_at_before_ins_upd
    BEFORE INSERT OR UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION trg_manage_notification_read_at();
  `);

  pgm.sql(`
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
    JOIN users su ON su.id = m.sender_user_id
    JOIN users ru ON ru.id = m.receiver_user_id;
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_user_inbox_summary AS
    SELECT
      receiver_user_id AS user_id,
      COUNT(*) AS total_received_messages,
      COUNT(*) FILTER (WHERE read_at IS NULL) AS unread_messages
    FROM messages
    GROUP BY receiver_user_id;
  `);

  pgm.sql(`
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
    JOIN users u ON u.id = a.created_by;
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_active_announcements AS
    SELECT *
    FROM vw_announcement_details
    WHERE expires_at IS NULL OR expires_at >= NOW();
  `);

  pgm.sql(`
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
    JOIN users u ON u.id = n.user_id;
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW vw_user_notification_summary AS
    SELECT
      user_id,
      COUNT(*) AS total_notifications,
      COUNT(*) FILTER (WHERE is_read = FALSE) AS unread_notifications
    FROM notifications
    GROUP BY user_id;
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
};

exports.down = (pgm) => {
  pgm.sql("DROP VIEW IF EXISTS vw_admin_dashboard_summary;");
  pgm.sql("DROP VIEW IF EXISTS vw_user_notification_summary;");
  pgm.sql("DROP VIEW IF EXISTS vw_notification_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_active_announcements;");
  pgm.sql("DROP VIEW IF EXISTS vw_announcement_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_user_inbox_summary;");
  pgm.sql("DROP VIEW IF EXISTS vw_message_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_trip_student_event_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_active_trip_live_status;");
  pgm.sql("DROP VIEW IF EXISTS vw_latest_trip_location;");
  pgm.sql("DROP VIEW IF EXISTS vw_trip_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_active_student_bus_assignments;");
  pgm.sql("DROP VIEW IF EXISTS vw_route_stops;");
  pgm.sql("DROP VIEW IF EXISTS vw_student_behavior_summary;");
  pgm.sql("DROP VIEW IF EXISTS vw_behavior_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_homework_submission_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_homework_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_student_assessment_summary;");
  pgm.sql("DROP VIEW IF EXISTS vw_student_assessment_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_assessment_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_class_attendance_summary;");
  pgm.sql("DROP VIEW IF EXISTS vw_student_attendance_summary;");
  pgm.sql("DROP VIEW IF EXISTS vw_attendance_details;");
  pgm.sql("DROP VIEW IF EXISTS vw_class_students;");
  pgm.sql("DROP VIEW IF EXISTS vw_student_primary_parent;");
  pgm.sql("DROP VIEW IF EXISTS vw_student_profiles;");

  pgm.sql("DROP TRIGGER IF EXISTS manage_notification_read_at_before_ins_upd ON notifications;");
  pgm.sql("DROP FUNCTION IF EXISTS trg_manage_notification_read_at();");
  pgm.dropIndex("notifications", "created_at", {
    name: "idx_notifications_created_at",
    ifExists: true
  });
  pgm.dropIndex("notifications", "notification_type", {
    name: "idx_notifications_type",
    ifExists: true
  });
  pgm.dropIndex("notifications", "is_read", {
    name: "idx_notifications_is_read",
    ifExists: true
  });
  pgm.dropIndex("notifications", "user_id", {
    name: "idx_notifications_user_id",
    ifExists: true
  });
  pgm.dropConstraint("notifications", "chk_notifications_read_consistency", {
    ifExists: true
  });
  pgm.dropConstraint("notifications", "chk_notifications_message_not_blank", {
    ifExists: true
  });
  pgm.dropConstraint("notifications", "chk_notifications_title_not_blank", {
    ifExists: true
  });
  pgm.dropTable("notifications", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS trg_announcements_set_updated_at ON announcements;");
  pgm.dropIndex("announcements", "published_at", {
    name: "idx_announcements_published_at",
    ifExists: true
  });
  pgm.dropIndex("announcements", "target_role", {
    name: "idx_announcements_target_role",
    ifExists: true
  });
  pgm.dropIndex("announcements", "created_by", {
    name: "idx_announcements_created_by",
    ifExists: true
  });
  pgm.dropConstraint("announcements", "chk_announcements_expiry", {
    ifExists: true
  });
  pgm.dropConstraint("announcements", "chk_announcements_target_role", {
    ifExists: true
  });
  pgm.dropConstraint("announcements", "chk_announcements_content_not_blank", {
    ifExists: true
  });
  pgm.dropConstraint("announcements", "chk_announcements_title_not_blank", {
    ifExists: true
  });
  pgm.dropTable("announcements", {
    ifExists: true
  });

  pgm.dropIndex("messages", "sent_at", {
    name: "idx_messages_sent_at",
    ifExists: true
  });
  pgm.dropIndex("messages", "receiver_user_id", {
    name: "idx_messages_receiver_user_id",
    ifExists: true
  });
  pgm.dropIndex("messages", "sender_user_id", {
    name: "idx_messages_sender_user_id",
    ifExists: true
  });
  pgm.dropConstraint("messages", "chk_messages_body_not_blank", {
    ifExists: true
  });
  pgm.dropConstraint("messages", "chk_messages_not_self", {
    ifExists: true
  });
  pgm.dropTable("messages", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_trip_student_event_before_ins_upd ON trip_student_events;"
  );
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_trip_student_event();");
  pgm.dropIndex("trip_student_events", "event_time", {
    name: "idx_trip_student_events_event_time",
    ifExists: true
  });
  pgm.dropIndex("trip_student_events", "student_id", {
    name: "idx_trip_student_events_student_id",
    ifExists: true
  });
  pgm.dropIndex("trip_student_events", "trip_id", {
    name: "idx_trip_student_events_trip_id",
    ifExists: true
  });
  pgm.dropConstraint("trip_student_events", "chk_trip_student_events_type", {
    ifExists: true
  });
  pgm.dropTable("trip_student_events", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_bus_location_trip_status_before_ins ON bus_location_history;"
  );
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_bus_location_trip_status();");
  pgm.dropIndex("bus_location_history", ["trip_id", "recorded_at"], {
    name: "idx_bus_location_history_trip_recorded_at",
    ifExists: true
  });
  pgm.dropIndex("bus_location_history", "trip_id", {
    name: "idx_bus_location_history_trip_id",
    ifExists: true
  });
  pgm.dropConstraint("bus_location_history", "chk_bus_location_history_longitude", {
    ifExists: true
  });
  pgm.dropConstraint("bus_location_history", "chk_bus_location_history_latitude", {
    ifExists: true
  });
  pgm.dropTable("bus_location_history", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS validate_trip_status_transition_before_ins_upd ON trips;");
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_trip_status_transition();");
  pgm.sql("DROP TRIGGER IF EXISTS trg_trips_set_updated_at ON trips;");
  pgm.dropIndex("trips", "trip_status", {
    name: "idx_trips_trip_status",
    ifExists: true
  });
  pgm.dropIndex("trips", "trip_date", {
    name: "idx_trips_trip_date",
    ifExists: true
  });
  pgm.dropIndex("trips", "route_id", {
    name: "idx_trips_route_id",
    ifExists: true
  });
  pgm.dropIndex("trips", "bus_id", {
    name: "idx_trips_bus_id",
    ifExists: true
  });
  pgm.dropConstraint("trips", "chk_trips_time_order", {
    ifExists: true
  });
  pgm.dropConstraint("trips", "chk_trips_status", {
    ifExists: true
  });
  pgm.dropConstraint("trips", "chk_trips_type", {
    ifExists: true
  });
  pgm.dropTable("trips", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_student_bus_assignment_stop_route_before_ins_upd ON student_bus_assignments;"
  );
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_student_bus_assignment_stop_route();");
  pgm.sql(
    "DROP TRIGGER IF EXISTS trg_student_bus_assignments_set_updated_at ON student_bus_assignments;"
  );
  pgm.dropIndex("student_bus_assignments", "stop_id", {
    name: "idx_student_bus_assignments_stop_id",
    ifExists: true
  });
  pgm.dropIndex("student_bus_assignments", "route_id", {
    name: "idx_student_bus_assignments_route_id",
    ifExists: true
  });
  pgm.sql("DROP INDEX IF EXISTS uq_student_bus_assignments_one_active;");
  pgm.dropConstraint("student_bus_assignments", "chk_student_bus_assignments_dates", {
    ifExists: true
  });
  pgm.dropTable("student_bus_assignments", {
    ifExists: true
  });

  pgm.dropIndex("bus_stops", "route_id", {
    name: "idx_bus_stops_route_id",
    ifExists: true
  });
  pgm.dropConstraint("bus_stops", "chk_bus_stops_order", {
    ifExists: true
  });
  pgm.dropConstraint("bus_stops", "chk_bus_stops_longitude", {
    ifExists: true
  });
  pgm.dropConstraint("bus_stops", "chk_bus_stops_latitude", {
    ifExists: true
  });
  pgm.dropConstraint("bus_stops", "uq_bus_stops_route_order", {
    ifExists: true
  });
  pgm.dropTable("bus_stops", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS trg_routes_set_updated_at ON routes;");
  pgm.dropIndex("routes", "is_active", {
    name: "idx_routes_is_active",
    ifExists: true
  });
  pgm.dropConstraint("routes", "chk_routes_estimated_duration", {
    ifExists: true
  });
  pgm.dropConstraint("routes", "uq_routes_name", {
    ifExists: true
  });
  pgm.dropTable("routes", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS trg_buses_set_updated_at ON buses;");
  pgm.dropIndex("buses", "status", {
    name: "idx_buses_status",
    ifExists: true
  });
  pgm.dropIndex("buses", "driver_id", {
    name: "idx_buses_driver_id",
    ifExists: true
  });
  pgm.dropConstraint("buses", "chk_buses_status", {
    ifExists: true
  });
  pgm.dropConstraint("buses", "chk_buses_capacity", {
    ifExists: true
  });
  pgm.dropConstraint("buses", "uq_buses_plate_number", {
    ifExists: true
  });
  pgm.dropTable("buses", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_student_assessment_class_before_ins_upd ON student_assessments;"
  );
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_student_assessment_class();");
  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_student_assessment_score_before_ins_upd ON student_assessments;"
  );
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_student_assessment_score();");
  pgm.sql("DROP TRIGGER IF EXISTS trg_student_assessments_set_updated_at ON student_assessments;");
  pgm.dropIndex("student_assessments", "student_id", {
    name: "idx_student_assessments_student_id",
    ifExists: true
  });
  pgm.dropIndex("student_assessments", "assessment_id", {
    name: "idx_student_assessments_assessment_id",
    ifExists: true
  });
  pgm.dropConstraint("student_assessments", "chk_student_assessments_score_non_negative", {
    ifExists: true
  });
  pgm.dropConstraint("student_assessments", "uq_student_assessments_unique", {
    ifExists: true
  });
  pgm.dropTable("student_assessments", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_assessment_semester_year_before_ins_upd ON assessments;"
  );
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_assessment_semester_year();");
  pgm.sql("DROP TRIGGER IF EXISTS trg_assessments_set_updated_at ON assessments;");
  pgm.dropIndex("assessments", "assessment_date", {
    name: "idx_assessments_date",
    ifExists: true
  });
  pgm.dropIndex("assessments", "semester_id", {
    name: "idx_assessments_semester_id",
    ifExists: true
  });
  pgm.dropIndex("assessments", "academic_year_id", {
    name: "idx_assessments_academic_year_id",
    ifExists: true
  });
  pgm.dropIndex("assessments", "teacher_id", {
    name: "idx_assessments_teacher_id",
    ifExists: true
  });
  pgm.dropIndex("assessments", "subject_id", {
    name: "idx_assessments_subject_id",
    ifExists: true
  });
  pgm.dropIndex("assessments", "class_id", {
    name: "idx_assessments_class_id",
    ifExists: true
  });
  pgm.dropIndex("assessments", "assessment_type_id", {
    name: "idx_assessments_type_id",
    ifExists: true
  });
  pgm.dropConstraint("assessments", "chk_assessments_weight", {
    ifExists: true
  });
  pgm.dropConstraint("assessments", "chk_assessments_max_score", {
    ifExists: true
  });
  pgm.dropTable("assessments", {
    ifExists: true
  });

  pgm.dropConstraint("assessment_types", "uq_assessment_types_name", {
    ifExists: true
  });
  pgm.dropConstraint("assessment_types", "uq_assessment_types_code", {
    ifExists: true
  });
  pgm.dropTable("assessment_types", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS validate_homework_submission_class_before_ins_upd ON homework_submissions;");
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_homework_submission_class();");
  pgm.sql("DROP TRIGGER IF EXISTS trg_homework_submissions_set_updated_at ON homework_submissions;");
  pgm.dropIndex("homework_submissions", "student_id", {
    name: "idx_homework_submissions_student_id",
    ifExists: true
  });
  pgm.dropIndex("homework_submissions", "homework_id", {
    name: "idx_homework_submissions_homework_id",
    ifExists: true
  });
  pgm.dropConstraint("homework_submissions", "chk_homework_submissions_status", {
    ifExists: true
  });
  pgm.dropConstraint("homework_submissions", "uq_homework_submissions_unique", {
    ifExists: true
  });
  pgm.dropTable("homework_submissions", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS validate_homework_semester_year_before_ins_upd ON homework;");
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_homework_semester_year();");
  pgm.sql("DROP TRIGGER IF EXISTS trg_homework_set_updated_at ON homework;");
  pgm.dropIndex("homework", "due_date", {
    name: "idx_homework_due_date",
    ifExists: true
  });
  pgm.dropIndex("homework", "subject_id", {
    name: "idx_homework_subject_id",
    ifExists: true
  });
  pgm.dropIndex("homework", "class_id", {
    name: "idx_homework_class_id",
    ifExists: true
  });
  pgm.dropIndex("homework", "teacher_id", {
    name: "idx_homework_teacher_id",
    ifExists: true
  });
  pgm.dropConstraint("homework", "chk_homework_dates", {
    ifExists: true
  });
  pgm.dropTable("homework", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_behavior_semester_year_before_ins_upd ON behavior_records;"
  );
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_behavior_semester_year();");
  pgm.dropIndex("behavior_records", "behavior_category_id", {
    name: "idx_behavior_records_category_id",
    ifExists: true
  });
  pgm.dropIndex("behavior_records", "supervisor_id", {
    name: "idx_behavior_records_supervisor_id",
    ifExists: true
  });
  pgm.dropIndex("behavior_records", "teacher_id", {
    name: "idx_behavior_records_teacher_id",
    ifExists: true
  });
  pgm.dropIndex("behavior_records", "behavior_date", {
    name: "idx_behavior_records_behavior_date",
    ifExists: true
  });
  pgm.dropIndex("behavior_records", "student_id", {
    name: "idx_behavior_records_student_id",
    ifExists: true
  });
  pgm.dropConstraint("behavior_records", "chk_behavior_records_severity", {
    ifExists: true
  });
  pgm.dropConstraint("behavior_records", "chk_behavior_records_actor", {
    ifExists: true
  });
  pgm.dropTable("behavior_records", {
    ifExists: true
  });

  pgm.dropConstraint("behavior_categories", "chk_behavior_categories_severity", {
    ifExists: true
  });
  pgm.dropConstraint("behavior_categories", "chk_behavior_categories_type", {
    ifExists: true
  });
  pgm.dropConstraint("behavior_categories", "uq_behavior_categories_name", {
    ifExists: true
  });
  pgm.dropConstraint("behavior_categories", "uq_behavior_categories_code", {
    ifExists: true
  });
  pgm.dropTable("behavior_categories", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_attendance_student_class_before_ins_upd ON attendance;"
  );
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_attendance_student_class();");
  pgm.dropIndex("attendance", "status", {
    name: "idx_attendance_status",
    ifExists: true
  });
  pgm.dropIndex("attendance", "student_id", {
    name: "idx_attendance_student_id",
    ifExists: true
  });
  pgm.dropIndex("attendance", "attendance_session_id", {
    name: "idx_attendance_session_id",
    ifExists: true
  });
  pgm.dropConstraint("attendance", "chk_attendance_status", {
    ifExists: true
  });
  pgm.dropConstraint("attendance", "uq_attendance_unique", {
    ifExists: true
  });
  pgm.dropTable("attendance", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_attendance_session_semester_year_before_ins_upd ON attendance_sessions;"
  );
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_attendance_session_semester_year();");
  pgm.dropIndex("attendance_sessions", "session_date", {
    name: "idx_attendance_sessions_session_date",
    ifExists: true
  });
  pgm.dropIndex("attendance_sessions", "teacher_id", {
    name: "idx_attendance_sessions_teacher_id",
    ifExists: true
  });
  pgm.dropIndex("attendance_sessions", "subject_id", {
    name: "idx_attendance_sessions_subject_id",
    ifExists: true
  });
  pgm.dropIndex("attendance_sessions", "class_id", {
    name: "idx_attendance_sessions_class_id",
    ifExists: true
  });
  pgm.dropConstraint("attendance_sessions", "chk_attendance_sessions_period_no", {
    ifExists: true
  });
  pgm.dropConstraint("attendance_sessions", "uq_attendance_sessions_unique", {
    ifExists: true
  });
  pgm.dropTable("attendance_sessions", {
    ifExists: true
  });

  pgm.dropIndex("student_promotions", "academic_year_id", {
    name: "idx_student_promotions_academic_year_id",
    ifExists: true
  });
  pgm.dropIndex("student_promotions", "student_id", {
    name: "idx_student_promotions_student_id",
    ifExists: true
  });
  pgm.dropConstraint("student_promotions", "uq_student_promotions_unique", {
    ifExists: true
  });
  pgm.dropConstraint("student_promotions", "chk_student_promotions_different_classes", {
    ifExists: true
  });
  pgm.dropTable("student_promotions", {
    ifExists: true
  });

  pgm.dropIndex("student_parents", "parent_id", {
    name: "idx_student_parents_parent_id",
    ifExists: true
  });
  pgm.dropIndex("student_parents", "student_id", {
    name: "idx_student_parents_student_id",
    ifExists: true
  });
  pgm.sql("DROP INDEX IF EXISTS uq_student_primary_parent;");
  pgm.dropConstraint("student_parents", "uq_student_parents_pair", {
    ifExists: true
  });
  pgm.dropTable("student_parents", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS trg_students_set_updated_at ON students;");
  pgm.dropIndex("students", "status", {
    name: "idx_students_status",
    ifExists: true
  });
  pgm.dropIndex("students", "class_id", {
    name: "idx_students_class_id",
    ifExists: true
  });
  pgm.dropConstraint("students", "chk_students_status", {
    ifExists: true
  });
  pgm.dropConstraint("students", "chk_students_gender", {
    ifExists: true
  });
  pgm.dropConstraint("students", "uq_students_academic_no", {
    ifExists: true
  });
  pgm.dropTable("students", {
    ifExists: true
  });

  pgm.dropIndex("supervisor_classes", "academic_year_id", {
    name: "idx_supervisor_classes_academic_year_id",
    ifExists: true
  });
  pgm.dropIndex("supervisor_classes", "class_id", {
    name: "idx_supervisor_classes_class_id",
    ifExists: true
  });
  pgm.dropIndex("supervisor_classes", "supervisor_id", {
    name: "idx_supervisor_classes_supervisor_id",
    ifExists: true
  });
  pgm.dropTable("supervisor_classes", {
    ifExists: true
  });

  pgm.dropIndex("teacher_classes", "academic_year_id", {
    name: "idx_teacher_classes_academic_year_id",
    ifExists: true
  });
  pgm.dropIndex("teacher_classes", "subject_id", {
    name: "idx_teacher_classes_subject_id",
    ifExists: true
  });
  pgm.dropIndex("teacher_classes", "class_id", {
    name: "idx_teacher_classes_class_id",
    ifExists: true
  });
  pgm.dropIndex("teacher_classes", "teacher_id", {
    name: "idx_teacher_classes_teacher_id",
    ifExists: true
  });
  pgm.dropIndex("teacher_classes", ["teacher_id", "class_id", "subject_id", "academic_year_id"], {
    name: "uq_teacher_classes_teacher_assignment",
    ifExists: true
  });
  pgm.dropIndex("teacher_classes", ["class_id", "subject_id", "academic_year_id"], {
    name: "uq_teacher_classes_single_teacher_per_subject",
    ifExists: true
  });
  pgm.dropTable("teacher_classes", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS trg_subjects_set_updated_at ON subjects;");
  pgm.dropIndex("subjects", ["grade_level_id", "name"], {
    name: "uq_subjects_grade_level_name",
    ifExists: true
  });
  pgm.dropIndex("subjects", "code", {
    name: "uq_subjects_code",
    ifExists: true
  });
  pgm.dropIndex("subjects", "is_active", {
    name: "idx_subjects_is_active",
    ifExists: true
  });
  pgm.dropIndex("subjects", "grade_level_id", {
    name: "idx_subjects_grade_level_id",
    ifExists: true
  });
  pgm.dropTable("subjects", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS trg_classes_set_updated_at ON classes;");
  pgm.dropIndex("classes", ["grade_level_id", "academic_year_id", "class_name", "section"], {
    name: "uq_classes_unique_in_year",
    ifExists: true
  });
  pgm.dropIndex("classes", "is_active", {
    name: "idx_classes_is_active",
    ifExists: true
  });
  pgm.dropIndex("classes", "academic_year_id", {
    name: "idx_classes_academic_year_id",
    ifExists: true
  });
  pgm.dropIndex("classes", "grade_level_id", {
    name: "idx_classes_grade_level_id",
    ifExists: true
  });
  pgm.dropConstraint("classes", "chk_classes_capacity", {
    ifExists: true
  });
  pgm.dropTable("classes", {
    ifExists: true
  });

  pgm.dropIndex("grade_levels", "level_order", {
    name: "uq_grade_levels_order",
    ifExists: true
  });
  pgm.dropIndex("grade_levels", "name", {
    name: "uq_grade_levels_name",
    ifExists: true
  });
  pgm.dropConstraint("grade_levels", "chk_grade_levels_order", {
    ifExists: true
  });
  pgm.dropTable("grade_levels", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_semester_within_academic_year_before_ins_upd ON semesters;"
  );
  pgm.sql("DROP TRIGGER IF EXISTS trg_semesters_set_updated_at ON semesters;");
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_semester_within_academic_year();");
  pgm.dropIndex("semesters", ["academic_year_id", "name"], {
    name: "uq_semesters_year_name",
    ifExists: true
  });
  pgm.dropIndex("semesters", "is_active", {
    name: "idx_semesters_is_active",
    ifExists: true
  });
  pgm.dropIndex("semesters", "academic_year_id", {
    name: "idx_semesters_academic_year_id",
    ifExists: true
  });
  pgm.dropConstraint("semesters", "chk_semesters_dates", {
    ifExists: true
  });
  pgm.dropTable("semesters", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS trg_academic_years_set_updated_at ON academic_years;");
  pgm.sql("DROP INDEX IF EXISTS uq_academic_years_one_active;");
  pgm.dropIndex("academic_years", "name", {
    name: "uq_academic_years_name",
    ifExists: true
  });
  pgm.dropConstraint("academic_years", "chk_academic_years_dates", {
    ifExists: true
  });
  pgm.dropTable("academic_years", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS validate_driver_role_before_ins_upd ON drivers;");
  pgm.sql(
    "DROP TRIGGER IF EXISTS validate_supervisor_role_before_ins_upd ON supervisors;"
  );
  pgm.sql("DROP TRIGGER IF EXISTS validate_teacher_role_before_ins_upd ON teachers;");
  pgm.sql("DROP TRIGGER IF EXISTS validate_parent_role_before_ins_upd ON parents;");
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_driver_role();");
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_supervisor_role();");
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_teacher_role();");
  pgm.sql("DROP FUNCTION IF EXISTS trg_validate_parent_role();");
  pgm.sql("DROP FUNCTION IF EXISTS validate_user_role(text, bigint);");

  pgm.dropConstraint("drivers", "chk_drivers_status", {
    ifExists: true
  });
  pgm.dropIndex("drivers", "license_number", {
    name: "uq_drivers_license_number",
    ifExists: true
  });
  pgm.dropIndex("drivers", "driver_status", {
    name: "idx_drivers_status",
    ifExists: true
  });
  pgm.dropIndex("drivers", "user_id", {
    name: "idx_drivers_user_id",
    ifExists: true
  });
  pgm.dropTable("drivers", {
    ifExists: true
  });

  pgm.dropIndex("supervisors", "user_id", {
    name: "idx_supervisors_user_id",
    ifExists: true
  });
  pgm.dropTable("supervisors", {
    ifExists: true
  });

  pgm.dropIndex("teachers", "user_id", {
    name: "idx_teachers_user_id",
    ifExists: true
  });
  pgm.dropTable("teachers", {
    ifExists: true
  });

  pgm.dropIndex("parents", "user_id", {
    name: "idx_parents_user_id",
    ifExists: true
  });
  pgm.dropTable("parents", {
    ifExists: true
  });

  pgm.dropIndex("password_reset_tokens", "token_hash", {
    name: "uq_password_reset_tokens_token_hash",
    ifExists: true
  });
  pgm.dropIndex("password_reset_tokens", "expires_at", {
    name: "idx_password_reset_tokens_expires_at",
    ifExists: true
  });
  pgm.dropIndex("password_reset_tokens", "user_id", {
    name: "idx_password_reset_tokens_user_id",
    ifExists: true
  });
  pgm.dropTable("password_reset_tokens", {
    ifExists: true
  });

  pgm.dropIndex("auth_refresh_tokens", "revoked_at", {
    name: "idx_auth_refresh_tokens_revoked_at",
    ifExists: true
  });
  pgm.dropIndex("auth_refresh_tokens", "expires_at", {
    name: "idx_auth_refresh_tokens_expires_at",
    ifExists: true
  });
  pgm.dropIndex("auth_refresh_tokens", "user_id", {
    name: "idx_auth_refresh_tokens_user_id",
    ifExists: true
  });
  pgm.dropTable("auth_refresh_tokens", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;");
  pgm.sql("DROP FUNCTION IF EXISTS set_updated_at();");
  pgm.dropIndex("users", "is_active", {
    name: "idx_users_is_active",
    ifExists: true
  });
  pgm.dropIndex("users", "role", {
    name: "idx_users_role",
    ifExists: true
  });
  pgm.dropIndex("users", "phone", {
    name: "uq_users_phone_not_null",
    ifExists: true
  });
  pgm.sql("DROP INDEX IF EXISTS uq_users_email_not_null;");
  pgm.dropConstraint("users", "chk_users_phone_not_blank", {
    ifExists: true
  });
  pgm.dropConstraint("users", "chk_users_email_not_blank", {
    ifExists: true
  });
  pgm.dropConstraint("users", "chk_users_role", {
    ifExists: true
  });
  pgm.dropTable("users", {
    ifExists: true
  });
};


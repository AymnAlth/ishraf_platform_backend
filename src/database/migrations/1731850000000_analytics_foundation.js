exports.up = (pgm) => {
  pgm.createTable("analytics_jobs", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    analysis_type: {
      type: "varchar(60)",
      notNull: true
    },
    subject_type: {
      type: "varchar(30)",
      notNull: true
    },
    subject_id: {
      type: "bigint",
      notNull: true
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
    requested_by_user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "pending"
    },
    primary_provider: {
      type: "varchar(20)",
      notNull: true
    },
    fallback_provider: {
      type: "varchar(20)",
      notNull: true
    },
    selected_provider: {
      type: "varchar(20)"
    },
    fallback_used: {
      type: "boolean",
      notNull: true,
      default: false
    },
    input_json: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    },
    snapshot_id: {
      type: "bigint"
    },
    started_at: {
      type: "timestamptz"
    },
    completed_at: {
      type: "timestamptz"
    },
    last_error_code: {
      type: "varchar(100)"
    },
    last_error_message: {
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
    "analytics_jobs",
    "chk_analytics_jobs_analysis_type",
    "CHECK (analysis_type IN ('student_risk_summary', 'teacher_compliance_summary'))"
  );
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_subject_type",
    "CHECK (subject_type IN ('student', 'teacher'))"
  );
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_status",
    "CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead'))"
  );
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_primary_provider",
    "CHECK (primary_provider IN ('openai', 'groq'))"
  );
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_fallback_provider",
    "CHECK (fallback_provider IN ('openai', 'groq'))"
  );
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_selected_provider",
    "CHECK (selected_provider IS NULL OR selected_provider IN ('openai', 'groq'))"
  );
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_distinct_providers",
    "CHECK (primary_provider <> fallback_provider)"
  );
  pgm.createIndex("analytics_jobs", ["status", "created_at"], {
    name: "idx_analytics_jobs_status_created_at",
    order: ["ASC", "DESC"]
  });
  pgm.createIndex(
    "analytics_jobs",
    ["analysis_type", "subject_type", "subject_id", "academic_year_id", "semester_id", "created_at"],
    {
      name: "idx_analytics_jobs_subject_context_created_at",
      order: ["ASC", "ASC", "ASC", "ASC", "ASC", "DESC"]
    }
  );
  pgm.createIndex("analytics_jobs", ["requested_by_user_id", "created_at"], {
    name: "idx_analytics_jobs_requested_by_created_at",
    order: ["ASC", "DESC"]
  });
  pgm.sql(`
    CREATE UNIQUE INDEX uq_analytics_jobs_active_natural_key
    ON analytics_jobs (analysis_type, subject_type, subject_id, academic_year_id, semester_id)
    WHERE status IN ('pending', 'processing');
  `);
  pgm.sql(`
    CREATE TRIGGER trg_analytics_jobs_set_updated_at
    BEFORE UPDATE ON analytics_jobs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("analytics_snapshots", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    analysis_type: {
      type: "varchar(60)",
      notNull: true
    },
    subject_type: {
      type: "varchar(30)",
      notNull: true
    },
    subject_id: {
      type: "bigint",
      notNull: true
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
    source_job_id: {
      type: "bigint",
      references: "analytics_jobs(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    provider_key: {
      type: "varchar(20)"
    },
    fallback_used: {
      type: "boolean",
      notNull: true,
      default: false
    },
    feature_payload_json: {
      type: "jsonb",
      notNull: true
    },
    result_json: {
      type: "jsonb",
      notNull: true
    },
    computed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
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
    "analytics_snapshots",
    "chk_analytics_snapshots_analysis_type",
    "CHECK (analysis_type IN ('student_risk_summary', 'teacher_compliance_summary'))"
  );
  pgm.addConstraint(
    "analytics_snapshots",
    "chk_analytics_snapshots_subject_type",
    "CHECK (subject_type IN ('student', 'teacher'))"
  );
  pgm.addConstraint(
    "analytics_snapshots",
    "chk_analytics_snapshots_provider_key",
    "CHECK (provider_key IS NULL OR provider_key IN ('openai', 'groq'))"
  );
  pgm.createIndex(
    "analytics_snapshots",
    ["analysis_type", "subject_type", "subject_id", "academic_year_id", "semester_id", "computed_at"],
    {
      name: "idx_analytics_snapshots_subject_context_computed_at",
      order: ["ASC", "ASC", "ASC", "ASC", "ASC", "DESC"]
    }
  );
  pgm.createIndex("analytics_snapshots", "source_job_id", {
    name: "idx_analytics_snapshots_source_job_id"
  });
  pgm.sql(`
    CREATE TRIGGER trg_analytics_snapshots_set_updated_at
    BEFORE UPDATE ON analytics_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.addConstraint(
    "analytics_jobs",
    "fk_analytics_jobs_snapshot_id",
    "FOREIGN KEY (snapshot_id) REFERENCES analytics_snapshots(id) ON DELETE SET NULL ON UPDATE CASCADE"
  );

  pgm.createTable("analytics_feedback", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    snapshot_id: {
      type: "bigint",
      notNull: true,
      references: "analytics_snapshots(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    rating: {
      type: "integer"
    },
    feedback_text: {
      type: "text"
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });

  pgm.addConstraint(
    "analytics_feedback",
    "chk_analytics_feedback_rating",
    "CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)"
  );
  pgm.createIndex("analytics_feedback", ["snapshot_id", "created_at"], {
    name: "idx_analytics_feedback_snapshot_created_at",
    order: ["ASC", "DESC"]
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("analytics_feedback", ["snapshot_id", "created_at"], {
    name: "idx_analytics_feedback_snapshot_created_at",
    ifExists: true
  });
  pgm.dropConstraint("analytics_feedback", "chk_analytics_feedback_rating", {
    ifExists: true
  });
  pgm.dropTable("analytics_feedback", { ifExists: true });

  pgm.dropConstraint("analytics_jobs", "fk_analytics_jobs_snapshot_id", {
    ifExists: true
  });

  pgm.sql("DROP TRIGGER IF EXISTS trg_analytics_snapshots_set_updated_at ON analytics_snapshots;");
  pgm.dropIndex("analytics_snapshots", "source_job_id", {
    name: "idx_analytics_snapshots_source_job_id",
    ifExists: true
  });
  pgm.dropIndex(
    "analytics_snapshots",
    ["analysis_type", "subject_type", "subject_id", "academic_year_id", "semester_id", "computed_at"],
    {
      name: "idx_analytics_snapshots_subject_context_computed_at",
      ifExists: true
    }
  );
  pgm.dropConstraint("analytics_snapshots", "chk_analytics_snapshots_provider_key", {
    ifExists: true
  });
  pgm.dropConstraint("analytics_snapshots", "chk_analytics_snapshots_subject_type", {
    ifExists: true
  });
  pgm.dropConstraint("analytics_snapshots", "chk_analytics_snapshots_analysis_type", {
    ifExists: true
  });
  pgm.dropTable("analytics_snapshots", { ifExists: true });

  pgm.sql("DROP TRIGGER IF EXISTS trg_analytics_jobs_set_updated_at ON analytics_jobs;");
  pgm.sql("DROP INDEX IF EXISTS uq_analytics_jobs_active_natural_key;");
  pgm.dropIndex("analytics_jobs", ["requested_by_user_id", "created_at"], {
    name: "idx_analytics_jobs_requested_by_created_at",
    ifExists: true
  });
  pgm.dropIndex(
    "analytics_jobs",
    ["analysis_type", "subject_type", "subject_id", "academic_year_id", "semester_id", "created_at"],
    {
      name: "idx_analytics_jobs_subject_context_created_at",
      ifExists: true
    }
  );
  pgm.dropIndex("analytics_jobs", ["status", "created_at"], {
    name: "idx_analytics_jobs_status_created_at",
    ifExists: true
  });
  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_distinct_providers", {
    ifExists: true
  });
  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_selected_provider", {
    ifExists: true
  });
  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_fallback_provider", {
    ifExists: true
  });
  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_primary_provider", {
    ifExists: true
  });
  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_status", {
    ifExists: true
  });
  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_subject_type", {
    ifExists: true
  });
  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_analysis_type", {
    ifExists: true
  });
  pgm.dropTable("analytics_jobs", { ifExists: true });
};

exports.up = (pgm) => {
  pgm.createTable("school_onboarding_import_runs", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    mode: {
      type: "varchar(20)",
      notNull: true
    },
    status: {
      type: "varchar(20)",
      notNull: true
    },
    template_version: {
      type: "varchar(50)",
      notNull: true
    },
    file_name: {
      type: "varchar(255)",
      notNull: true
    },
    file_hash: {
      type: "varchar(255)",
      notNull: true
    },
    file_size: {
      type: "integer"
    },
    submitted_by_user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    payload_json: {
      type: "jsonb",
      notNull: true
    },
    result_json: {
      type: "jsonb",
      notNull: true
    },
    summary_json: {
      type: "jsonb",
      notNull: true
    },
    issues_json: {
      type: "jsonb",
      notNull: true
    },
    entity_counts_json: {
      type: "jsonb",
      notNull: true
    },
    resolved_reference_counts_json: {
      type: "jsonb",
      notNull: true
    },
    dry_run_source_id: {
      type: "bigint",
      references: "school_onboarding_import_runs(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    applied_at: {
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
    "school_onboarding_import_runs",
    "chk_school_onboarding_import_runs_mode",
    "CHECK (mode IN ('dry-run', 'apply'))"
  );
  pgm.addConstraint(
    "school_onboarding_import_runs",
    "chk_school_onboarding_import_runs_status",
    "CHECK (status IN ('validated', 'rejected', 'applied', 'failed'))"
  );
  pgm.addConstraint(
    "school_onboarding_import_runs",
    "chk_school_onboarding_import_runs_file_size",
    "CHECK (file_size IS NULL OR file_size >= 0)"
  );
  pgm.createIndex("school_onboarding_import_runs", "submitted_by_user_id", {
    name: "idx_school_onboarding_import_runs_submitted_by_user_id"
  });
  pgm.createIndex("school_onboarding_import_runs", "created_at", {
    name: "idx_school_onboarding_import_runs_created_at"
  });
  pgm.createIndex("school_onboarding_import_runs", "file_hash", {
    name: "idx_school_onboarding_import_runs_file_hash"
  });
  pgm.createIndex("school_onboarding_import_runs", "dry_run_source_id", {
    name: "idx_school_onboarding_import_runs_dry_run_source_id"
  });
  pgm.sql(`
    CREATE UNIQUE INDEX uq_school_onboarding_import_runs_one_apply_per_dry_run
    ON school_onboarding_import_runs (dry_run_source_id)
    WHERE mode = 'apply' AND dry_run_source_id IS NOT NULL;
  `);
  pgm.sql(`
    CREATE TRIGGER trg_school_onboarding_import_runs_set_updated_at
    BEFORE UPDATE ON school_onboarding_import_runs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = (pgm) => {
  pgm.sql(
    "DROP TRIGGER IF EXISTS trg_school_onboarding_import_runs_set_updated_at ON school_onboarding_import_runs;"
  );
  pgm.sql("DROP INDEX IF EXISTS uq_school_onboarding_import_runs_one_apply_per_dry_run;");
  pgm.dropIndex("school_onboarding_import_runs", "dry_run_source_id", {
    name: "idx_school_onboarding_import_runs_dry_run_source_id",
    ifExists: true
  });
  pgm.dropIndex("school_onboarding_import_runs", "file_hash", {
    name: "idx_school_onboarding_import_runs_file_hash",
    ifExists: true
  });
  pgm.dropIndex("school_onboarding_import_runs", "created_at", {
    name: "idx_school_onboarding_import_runs_created_at",
    ifExists: true
  });
  pgm.dropIndex("school_onboarding_import_runs", "submitted_by_user_id", {
    name: "idx_school_onboarding_import_runs_submitted_by_user_id",
    ifExists: true
  });
  pgm.dropConstraint(
    "school_onboarding_import_runs",
    "chk_school_onboarding_import_runs_file_size",
    {
      ifExists: true
    }
  );
  pgm.dropConstraint(
    "school_onboarding_import_runs",
    "chk_school_onboarding_import_runs_status",
    {
      ifExists: true
    }
  );
  pgm.dropConstraint(
    "school_onboarding_import_runs",
    "chk_school_onboarding_import_runs_mode",
    {
      ifExists: true
    }
  );
  pgm.dropTable("school_onboarding_import_runs", { ifExists: true });
};

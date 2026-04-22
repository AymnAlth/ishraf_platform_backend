exports.up = (pgm) => {
  pgm.createTable("analytics_scheduler_runs", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    trigger_mode: {
      type: "varchar(40)",
      notNull: true
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "processing"
    },
    requested_by_user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
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
    stale_before: {
      type: "timestamptz",
      notNull: true
    },
    scheduled_targets_json: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'[]'::jsonb")
    },
    summary_json: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    },
    started_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
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
    "analytics_scheduler_runs",
    "chk_analytics_scheduler_runs_trigger_mode",
    "CHECK (trigger_mode IN ('autonomous_dispatch'))"
  );
  pgm.addConstraint(
    "analytics_scheduler_runs",
    "chk_analytics_scheduler_runs_status",
    "CHECK (status IN ('processing', 'completed', 'failed'))"
  );
  pgm.createIndex("analytics_scheduler_runs", ["trigger_mode", "started_at"], {
    name: "idx_analytics_scheduler_runs_trigger_started_at",
    order: ["ASC", "DESC"]
  });
  pgm.createIndex("analytics_scheduler_runs", ["status", "started_at"], {
    name: "idx_analytics_scheduler_runs_status_started_at",
    order: ["ASC", "DESC"]
  });
  pgm.sql(`
    CREATE TRIGGER trg_analytics_scheduler_runs_set_updated_at
    BEFORE UPDATE ON analytics_scheduler_runs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TRIGGER IF EXISTS trg_analytics_scheduler_runs_set_updated_at ON analytics_scheduler_runs;`);
  pgm.dropIndex("analytics_scheduler_runs", ["status", "started_at"], {
    name: "idx_analytics_scheduler_runs_status_started_at",
    ifExists: true
  });
  pgm.dropIndex("analytics_scheduler_runs", ["trigger_mode", "started_at"], {
    name: "idx_analytics_scheduler_runs_trigger_started_at",
    ifExists: true
  });
  pgm.dropConstraint("analytics_scheduler_runs", "chk_analytics_scheduler_runs_status", {
    ifExists: true
  });
  pgm.dropConstraint("analytics_scheduler_runs", "chk_analytics_scheduler_runs_trigger_mode", {
    ifExists: true
  });
  pgm.dropTable("analytics_scheduler_runs", { ifExists: true });
};

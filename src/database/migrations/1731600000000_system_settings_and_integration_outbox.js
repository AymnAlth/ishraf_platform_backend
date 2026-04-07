exports.up = (pgm) => {
  pgm.createTable("system_settings", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    setting_group: {
      type: "varchar(50)",
      notNull: true
    },
    setting_key: {
      type: "varchar(100)",
      notNull: true
    },
    value_json: {
      type: "jsonb",
      notNull: true
    },
    updated_by_user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
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
    "system_settings",
    "chk_system_settings_group",
    "CHECK (setting_group IN ('pushNotifications', 'transportMaps', 'analytics', 'imports'))"
  );
  pgm.addConstraint(
    "system_settings",
    "uq_system_settings_group_key",
    "UNIQUE (setting_group, setting_key)"
  );
  pgm.sql(`
    CREATE TRIGGER trg_system_settings_set_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("system_setting_audit_logs", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    system_setting_id: {
      type: "bigint",
      references: "system_settings(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    setting_group: {
      type: "varchar(50)",
      notNull: true
    },
    setting_key: {
      type: "varchar(100)",
      notNull: true
    },
    action: {
      type: "varchar(20)",
      notNull: true
    },
    previous_value_json: {
      type: "jsonb"
    },
    new_value_json: {
      type: "jsonb"
    },
    changed_by_user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    change_reason: {
      type: "varchar(500)",
      notNull: true
    },
    request_id: {
      type: "uuid",
      notNull: true
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });

  pgm.addConstraint(
    "system_setting_audit_logs",
    "chk_system_setting_audit_logs_group",
    "CHECK (setting_group IN ('pushNotifications', 'transportMaps', 'analytics', 'imports'))"
  );
  pgm.addConstraint(
    "system_setting_audit_logs",
    "chk_system_setting_audit_logs_action",
    "CHECK (action IN ('created', 'updated', 'cleared'))"
  );
  pgm.addConstraint(
    "system_setting_audit_logs",
    "chk_system_setting_audit_logs_values",
    "CHECK (previous_value_json IS NOT NULL OR new_value_json IS NOT NULL)"
  );
  pgm.createIndex("system_setting_audit_logs", "created_at", {
    name: "idx_system_setting_audit_logs_created_at",
    order: "DESC"
  });
  pgm.createIndex(
    "system_setting_audit_logs",
    ["setting_group", "setting_key", "created_at"],
    {
      name: "idx_system_setting_audit_logs_group_key_created_at",
      order: ["ASC", "ASC", "DESC"]
    }
  );
  pgm.createIndex(
    "system_setting_audit_logs",
    ["changed_by_user_id", "created_at"],
    {
      name: "idx_system_setting_audit_logs_changed_by_created_at",
      order: ["ASC", "DESC"]
    }
  );
  pgm.createIndex("system_setting_audit_logs", "request_id", {
    name: "idx_system_setting_audit_logs_request_id"
  });

  pgm.createTable("integration_outbox", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    provider_key: {
      type: "varchar(50)",
      notNull: true
    },
    event_type: {
      type: "varchar(100)",
      notNull: true
    },
    aggregate_type: {
      type: "varchar(50)",
      notNull: true
    },
    aggregate_id: {
      type: "varchar(50)",
      notNull: true
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "pending"
    },
    payload_json: {
      type: "jsonb",
      notNull: true
    },
    headers_json: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    },
    idempotency_key: {
      type: "varchar(255)"
    },
    available_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    reserved_at: {
      type: "timestamptz"
    },
    processed_at: {
      type: "timestamptz"
    },
    attempt_count: {
      type: "integer",
      notNull: true,
      default: 0
    },
    max_attempts: {
      type: "integer",
      notNull: true,
      default: 10
    },
    last_error_code: {
      type: "varchar(100)"
    },
    last_error_message: {
      type: "text"
    },
    created_by_user_id: {
      type: "bigint",
      references: "users(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    request_id: {
      type: "uuid"
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
    "integration_outbox",
    "chk_integration_outbox_status",
    "CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'dead'))"
  );
  pgm.addConstraint(
    "integration_outbox",
    "chk_integration_outbox_attempt_count",
    "CHECK (attempt_count >= 0)"
  );
  pgm.addConstraint(
    "integration_outbox",
    "chk_integration_outbox_max_attempts",
    "CHECK (max_attempts > 0)"
  );
  pgm.sql(`
    CREATE INDEX idx_integration_outbox_dispatch_queue
    ON integration_outbox (status, available_at, id)
    WHERE status IN ('pending', 'failed');
  `);
  pgm.createIndex(
    "integration_outbox",
    ["provider_key", "status", "created_at"],
    {
      name: "idx_integration_outbox_provider_status_created_at",
      order: ["ASC", "ASC", "DESC"]
    }
  );
  pgm.createIndex(
    "integration_outbox",
    ["aggregate_type", "aggregate_id", "created_at"],
    {
      name: "idx_integration_outbox_aggregate_created_at",
      order: ["ASC", "ASC", "DESC"]
    }
  );
  pgm.sql(`
    CREATE UNIQUE INDEX uq_integration_outbox_idempotency_key
    ON integration_outbox (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
  `);
  pgm.createIndex("integration_outbox", "request_id", {
    name: "idx_integration_outbox_request_id"
  });
  pgm.sql(`
    CREATE TRIGGER trg_integration_outbox_set_updated_at
    BEFORE UPDATE ON integration_outbox
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = (pgm) => {
  pgm.sql("DROP TRIGGER IF EXISTS trg_integration_outbox_set_updated_at ON integration_outbox;");
  pgm.dropIndex("integration_outbox", "request_id", {
    name: "idx_integration_outbox_request_id",
    ifExists: true
  });
  pgm.sql("DROP INDEX IF EXISTS uq_integration_outbox_idempotency_key;");
  pgm.dropIndex("integration_outbox", ["aggregate_type", "aggregate_id", "created_at"], {
    name: "idx_integration_outbox_aggregate_created_at",
    ifExists: true
  });
  pgm.dropIndex("integration_outbox", ["provider_key", "status", "created_at"], {
    name: "idx_integration_outbox_provider_status_created_at",
    ifExists: true
  });
  pgm.sql("DROP INDEX IF EXISTS idx_integration_outbox_dispatch_queue;");
  pgm.dropConstraint("integration_outbox", "chk_integration_outbox_max_attempts", {
    ifExists: true
  });
  pgm.dropConstraint("integration_outbox", "chk_integration_outbox_attempt_count", {
    ifExists: true
  });
  pgm.dropConstraint("integration_outbox", "chk_integration_outbox_status", {
    ifExists: true
  });
  pgm.dropTable("integration_outbox", { ifExists: true });

  pgm.dropIndex("system_setting_audit_logs", "request_id", {
    name: "idx_system_setting_audit_logs_request_id",
    ifExists: true
  });
  pgm.dropIndex("system_setting_audit_logs", ["changed_by_user_id", "created_at"], {
    name: "idx_system_setting_audit_logs_changed_by_created_at",
    ifExists: true
  });
  pgm.dropIndex("system_setting_audit_logs", ["setting_group", "setting_key", "created_at"], {
    name: "idx_system_setting_audit_logs_group_key_created_at",
    ifExists: true
  });
  pgm.dropIndex("system_setting_audit_logs", "created_at", {
    name: "idx_system_setting_audit_logs_created_at",
    ifExists: true
  });
  pgm.dropConstraint(
    "system_setting_audit_logs",
    "chk_system_setting_audit_logs_values",
    { ifExists: true }
  );
  pgm.dropConstraint(
    "system_setting_audit_logs",
    "chk_system_setting_audit_logs_action",
    { ifExists: true }
  );
  pgm.dropConstraint(
    "system_setting_audit_logs",
    "chk_system_setting_audit_logs_group",
    { ifExists: true }
  );
  pgm.dropTable("system_setting_audit_logs", { ifExists: true });

  pgm.sql("DROP TRIGGER IF EXISTS trg_system_settings_set_updated_at ON system_settings;");
  pgm.dropConstraint("system_settings", "uq_system_settings_group_key", { ifExists: true });
  pgm.dropConstraint("system_settings", "chk_system_settings_group", { ifExists: true });
  pgm.dropTable("system_settings", { ifExists: true });
};

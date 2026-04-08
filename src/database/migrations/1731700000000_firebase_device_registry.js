exports.up = (pgm) => {
  pgm.createTable("user_devices", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    provider_key: {
      type: "varchar(30)",
      notNull: true
    },
    platform: {
      type: "varchar(20)",
      notNull: true
    },
    app_id: {
      type: "varchar(50)",
      notNull: true
    },
    device_token: {
      type: "text",
      notNull: true
    },
    device_name: {
      type: "varchar(100)"
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true
    },
    last_seen_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    unregistered_at: {
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
    "user_devices",
    "chk_user_devices_provider_key",
    "CHECK (provider_key IN ('fcm'))"
  );
  pgm.addConstraint(
    "user_devices",
    "chk_user_devices_platform",
    "CHECK (platform IN ('android', 'ios', 'web'))"
  );
  pgm.addConstraint(
    "user_devices",
    "uq_user_devices_provider_token",
    "UNIQUE (provider_key, device_token)"
  );
  pgm.createIndex("user_devices", ["user_id", "is_active", "updated_at"], {
    name: "idx_user_devices_user_active_updated_at",
    order: ["ASC", "ASC", "DESC"]
  });
  pgm.createIndex("user_devices", ["provider_key", "is_active", "updated_at"], {
    name: "idx_user_devices_provider_active_updated_at",
    order: ["ASC", "ASC", "DESC"]
  });
  pgm.sql(`
    CREATE TRIGGER trg_user_devices_set_updated_at
    BEFORE UPDATE ON user_devices
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("user_device_subscriptions", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    device_id: {
      type: "bigint",
      notNull: true,
      references: "user_devices(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    subscription_key: {
      type: "varchar(50)",
      notNull: true
    },
    is_enabled: {
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
    "user_device_subscriptions",
    "chk_user_device_subscriptions_key",
    "CHECK (subscription_key IN ('transportRealtime'))"
  );
  pgm.addConstraint(
    "user_device_subscriptions",
    "uq_user_device_subscriptions_device_key",
    "UNIQUE (device_id, subscription_key)"
  );
  pgm.createIndex("user_device_subscriptions", ["device_id", "is_enabled"], {
    name: "idx_user_device_subscriptions_device_enabled"
  });
  pgm.createIndex("user_device_subscriptions", ["subscription_key", "is_enabled"], {
    name: "idx_user_device_subscriptions_key_enabled"
  });
  pgm.sql(`
    CREATE TRIGGER trg_user_device_subscriptions_set_updated_at
    BEFORE UPDATE ON user_device_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = (pgm) => {
  pgm.sql(
    "DROP TRIGGER IF EXISTS trg_user_device_subscriptions_set_updated_at ON user_device_subscriptions;"
  );
  pgm.dropIndex("user_device_subscriptions", ["subscription_key", "is_enabled"], {
    name: "idx_user_device_subscriptions_key_enabled",
    ifExists: true
  });
  pgm.dropIndex("user_device_subscriptions", ["device_id", "is_enabled"], {
    name: "idx_user_device_subscriptions_device_enabled",
    ifExists: true
  });
  pgm.dropConstraint(
    "user_device_subscriptions",
    "uq_user_device_subscriptions_device_key",
    { ifExists: true }
  );
  pgm.dropConstraint(
    "user_device_subscriptions",
    "chk_user_device_subscriptions_key",
    { ifExists: true }
  );
  pgm.dropTable("user_device_subscriptions", { ifExists: true });

  pgm.sql("DROP TRIGGER IF EXISTS trg_user_devices_set_updated_at ON user_devices;");
  pgm.dropIndex("user_devices", ["provider_key", "is_active", "updated_at"], {
    name: "idx_user_devices_provider_active_updated_at",
    ifExists: true
  });
  pgm.dropIndex("user_devices", ["user_id", "is_active", "updated_at"], {
    name: "idx_user_devices_user_active_updated_at",
    ifExists: true
  });
  pgm.dropConstraint("user_devices", "uq_user_devices_provider_token", {
    ifExists: true
  });
  pgm.dropConstraint("user_devices", "chk_user_devices_platform", {
    ifExists: true
  });
  pgm.dropConstraint("user_devices", "chk_user_devices_provider_key", {
    ifExists: true
  });
  pgm.dropTable("user_devices", { ifExists: true });
};

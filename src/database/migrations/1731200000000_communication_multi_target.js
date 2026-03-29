exports.up = (pgm) => {
  pgm.createTable("announcement_target_roles", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    announcement_id: {
      type: "bigint",
      notNull: true,
      references: "announcements(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    target_role: {
      type: "varchar(30)",
      notNull: true
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });

  pgm.addConstraint(
    "announcement_target_roles",
    "chk_announcement_target_roles_role",
    "CHECK (target_role IN ('admin', 'parent', 'teacher', 'supervisor', 'driver'))"
  );
  pgm.addConstraint(
    "announcement_target_roles",
    "uq_announcement_target_roles_pair",
    "UNIQUE (announcement_id, target_role)"
  );
  pgm.createIndex("announcement_target_roles", "announcement_id", {
    name: "idx_announcement_target_roles_announcement_id"
  });
  pgm.createIndex("announcement_target_roles", "target_role", {
    name: "idx_announcement_target_roles_target_role"
  });

  pgm.sql(`
    INSERT INTO announcement_target_roles (announcement_id, target_role)
    SELECT id, target_role
    FROM announcements
    WHERE target_role IS NOT NULL
    ON CONFLICT (announcement_id, target_role) DO NOTHING;
  `);

  pgm.sql("DROP VIEW IF EXISTS vw_active_announcements;");
  pgm.sql("DROP VIEW IF EXISTS vw_announcement_details;");

  pgm.sql(`
    CREATE VIEW vw_announcement_details AS
    SELECT
      a.id AS announcement_id,
      a.title,
      a.content,
      a.target_role,
      COALESCE(
        array_agg(DISTINCT atr.target_role ORDER BY atr.target_role)
          FILTER (WHERE atr.target_role IS NOT NULL),
        ARRAY[]::varchar[]
      ) AS target_roles,
      a.published_at,
      a.expires_at,
      a.created_by,
      u.full_name AS created_by_name
    FROM announcements a
    JOIN users u ON u.id = a.created_by
    LEFT JOIN announcement_target_roles atr ON atr.announcement_id = a.id
    GROUP BY a.id, u.full_name;
  `);

  pgm.sql(`
    CREATE VIEW vw_active_announcements AS
    SELECT *
    FROM vw_announcement_details
    WHERE expires_at IS NULL OR expires_at >= NOW();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE announcements a
    SET target_role = source.target_role
    FROM (
      SELECT
        announcement_id,
        CASE
          WHEN COUNT(*) = 1 THEN MIN(target_role)
          ELSE NULL
        END AS target_role
      FROM announcement_target_roles
      GROUP BY announcement_id
    ) AS source
    WHERE a.id = source.announcement_id;
  `);

  pgm.sql("DROP VIEW IF EXISTS vw_active_announcements;");
  pgm.sql("DROP VIEW IF EXISTS vw_announcement_details;");

  pgm.sql(`
    CREATE VIEW vw_announcement_details AS
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
    CREATE VIEW vw_active_announcements AS
    SELECT *
    FROM vw_announcement_details
    WHERE expires_at IS NULL OR expires_at >= NOW();
  `);

  pgm.dropIndex("announcement_target_roles", "target_role", {
    name: "idx_announcement_target_roles_target_role",
    ifExists: true
  });
  pgm.dropIndex("announcement_target_roles", "announcement_id", {
    name: "idx_announcement_target_roles_announcement_id",
    ifExists: true
  });
  pgm.dropConstraint("announcement_target_roles", "uq_announcement_target_roles_pair", {
    ifExists: true
  });
  pgm.dropConstraint("announcement_target_roles", "chk_announcement_target_roles_role", {
    ifExists: true
  });
  pgm.dropTable("announcement_target_roles", { ifExists: true });
};

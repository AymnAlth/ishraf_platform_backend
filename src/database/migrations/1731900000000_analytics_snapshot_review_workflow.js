exports.up = (pgm) => {
  pgm.addColumns("analytics_snapshots", {
    review_status: {
      type: "varchar(20)",
      notNull: true,
      default: "draft"
    },
    reviewed_by_user_id: {
      type: "bigint",
      references: "users(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    reviewed_at: {
      type: "timestamptz"
    },
    published_at: {
      type: "timestamptz"
    },
    review_notes: {
      type: "text"
    }
  });

  pgm.addConstraint(
    "analytics_snapshots",
    "chk_analytics_snapshots_review_status",
    "CHECK (review_status IN ('draft', 'approved', 'rejected', 'superseded'))"
  );

  pgm.createIndex(
    "analytics_snapshots",
    [
      "analysis_type",
      "subject_type",
      "subject_id",
      "academic_year_id",
      "semester_id",
      "review_status",
      "computed_at"
    ],
    {
      name: "idx_analytics_snapshots_subject_context_review_computed_at"
    }
  );
};

exports.down = (pgm) => {
  pgm.dropIndex(
    "analytics_snapshots",
    [
      "analysis_type",
      "subject_type",
      "subject_id",
      "academic_year_id",
      "semester_id",
      "review_status",
      "computed_at"
    ],
    {
      name: "idx_analytics_snapshots_subject_context_review_computed_at",
      ifExists: true
    }
  );

  pgm.dropConstraint("analytics_snapshots", "chk_analytics_snapshots_review_status", {
    ifExists: true
  });

  pgm.dropColumns("analytics_snapshots", [
    "review_notes",
    "published_at",
    "reviewed_at",
    "reviewed_by_user_id",
    "review_status"
  ]);
};

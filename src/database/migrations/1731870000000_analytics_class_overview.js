exports.up = (pgm) => {
  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_analysis_type");
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_analysis_type",
    "CHECK (analysis_type IN ('student_risk_summary', 'teacher_compliance_summary', 'admin_operational_digest', 'class_overview'))"
  );

  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_subject_type");
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_subject_type",
    "CHECK (subject_type IN ('student', 'teacher', 'system', 'class'))"
  );

  pgm.dropConstraint("analytics_snapshots", "chk_analytics_snapshots_analysis_type");
  pgm.addConstraint(
    "analytics_snapshots",
    "chk_analytics_snapshots_analysis_type",
    "CHECK (analysis_type IN ('student_risk_summary', 'teacher_compliance_summary', 'admin_operational_digest', 'class_overview'))"
  );

  pgm.dropConstraint("analytics_snapshots", "chk_analytics_snapshots_subject_type");
  pgm.addConstraint(
    "analytics_snapshots",
    "chk_analytics_snapshots_subject_type",
    "CHECK (subject_type IN ('student', 'teacher', 'system', 'class'))"
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint("analytics_snapshots", "chk_analytics_snapshots_subject_type");
  pgm.addConstraint(
    "analytics_snapshots",
    "chk_analytics_snapshots_subject_type",
    "CHECK (subject_type IN ('student', 'teacher', 'system'))"
  );

  pgm.dropConstraint("analytics_snapshots", "chk_analytics_snapshots_analysis_type");
  pgm.addConstraint(
    "analytics_snapshots",
    "chk_analytics_snapshots_analysis_type",
    "CHECK (analysis_type IN ('student_risk_summary', 'teacher_compliance_summary', 'admin_operational_digest'))"
  );

  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_subject_type");
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_subject_type",
    "CHECK (subject_type IN ('student', 'teacher', 'system'))"
  );

  pgm.dropConstraint("analytics_jobs", "chk_analytics_jobs_analysis_type");
  pgm.addConstraint(
    "analytics_jobs",
    "chk_analytics_jobs_analysis_type",
    "CHECK (analysis_type IN ('student_risk_summary', 'teacher_compliance_summary', 'admin_operational_digest'))"
  );
};

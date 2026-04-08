exports.up = (pgm) => {
  pgm.dropConstraint(
    "transport_trip_eta_snapshots",
    "chk_transport_trip_eta_snapshots_calculation_mode",
    { ifExists: true }
  );

  pgm.sql(`
    UPDATE transport_trip_eta_snapshots
    SET calculation_mode = 'provider_snapshot'
    WHERE calculation_mode = 'google_snapshot'
  `);

  pgm.addConstraint(
    "transport_trip_eta_snapshots",
    "chk_transport_trip_eta_snapshots_calculation_mode",
    "CHECK (calculation_mode IS NULL OR calculation_mode IN ('provider_snapshot', 'derived_estimate'))"
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint(
    "transport_trip_eta_snapshots",
    "chk_transport_trip_eta_snapshots_calculation_mode",
    { ifExists: true }
  );

  pgm.sql(`
    UPDATE transport_trip_eta_snapshots
    SET calculation_mode = 'google_snapshot'
    WHERE calculation_mode = 'provider_snapshot'
  `);

  pgm.addConstraint(
    "transport_trip_eta_snapshots",
    "chk_transport_trip_eta_snapshots_calculation_mode",
    "CHECK (calculation_mode IS NULL OR calculation_mode IN ('google_snapshot', 'derived_estimate'))"
  );
};

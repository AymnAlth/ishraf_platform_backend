exports.up = (pgm) => {
  pgm.addColumn("transport_trip_eta_stop_snapshots", {
    approaching_notified: {
      type: "boolean",
      notNull: true,
      default: false
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("transport_trip_eta_stop_snapshots", ["approaching_notified"], {
    ifExists: true
  });
};

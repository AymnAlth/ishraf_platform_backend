exports.up = (pgm) => {
  pgm.dropConstraint(
    "transport_route_map_cache",
    "uq_transport_route_map_cache_route_signature",
    { ifExists: true }
  );

  pgm.addConstraint(
    "transport_route_map_cache",
    "uq_transport_route_map_cache_route_provider_signature",
    "UNIQUE (route_id, provider_key, stop_signature_hash)"
  );

  pgm.createIndex(
    "transport_route_map_cache",
    ["route_id", "provider_key", "stop_signature_hash"],
    {
      name: "idx_transport_route_map_cache_route_provider_signature"
    }
  );

  pgm.addColumns("transport_trip_eta_snapshots", {
    provider_key: {
      type: "varchar(50)",
      default: "googleRoutes"
    },
    refresh_reason: {
      type: "varchar(50)"
    }
  });

  pgm.sql(`
    UPDATE transport_trip_eta_snapshots
    SET provider_key = 'googleRoutes'
    WHERE provider_key IS NULL
  `);

  pgm.alterColumn("transport_trip_eta_snapshots", "provider_key", {
    type: "varchar(50)",
    notNull: true,
    default: "googleRoutes"
  });
};

exports.down = (pgm) => {
  pgm.alterColumn("transport_trip_eta_snapshots", "provider_key", {
    type: "varchar(50)",
    notNull: false,
    default: null
  });

  pgm.dropColumns("transport_trip_eta_snapshots", ["provider_key", "refresh_reason"], {
    ifExists: true
  });

  pgm.dropIndex(
    "transport_route_map_cache",
    ["route_id", "provider_key", "stop_signature_hash"],
    {
      name: "idx_transport_route_map_cache_route_provider_signature",
      ifExists: true
    }
  );

  pgm.dropConstraint(
    "transport_route_map_cache",
    "uq_transport_route_map_cache_route_provider_signature",
    { ifExists: true }
  );

  pgm.addConstraint(
    "transport_route_map_cache",
    "uq_transport_route_map_cache_route_signature",
    "UNIQUE (route_id, stop_signature_hash)"
  );
};
exports.up = (pgm) => {
  pgm.createTable("transport_route_map_cache", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    route_id: {
      type: "bigint",
      notNull: true,
      references: "routes(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    stop_signature_hash: {
      type: "varchar(128)",
      notNull: true
    },
    provider_key: {
      type: "varchar(50)",
      notNull: true,
      default: "googleRoutes"
    },
    encoded_polyline: {
      type: "text",
      notNull: true
    },
    total_distance_meters: {
      type: "integer",
      notNull: true
    },
    total_duration_seconds: {
      type: "integer",
      notNull: true
    },
    stop_metrics_json: {
      type: "jsonb",
      notNull: true
    },
    computed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    last_error_code: {
      type: "varchar(100)"
    },
    last_error_message: {
      type: "text"
    }
  });
  pgm.addConstraint(
    "transport_route_map_cache",
    "uq_transport_route_map_cache_route_signature",
    "UNIQUE (route_id, stop_signature_hash)"
  );
  pgm.createIndex("transport_route_map_cache", "route_id", {
    name: "idx_transport_route_map_cache_route_id"
  });

  pgm.createTable("transport_trip_eta_snapshots", {
    trip_id: {
      type: "bigint",
      primaryKey: true,
      references: "trips(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    route_id: {
      type: "bigint",
      notNull: true,
      references: "routes(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    route_map_cache_id: {
      type: "bigint",
      references: "transport_route_map_cache(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "unavailable"
    },
    calculation_mode: {
      type: "varchar(30)"
    },
    based_on_location_id: {
      type: "bigint",
      references: "bus_location_history(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    based_on_latitude: {
      type: "numeric(10, 7)"
    },
    based_on_longitude: {
      type: "numeric(10, 7)"
    },
    based_on_recorded_at: {
      type: "timestamptz"
    },
    projected_distance_meters: {
      type: "integer"
    },
    remaining_distance_meters: {
      type: "integer"
    },
    remaining_duration_seconds: {
      type: "integer"
    },
    estimated_speed_mps: {
      type: "numeric(10, 4)"
    },
    next_stop_id: {
      type: "bigint",
      references: "bus_stops(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    next_stop_order: {
      type: "integer"
    },
    next_stop_eta_at: {
      type: "timestamptz"
    },
    final_eta_at: {
      type: "timestamptz"
    },
    provider_refreshed_at: {
      type: "timestamptz"
    },
    computed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },
    last_deviation_meters: {
      type: "integer"
    },
    last_error_code: {
      type: "varchar(100)"
    },
    last_error_message: {
      type: "text"
    }
  });
  pgm.addConstraint(
    "transport_trip_eta_snapshots",
    "chk_transport_trip_eta_snapshots_status",
    "CHECK (status IN ('fresh', 'stale', 'unavailable', 'completed'))"
  );
  pgm.addConstraint(
    "transport_trip_eta_snapshots",
    "chk_transport_trip_eta_snapshots_calculation_mode",
    "CHECK (calculation_mode IS NULL OR calculation_mode IN ('google_snapshot', 'derived_estimate'))"
  );
  pgm.createIndex("transport_trip_eta_snapshots", "trip_id", {
    name: "idx_transport_trip_eta_snapshots_trip_id"
  });
  pgm.createIndex("transport_trip_eta_snapshots", "status", {
    name: "idx_transport_trip_eta_snapshots_status"
  });
  pgm.createIndex("transport_trip_eta_snapshots", "provider_refreshed_at", {
    name: "idx_transport_trip_eta_snapshots_provider_refreshed_at"
  });

  pgm.createTable("transport_trip_eta_stop_snapshots", {
    trip_id: {
      type: "bigint",
      notNull: true,
      references: "trips(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    stop_id: {
      type: "bigint",
      notNull: true,
      references: "bus_stops(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    stop_order: {
      type: "integer",
      notNull: true
    },
    stop_name: {
      type: "varchar(100)",
      notNull: true
    },
    eta_at: {
      type: "timestamptz"
    },
    remaining_distance_meters: {
      type: "integer"
    },
    remaining_duration_seconds: {
      type: "integer"
    },
    is_next_stop: {
      type: "boolean",
      notNull: true,
      default: false
    },
    is_completed: {
      type: "boolean",
      notNull: true,
      default: false
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });
  pgm.addConstraint(
    "transport_trip_eta_stop_snapshots",
    "uq_transport_trip_eta_stop_snapshots_trip_stop",
    "UNIQUE (trip_id, stop_id)"
  );
  pgm.createIndex("transport_trip_eta_stop_snapshots", ["trip_id", "stop_order"], {
    name: "idx_transport_trip_eta_stop_snapshots_trip_stop_order"
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("transport_trip_eta_stop_snapshots", ["trip_id", "stop_order"], {
    name: "idx_transport_trip_eta_stop_snapshots_trip_stop_order",
    ifExists: true
  });
  pgm.dropConstraint(
    "transport_trip_eta_stop_snapshots",
    "uq_transport_trip_eta_stop_snapshots_trip_stop",
    { ifExists: true }
  );
  pgm.dropTable("transport_trip_eta_stop_snapshots", { ifExists: true });

  pgm.dropIndex("transport_trip_eta_snapshots", "provider_refreshed_at", {
    name: "idx_transport_trip_eta_snapshots_provider_refreshed_at",
    ifExists: true
  });
  pgm.dropIndex("transport_trip_eta_snapshots", "status", {
    name: "idx_transport_trip_eta_snapshots_status",
    ifExists: true
  });
  pgm.dropIndex("transport_trip_eta_snapshots", "trip_id", {
    name: "idx_transport_trip_eta_snapshots_trip_id",
    ifExists: true
  });
  pgm.dropConstraint(
    "transport_trip_eta_snapshots",
    "chk_transport_trip_eta_snapshots_calculation_mode",
    { ifExists: true }
  );
  pgm.dropConstraint("transport_trip_eta_snapshots", "chk_transport_trip_eta_snapshots_status", {
    ifExists: true
  });
  pgm.dropTable("transport_trip_eta_snapshots", { ifExists: true });

  pgm.dropIndex("transport_route_map_cache", "route_id", {
    name: "idx_transport_route_map_cache_route_id",
    ifExists: true
  });
  pgm.dropConstraint(
    "transport_route_map_cache",
    "uq_transport_route_map_cache_route_signature",
    { ifExists: true }
  );
  pgm.dropTable("transport_route_map_cache", { ifExists: true });
};

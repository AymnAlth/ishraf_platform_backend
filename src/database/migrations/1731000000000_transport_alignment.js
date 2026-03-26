exports.up = (pgm) => {
  pgm.createTable("transport_route_assignments", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    bus_id: {
      type: "bigint",
      notNull: true,
      references: "buses(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    route_id: {
      type: "bigint",
      notNull: true,
      references: "routes(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    start_date: {
      type: "date",
      notNull: true
    },
    end_date: {
      type: "date"
    },
    is_active: {
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
    "transport_route_assignments",
    "chk_transport_route_assignments_dates",
    "CHECK (end_date IS NULL OR end_date >= start_date)"
  );
  pgm.createIndex("transport_route_assignments", "bus_id", {
    name: "idx_transport_route_assignments_bus_id"
  });
  pgm.createIndex("transport_route_assignments", "route_id", {
    name: "idx_transport_route_assignments_route_id"
  });
  pgm.sql(`
    CREATE UNIQUE INDEX uq_transport_route_assignments_one_active_bus
    ON transport_route_assignments (bus_id)
    WHERE is_active = TRUE;
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX uq_transport_route_assignments_one_active_route
    ON transport_route_assignments (route_id)
    WHERE is_active = TRUE;
  `);
  pgm.sql(`
    CREATE TRIGGER trg_transport_route_assignments_set_updated_at
    BEFORE UPDATE ON transport_route_assignments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.createTable("student_transport_home_locations", {
    id: {
      type: "bigserial",
      primaryKey: true
    },
    student_id: {
      type: "bigint",
      notNull: true,
      references: "students(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    address_label: {
      type: "varchar(150)"
    },
    address_text: {
      type: "text"
    },
    latitude: {
      type: "numeric(10, 7)",
      notNull: true
    },
    longitude: {
      type: "numeric(10, 7)",
      notNull: true
    },
    source: {
      type: "varchar(20)",
      notNull: true,
      default: "admin"
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "pending"
    },
    submitted_by_user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    },
    approved_by_user_id: {
      type: "bigint",
      references: "users(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    approved_at: {
      type: "timestamptz"
    },
    notes: {
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
    "student_transport_home_locations",
    "uq_student_transport_home_locations_student",
    "UNIQUE (student_id)"
  );
  pgm.addConstraint(
    "student_transport_home_locations",
    "chk_student_transport_home_locations_latitude",
    "CHECK (latitude BETWEEN -90 AND 90)"
  );
  pgm.addConstraint(
    "student_transport_home_locations",
    "chk_student_transport_home_locations_longitude",
    "CHECK (longitude BETWEEN -180 AND 180)"
  );
  pgm.addConstraint(
    "student_transport_home_locations",
    "chk_student_transport_home_locations_source",
    "CHECK (source IN ('admin', 'parent'))"
  );
  pgm.addConstraint(
    "student_transport_home_locations",
    "chk_student_transport_home_locations_status",
    "CHECK (status IN ('pending', 'approved', 'rejected'))"
  );
  pgm.createIndex("student_transport_home_locations", "status", {
    name: "idx_student_transport_home_locations_status"
  });
  pgm.sql(`
    CREATE TRIGGER trg_student_transport_home_locations_set_updated_at
    BEFORE UPDATE ON student_transport_home_locations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.sql(`
    CREATE TEMP TABLE tmp_trip_dedup_map AS
    WITH ranked AS (
      SELECT
        id,
        bus_id,
        route_id,
        trip_date,
        trip_type,
        ROW_NUMBER() OVER (
          PARTITION BY bus_id, route_id, trip_date, trip_type
          ORDER BY
            CASE trip_status
              WHEN 'ended' THEN 4
              WHEN 'started' THEN 3
              WHEN 'scheduled' THEN 2
              WHEN 'cancelled' THEN 1
              ELSE 0
            END DESC,
            updated_at DESC,
            created_at DESC,
            id DESC
        ) AS row_num,
        FIRST_VALUE(id) OVER (
          PARTITION BY bus_id, route_id, trip_date, trip_type
          ORDER BY
            CASE trip_status
              WHEN 'ended' THEN 4
              WHEN 'started' THEN 3
              WHEN 'scheduled' THEN 2
              WHEN 'cancelled' THEN 1
              ELSE 0
            END DESC,
            updated_at DESC,
            created_at DESC,
            id DESC
        ) AS canonical_trip_id
      FROM trips
    )
    SELECT id AS duplicate_trip_id, canonical_trip_id
    FROM ranked
    WHERE row_num > 1;
  `);
  pgm.sql(`
    UPDATE bus_location_history blh
    SET trip_id = map.canonical_trip_id
    FROM tmp_trip_dedup_map map
    WHERE blh.trip_id = map.duplicate_trip_id;
  `);
  pgm.sql(`
    UPDATE trip_student_events tse
    SET trip_id = map.canonical_trip_id
    FROM tmp_trip_dedup_map map
    WHERE tse.trip_id = map.duplicate_trip_id;
  `);
  pgm.sql(`
    UPDATE notifications n
    SET reference_id = map.canonical_trip_id
    FROM tmp_trip_dedup_map map
    WHERE n.reference_type = 'trip'
      AND n.reference_id = map.duplicate_trip_id;
  `);
  pgm.sql(`
    DELETE FROM trips tr
    USING tmp_trip_dedup_map map
    WHERE tr.id = map.duplicate_trip_id;
  `);
  pgm.addConstraint(
    "trips",
    "uq_trips_bus_route_date_type",
    "UNIQUE (bus_id, route_id, trip_date, trip_type)"
  );

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_trip_student_event()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_trip_status VARCHAR(30);
      v_trip_route_id BIGINT;
      v_trip_date DATE;
      v_assignment_route_id BIGINT;
      v_stop_route_id BIGINT;
    BEGIN
      SELECT trip_status, route_id, trip_date
        INTO v_trip_status, v_trip_route_id, v_trip_date
      FROM trips
      WHERE id = NEW.trip_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', NEW.trip_id;
      END IF;

      IF v_trip_status NOT IN ('started', 'ended') THEN
        RAISE EXCEPTION
          'Cannot record trip student event for trip % with status %',
          NEW.trip_id, v_trip_status;
      END IF;

      SELECT route_id
        INTO v_assignment_route_id
      FROM student_bus_assignments
      WHERE student_id = NEW.student_id
        AND start_date <= v_trip_date
        AND (end_date IS NULL OR end_date >= v_trip_date)
      ORDER BY start_date DESC, id DESC
      LIMIT 1;

      IF v_assignment_route_id IS NULL THEN
        RAISE EXCEPTION
          'Student % has no transport assignment for trip % date %',
          NEW.student_id, NEW.trip_id, v_trip_date;
      END IF;

      IF v_assignment_route_id <> v_trip_route_id THEN
        RAISE EXCEPTION
          'Student % is assigned to route % for trip date %, but trip % is on route %',
          NEW.student_id, v_assignment_route_id, v_trip_date, NEW.trip_id, v_trip_route_id;
      END IF;

      IF NEW.stop_id IS NOT NULL THEN
        SELECT route_id
          INTO v_stop_route_id
        FROM bus_stops
        WHERE id = NEW.stop_id;

        IF v_stop_route_id IS NULL THEN
          RAISE EXCEPTION 'Stop % not found', NEW.stop_id;
        END IF;

        IF v_stop_route_id <> v_trip_route_id THEN
          RAISE EXCEPTION
            'Stop % belongs to route %, not trip route %',
            NEW.stop_id, v_stop_route_id, v_trip_route_id;
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_trip_student_event()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_trip_status VARCHAR(30);
      v_trip_route_id BIGINT;
      v_assignment_route_id BIGINT;
      v_stop_route_id BIGINT;
    BEGIN
      SELECT trip_status, route_id
        INTO v_trip_status, v_trip_route_id
      FROM trips
      WHERE id = NEW.trip_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', NEW.trip_id;
      END IF;

      IF v_trip_status NOT IN ('started', 'ended') THEN
        RAISE EXCEPTION
          'Cannot record trip student event for trip % with status %',
          NEW.trip_id, v_trip_status;
      END IF;

      SELECT route_id
        INTO v_assignment_route_id
      FROM student_bus_assignments
      WHERE student_id = NEW.student_id
        AND is_active = TRUE
      ORDER BY id DESC
      LIMIT 1;

      IF v_assignment_route_id IS NULL THEN
        RAISE EXCEPTION
          'Student % has no active bus assignment',
          NEW.student_id;
      END IF;

      IF v_assignment_route_id <> v_trip_route_id THEN
        RAISE EXCEPTION
          'Student % is assigned to route %, but trip % is on route %',
          NEW.student_id, v_assignment_route_id, NEW.trip_id, v_trip_route_id;
      END IF;

      IF NEW.stop_id IS NOT NULL THEN
        SELECT route_id
          INTO v_stop_route_id
        FROM bus_stops
        WHERE id = NEW.stop_id;

        IF v_stop_route_id IS NULL THEN
          RAISE EXCEPTION 'Stop % not found', NEW.stop_id;
        END IF;

        IF v_stop_route_id <> v_trip_route_id THEN
          RAISE EXCEPTION
            'Stop % belongs to route %, not trip route %',
            NEW.stop_id, v_stop_route_id, v_trip_route_id;
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);

  pgm.dropConstraint("trips", "uq_trips_bus_route_date_type", {
    ifExists: true
  });

  pgm.sql(
    "DROP TRIGGER IF EXISTS trg_student_transport_home_locations_set_updated_at ON student_transport_home_locations;"
  );
  pgm.dropIndex("student_transport_home_locations", "status", {
    name: "idx_student_transport_home_locations_status",
    ifExists: true
  });
  pgm.dropConstraint(
    "student_transport_home_locations",
    "chk_student_transport_home_locations_status",
    { ifExists: true }
  );
  pgm.dropConstraint(
    "student_transport_home_locations",
    "chk_student_transport_home_locations_source",
    { ifExists: true }
  );
  pgm.dropConstraint(
    "student_transport_home_locations",
    "chk_student_transport_home_locations_longitude",
    { ifExists: true }
  );
  pgm.dropConstraint(
    "student_transport_home_locations",
    "chk_student_transport_home_locations_latitude",
    { ifExists: true }
  );
  pgm.dropConstraint(
    "student_transport_home_locations",
    "uq_student_transport_home_locations_student",
    { ifExists: true }
  );
  pgm.dropTable("student_transport_home_locations", { ifExists: true });

  pgm.sql(
    "DROP TRIGGER IF EXISTS trg_transport_route_assignments_set_updated_at ON transport_route_assignments;"
  );
  pgm.sql("DROP INDEX IF EXISTS uq_transport_route_assignments_one_active_route;");
  pgm.sql("DROP INDEX IF EXISTS uq_transport_route_assignments_one_active_bus;");
  pgm.dropIndex("transport_route_assignments", "route_id", {
    name: "idx_transport_route_assignments_route_id",
    ifExists: true
  });
  pgm.dropIndex("transport_route_assignments", "bus_id", {
    name: "idx_transport_route_assignments_bus_id",
    ifExists: true
  });
  pgm.dropConstraint(
    "transport_route_assignments",
    "chk_transport_route_assignments_dates",
    { ifExists: true }
  );
  pgm.dropTable("transport_route_assignments", { ifExists: true });
};

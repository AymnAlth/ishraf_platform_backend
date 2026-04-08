exports.up = (pgm) => {
  pgm.addColumn("transport_trip_eta_stop_snapshots", {
    arrived_notified: {
      type: "boolean",
      notNull: true,
      default: false
    }
  });

  pgm.dropConstraint("trips", "chk_trips_status", { ifExists: true });
  pgm.addConstraint(
    "trips",
    "chk_trips_status",
    "CHECK (trip_status IN ('scheduled', 'started', 'ended', 'completed', 'cancelled'))"
  );

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_bus_location_trip_status()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_status VARCHAR(30);
    BEGIN
      SELECT trip_status
        INTO v_status
      FROM trips
      WHERE id = NEW.trip_id;

      IF v_status IS NULL THEN
        RAISE EXCEPTION 'Trip % not found', NEW.trip_id;
      END IF;

      IF v_status IN ('ended', 'completed', 'cancelled') THEN
        RAISE EXCEPTION
          'Cannot insert location history for trip % with status %',
          NEW.trip_id, v_status;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_trip_status_transition()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.trip_status NOT IN ('scheduled', 'started', 'ended', 'completed', 'cancelled') THEN
          RAISE EXCEPTION 'Invalid trip status: %', NEW.trip_status;
        END IF;

        IF NEW.trip_status = 'started' AND NEW.started_at IS NULL THEN
          NEW.started_at := NOW();
        END IF;

        IF NEW.trip_status IN ('ended', 'completed') THEN
          IF NEW.started_at IS NULL THEN
            RAISE EXCEPTION 'Cannot create % trip without started_at', NEW.trip_status;
          END IF;

          IF NEW.ended_at IS NULL THEN
            NEW.ended_at := NOW();
          END IF;
        END IF;

        RETURN NEW;
      END IF;

      IF TG_OP = 'UPDATE' THEN
        IF OLD.trip_status = 'scheduled' AND NEW.trip_status = 'started' THEN
          IF NEW.started_at IS NULL THEN
            NEW.started_at := NOW();
          END IF;
        ELSIF OLD.trip_status = 'started' AND NEW.trip_status IN ('ended', 'completed') THEN
          IF COALESCE(NEW.started_at, OLD.started_at) IS NULL THEN
            RAISE EXCEPTION 'Cannot finalize trip without started_at';
          END IF;

          IF NEW.ended_at IS NULL THEN
            NEW.ended_at := NOW();
          END IF;
        ELSIF OLD.trip_status = 'scheduled' AND NEW.trip_status = 'cancelled' THEN
          NULL;
        ELSIF OLD.trip_status = NEW.trip_status THEN
          NULL;
        ELSE
          RAISE EXCEPTION
            'Invalid trip status transition from % to %',
            OLD.trip_status, NEW.trip_status;
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropColumns("transport_trip_eta_stop_snapshots", ["arrived_notified"], {
    ifExists: true
  });

  pgm.sql(`
    UPDATE trips
    SET trip_status = 'ended'
    WHERE trip_status = 'completed'
  `);

  pgm.dropConstraint("trips", "chk_trips_status", { ifExists: true });
  pgm.addConstraint(
    "trips",
    "chk_trips_status",
    "CHECK (trip_status IN ('scheduled', 'started', 'ended', 'cancelled'))"
  );

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_bus_location_trip_status()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_status VARCHAR(30);
    BEGIN
      SELECT trip_status
        INTO v_status
      FROM trips
      WHERE id = NEW.trip_id;

      IF v_status IS NULL THEN
        RAISE EXCEPTION 'Trip % not found', NEW.trip_id;
      END IF;

      IF v_status IN ('ended', 'cancelled') THEN
        RAISE EXCEPTION
          'Cannot insert location history for trip % with status %',
          NEW.trip_id, v_status;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION trg_validate_trip_status_transition()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.trip_status NOT IN ('scheduled', 'started', 'ended', 'cancelled') THEN
          RAISE EXCEPTION 'Invalid trip status: %', NEW.trip_status;
        END IF;

        IF NEW.trip_status = 'started' AND NEW.started_at IS NULL THEN
          NEW.started_at := NOW();
        END IF;

        IF NEW.trip_status = 'ended' THEN
          IF NEW.started_at IS NULL THEN
            RAISE EXCEPTION 'Cannot create ended trip without started_at';
          END IF;

          IF NEW.ended_at IS NULL THEN
            NEW.ended_at := NOW();
          END IF;
        END IF;

        RETURN NEW;
      END IF;

      IF TG_OP = 'UPDATE' THEN
        IF OLD.trip_status = 'scheduled' AND NEW.trip_status = 'started' THEN
          IF NEW.started_at IS NULL THEN
            NEW.started_at := NOW();
          END IF;
        ELSIF OLD.trip_status = 'started' AND NEW.trip_status = 'ended' THEN
          IF COALESCE(NEW.started_at, OLD.started_at) IS NULL THEN
            RAISE EXCEPTION 'Cannot end trip without started_at';
          END IF;

          IF NEW.ended_at IS NULL THEN
            NEW.ended_at := NOW();
          END IF;
        ELSIF OLD.trip_status = 'scheduled' AND NEW.trip_status = 'cancelled' THEN
          NULL;
        ELSIF OLD.trip_status = NEW.trip_status THEN
          NULL;
        ELSE
          RAISE EXCEPTION
            'Invalid trip status transition from % to %',
            OLD.trip_status, NEW.trip_status;
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);
};

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { databaseTables } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  TransportEtaArrivedStopClaimRow,
  TransportEtaApproachingRecipientRow,
  TransportEtaApproachingStopClaimRow,
  TransportEtaStopRecipientRow,
  TransportRouteMapCacheRow,
  TransportTripEtaSnapshotRow,
  TransportTripEtaSnapshotWriteInput,
  TransportTripEtaStopSnapshotRow,
  TransportTripEtaStopSnapshotWriteInput,
  TransportTripLocationPointRow
} from "../types/transport-eta.types";

export class TransportEtaRepository {
  async findRouteMapCacheById(
    id: string,
    queryable: Queryable = db
  ): Promise<TransportRouteMapCacheRow | null> {
    const result = await queryable.query<TransportRouteMapCacheRow>(
      `
        SELECT
          id::text AS id,
          route_id::text AS "routeId",
          stop_signature_hash AS "stopSignatureHash",
          provider_key AS "providerKey",
          encoded_polyline AS "encodedPolyline",
          total_distance_meters AS "totalDistanceMeters",
          total_duration_seconds AS "totalDurationSeconds",
          stop_metrics_json AS "stopMetricsJson",
          computed_at AS "computedAt",
          last_error_code AS "lastErrorCode",
          last_error_message AS "lastErrorMessage"
        FROM ${databaseTables.transportRouteMapCache}
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findRouteMapCacheBySignature(
    routeId: string,
    providerKey: string,
    stopSignatureHash: string,
    queryable: Queryable = db
  ): Promise<TransportRouteMapCacheRow | null> {
    const result = await queryable.query<TransportRouteMapCacheRow>(
      `
        SELECT
          id::text AS id,
          route_id::text AS "routeId",
          stop_signature_hash AS "stopSignatureHash",
          provider_key AS "providerKey",
          encoded_polyline AS "encodedPolyline",
          total_distance_meters AS "totalDistanceMeters",
          total_duration_seconds AS "totalDurationSeconds",
          stop_metrics_json AS "stopMetricsJson",
          computed_at AS "computedAt",
          last_error_code AS "lastErrorCode",
          last_error_message AS "lastErrorMessage"
        FROM ${databaseTables.transportRouteMapCache}
        WHERE route_id = $1
          AND provider_key = $2
          AND stop_signature_hash = $3
        LIMIT 1
      `,
      [routeId, providerKey, stopSignatureHash]
    );

    return result.rows[0] ?? null;
  }

  async upsertRouteMapCache(
    input: {
      routeId: string;
      stopSignatureHash: string;
      providerKey: string;
      encodedPolyline: string;
      totalDistanceMeters: number;
      totalDurationSeconds: number;
      stopMetricsJson: unknown;
      computedAt: Date;
      lastErrorCode?: string | null;
      lastErrorMessage?: string | null;
    },
    queryable: Queryable = db
  ): Promise<TransportRouteMapCacheRow> {
    const result = await queryable.query<TransportRouteMapCacheRow>(
      `
        INSERT INTO ${databaseTables.transportRouteMapCache} (
          route_id,
          stop_signature_hash,
          provider_key,
          encoded_polyline,
          total_distance_meters,
          total_duration_seconds,
          stop_metrics_json,
          computed_at,
          last_error_code,
          last_error_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
        ON CONFLICT (route_id, provider_key, stop_signature_hash)
        DO UPDATE
        SET
          encoded_polyline = EXCLUDED.encoded_polyline,
          total_distance_meters = EXCLUDED.total_distance_meters,
          total_duration_seconds = EXCLUDED.total_duration_seconds,
          stop_metrics_json = EXCLUDED.stop_metrics_json,
          computed_at = EXCLUDED.computed_at,
          last_error_code = EXCLUDED.last_error_code,
          last_error_message = EXCLUDED.last_error_message
        RETURNING
          id::text AS id,
          route_id::text AS "routeId",
          stop_signature_hash AS "stopSignatureHash",
          provider_key AS "providerKey",
          encoded_polyline AS "encodedPolyline",
          total_distance_meters AS "totalDistanceMeters",
          total_duration_seconds AS "totalDurationSeconds",
          stop_metrics_json AS "stopMetricsJson",
          computed_at AS "computedAt",
          last_error_code AS "lastErrorCode",
          last_error_message AS "lastErrorMessage"
      `,
      [
        input.routeId,
        input.stopSignatureHash,
        input.providerKey,
        input.encodedPolyline,
        input.totalDistanceMeters,
        input.totalDurationSeconds,
        JSON.stringify(input.stopMetricsJson),
        input.computedAt,
        input.lastErrorCode ?? null,
        input.lastErrorMessage ?? null
      ]
    );

    return result.rows[0];
  }

  async listRecentTripLocations(
    tripId: string,
    limit: number,
    queryable: Queryable = db
  ): Promise<TransportTripLocationPointRow[]> {
    const result = await queryable.query<TransportTripLocationPointRow>(
      `
        SELECT
          id::text AS id,
          trip_id::text AS "tripId",
          latitude,
          longitude,
          recorded_at AS "recordedAt"
        FROM ${databaseTables.busLocationHistory}
        WHERE trip_id = $1
        ORDER BY recorded_at DESC, id DESC
        LIMIT $2
      `,
      [tripId, limit]
    );

    return result.rows;
  }

  async findTripEtaSnapshotByTripId(
    tripId: string,
    queryable: Queryable = db
  ): Promise<TransportTripEtaSnapshotRow | null> {
    const result = await queryable.query<TransportTripEtaSnapshotRow>(
      `
        SELECT
          trip_id::text AS "tripId",
          route_id::text AS "routeId",
          route_map_cache_id::text AS "routeMapCacheId",
          provider_key AS "providerKey",
          refresh_reason AS "refreshReason",
          status,
          calculation_mode AS "calculationMode",
          based_on_location_id::text AS "basedOnLocationId",
          based_on_latitude AS "basedOnLatitude",
          based_on_longitude AS "basedOnLongitude",
          based_on_recorded_at AS "basedOnRecordedAt",
          projected_distance_meters AS "projectedDistanceMeters",
          remaining_distance_meters AS "remainingDistanceMeters",
          remaining_duration_seconds AS "remainingDurationSeconds",
          estimated_speed_mps AS "estimatedSpeedMps",
          next_stop_id::text AS "nextStopId",
          next_stop_order AS "nextStopOrder",
          next_stop_eta_at AS "nextStopEtaAt",
          final_eta_at AS "finalEtaAt",
          provider_refreshed_at AS "providerRefreshedAt",
          computed_at AS "computedAt",
          last_deviation_meters AS "lastDeviationMeters",
          last_error_code AS "lastErrorCode",
          last_error_message AS "lastErrorMessage"
        FROM ${databaseTables.transportTripEtaSnapshots}
        WHERE trip_id = $1
        LIMIT 1
      `,
      [tripId]
    );

    return result.rows[0] ?? null;
  }

  async listTripEtaStopSnapshotsByTripId(
    tripId: string,
    queryable: Queryable = db
  ): Promise<TransportTripEtaStopSnapshotRow[]> {
    const result = await queryable.query<TransportTripEtaStopSnapshotRow>(
      `
        SELECT
          trip_id::text AS "tripId",
          stop_id::text AS "stopId",
          stop_order AS "stopOrder",
          stop_name AS "stopName",
          eta_at AS "etaAt",
          remaining_distance_meters AS "remainingDistanceMeters",
          remaining_duration_seconds AS "remainingDurationSeconds",
          is_next_stop AS "isNextStop",
          is_completed AS "isCompleted",
          approaching_notified AS "approachingNotified",
          arrived_notified AS "arrivedNotified",
          updated_at AS "updatedAt"
        FROM ${databaseTables.transportTripEtaStopSnapshots}
        WHERE trip_id = $1
        ORDER BY stop_order ASC, stop_id ASC
      `,
      [tripId]
    );

    return result.rows;
  }

  async replaceTripEtaSnapshot(
    snapshot: TransportTripEtaSnapshotWriteInput,
    stops: TransportTripEtaStopSnapshotWriteInput[],
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.transportTripEtaSnapshots} (
          trip_id,
          route_id,
          route_map_cache_id,
          provider_key,
          refresh_reason,
          status,
          calculation_mode,
          based_on_location_id,
          based_on_latitude,
          based_on_longitude,
          based_on_recorded_at,
          projected_distance_meters,
          remaining_distance_meters,
          remaining_duration_seconds,
          estimated_speed_mps,
          next_stop_id,
          next_stop_order,
          next_stop_eta_at,
          final_eta_at,
          provider_refreshed_at,
          computed_at,
          last_deviation_meters,
          last_error_code,
          last_error_message
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24
        )
        ON CONFLICT (trip_id)
        DO UPDATE
        SET
          route_id = EXCLUDED.route_id,
          route_map_cache_id = EXCLUDED.route_map_cache_id,
          provider_key = EXCLUDED.provider_key,
          refresh_reason = EXCLUDED.refresh_reason,
          status = EXCLUDED.status,
          calculation_mode = EXCLUDED.calculation_mode,
          based_on_location_id = EXCLUDED.based_on_location_id,
          based_on_latitude = EXCLUDED.based_on_latitude,
          based_on_longitude = EXCLUDED.based_on_longitude,
          based_on_recorded_at = EXCLUDED.based_on_recorded_at,
          projected_distance_meters = EXCLUDED.projected_distance_meters,
          remaining_distance_meters = EXCLUDED.remaining_distance_meters,
          remaining_duration_seconds = EXCLUDED.remaining_duration_seconds,
          estimated_speed_mps = EXCLUDED.estimated_speed_mps,
          next_stop_id = EXCLUDED.next_stop_id,
          next_stop_order = EXCLUDED.next_stop_order,
          next_stop_eta_at = EXCLUDED.next_stop_eta_at,
          final_eta_at = EXCLUDED.final_eta_at,
          provider_refreshed_at = EXCLUDED.provider_refreshed_at,
          computed_at = EXCLUDED.computed_at,
          last_deviation_meters = EXCLUDED.last_deviation_meters,
          last_error_code = EXCLUDED.last_error_code,
          last_error_message = EXCLUDED.last_error_message
      `,
      [
        snapshot.tripId,
        snapshot.routeId,
        snapshot.routeMapCacheId,
        snapshot.providerKey,
        snapshot.refreshReason,
        snapshot.status,
        snapshot.calculationMode,
        snapshot.basedOnLocationId,
        snapshot.basedOnLatitude,
        snapshot.basedOnLongitude,
        snapshot.basedOnRecordedAt,
        snapshot.projectedDistanceMeters,
        snapshot.remainingDistanceMeters,
        snapshot.remainingDurationSeconds,
        snapshot.estimatedSpeedMps,
        snapshot.nextStopId,
        snapshot.nextStopOrder,
        snapshot.nextStopEtaAt,
        snapshot.finalEtaAt,
        snapshot.providerRefreshedAt,
        snapshot.computedAt,
        snapshot.lastDeviationMeters,
        snapshot.lastErrorCode,
        snapshot.lastErrorMessage
      ]
    );

    await queryable.query(
      `
        DELETE FROM ${databaseTables.transportTripEtaStopSnapshots}
        WHERE trip_id = $1
      `,
      [snapshot.tripId]
    );

    for (const stop of stops) {
      await queryable.query(
        `
          INSERT INTO ${databaseTables.transportTripEtaStopSnapshots} (
            trip_id,
            stop_id,
            stop_order,
            stop_name,
            eta_at,
            remaining_distance_meters,
            remaining_duration_seconds,
            is_next_stop,
            is_completed,
            approaching_notified,
            arrived_notified,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          stop.tripId,
          stop.stopId,
          stop.stopOrder,
          stop.stopName,
          stop.etaAt,
          stop.remainingDistanceMeters,
          stop.remainingDurationSeconds,
          stop.isNextStop,
          stop.isCompleted,
          stop.approachingNotified,
          stop.arrivedNotified,
          stop.updatedAt
        ]
      );
    }
  }

  async claimApproachingStopNotifications(
    tripId: string,
    remainingDurationThresholdSeconds = 300,
    remainingDistanceThresholdMeters = 500,
    queryable: Queryable = db
  ): Promise<TransportEtaApproachingStopClaimRow[]> {
    const result = await queryable.query<TransportEtaApproachingStopClaimRow>(
      `
        WITH candidates AS (
          SELECT stop_id
          FROM ${databaseTables.transportTripEtaStopSnapshots}
          WHERE trip_id = $1
            AND is_completed = FALSE
            AND approaching_notified = FALSE
            AND (
              (remaining_duration_seconds IS NOT NULL AND remaining_duration_seconds <= $2)
              OR (remaining_distance_meters IS NOT NULL AND remaining_distance_meters <= $3)
            )
          ORDER BY stop_order ASC, stop_id ASC
          FOR UPDATE SKIP LOCKED
        ),
        updated AS (
          UPDATE ${databaseTables.transportTripEtaStopSnapshots} stop_snapshots
          SET
            approaching_notified = TRUE,
            updated_at = NOW()
          FROM candidates
          WHERE stop_snapshots.trip_id = $1
            AND stop_snapshots.stop_id = candidates.stop_id
          RETURNING
            stop_snapshots.trip_id::text AS "tripId",
            stop_snapshots.stop_id::text AS "stopId",
            stop_snapshots.stop_order AS "stopOrder",
            stop_snapshots.stop_name AS "stopName"
        )
        SELECT
          "tripId",
          "stopId",
          "stopOrder",
          "stopName"
        FROM updated
        ORDER BY "stopOrder" ASC, "stopId" ASC
      `,
      [tripId, remainingDurationThresholdSeconds, remainingDistanceThresholdMeters]
    );

    return result.rows;
  }

  async claimArrivedStopNotifications(
    tripId: string,
    remainingDistanceThresholdMeters = 50,
    queryable: Queryable = db
  ): Promise<TransportEtaArrivedStopClaimRow[]> {
    const result = await queryable.query<TransportEtaArrivedStopClaimRow>(
      `
        WITH candidates AS (
          SELECT stop_id
          FROM ${databaseTables.transportTripEtaStopSnapshots}
          WHERE trip_id = $1
            AND is_completed = FALSE
            AND arrived_notified = FALSE
            AND remaining_distance_meters IS NOT NULL
            AND remaining_distance_meters <= $2
          ORDER BY stop_order ASC, stop_id ASC
          FOR UPDATE SKIP LOCKED
        ),
        updated AS (
          UPDATE ${databaseTables.transportTripEtaStopSnapshots} stop_snapshots
          SET
            arrived_notified = TRUE,
            updated_at = NOW()
          FROM candidates
          WHERE stop_snapshots.trip_id = $1
            AND stop_snapshots.stop_id = candidates.stop_id
          RETURNING
            stop_snapshots.trip_id::text AS "tripId",
            stop_snapshots.stop_id::text AS "stopId",
            stop_snapshots.stop_order AS "stopOrder",
            stop_snapshots.stop_name AS "stopName"
        )
        SELECT
          "tripId",
          "stopId",
          "stopOrder",
          "stopName"
        FROM updated
        ORDER BY "stopOrder" ASC, "stopId" ASC
      `,
      [tripId, remainingDistanceThresholdMeters]
    );

    return result.rows;
  }

  async listStopRecipientsByTripStops(
    tripId: string,
    stopIds: readonly string[],
    queryable: Queryable = db
  ): Promise<TransportEtaStopRecipientRow[]> {
    if (stopIds.length === 0) {
      return [];
    }

    const result = await queryable.query<TransportEtaStopRecipientRow>(
      `
        WITH target_stops AS (
          SELECT DISTINCT UNNEST($2::bigint[]) AS stop_id
        )
        SELECT
          target_stops.stop_id::text AS "stopId",
          users.id::text AS "parentUserId",
          students.id::text AS "studentId",
          students.full_name AS "studentFullName"
        FROM ${databaseTables.trips} trips
        JOIN target_stops
          ON TRUE
        JOIN ${databaseTables.studentBusAssignments} assignments
          ON assignments.route_id = trips.route_id
         AND assignments.stop_id = target_stops.stop_id
         AND assignments.is_active = TRUE
         AND assignments.start_date <= trips.trip_date
         AND (assignments.end_date IS NULL OR assignments.end_date >= trips.trip_date)
        JOIN ${databaseTables.students} students
          ON students.id = assignments.student_id
        JOIN ${databaseTables.studentParents} student_parents
          ON student_parents.student_id = students.id
        JOIN ${databaseTables.parents} parents
          ON parents.id = student_parents.parent_id
        JOIN ${databaseTables.users} users
          ON users.id = parents.user_id
        WHERE trips.id = $1
        ORDER BY target_stops.stop_id ASC, users.id ASC, students.full_name ASC, students.id ASC
      `,
      [tripId, stopIds]
    );

    return result.rows;
  }

  async listApproachingRecipientsByTripStops(
    tripId: string,
    stopIds: readonly string[],
    queryable: Queryable = db
  ): Promise<TransportEtaApproachingRecipientRow[]> {
    return this.listStopRecipientsByTripStops(tripId, stopIds, queryable);
  }

  async markTripStopCompleted(
    tripId: string,
    stopId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query(
      `
        UPDATE ${databaseTables.transportTripEtaStopSnapshots}
        SET
          is_completed = TRUE,
          is_next_stop = FALSE,
          remaining_distance_meters = 0,
          remaining_duration_seconds = 0,
          eta_at = CASE
            WHEN eta_at IS NULL THEN NOW()
            ELSE eta_at
          END,
          updated_at = NOW()
        WHERE trip_id = $1
          AND stop_id = $2
      `,
      [tripId, stopId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async areAllTripStopsCompleted(
    tripId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ total_count: string; remaining_count: string }>(
      `
        SELECT
          COUNT(*)::text AS total_count,
          COUNT(*) FILTER (WHERE is_completed = FALSE)::text AS remaining_count
        FROM ${databaseTables.transportTripEtaStopSnapshots}
        WHERE trip_id = $1
      `,
      [tripId]
    );

    const totalCount = Number(result.rows[0]?.total_count ?? 0);
    const remainingCount = Number(result.rows[0]?.remaining_count ?? 0);

    return totalCount > 0 && remainingCount === 0;
  }

  async markTripEtaCompleted(
    tripId: string,
    computedAt: Date,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.transportTripEtaSnapshots}
        SET
          status = 'completed',
          remaining_distance_meters = 0,
          remaining_duration_seconds = 0,
          next_stop_id = NULL,
          next_stop_order = NULL,
          next_stop_eta_at = NULL,
          final_eta_at = $2,
          computed_at = $2,
          last_error_code = NULL,
          last_error_message = NULL
        WHERE trip_id = $1
      `,
      [tripId, computedAt]
    );

    await queryable.query(
      `
        UPDATE ${databaseTables.transportTripEtaStopSnapshots}
        SET
          eta_at = CASE
            WHEN eta_at IS NULL THEN $2
            ELSE eta_at
          END,
          remaining_distance_meters = 0,
          remaining_duration_seconds = 0,
          is_next_stop = false,
          is_completed = true,
          approaching_notified = true,
          arrived_notified = true,
          updated_at = $2
        WHERE trip_id = $1
      `,
      [tripId, computedAt]
    );
  }
}

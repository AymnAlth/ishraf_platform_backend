import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type { PaginatedQueryResult } from "../../../common/types/pagination.types";
import {
  buildLimitOffsetClause,
  buildOrderByClause,
  buildPaginationWindow
} from "../../../common/utils/pagination.util";
import { databaseTables, databaseViews } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  BusRow,
  BusWriteInput,
  DeactivateStudentBusAssignmentInput,
  DeactivateTransportRouteAssignmentInput,
  DriverReferenceRow,
  LatestTripLocationRow,
  RouteRow,
  RouteStopRow,
  RouteStopWriteInput,
  RouteWriteInput,
  RouteAssignmentScope,
  StudentHomeLocationRow,
  StudentHomeLocationWriteInput,
  StudentBusAssignmentRow,
  StudentBusAssignmentWriteInput,
  StudentTransportReferenceRow,
  TransportRouteAssignmentRow,
  TripListQuery,
  TripNaturalKey,
  TripStudentRosterFilters,
  TripStudentRosterRow,
  ParentTripStopRow,
  TripScope,
  TripLocationWriteInput,
  TripRow,
  TripStudentEventRow,
  TripStudentEventWriteInput,
  TransportRouteAssignmentWriteInput,
  TripWriteInput
} from "../types/transport.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const busReadSelect = `
  SELECT
    b.id,
    b.plate_number AS "plateNumber",
    b.capacity,
    b.status,
    d.id AS "driverId",
    u.id AS "driverUserId",
    u.full_name AS "driverFullName",
    u.email AS "driverEmail",
    u.phone AS "driverPhone",
    b.created_at AS "createdAt",
    b.updated_at AS "updatedAt"
  FROM ${databaseTables.buses} b
  LEFT JOIN ${databaseTables.drivers} d ON d.id = b.driver_id
  LEFT JOIN ${databaseTables.users} u ON u.id = d.user_id
`;

const routeReadSelect = `
  SELECT
    id,
    route_name AS "routeName",
    start_point AS "startPoint",
    end_point AS "endPoint",
    estimated_duration_minutes AS "estimatedDurationMinutes",
    is_active AS "isActive",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM ${databaseTables.routes}
`;

const routeStopReadSelect = `
  SELECT
    bs.route_id AS "routeId",
    r.route_name AS "routeName",
    bs.id AS "stopId",
    bs.stop_name AS "stopName",
    bs.latitude,
    bs.longitude,
    bs.stop_order AS "stopOrder",
    bs.created_at AS "createdAt"
  FROM ${databaseTables.busStops} bs
  JOIN ${databaseTables.routes} r ON r.id = bs.route_id
`;

const studentAssignmentReadSelect = `
  SELECT
    sba.id AS "assignmentId",
    st.id AS "studentId",
    st.academic_no AS "academicNo",
    st.full_name AS "studentFullName",
    r.id AS "routeId",
    r.route_name AS "routeName",
    bs.id AS "stopId",
    bs.stop_name AS "stopName",
    sba.start_date AS "startDate",
    sba.end_date AS "endDate",
    sba.is_active AS "isActive",
    sba.created_at AS "createdAt",
    sba.updated_at AS "updatedAt"
  FROM ${databaseTables.studentBusAssignments} sba
  JOIN ${databaseTables.students} st ON st.id = sba.student_id
  JOIN ${databaseTables.routes} r ON r.id = sba.route_id
  JOIN ${databaseTables.busStops} bs ON bs.id = sba.stop_id
`;

const routeAssignmentReadSelect = `
  SELECT
    tra.id AS "routeAssignmentId",
    b.id AS "busId",
    b.plate_number AS "plateNumber",
    b.capacity,
    b.status AS "busStatus",
    d.id AS "driverId",
    u.id AS "driverUserId",
    u.full_name AS "driverFullName",
    u.email AS "driverEmail",
    u.phone AS "driverPhone",
    r.id AS "routeId",
    r.route_name AS "routeName",
    r.start_point AS "startPoint",
    r.end_point AS "endPoint",
    r.estimated_duration_minutes AS "estimatedDurationMinutes",
    r.is_active AS "routeIsActive",
    tra.start_date AS "startDate",
    tra.end_date AS "endDate",
    tra.is_active AS "isActive",
    tra.created_at AS "createdAt",
    tra.updated_at AS "updatedAt"
  FROM ${databaseTables.transportRouteAssignments} tra
  JOIN ${databaseTables.buses} b ON b.id = tra.bus_id
  LEFT JOIN ${databaseTables.drivers} d ON d.id = b.driver_id
  LEFT JOIN ${databaseTables.users} u ON u.id = d.user_id
  JOIN ${databaseTables.routes} r ON r.id = tra.route_id
`;

const studentHomeLocationReadSelect = `
  SELECT
    st.id AS "studentId",
    st.academic_no AS "academicNo",
    st.full_name AS "studentFullName",
    shl.id AS "locationId",
    shl.address_label AS "addressLabel",
    shl.address_text AS "addressText",
    shl.latitude,
    shl.longitude,
    shl.source,
    shl.status,
    shl.submitted_by_user_id AS "submittedByUserId",
    shl.approved_by_user_id AS "approvedByUserId",
    shl.approved_at AS "approvedAt",
    shl.notes,
    shl.created_at AS "createdAt",
    shl.updated_at AS "updatedAt"
  FROM ${databaseTables.students} st
  LEFT JOIN ${databaseTables.studentTransportHomeLocations} shl
    ON shl.student_id = st.id
`;

const tripEventCountsSelect = `
  SELECT
    trip_id,
    COUNT(*) FILTER (WHERE event_type = 'boarded')::int AS boarded_count,
    COUNT(*) FILTER (WHERE event_type = 'dropped_off')::int AS dropped_off_count,
    COUNT(*) FILTER (WHERE event_type = 'absent')::int AS absent_count,
    COUNT(*)::int AS total_events
  FROM ${databaseTables.tripStudentEvents}
  GROUP BY trip_id
`;

const tripReadSelect = `
  SELECT
    td.trip_id AS id,
    td.trip_date AS "tripDate",
    td.trip_type AS "tripType",
    td.trip_status AS "tripStatus",
    td.started_at AS "startedAt",
    td.ended_at AS "endedAt",
    tr.created_at AS "createdAt",
    tr.updated_at AS "updatedAt",
    td.bus_id AS "busId",
    td.plate_number AS "plateNumber",
    td.driver_id AS "driverId",
    td.driver_name AS "driverName",
    td.route_id AS "routeId",
    td.route_name AS "routeName",
    loc.latitude AS "latestLatitude",
    loc.longitude AS "latestLongitude",
    loc.recorded_at AS "latestRecordedAt",
    COALESCE(ec.boarded_count, 0)::int AS "boardedCount",
    COALESCE(ec.dropped_off_count, 0)::int AS "droppedOffCount",
    COALESCE(ec.absent_count, 0)::int AS "absentCount",
    COALESCE(ec.total_events, 0)::int AS "totalEvents"
  FROM ${databaseViews.tripDetails} td
  JOIN ${databaseTables.trips} tr ON tr.id = td.trip_id
  LEFT JOIN ${databaseViews.latestTripLocation} loc ON loc.trip_id = td.trip_id
  LEFT JOIN (${tripEventCountsSelect}) ec ON ec.trip_id = td.trip_id
`;

const driverReferenceSelect = `
  SELECT
    d.id AS "driverId",
    u.id AS "driverUserId",
    u.full_name AS "driverFullName",
    u.email AS "driverEmail",
    u.phone AS "driverPhone"
  FROM ${databaseTables.drivers} d
  JOIN ${databaseTables.users} u ON u.id = d.user_id
`;

const tripSortColumns = {
  tripDate: ["tr.trip_date", "tr.created_at"],
  tripStatus: ["tr.trip_status", "tr.trip_date"],
  startedAt: ["tr.started_at", "tr.trip_date"],
  createdAt: "tr.created_at"
} as const;

export class TransportRepository {
  async findDriverProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<DriverReferenceRow | null> {
    const result = await queryable.query<DriverReferenceRow>(
      `
        ${driverReferenceSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async findDriverById(
    driverId: string,
    queryable: Queryable = db
  ): Promise<DriverReferenceRow | null> {
    const result = await queryable.query<DriverReferenceRow>(
      `
        ${driverReferenceSelect}
        WHERE d.id = $1
        LIMIT 1
      `,
      [driverId]
    );

    return mapSingleRow(result.rows);
  }

  async createBus(input: BusWriteInput, queryable: Queryable = db): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.buses} (
          plate_number,
          driver_id,
          capacity,
          status
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [input.plateNumber, input.driverId ?? null, input.capacity, input.status]
    );

    return result.rows[0].id;
  }

  async listBuses(queryable: Queryable = db): Promise<BusRow[]> {
    const result = await queryable.query<BusRow>(
      `
        ${busReadSelect}
        ORDER BY b.plate_number ASC, b.id ASC
      `
    );

    return result.rows;
  }

  async findBusById(busId: string, queryable: Queryable = db): Promise<BusRow | null> {
    const result = await queryable.query<BusRow>(
      `
        ${busReadSelect}
        WHERE b.id = $1
        LIMIT 1
      `,
      [busId]
    );

    return mapSingleRow(result.rows);
  }

  async hasDriverBusOwnership(
    driverId: string,
    busId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.buses}
          WHERE id = $1
            AND driver_id = $2
        ) AS exists
      `,
      [busId, driverId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async createRoute(input: RouteWriteInput, queryable: Queryable = db): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.routes} (
          route_name,
          start_point,
          end_point,
          estimated_duration_minutes,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        input.routeName,
        input.startPoint,
        input.endPoint,
        input.estimatedDurationMinutes,
        input.isActive
      ]
    );

    return result.rows[0].id;
  }

  async listRoutes(queryable: Queryable = db): Promise<RouteRow[]> {
    const result = await queryable.query<RouteRow>(
      `
        ${routeReadSelect}
        ORDER BY route_name ASC, id ASC
      `
    );

    return result.rows;
  }

  async findRouteById(routeId: string, queryable: Queryable = db): Promise<RouteRow | null> {
    const result = await queryable.query<RouteRow>(
      `
        ${routeReadSelect}
        WHERE id = $1
        LIMIT 1
      `,
      [routeId]
    );

    return mapSingleRow(result.rows);
  }

  async createRouteStop(
    input: RouteStopWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.busStops} (
          route_id,
          stop_name,
          latitude,
          longitude,
          stop_order
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [input.routeId, input.stopName, input.latitude, input.longitude, input.stopOrder]
    );

    return result.rows[0].id;
  }

  async listRouteStopsByRouteId(
    routeId: string,
    queryable: Queryable = db
  ): Promise<RouteStopRow[]> {
    const result = await queryable.query<RouteStopRow>(
      `
        SELECT
          route_id AS "routeId",
          route_name AS "routeName",
          stop_id AS "stopId",
          stop_name AS "stopName",
          latitude,
          longitude,
          stop_order AS "stopOrder"
        FROM ${databaseViews.routeStops}
        WHERE route_id = $1
        ORDER BY stop_order ASC, stop_id ASC
      `,
      [routeId]
    );

    return result.rows;
  }

  async findRouteStopById(
    stopId: string,
    queryable: Queryable = db
  ): Promise<RouteStopRow | null> {
    const result = await queryable.query<RouteStopRow>(
      `
        ${routeStopReadSelect}
        WHERE bs.id = $1
        LIMIT 1
      `,
      [stopId]
    );

    return mapSingleRow(result.rows);
  }

  async findStudentTransportReferenceById(
    studentId: string,
    queryable: Queryable = db
  ): Promise<StudentTransportReferenceRow | null> {
    const result = await queryable.query<StudentTransportReferenceRow>(
      `
        SELECT
          sp.student_id AS "studentId",
          sp.academic_no AS "academicNo",
          sp.student_name AS "fullName",
          sp.class_id AS "classId",
          sp.class_name AS "className",
          sp.section,
          sp.academic_year_id AS "academicYearId",
          sp.academic_year_name AS "academicYearName"
        FROM ${databaseViews.studentProfiles} sp
        WHERE sp.student_id = $1
        LIMIT 1
      `,
      [studentId]
    );

    return mapSingleRow(result.rows);
  }

  async findStudentBusAssignmentById(
    assignmentId: string,
    queryable: Queryable = db
  ): Promise<StudentBusAssignmentRow | null> {
    const result = await queryable.query<StudentBusAssignmentRow>(
      `
        ${studentAssignmentReadSelect}
        WHERE sba.id = $1
        LIMIT 1
      `,
      [assignmentId]
    );

    return mapSingleRow(result.rows);
  }

  async findActiveStudentAssignmentByStudentId(
    studentId: string,
    queryable: Queryable = db
  ): Promise<StudentBusAssignmentRow | null> {
    const result = await queryable.query<StudentBusAssignmentRow>(
      `
        ${studentAssignmentReadSelect}
        WHERE sba.student_id = $1
          AND sba.is_active = true
        ORDER BY sba.id DESC
        LIMIT 1
      `,
      [studentId]
    );

    return mapSingleRow(result.rows);
  }

  async findStudentAssignmentByStudentIdOnDate(
    studentId: string,
    effectiveDate: string,
    queryable: Queryable = db
  ): Promise<StudentBusAssignmentRow | null> {
    const result = await queryable.query<StudentBusAssignmentRow>(
      `
        ${studentAssignmentReadSelect}
        WHERE sba.student_id = $1
          AND sba.start_date <= $2::date
          AND (sba.end_date IS NULL OR sba.end_date >= $2::date)
        ORDER BY sba.start_date DESC, sba.id DESC
        LIMIT 1
      `,
      [studentId, effectiveDate]
    );

    return mapSingleRow(result.rows);
  }

  async createStudentBusAssignment(
    input: StudentBusAssignmentWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.studentBusAssignments} (
          student_id,
          route_id,
          stop_id,
          start_date,
          end_date,
          is_active
        )
        VALUES ($1, $2, $3, $4::date, $5::date, true)
        RETURNING id
      `,
      [input.studentId, input.routeId, input.stopId, input.startDate, input.endDate ?? null]
    );

    return result.rows[0].id;
  }

  async deactivateStudentBusAssignment(
    assignmentId: string,
    input: DeactivateStudentBusAssignmentInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.studentBusAssignments}
        SET is_active = false,
            end_date = $2::date
        WHERE id = $1
      `,
      [assignmentId, input.endDate]
    );
  }

  async listActiveStudentAssignments(
    queryable: Queryable = db
  ): Promise<StudentBusAssignmentRow[]> {
    const result = await queryable.query<StudentBusAssignmentRow>(
      `
        SELECT
          assignment_id AS "assignmentId",
          student_id AS "studentId",
          academic_no AS "academicNo",
          student_name AS "studentFullName",
          route_id AS "routeId",
          route_name AS "routeName",
          stop_id AS "stopId",
          stop_name AS "stopName",
          start_date AS "startDate",
          end_date AS "endDate",
          is_active AS "isActive"
        FROM ${databaseViews.activeStudentBusAssignments}
        ORDER BY academic_no ASC, assignment_id ASC
      `
    );

    return result.rows;
  }

  async createTransportRouteAssignment(
    input: TransportRouteAssignmentWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.transportRouteAssignments} (
          bus_id,
          route_id,
          start_date,
          end_date,
          is_active
        )
        VALUES ($1, $2, $3::date, $4::date, true)
        RETURNING id
      `,
      [input.busId, input.routeId, input.startDate, input.endDate ?? null]
    );

    return result.rows[0].id;
  }

  async findTransportRouteAssignmentById(
    routeAssignmentId: string,
    queryable: Queryable = db
  ): Promise<TransportRouteAssignmentRow | null> {
    const result = await queryable.query<TransportRouteAssignmentRow>(
      `
        ${routeAssignmentReadSelect}
        WHERE tra.id = $1
        LIMIT 1
      `,
      [routeAssignmentId]
    );

    return mapSingleRow(result.rows);
  }

  async listTransportRouteAssignments(
    scope: RouteAssignmentScope = {},
    queryable: Queryable = db
  ): Promise<TransportRouteAssignmentRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const addCondition = (template: string, value: unknown): void => {
      values.push(value);
      conditions.push(template.replace("?", `$${values.length}`));
    };

    if (scope.driverId) {
      addCondition("b.driver_id = ?", scope.driverId);
    }

    if (scope.isActive !== undefined) {
      addCondition("tra.is_active = ?", scope.isActive);
    }

    if (scope.applicableOnDate) {
      addCondition("tra.start_date <= ?::date", scope.applicableOnDate);
      addCondition("(tra.end_date IS NULL OR tra.end_date >= ?::date)", scope.applicableOnDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await queryable.query<TransportRouteAssignmentRow>(
      `
        ${routeAssignmentReadSelect}
        ${whereClause}
        ORDER BY tra.is_active DESC, tra.start_date DESC, r.route_name ASC, b.plate_number ASC
      `,
      values
    );

    return result.rows;
  }

  async hasDriverRouteAssignmentOwnership(
    driverId: string,
    routeAssignmentId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.transportRouteAssignments} tra
          JOIN ${databaseTables.buses} b ON b.id = tra.bus_id
          WHERE tra.id = $1
            AND b.driver_id = $2
        ) AS exists
      `,
      [routeAssignmentId, driverId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async deactivateTransportRouteAssignment(
    routeAssignmentId: string,
    input: DeactivateTransportRouteAssignmentInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.transportRouteAssignments}
        SET is_active = false,
            end_date = $2::date
        WHERE id = $1
      `,
      [routeAssignmentId, input.endDate]
    );
  }

  async createTrip(input: TripWriteInput, queryable: Queryable = db): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.trips} (
          bus_id,
          route_id,
          trip_date,
          trip_type
        )
        VALUES ($1, $2, $3::date, $4)
        RETURNING id
      `,
      [input.busId, input.routeId, input.tripDate, input.tripType]
    );

    return result.rows[0].id;
  }

  async findTripByNaturalKey(
    key: TripNaturalKey,
    queryable: Queryable = db
  ): Promise<TripRow | null> {
    const result = await queryable.query<TripRow>(
      `
        ${tripReadSelect}
        WHERE tr.bus_id = $1
          AND tr.route_id = $2
          AND tr.trip_date = $3::date
          AND tr.trip_type = $4
        LIMIT 1
      `,
      [key.busId, key.routeId, key.tripDate, key.tripType]
    );

    return mapSingleRow(result.rows);
  }

  async listTrips(
    filters: TripListQuery,
    scope: TripScope = {},
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<TripRow>> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const addCondition = (template: string, value: unknown): void => {
      values.push(value);
      conditions.push(template.replace("?", `$${values.length}`));
    };

    if (scope.driverId) {
      addCondition("td.driver_id = ?", scope.driverId);
    }

    if (filters.busId) {
      addCondition("tr.bus_id = ?", filters.busId);
    }

    if (filters.routeId) {
      addCondition("tr.route_id = ?", filters.routeId);
    }

    if (filters.tripType) {
      addCondition("tr.trip_type = ?", filters.tripType);
    }

    if (filters.tripStatus) {
      addCondition("tr.trip_status = ?", filters.tripStatus);
    }

    if (filters.tripDate) {
      addCondition("tr.trip_date = ?::date", filters.tripDate);
    }

    if (filters.dateFrom) {
      addCondition("tr.trip_date >= ?::date", filters.dateFrom);
    }

    if (filters.dateTo) {
      addCondition("tr.trip_date <= ?::date", filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseViews.tripDetails} td
        JOIN ${databaseTables.trips} tr ON tr.id = td.trip_id
        ${whereClause}
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const orderByClause = buildOrderByClause(
      tripSortColumns,
      filters.sortBy,
      filters.sortOrder,
      ["tr.id"]
    );
    const result = await queryable.query<TripRow>(
      `
        ${tripReadSelect}
        ${whereClause}
        ORDER BY ${orderByClause}
        ${buildLimitOffsetClause(values.length + 1)}
      `,
      [...values, filters.limit, pagination.offset]
    );

    return {
      rows: result.rows,
      totalItems
    };
  }

  async findTripById(tripId: string, queryable: Queryable = db): Promise<TripRow | null> {
    const result = await queryable.query<TripRow>(
      `
        ${tripReadSelect}
        WHERE tr.id = $1
        LIMIT 1
      `,
      [tripId]
    );

    return mapSingleRow(result.rows);
  }

  async listTripStudentRoster(
    tripId: string,
    filters: TripStudentRosterFilters = {},
    queryable: Queryable = db
  ): Promise<TripStudentRosterRow[]> {
    const candidateConditions = [
      "sba.route_id = tr.route_id",
      "sba.start_date <= tr.trip_date",
      "(sba.end_date IS NULL OR sba.end_date >= tr.trip_date)"
    ];
    const outerConditions = ["tr.id = $1"];
    const values: unknown[] = [tripId];

    if (filters.stopId) {
      values.push(filters.stopId);
      candidateConditions.push(`sba.stop_id = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      outerConditions.push(
        `(st.full_name ILIKE $${values.length} OR st.academic_no ILIKE $${values.length})`
      );
    }

    const result = await queryable.query<TripStudentRosterRow>(
      `
        WITH candidate_assignments AS (
          SELECT DISTINCT ON (sba.student_id)
            sba.id,
            sba.student_id,
            sba.route_id,
            sba.stop_id,
            sba.start_date,
            sba.end_date
          FROM ${databaseTables.studentBusAssignments} sba
          JOIN ${databaseTables.trips} tr ON tr.id = $1
          WHERE ${candidateConditions.join(" AND ")}
          ORDER BY sba.student_id, sba.start_date DESC, sba.id DESC
        )
        SELECT
          st.id AS "studentId",
          st.academic_no AS "academicNo",
          st.full_name AS "fullName",
          bs.id AS "stopId",
          bs.stop_name AS "stopName",
          bs.latitude AS "stopLatitude",
          bs.longitude AS "stopLongitude",
          bs.stop_order AS "stopOrder",
          home.latitude AS "homeLatitude",
          home.longitude AS "homeLongitude",
          home.address_label AS "homeAddressLabel",
          home.address_text AS "homeAddressText",
          last_event.event_type AS "lastEventType",
          last_event.event_time AS "lastEventTime",
          last_event.stop_id AS "lastEventStopId"
        FROM ${databaseTables.trips} tr
        JOIN candidate_assignments candidate ON true
        JOIN ${databaseTables.students} st ON st.id = candidate.student_id
        JOIN ${databaseTables.busStops} bs
          ON bs.id = candidate.stop_id
         AND bs.route_id = tr.route_id
        LEFT JOIN ${databaseTables.studentTransportHomeLocations} home
          ON home.student_id = candidate.student_id
         AND home.status = 'approved'
        LEFT JOIN LATERAL (
          SELECT
            tse.event_type,
            tse.event_time,
            tse.stop_id
          FROM ${databaseTables.tripStudentEvents} tse
          WHERE tse.trip_id = tr.id
            AND tse.student_id = candidate.student_id
          ORDER BY tse.event_time DESC, tse.id DESC
          LIMIT 1
        ) last_event ON true
        WHERE ${outerConditions.join(" AND ")}
        ORDER BY bs.stop_order ASC, st.full_name ASC, st.id ASC
      `,
      values
    );

    return result.rows;
  }

  async hasDriverTripOwnership(
    driverId: string,
    tripId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.trips} tr
          JOIN ${databaseTables.buses} b ON b.id = tr.bus_id
          WHERE tr.id = $1
            AND b.driver_id = $2
        ) AS exists
      `,
      [tripId, driverId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async updateTripStatus(
    tripId: string,
    tripStatus: "started" | "ended" | "completed",
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.trips}
        SET trip_status = $2
        WHERE id = $1
      `,
      [tripId, tripStatus]
    );
  }

  async createTripLocation(
    input: TripLocationWriteInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.busLocationHistory} (
          trip_id,
          latitude,
          longitude
        )
        VALUES ($1, $2, $3)
      `,
      [input.tripId, input.latitude, input.longitude]
    );
  }

  async findLatestTripLocationByTripId(
    tripId: string,
    queryable: Queryable = db
  ): Promise<LatestTripLocationRow | null> {
    const result = await queryable.query<LatestTripLocationRow>(
      `
        SELECT
          trip_id AS "tripId",
          latitude,
          longitude,
          recorded_at AS "recordedAt"
        FROM ${databaseViews.latestTripLocation}
        WHERE trip_id = $1
        LIMIT 1
      `,
      [tripId]
    );

    return mapSingleRow(result.rows);
  }

  async createTripStudentEvent(
    input: TripStudentEventWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.tripStudentEvents} (
          trip_id,
          student_id,
          event_type,
          stop_id,
          notes
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        input.tripId,
        input.studentId,
        input.eventType,
        input.stopId ?? null,
        input.notes ?? null
      ]
    );

    return result.rows[0].id;
  }

  async findTripStudentEventById(
    tripStudentEventId: string,
    queryable: Queryable = db
  ): Promise<TripStudentEventRow | null> {
    const result = await queryable.query<TripStudentEventRow>(
      `
        SELECT
          trip_student_event_id AS "tripStudentEventId",
          trip_id AS "tripId",
          trip_date AS "tripDate",
          trip_type AS "tripType",
          trip_status AS "tripStatus",
          student_id AS "studentId",
          academic_no AS "academicNo",
          student_name AS "studentFullName",
          event_type AS "eventType",
          event_time AS "eventTime",
          stop_id AS "stopId",
          stop_name AS "stopName",
          notes
        FROM ${databaseViews.tripStudentEventDetails}
        WHERE trip_student_event_id = $1
        LIMIT 1
      `,
      [tripStudentEventId]
    );

    return mapSingleRow(result.rows);
  }

  async listTripEventsByTripId(
    tripId: string,
    queryable: Queryable = db
  ): Promise<TripStudentEventRow[]> {
    const result = await queryable.query<TripStudentEventRow>(
      `
        SELECT
          trip_student_event_id AS "tripStudentEventId",
          trip_id AS "tripId",
          trip_date AS "tripDate",
          trip_type AS "tripType",
          trip_status AS "tripStatus",
          student_id AS "studentId",
          academic_no AS "academicNo",
          student_name AS "studentFullName",
          event_type AS "eventType",
          event_time AS "eventTime",
          stop_id AS "stopId",
          stop_name AS "stopName",
          notes
        FROM ${databaseViews.tripStudentEventDetails}
        WHERE trip_id = $1
        ORDER BY event_time ASC, trip_student_event_id ASC
      `,
      [tripId]
    );

    return result.rows;
  }

  async findStudentHomeLocationByStudentId(
    studentId: string,
    queryable: Queryable = db
  ): Promise<StudentHomeLocationRow | null> {
    const result = await queryable.query<StudentHomeLocationRow>(
      `
        ${studentHomeLocationReadSelect}
        WHERE st.id = $1
        LIMIT 1
      `,
      [studentId]
    );

    return mapSingleRow(result.rows);
  }

  async upsertStudentHomeLocation(
    input: StudentHomeLocationWriteInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.studentTransportHomeLocations} (
          student_id,
          address_label,
          address_text,
          latitude,
          longitude,
          source,
          status,
          submitted_by_user_id,
          approved_by_user_id,
          approved_at,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (student_id)
        DO UPDATE
        SET
          address_label = EXCLUDED.address_label,
          address_text = EXCLUDED.address_text,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          source = EXCLUDED.source,
          status = EXCLUDED.status,
          submitted_by_user_id = EXCLUDED.submitted_by_user_id,
          approved_by_user_id = EXCLUDED.approved_by_user_id,
          approved_at = EXCLUDED.approved_at,
          notes = EXCLUDED.notes
      `,
      [
        input.studentId,
        input.addressLabel ?? null,
        input.addressText ?? null,
        input.latitude,
        input.longitude,
        input.source,
        input.status,
        input.submittedByUserId,
        input.approvedByUserId ?? null,
        input.approvedAt ?? null,
        input.notes ?? null
      ]
    );
  }

  async deleteStudentHomeLocation(
    studentId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        DELETE FROM ${databaseTables.studentTransportHomeLocations}
        WHERE student_id = $1
      `,
      [studentId]
    );
  }
  async hasParentTripAccess(
    parentUserId: string,
    tripId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.trips} tr
          JOIN ${databaseTables.studentBusAssignments} sba
            ON sba.route_id = tr.route_id
           AND sba.is_active = TRUE
           AND sba.start_date <= tr.trip_date
           AND (sba.end_date IS NULL OR sba.end_date >= tr.trip_date)
          JOIN ${databaseTables.studentParents} sp
            ON sp.student_id = sba.student_id
          JOIN ${databaseTables.parents} p
            ON p.id = sp.parent_id
          WHERE tr.id = $1
            AND p.user_id = $2
        ) AS exists
      `,
      [tripId, parentUserId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async listParentTripStops(
    parentUserId: string,
    tripId: string,
    queryable: Queryable = db
  ): Promise<ParentTripStopRow[]> {
    const result = await queryable.query<ParentTripStopRow>(
      `
        SELECT DISTINCT
          bs.id::text AS "stopId",
          bs.stop_name AS "stopName",
          bs.stop_order AS "stopOrder"
        FROM ${databaseTables.trips} tr
        JOIN ${databaseTables.studentBusAssignments} sba
          ON sba.route_id = tr.route_id
         AND sba.is_active = TRUE
         AND sba.start_date <= tr.trip_date
         AND (sba.end_date IS NULL OR sba.end_date >= tr.trip_date)
        JOIN ${databaseTables.studentParents} sp
          ON sp.student_id = sba.student_id
        JOIN ${databaseTables.parents} p
          ON p.id = sp.parent_id
        JOIN ${databaseTables.busStops} bs
          ON bs.id = sba.stop_id
        WHERE tr.id = $1
          AND p.user_id = $2
        ORDER BY bs.stop_order ASC, bs.id::text ASC
      `,
      [tripId, parentUserId]
    );

    return result.rows;
  }
}


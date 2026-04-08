import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { databaseTables } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  ParentNotificationRecipient,
  RouteParentNotificationRecipient
} from "../types/automation.types";

const mapRows = <T extends QueryResultRow>(rows: T[]): T[] => rows;

export class AutomationRepository {
  async listParentRecipientsForStudent(
    studentId: string,
    queryable: Queryable = db
  ): Promise<ParentNotificationRecipient[]> {
    const result = await queryable.query<ParentNotificationRecipient>(
      `
        SELECT
          u.id AS "parentUserId",
          p.id AS "parentId",
          st.id AS "studentId",
          st.full_name AS "studentFullName",
          st.academic_no AS "academicNo",
          sp.relation_type AS "relationType",
          sp.is_primary AS "isPrimary"
        FROM ${databaseTables.studentParents} sp
        JOIN ${databaseTables.parents} p
          ON p.id = sp.parent_id
        JOIN ${databaseTables.users} u
          ON u.id = p.user_id
        JOIN ${databaseTables.students} st
          ON st.id = sp.student_id
        WHERE sp.student_id = $1
        ORDER BY sp.is_primary DESC, p.id ASC
      `,
      [studentId]
    );

    return mapRows(result.rows);
  }

  async listRouteParentRecipients(
    routeId: string,
    tripDate: string,
    queryable: Queryable = db
  ): Promise<RouteParentNotificationRecipient[]> {
    const result = await queryable.query<RouteParentNotificationRecipient>(
      `
        SELECT
          u.id AS "parentUserId",
          p.id AS "parentId",
          st.id AS "studentId",
          st.full_name AS "studentFullName",
          st.academic_no AS "academicNo",
          sp.relation_type AS "relationType",
          sp.is_primary AS "isPrimary",
          r.id AS "routeId",
          r.route_name AS "routeName",
          bs.id AS "stopId",
          bs.stop_name AS "stopName"
        FROM ${databaseTables.studentBusAssignments} sba
        JOIN ${databaseTables.students} st
          ON st.id = sba.student_id
        JOIN ${databaseTables.routes} r
          ON r.id = sba.route_id
        JOIN ${databaseTables.busStops} bs
          ON bs.id = sba.stop_id
        JOIN ${databaseTables.studentParents} sp
          ON sp.student_id = st.id
        JOIN ${databaseTables.parents} p
          ON p.id = sp.parent_id
        JOIN ${databaseTables.users} u
          ON u.id = p.user_id
        WHERE sba.route_id = $1
          AND sba.is_active = TRUE
          AND sba.start_date <= $2::date
          AND (sba.end_date IS NULL OR sba.end_date >= $2::date)
        ORDER BY st.id ASC, sp.is_primary DESC, p.id ASC
      `,
      [routeId, tripDate]
    );

    return mapRows(result.rows);
  }

  async listActiveAdminUserIds(queryable: Queryable = db): Promise<string[]> {
    const result = await queryable.query<{ userId: string }>(
      `
        SELECT id::text AS "userId"
        FROM ${databaseTables.users}
        WHERE role = 'admin'
          AND is_active = TRUE
        ORDER BY id ASC
      `
    );

    return result.rows.map((row) => row.userId);
  }
}

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
  AnnouncementRow,
  AnnouncementWriteInput,
  BulkMessageWriteInput,
  BulkNotificationWriteInput,
  CommunicationDeviceProvider,
  CommunicationDeviceRow,
  CommunicationDeviceSubscriptionKey,
  CommunicationDeviceTokenRow,
  CommunicationDeviceWriteInput,
  CommunicationUserRow,
  ConversationListQuery,
  InboxListQuery,
  MessageRow,
  MessageWriteInput,
  NotificationListQuery,
  NotificationRow,
  NotificationWriteInput,
  RecipientListQuery,
  SentListQuery,
  UserInboxSummaryRow,
  UserNotificationSummaryRow
} from "../types/communication.types";

interface CommunicationDeviceCoreRow {
  deviceId: string;
  userId: string;
  providerKey: CommunicationDeviceProvider;
  platform: CommunicationDeviceRow["platform"];
  appId: string;
  deviceToken: string;
  deviceName: string | null;
  isActive: boolean;
  lastSeenAt: Date;
  unregisteredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const userSelect = `
  SELECT
    id,
    full_name AS "fullName",
    email,
    phone,
    role,
    is_active AS "isActive"
  FROM ${databaseTables.users}
`;

const parentScopedRecipientsCte = `
  WITH linked_students AS (
    SELECT DISTINCT sp.student_id
    FROM ${databaseTables.studentParents} sp
    WHERE sp.parent_id = $1
  ),
  current_student_classes AS (
    SELECT DISTINCT
      sp.student_id,
      sp.class_id,
      sp.academic_year_id
    FROM linked_students ls
    JOIN ${databaseViews.studentProfiles} sp
      ON sp.student_id = ls.student_id
  ),
  admin_candidates AS (
    SELECT
      u.id::text AS id,
      u.full_name AS "fullName",
      u.email,
      u.phone,
      u.role,
      u.is_active AS "isActive"
    FROM ${databaseTables.users} u
    WHERE u.is_active = true
      AND u.role = 'admin'
  ),
  driver_candidates AS (
    SELECT DISTINCT
      u.id::text AS id,
      u.full_name AS "fullName",
      u.email,
      u.phone,
      u.role,
      u.is_active AS "isActive"
    FROM linked_students ls
    JOIN ${databaseTables.studentBusAssignments} sba
      ON sba.student_id = ls.student_id
     AND sba.is_active = true
     AND sba.start_date <= CURRENT_DATE
     AND (sba.end_date IS NULL OR sba.end_date >= CURRENT_DATE)
    JOIN ${databaseTables.transportRouteAssignments} tra
      ON tra.route_id = sba.route_id
     AND tra.is_active = true
     AND tra.start_date <= CURRENT_DATE
     AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
    JOIN ${databaseTables.buses} b
      ON b.id = tra.bus_id
    JOIN ${databaseTables.drivers} d
      ON d.id = b.driver_id
    JOIN ${databaseTables.users} u
      ON u.id = d.user_id
    WHERE u.is_active = true
      AND u.role = 'driver'
  ),
  teacher_candidates AS (
    SELECT DISTINCT
      u.id::text AS id,
      u.full_name AS "fullName",
      u.email,
      u.phone,
      u.role,
      u.is_active AS "isActive"
    FROM current_student_classes csc
    JOIN ${databaseTables.teacherClasses} tc
      ON tc.class_id = csc.class_id
     AND tc.academic_year_id = csc.academic_year_id
    JOIN ${databaseTables.teachers} t
      ON t.id = tc.teacher_id
    JOIN ${databaseTables.users} u
      ON u.id = t.user_id
    WHERE u.is_active = true
      AND u.role = 'teacher'
  ),
  supervisor_candidates AS (
    SELECT DISTINCT
      u.id::text AS id,
      u.full_name AS "fullName",
      u.email,
      u.phone,
      u.role,
      u.is_active AS "isActive"
    FROM current_student_classes csc
    JOIN ${databaseTables.supervisorClasses} sc
      ON sc.class_id = csc.class_id
     AND sc.academic_year_id = csc.academic_year_id
    JOIN ${databaseTables.supervisors} s
      ON s.id = sc.supervisor_id
    JOIN ${databaseTables.users} u
      ON u.id = s.user_id
    WHERE u.is_active = true
      AND u.role = 'supervisor'
  ),
  scoped_recipients AS (
    SELECT * FROM admin_candidates
    UNION
    SELECT * FROM driver_candidates
    UNION
    SELECT * FROM teacher_candidates
    UNION
    SELECT * FROM supervisor_candidates
  )
`;

const messageSelect = `
  SELECT
    message_id AS id,
    sender_user_id AS "senderUserId",
    sender_name AS "senderName",
    receiver_user_id AS "receiverUserId",
    receiver_name AS "receiverName",
    message_body AS "messageBody",
    sent_at AS "sentAt",
    read_at AS "readAt"
  FROM ${databaseViews.vwMessageDetails}
`;

const announcementSelect = `
  SELECT
    announcement_id AS id,
    title,
    content,
    target_role AS "targetRole",
    target_roles AS "targetRoles",
    published_at AS "publishedAt",
    expires_at AS "expiresAt",
    created_by AS "createdBy",
    created_by_name AS "createdByName"
  FROM ${databaseViews.vwAnnouncementDetails}
`;

const notificationSelect = `
  SELECT
    notification_id AS id,
    user_id AS "userId",
    user_name AS "userName",
    title,
    message,
    notification_type AS "notificationType",
    reference_type AS "referenceType",
    reference_id AS "referenceId",
    is_read AS "isRead",
    created_at AS "createdAt",
    read_at AS "readAt"
  FROM ${databaseViews.vwNotificationDetails}
`;

const communicationDeviceCoreSelect = `
  SELECT
    ud.id::text AS "deviceId",
    ud.user_id::text AS "userId",
    ud.provider_key AS "providerKey",
    ud.platform,
    ud.app_id AS "appId",
    ud.device_token AS "deviceToken",
    ud.device_name AS "deviceName",
    ud.is_active AS "isActive",
    ud.last_seen_at AS "lastSeenAt",
    ud.unregistered_at AS "unregisteredAt",
    ud.created_at AS "createdAt",
    ud.updated_at AS "updatedAt"
  FROM ${databaseTables.userDevices} ud
`;

const communicationDeviceSelect = `
  SELECT
    ud.id::text AS "deviceId",
    ud.user_id::text AS "userId",
    ud.provider_key AS "providerKey",
    ud.platform,
    ud.app_id AS "appId",
    ud.device_token AS "deviceToken",
    ud.device_name AS "deviceName",
    ud.is_active AS "isActive",
    ud.last_seen_at AS "lastSeenAt",
    ud.unregistered_at AS "unregisteredAt",
    ud.created_at AS "createdAt",
    ud.updated_at AS "updatedAt",
    COALESCE(
      ARRAY_REMOVE(
        ARRAY_AGG(
          CASE WHEN uds.is_enabled THEN uds.subscription_key END
          ORDER BY uds.subscription_key
        ),
        NULL
      ),
      ARRAY[]::varchar[]
    ) AS subscriptions
  FROM ${databaseTables.userDevices} ud
  LEFT JOIN ${databaseTables.userDeviceSubscriptions} uds
    ON uds.device_id = ud.id
`;

const communicationDeviceGroupBy = `
  GROUP BY
    ud.id,
    ud.user_id,
    ud.provider_key,
    ud.platform,
    ud.app_id,
    ud.device_token,
    ud.device_name,
    ud.is_active,
    ud.last_seen_at,
    ud.unregistered_at,
    ud.created_at,
    ud.updated_at
`;

const messageSortColumns = {
  sentAt: "sent_at"
} as const;

const notificationSortColumns = {
  createdAt: "created_at",
  readAt: "read_at"
} as const;

export class CommunicationRepository {
  async findUserById(
    userId: string,
    queryable: Queryable = db
  ): Promise<CommunicationUserRow | null> {
    const result = await queryable.query<CommunicationUserRow>(
      `
        ${userSelect}
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async listAvailableRecipients(
    currentUserId: string,
    filters: RecipientListQuery,
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<CommunicationUserRow>> {
    const conditions = ["is_active = true", "id <> $1"];
    const values: unknown[] = [currentUserId];

    if (filters.role) {
      values.push(filters.role);
      conditions.push(`role = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(full_name ILIKE $${values.length} OR COALESCE(email, '') ILIKE $${values.length} OR COALESCE(phone, '') ILIKE $${values.length})`
      );
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseTables.users}
        ${whereClause}
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const result = await queryable.query<CommunicationUserRow>(
      `
        ${userSelect}
        ${whereClause}
        ORDER BY full_name ASC, id ASC
        ${buildLimitOffsetClause(values.length + 1)}
      `,
      [...values, filters.limit, pagination.offset]
    );

    return {
      rows: result.rows,
      totalItems
    };
  }

  async listParentScopedRecipients(
    parentId: string,
    filters: RecipientListQuery,
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<CommunicationUserRow>> {
    const conditions: string[] = [];
    const values: unknown[] = [parentId];

    if (filters.role) {
      values.push(filters.role);
      conditions.push(`role = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `("fullName" ILIKE $${values.length} OR COALESCE(email, '') ILIKE $${values.length} OR COALESCE(phone, '') ILIKE $${values.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await queryable.query<{ total: string }>(
      `
        ${parentScopedRecipientsCte}
        SELECT COUNT(*)::text AS total
        FROM scoped_recipients
        ${whereClause}
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const result = await queryable.query<CommunicationUserRow>(
      `
        ${parentScopedRecipientsCte}
        SELECT
          id,
          "fullName",
          email,
          phone,
          role,
          "isActive"
        FROM scoped_recipients
        ${whereClause}
        ORDER BY "fullName" ASC, id ASC
        ${buildLimitOffsetClause(values.length + 1)}
      `,
      [...values, filters.limit, pagination.offset]
    );

    return {
      rows: result.rows,
      totalItems
    };
  }

  async listAvailableRecipientIdsByUserIds(
    currentUserId: string,
    userIds: string[],
    queryable: Queryable = db
  ): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }

    const result = await queryable.query<{ id: string }>(
      `
        SELECT DISTINCT id::text AS id
        FROM ${databaseTables.users}
        WHERE is_active = true
          AND id <> $1
          AND id::text = ANY($2::text[])
        ORDER BY id::text ASC
      `,
      [currentUserId, userIds]
    );

    return result.rows.map((row) => row.id);
  }

  async listParentScopedRecipientIdsByUserIds(
    parentId: string,
    userIds: string[],
    queryable: Queryable = db
  ): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }

    const result = await queryable.query<{ id: string }>(
      `
        ${parentScopedRecipientsCte}
        SELECT DISTINCT id
        FROM scoped_recipients
        WHERE id = ANY($2::text[])
        ORDER BY id ASC
      `,
      [parentId, userIds]
    );

    return result.rows.map((row) => row.id);
  }

  async listAvailableRecipientIdsByRoles(
    currentUserId: string,
    roles: CommunicationUserRow["role"][],
    queryable: Queryable = db
  ): Promise<string[]> {
    if (roles.length === 0) {
      return [];
    }

    const result = await queryable.query<{ id: string }>(
      `
        SELECT DISTINCT id::text AS id
        FROM ${databaseTables.users}
        WHERE is_active = true
          AND id <> $1
          AND role = ANY($2::text[])
        ORDER BY id::text ASC
      `,
      [currentUserId, roles]
    );

    return result.rows.map((row) => row.id);
  }

  async createMessage(
    input: MessageWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.messages} (
          sender_user_id,
          receiver_user_id,
          message_body
        )
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [input.senderUserId, input.receiverUserId, input.messageBody]
    );

    return result.rows[0].id;
  }

  async createMessagesBulk(
    input: BulkMessageWriteInput,
    queryable: Queryable = db
  ): Promise<number> {
    const result = await queryable.query(
      `
        INSERT INTO ${databaseTables.messages} (
          sender_user_id,
          receiver_user_id,
          message_body
        )
        SELECT
          $1::bigint,
          recipient_user_id::bigint,
          $3
        FROM UNNEST($2::text[]) AS recipient_user_id
      `,
      [input.senderUserId, input.receiverUserIds, input.messageBody]
    );

    return result.rowCount ?? 0;
  }

  async findMessageById(
    messageId: string,
    queryable: Queryable = db
  ): Promise<MessageRow | null> {
    const result = await queryable.query<MessageRow>(
      `
        ${messageSelect}
        WHERE message_id = $1
        LIMIT 1
      `,
      [messageId]
    );

    return mapSingleRow(result.rows);
  }

  async listInboxMessages(
    userId: string,
    filters: InboxListQuery,
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<MessageRow>> {
    const conditions = ["receiver_user_id = $1"];
    const values: unknown[] = [userId];

    if (filters.isRead !== undefined) {
      values.push(filters.isRead);
      conditions.push(filters.isRead ? "read_at IS NOT NULL" : "read_at IS NULL");
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseViews.vwMessageDetails}
        ${whereClause}
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const orderByClause = buildOrderByClause(
      messageSortColumns,
      filters.sortBy,
      filters.sortOrder,
      ["message_id"]
    );
    const result = await queryable.query<MessageRow>(
      `
        ${messageSelect}
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

  async listSentMessages(
    userId: string,
    filters: SentListQuery,
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<MessageRow>> {
    const conditions = ["sender_user_id = $1"];
    const values: unknown[] = [userId];

    if (filters.receiverUserId) {
      values.push(filters.receiverUserId);
      conditions.push(`receiver_user_id = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseViews.vwMessageDetails}
        ${whereClause}
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const orderByClause = buildOrderByClause(
      messageSortColumns,
      filters.sortBy,
      filters.sortOrder,
      ["message_id"]
    );
    const result = await queryable.query<MessageRow>(
      `
        ${messageSelect}
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

  async listConversationMessages(
    currentUserId: string,
    otherUserId: string,
    filters: ConversationListQuery,
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<MessageRow>> {
    const values: unknown[] = [currentUserId, otherUserId];
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseViews.vwMessageDetails}
        WHERE (
          sender_user_id = $1
          AND receiver_user_id = $2
        ) OR (
          sender_user_id = $2
          AND receiver_user_id = $1
        )
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const orderByClause = buildOrderByClause(
      messageSortColumns,
      filters.sortBy,
      filters.sortOrder,
      ["message_id"]
    );
    const result = await queryable.query<MessageRow>(
      `
        ${messageSelect}
        WHERE (
          sender_user_id = $1
          AND receiver_user_id = $2
        ) OR (
          sender_user_id = $2
          AND receiver_user_id = $1
        )
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

  async findInboxSummaryByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<UserInboxSummaryRow | null> {
    const result = await queryable.query<UserInboxSummaryRow>(
      `
        SELECT
          total_received_messages AS "totalReceivedMessages",
          unread_messages AS "unreadMessages"
        FROM ${databaseViews.vwUserInboxSummary}
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async markMessageAsRead(
    messageId: string,
    receiverUserId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.messages}
        SET read_at = COALESCE(read_at, NOW())
        WHERE id = $1
          AND receiver_user_id = $2
      `,
      [messageId, receiverUserId]
    );
  }

  async createAnnouncement(
    input: AnnouncementWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.announcements} (
          created_by,
          title,
          content,
          target_role,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        input.createdBy,
        input.title,
        input.content,
        input.targetRole ?? null,
        input.expiresAt ?? null
      ]
    );

    return result.rows[0].id;
  }

  async createAnnouncementTargetRoles(
    announcementId: string,
    targetRoles: CommunicationUserRow["role"][],
    queryable: Queryable = db
  ): Promise<void> {
    if (targetRoles.length === 0) {
      return;
    }

    await queryable.query(
      `
        INSERT INTO ${databaseTables.announcementTargetRoles} (
          announcement_id,
          target_role
        )
        SELECT
          $1::bigint,
          target_role::varchar(30)
        FROM UNNEST($2::text[]) AS target_role
      `,
      [announcementId, targetRoles]
    );
  }

  async findAnnouncementById(
    announcementId: string,
    queryable: Queryable = db
  ): Promise<AnnouncementRow | null> {
    const result = await queryable.query<AnnouncementRow>(
      `
        ${announcementSelect}
        WHERE announcement_id = $1
        LIMIT 1
      `,
      [announcementId]
    );

    return mapSingleRow(result.rows);
  }

  async listAllAnnouncements(queryable: Queryable = db): Promise<AnnouncementRow[]> {
    const result = await queryable.query<AnnouncementRow>(
      `
        ${announcementSelect}
        ORDER BY published_at DESC, announcement_id DESC
      `
    );

    return result.rows;
  }

  async listActiveAnnouncementsForRole(
    role: CommunicationUserRow["role"],
    queryable: Queryable = db
  ): Promise<AnnouncementRow[]> {
    const result = await queryable.query<AnnouncementRow>(
      `
        SELECT
          announcement_id AS id,
          title,
          content,
          target_role AS "targetRole",
          target_roles AS "targetRoles",
          published_at AS "publishedAt",
          expires_at AS "expiresAt",
          created_by AS "createdBy",
          created_by_name AS "createdByName"
        FROM ${databaseViews.vwActiveAnnouncements}
        WHERE COALESCE(cardinality(target_roles), 0) = 0 OR $1 = ANY(target_roles)
        ORDER BY published_at DESC, announcement_id DESC
      `,
      [role]
    );

    return result.rows;
  }

  async createNotification(
    input: NotificationWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.notifications} (
          user_id,
          title,
          message,
          notification_type,
          reference_type,
          reference_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        input.userId,
        input.title,
        input.message,
        input.notificationType,
        input.referenceType ?? null,
        input.referenceId ?? null
      ]
    );

    return result.rows[0].id;
  }

  async createNotificationsBulk(
    input: BulkNotificationWriteInput,
    queryable: Queryable = db
  ): Promise<number> {
    const result = await queryable.query(
      `
        INSERT INTO ${databaseTables.notifications} (
          user_id,
          title,
          message,
          notification_type,
          reference_type,
          reference_id
        )
        SELECT
          recipient_user_id::bigint,
          $2::varchar(150),
          $3::text,
          $4::varchar(50),
          $5::varchar(50),
          $6::bigint
        FROM UNNEST($1::text[]) AS recipient_user_id
      `,
      [
        input.userIds,
        input.title,
        input.message,
        input.notificationType,
        input.referenceType ?? null,
        input.referenceId ?? null
      ]
    );

    return result.rowCount ?? 0;
  }

  async findNotificationById(
    notificationId: string,
    queryable: Queryable = db
  ): Promise<NotificationRow | null> {
    const result = await queryable.query<NotificationRow>(
      `
        ${notificationSelect}
        WHERE notification_id = $1
        LIMIT 1
      `,
      [notificationId]
    );

    return mapSingleRow(result.rows);
  }

  async listNotificationsByUserId(
    userId: string,
    filters: NotificationListQuery,
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<NotificationRow>> {
    const conditions = ["user_id = $1"];
    const values: unknown[] = [userId];

    if (filters.isRead !== undefined) {
      conditions.push(filters.isRead ? "is_read = true" : "is_read = false");
    }

    if (filters.notificationType) {
      values.push(filters.notificationType);
      conditions.push(`notification_type = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseViews.vwNotificationDetails}
        ${whereClause}
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const orderByClause = buildOrderByClause(
      notificationSortColumns,
      filters.sortBy,
      filters.sortOrder,
      ["notification_id"]
    );
    const result = await queryable.query<NotificationRow>(
      `
        ${notificationSelect}
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

  async findNotificationSummaryByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<UserNotificationSummaryRow | null> {
    const result = await queryable.query<UserNotificationSummaryRow>(
      `
        SELECT
          total_notifications AS "totalNotifications",
          unread_notifications AS "unreadNotifications"
        FROM ${databaseViews.vwUserNotificationSummary}
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async markNotificationAsRead(
    notificationId: string,
    userId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.notifications}
        SET is_read = true
        WHERE id = $1
          AND user_id = $2
      `,
      [notificationId, userId]
    );
  }

  async findDeviceById(
    deviceId: string,
    queryable: Queryable = db
  ): Promise<CommunicationDeviceRow | null> {
    const result = await queryable.query<CommunicationDeviceRow>(
      `
        ${communicationDeviceSelect}
        WHERE ud.id = $1
        ${communicationDeviceGroupBy}
        LIMIT 1
      `,
      [deviceId]
    );

    return mapSingleRow(result.rows);
  }

  async findDeviceByIdForUser(
    deviceId: string,
    userId: string,
    queryable: Queryable = db
  ): Promise<CommunicationDeviceRow | null> {
    const result = await queryable.query<CommunicationDeviceRow>(
      `
        ${communicationDeviceSelect}
        WHERE ud.id = $1
          AND ud.user_id = $2
        ${communicationDeviceGroupBy}
        LIMIT 1
      `,
      [deviceId, userId]
    );

    return mapSingleRow(result.rows);
  }

  async findDeviceByProviderToken(
    providerKey: CommunicationDeviceProvider,
    deviceToken: string,
    queryable: Queryable = db
  ): Promise<CommunicationDeviceRow | null> {
    const result = await queryable.query<CommunicationDeviceRow>(
      `
        ${communicationDeviceSelect}
        WHERE ud.provider_key = $1
          AND ud.device_token = $2
        ${communicationDeviceGroupBy}
        LIMIT 1
      `,
      [providerKey, deviceToken]
    );

    return mapSingleRow(result.rows);
  }

  async lockDeviceByIdForUser(
    deviceId: string,
    userId: string,
    queryable: Queryable = db
  ): Promise<CommunicationDeviceCoreRow | null> {
    const result = await queryable.query<CommunicationDeviceCoreRow>(
      `
        ${communicationDeviceCoreSelect}
        WHERE ud.id = $1
          AND ud.user_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [deviceId, userId]
    );

    return mapSingleRow(result.rows);
  }

  async lockDeviceByProviderToken(
    providerKey: CommunicationDeviceProvider,
    deviceToken: string,
    queryable: Queryable = db
  ): Promise<CommunicationDeviceCoreRow | null> {
    const result = await queryable.query<CommunicationDeviceCoreRow>(
      `
        ${communicationDeviceCoreSelect}
        WHERE ud.provider_key = $1
          AND ud.device_token = $2
        LIMIT 1
        FOR UPDATE
      `,
      [providerKey, deviceToken]
    );

    return mapSingleRow(result.rows);
  }

  async createDevice(
    input: CommunicationDeviceWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.userDevices} (
          user_id,
          provider_key,
          platform,
          app_id,
          device_token,
          device_name,
          is_active,
          last_seen_at,
          unregistered_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id::text AS id
      `,
      [
        input.userId,
        input.providerKey,
        input.platform,
        input.appId,
        input.deviceToken,
        input.deviceName ?? null,
        input.isActive,
        input.lastSeenAt,
        input.unregisteredAt ?? null
      ]
    );

    return result.rows[0].id;
  }

  async updateDevice(
    deviceId: string,
    input: CommunicationDeviceWriteInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.userDevices}
        SET user_id = $2,
            provider_key = $3,
            platform = $4,
            app_id = $5,
            device_token = $6,
            device_name = $7,
            is_active = $8,
            last_seen_at = $9,
            unregistered_at = $10
        WHERE id = $1
      `,
      [
        deviceId,
        input.userId,
        input.providerKey,
        input.platform,
        input.appId,
        input.deviceToken,
        input.deviceName ?? null,
        input.isActive,
        input.lastSeenAt,
        input.unregisteredAt ?? null
      ]
    );
  }

  async replaceDeviceSubscriptions(
    deviceId: string,
    subscriptions: CommunicationDeviceSubscriptionKey[],
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        DELETE FROM ${databaseTables.userDeviceSubscriptions}
        WHERE device_id = $1
      `,
      [deviceId]
    );

    if (subscriptions.length === 0) {
      return;
    }

    await queryable.query(
      `
        INSERT INTO ${databaseTables.userDeviceSubscriptions} (
          device_id,
          subscription_key,
          is_enabled
        )
        SELECT
          $1::bigint,
          subscription_key::varchar(50),
          true
        FROM UNNEST($2::text[]) AS subscription_key
      `,
      [deviceId, subscriptions]
    );
  }

  async deleteDeviceHard(deviceId: string, queryable: Queryable = db): Promise<void> {
    await queryable.query(
      `
        DELETE FROM ${databaseTables.userDevices}
        WHERE id = $1
      `,
      [deviceId]
    );
  }

  async softUnregisterDevice(deviceId: string, queryable: Queryable = db): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.userDevices}
        SET is_active = false,
            unregistered_at = NOW()
        WHERE id = $1
      `,
      [deviceId]
    );
  }

  async listActiveDeviceTokensByUserIds(
    userIds: string[],
    providerKey: CommunicationDeviceProvider,
    subscriptionKey: CommunicationDeviceSubscriptionKey,
    queryable: Queryable = db
  ): Promise<CommunicationDeviceTokenRow[]> {
    if (userIds.length === 0) {
      return [];
    }

    const result = await queryable.query<CommunicationDeviceTokenRow>(
      `
        SELECT DISTINCT
          ud.id::text AS "deviceId",
          ud.user_id::text AS "userId",
          ud.device_token AS "deviceToken"
        FROM ${databaseTables.userDevices} ud
        JOIN ${databaseTables.userDeviceSubscriptions} uds
          ON uds.device_id = ud.id
        WHERE ud.user_id::text = ANY($1::text[])
          AND ud.provider_key = $2
          AND uds.subscription_key = $3
          AND ud.is_active = true
          AND uds.is_enabled = true
        ORDER BY ud.id ASC
      `,
      [userIds, providerKey, subscriptionKey]
    );

    return result.rows;
  }

  async deactivateDevicesByTokens(
    providerKey: CommunicationDeviceProvider,
    deviceTokens: string[],
    queryable: Queryable = db
  ): Promise<void> {
    if (deviceTokens.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.userDevices}
        SET is_active = false,
            unregistered_at = COALESCE(unregistered_at, NOW())
        WHERE provider_key = $1
          AND device_token = ANY($2::text[])
      `,
      [providerKey, deviceTokens]
    );
  }
}

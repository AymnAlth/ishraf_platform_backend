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
  CommunicationUserRow,
  ConversationListQuery,
  InboxListQuery,
  MessageRow,
  MessageWriteInput,
  NotificationListQuery,
  NotificationRow,
  NotificationWriteInput,
  SentListQuery,
  UserInboxSummaryRow,
  UserNotificationSummaryRow
} from "../types/communication.types";

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
      conditions.push(
        filters.isRead ? "read_at IS NOT NULL" : "read_at IS NULL"
      );
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
          published_at AS "publishedAt",
          expires_at AS "expiresAt",
          created_by AS "createdBy",
          created_by_name AS "createdByName"
        FROM ${databaseViews.vwActiveAnnouncements}
        WHERE target_role IS NULL OR target_role = $1
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
}

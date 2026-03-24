import type { PaginatedData } from "../../../common/types/pagination.types";
import type {
  AnnouncementResponseDto,
  InboxResponseDto,
  MessageResponseDto,
  NotificationResponseDto,
  NotificationsListResponseDto
} from "../dto/communication.dto";
import type {
  AnnouncementRow,
  MessageRow,
  NotificationRow
} from "../types/communication.types";

const toUnreadCount = (value: number | string | undefined): number =>
  value === undefined ? 0 : Number(value);

export const toMessageResponseDto = (row: MessageRow): MessageResponseDto => ({
  id: row.id,
  sender: {
    userId: row.senderUserId,
    fullName: row.senderName
  },
  receiver: {
    userId: row.receiverUserId,
    fullName: row.receiverName
  },
  messageBody: row.messageBody,
  sentAt: row.sentAt.toISOString(),
  readAt: row.readAt ? row.readAt.toISOString() : null
});

export const toInboxResponseDto = (
  unreadCount: number | string | undefined,
  rows: MessageRow[]
): InboxResponseDto => ({
  items: rows.map((row) => toMessageResponseDto(row)),
  messages: rows.map((row) => toMessageResponseDto(row)),
  pagination: {
    page: 1,
    limit: rows.length,
    totalItems: rows.length,
    totalPages: rows.length > 0 ? 1 : 0,
    hasNextPage: false,
    hasPreviousPage: false
  },
  unreadCount: toUnreadCount(unreadCount),
});

export const toPaginatedInboxResponseDto = (
  unreadCount: number | string | undefined,
  data: PaginatedData<MessageResponseDto>
): InboxResponseDto => ({
  items: data.items,
  messages: data.items,
  pagination: data.pagination,
  unreadCount: toUnreadCount(unreadCount)
});

export const toAnnouncementResponseDto = (
  row: AnnouncementRow
): AnnouncementResponseDto => ({
  id: row.id,
  title: row.title,
  content: row.content,
  targetRole: row.targetRole,
  publishedAt: row.publishedAt.toISOString(),
  expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  createdBy: {
    userId: row.createdBy,
    fullName: row.createdByName
  }
});

export const toNotificationResponseDto = (
  row: NotificationRow
): NotificationResponseDto => ({
  id: row.id,
  title: row.title,
  message: row.message,
  notificationType: row.notificationType,
  referenceType: row.referenceType,
  referenceId: row.referenceId ? String(row.referenceId) : null,
  isRead: row.isRead,
  createdAt: row.createdAt.toISOString(),
  readAt: row.readAt ? row.readAt.toISOString() : null
});

export const toNotificationsListResponseDto = (
  unreadCount: number | string | undefined,
  rows: NotificationRow[]
): NotificationsListResponseDto => ({
  items: rows.map((row) => toNotificationResponseDto(row)),
  notifications: rows.map((row) => toNotificationResponseDto(row)),
  pagination: {
    page: 1,
    limit: rows.length,
    totalItems: rows.length,
    totalPages: rows.length > 0 ? 1 : 0,
    hasNextPage: false,
    hasPreviousPage: false
  },
  unreadCount: toUnreadCount(unreadCount),
});

export const toPaginatedNotificationsResponseDto = (
  unreadCount: number | string | undefined,
  data: PaginatedData<NotificationResponseDto>
): NotificationsListResponseDto => ({
  items: data.items,
  notifications: data.items,
  pagination: data.pagination,
  unreadCount: toUnreadCount(unreadCount)
});

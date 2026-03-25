import type { Role } from "../../../config/constants";
import type {
  PaginationQuery,
  SortQuery
} from "../../../common/types/pagination.types";

export interface CommunicationUserRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
}

export interface RecipientListQuery extends PaginationQuery {
  search?: string;
  role?: Role;
}

export interface MessageRow {
  id: string;
  senderUserId: string;
  senderName: string;
  receiverUserId: string;
  receiverName: string;
  messageBody: string;
  sentAt: Date;
  readAt: Date | null;
}

export interface UserInboxSummaryRow {
  totalReceivedMessages: number | string;
  unreadMessages: number | string;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  targetRole: Role | null;
  publishedAt: Date;
  expiresAt: Date | null;
  createdBy: string;
  createdByName: string;
}

export interface NotificationRow {
  id: string;
  userId: string;
  userName: string;
  title: string;
  message: string;
  notificationType: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
}

export interface UserNotificationSummaryRow {
  totalNotifications: number | string;
  unreadNotifications: number | string;
}

export const MESSAGE_LIST_SORT_FIELDS = ["sentAt"] as const;
export const NOTIFICATION_LIST_SORT_FIELDS = ["createdAt", "readAt"] as const;

export type MessageListSortField = (typeof MESSAGE_LIST_SORT_FIELDS)[number];
export type NotificationListSortField = (typeof NOTIFICATION_LIST_SORT_FIELDS)[number];

export interface InboxListQuery
  extends PaginationQuery,
    SortQuery<MessageListSortField> {
  isRead?: boolean;
}

export interface SentListQuery
  extends PaginationQuery,
    SortQuery<MessageListSortField> {
  receiverUserId?: string;
}

export interface ConversationListQuery
  extends PaginationQuery,
    SortQuery<MessageListSortField> {}

export interface NotificationListQuery
  extends PaginationQuery,
    SortQuery<NotificationListSortField> {
  isRead?: boolean;
  notificationType?: string;
}

export interface MessageWriteInput {
  senderUserId: string;
  receiverUserId: string;
  messageBody: string;
}

export interface AnnouncementWriteInput {
  createdBy: string;
  title: string;
  content: string;
  targetRole?: Role | null;
  expiresAt?: string | null;
}

export interface NotificationWriteInput {
  userId: string;
  title: string;
  message: string;
  notificationType: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

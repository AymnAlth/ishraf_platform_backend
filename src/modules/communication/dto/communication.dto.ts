import type { Role } from "../../../config/constants";
import type {
  CommunicationDevicePlatform,
  CommunicationDeviceProvider,
  CommunicationDeviceSubscriptionKey
} from "../types/communication.types";

export interface CommunicationMessageIdParamsDto {
  messageId: string;
}

export interface CommunicationNotificationIdParamsDto {
  notificationId: string;
}

export interface CommunicationOtherUserIdParamsDto {
  otherUserId: string;
}

export interface CommunicationDeviceIdParamsDto {
  deviceId: string;
}

export interface AvailableRecipientsQueryDto {
  page: number;
  limit: number;
  search?: string;
  role?: Role;
}

export interface SendMessageRequestDto {
  receiverUserId: string;
  messageBody: string;
}

export interface SendBulkMessageRequestDto {
  receiverUserIds?: string[];
  targetRoles?: Role[];
  messageBody: string;
}

export interface InboxQueryDto {
  page: number;
  limit: number;
  sortBy: "sentAt";
  sortOrder: "asc" | "desc";
  isRead?: boolean;
}

export interface SentQueryDto {
  page: number;
  limit: number;
  sortBy: "sentAt";
  sortOrder: "asc" | "desc";
  receiverUserId?: string;
}

export interface ConversationQueryDto {
  page: number;
  limit: number;
  sortBy: "sentAt";
  sortOrder: "asc" | "desc";
}

export interface NotificationsQueryDto {
  page: number;
  limit: number;
  sortBy: "createdAt" | "readAt";
  sortOrder: "asc" | "desc";
  isRead?: boolean;
  notificationType?: string;
}

export interface MessageResponseDto {
  id: string;
  sender: {
    userId: string;
    fullName: string;
  };
  receiver: {
    userId: string;
    fullName: string;
  };
  messageBody: string;
  sentAt: string;
  readAt: string | null;
}

export interface InboxResponseDto {
  items: MessageResponseDto[];
  messages: MessageResponseDto[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  unreadCount: number;
}

export interface CreateAnnouncementRequestDto {
  title: string;
  content: string;
  targetRole?: Role | null;
  targetRoles?: Role[];
  expiresAt?: string | null;
}

export interface AnnouncementResponseDto {
  id: string;
  title: string;
  content: string;
  targetRole: Role | null;
  targetRoles: Role[];
  publishedAt: string;
  expiresAt: string | null;
  createdBy: {
    userId: string;
    fullName: string;
  };
}

export interface CreateNotificationRequestDto {
  userId: string;
  title: string;
  message: string;
  notificationType: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

export interface CreateBulkNotificationRequestDto {
  userIds?: string[];
  targetRoles?: Role[];
  title: string;
  message: string;
  notificationType: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

export interface NotificationResponseDto {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationsListResponseDto {
  items: NotificationResponseDto[];
  notifications: NotificationResponseDto[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  unreadCount: number;
}

export interface AvailableRecipientResponseDto {
  userId: string;
  fullName: string;
  role: Role;
  phone: string | null;
  email: string | null;
}

export interface CommunicationBulkFailedTargetResponseDto {
  userId?: string;
  role?: Role;
  code: string;
  message: string;
}

export interface CommunicationBulkDeliveryResponseDto {
  resolvedRecipients: number;
  duplicatesRemoved: number;
  successCount: number;
  failedCount: number;
  failedTargets: CommunicationBulkFailedTargetResponseDto[];
}

export interface RegisterCommunicationDeviceRequestDto {
  providerKey: CommunicationDeviceProvider;
  platform: CommunicationDevicePlatform;
  appId: string;
  deviceToken: string;
  deviceName?: string;
  subscriptions: CommunicationDeviceSubscriptionKey[];
}

export interface UpdateCommunicationDeviceRequestDto {
  deviceToken?: string;
  deviceName?: string | null;
  subscriptions?: CommunicationDeviceSubscriptionKey[];
}

export interface CommunicationDeviceResponseDto {
  deviceId: string;
  providerKey: CommunicationDeviceProvider;
  platform: CommunicationDevicePlatform;
  appId: string;
  deviceName: string | null;
  isActive: boolean;
  subscriptions: CommunicationDeviceSubscriptionKey[];
  lastSeenAt: string;
  updatedAt: string;
}

export interface UnregisterCommunicationDeviceResponseDto {
  deviceId: string;
  isActive: false;
  unregisteredAt: string;
}
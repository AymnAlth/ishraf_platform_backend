import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import { DEFAULT_LIMIT, DEFAULT_PAGE, toPaginatedData } from "../../../common/utils/pagination.util";
import type { Role } from "../../../config/constants";
import { db } from "../../../database/db";
import type {
  AnnouncementResponseDto,
  AvailableRecipientResponseDto,
  AvailableRecipientsQueryDto,
  CommunicationBulkDeliveryResponseDto,
  ConversationQueryDto,
  CreateAnnouncementRequestDto,
  CreateBulkNotificationRequestDto,
  CreateNotificationRequestDto,
  InboxResponseDto,
  InboxQueryDto,
  MessageResponseDto,
  NotificationResponseDto,
  NotificationsListResponseDto,
  NotificationsQueryDto,
  SendBulkMessageRequestDto,
  SendMessageRequestDto,
  SentQueryDto
} from "../dto/communication.dto";
import {
  toAnnouncementResponseDto,
  toAvailableRecipientResponseDto,
  toPaginatedInboxResponseDto,
  toMessageResponseDto,
  toNotificationResponseDto,
  toPaginatedNotificationsResponseDto
} from "../mapper/communication.mapper";
import type { CommunicationRepository } from "../repository/communication.repository";

type CommunicationTransactionRunner = <T>(
  callback: (queryable: Queryable) => Promise<T>
) => Promise<T>;

const defaultTransactionRunner: CommunicationTransactionRunner = async (callback) =>
  db.withTransaction((client) => callback(client));

const assertFound = <T>(entity: T | null, label: string): T => {
  if (!entity) {
    throw new NotFoundError(`${label} not found`);
  }

  return entity;
};

const assertAdmin = (authUser: AuthenticatedUser): void => {
  if (authUser.role !== "admin") {
    throw new ForbiddenError("You do not have permission to access communication management");
  }
};

const buildSelfMessageError = (): ValidationError =>
  new ValidationError("You cannot send a message to yourself", [
    {
      field: "receiverUserId",
      code: "MESSAGE_RECEIVER_SELF",
      message: "You cannot send a message to yourself"
    }
  ]);

const buildSelfConversationError = (): ValidationError =>
  new ValidationError("Conversation user must be different from the current user", [
    {
      field: "otherUserId",
      code: "CONVERSATION_USER_SELF",
      message: "Conversation user must be different from the current user"
    }
  ]);

const buildBulkSelfTargetingError = (): ValidationError =>
  new ValidationError("Bulk messages cannot target the current user", [
    {
      field: "receiverUserIds",
      code: "SELF_TARGETING_NOT_ALLOWED",
      message: "Bulk messages cannot target the current user"
    }
  ]);

const buildAudienceEmptyError = (
  field: "receiverUserIds" | "userIds"
): ValidationError =>
  new ValidationError("Resolved audience is empty", [
    {
      field,
      code: "AUDIENCE_EMPTY",
      message: "Resolved audience is empty"
    }
  ]);

const buildUnavailableAudienceError = (
  field: "receiverUserIds" | "userIds",
  userIds: string[]
): ValidationError =>
  new ValidationError("One or more selected users are not available for delivery", [
    ...userIds.map((userId) => ({
      field,
      code: "TARGET_USER_NOT_AVAILABLE",
      message: `User ${userId} is not available for delivery`
    }))
  ]);

const normalizePaginatedRows = <T>(
  value: T[] | { rows: T[]; totalItems: number }
): { rows: T[]; totalItems: number } =>
  Array.isArray(value)
    ? {
        rows: value,
        totalItems: value.length
      }
    : value;

const dedupeStrings = (values: string[] | undefined): string[] => [...new Set(values ?? [])];

const dedupeRoles = (values: Role[] | undefined): Role[] => [...new Set(values ?? [])];

const defaultInboxQuery = (): InboxQueryDto => ({
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  sortBy: "sentAt",
  sortOrder: "desc"
});

const defaultSentQuery = (): SentQueryDto => ({
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  sortBy: "sentAt",
  sortOrder: "desc"
});

const defaultConversationQuery = (): ConversationQueryDto => ({
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  sortBy: "sentAt",
  sortOrder: "asc"
});

const defaultNotificationsQuery = (): NotificationsQueryDto => ({
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  sortBy: "createdAt",
  sortOrder: "desc"
});

const defaultRecipientsQuery = (): AvailableRecipientsQueryDto => ({
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT
});

export class CommunicationService {
  constructor(
    private readonly communicationRepository: CommunicationRepository,
    private readonly withTransaction: CommunicationTransactionRunner = defaultTransactionRunner
  ) {}

  private async resolveAudience(
    authUser: AuthenticatedUser,
    input: {
      explicitUserIds?: string[];
      targetRoles?: Role[];
      explicitField: "receiverUserIds" | "userIds";
      rejectSelfTargeting?: boolean;
    },
    queryable?: Queryable
  ): Promise<{ recipientIds: string[]; duplicatesRemoved: number }> {
    const explicitUserIds = dedupeStrings(input.explicitUserIds);
    const targetRoles = dedupeRoles(input.targetRoles);

    if (input.rejectSelfTargeting && explicitUserIds.includes(authUser.userId)) {
      throw buildBulkSelfTargetingError();
    }

    const [resolvedExplicitUserIds, resolvedRoleUserIds] = await Promise.all([
      explicitUserIds.length > 0
        ? this.communicationRepository.listAvailableRecipientIdsByUserIds(
            authUser.userId,
            explicitUserIds,
            queryable
          )
        : Promise.resolve([]),
      targetRoles.length > 0
        ? this.communicationRepository.listAvailableRecipientIdsByRoles(
            authUser.userId,
            targetRoles,
            queryable
          )
        : Promise.resolve([])
    ]);

    const unavailableExplicitIds = explicitUserIds.filter(
      (userId) => !resolvedExplicitUserIds.includes(userId)
    );

    if (unavailableExplicitIds.length > 0) {
      throw buildUnavailableAudienceError(input.explicitField, unavailableExplicitIds);
    }

    const recipientIds = dedupeStrings([...resolvedExplicitUserIds, ...resolvedRoleUserIds]);

    if (recipientIds.length === 0) {
      throw buildAudienceEmptyError(input.explicitField);
    }

    return {
      recipientIds,
      duplicatesRemoved:
        resolvedExplicitUserIds.length + resolvedRoleUserIds.length - recipientIds.length
    };
  }

  async listAvailableRecipients(
    authUser: AuthenticatedUser,
    query: AvailableRecipientsQueryDto = defaultRecipientsQuery()
  ): Promise<PaginatedData<AvailableRecipientResponseDto>> {
    const { rows, totalItems } = normalizePaginatedRows(
      await this.communicationRepository.listAvailableRecipients(authUser.userId, query)
    );

    return toPaginatedData(
      rows.map((row) => toAvailableRecipientResponseDto(row)),
      query.page,
      query.limit,
      totalItems
    );
  }

  async sendMessage(
    authUser: AuthenticatedUser,
    payload: SendMessageRequestDto
  ): Promise<MessageResponseDto> {
    if (payload.receiverUserId === authUser.userId) {
      throw buildSelfMessageError();
    }

    assertFound(
      await this.communicationRepository.findUserById(payload.receiverUserId),
      "Receiver user"
    );

    const messageId = await this.communicationRepository.createMessage({
      senderUserId: authUser.userId,
      receiverUserId: payload.receiverUserId,
      messageBody: payload.messageBody
    });
    const message = assertFound(
      await this.communicationRepository.findMessageById(messageId),
      "Message"
    );

    return toMessageResponseDto(message);
  }

  async sendBulkMessages(
    authUser: AuthenticatedUser,
    payload: SendBulkMessageRequestDto
  ): Promise<CommunicationBulkDeliveryResponseDto> {
    assertAdmin(authUser);

    const audience = await this.resolveAudience(authUser, {
      explicitUserIds: payload.receiverUserIds,
      targetRoles: payload.targetRoles,
      explicitField: "receiverUserIds",
      rejectSelfTargeting: true
    });

    const successCount = await this.withTransaction((queryable) =>
      this.communicationRepository.createMessagesBulk(
        {
          senderUserId: authUser.userId,
          receiverUserIds: audience.recipientIds,
          messageBody: payload.messageBody
        },
        queryable
      )
    );

    return {
      resolvedRecipients: audience.recipientIds.length,
      duplicatesRemoved: audience.duplicatesRemoved,
      successCount,
      failedCount: 0,
      failedTargets: []
    };
  }

  async listInbox(
    authUser: AuthenticatedUser,
    query: InboxQueryDto = defaultInboxQuery()
  ): Promise<InboxResponseDto> {
    const [messageResult, summary] = await Promise.all([
      this.communicationRepository.listInboxMessages(authUser.userId, query),
      this.communicationRepository.findInboxSummaryByUserId(authUser.userId)
    ]);
    const { rows, totalItems } = normalizePaginatedRows(messageResult);

    return toPaginatedInboxResponseDto(
      summary?.unreadMessages,
      toPaginatedData(
        rows.map((row) => toMessageResponseDto(row)),
        query.page,
        query.limit,
        totalItems
      )
    );
  }

  async listSent(
    authUser: AuthenticatedUser,
    query?: SentQueryDto
  ): Promise<PaginatedData<MessageResponseDto> | MessageResponseDto[]> {
    const normalizedQuery = query ?? defaultSentQuery();
    const { rows, totalItems } = normalizePaginatedRows(
      await this.communicationRepository.listSentMessages(authUser.userId, normalizedQuery)
    );
    const items = rows.map((row) => toMessageResponseDto(row));

    if (!query) {
      return items;
    }

    return toPaginatedData(items, normalizedQuery.page, normalizedQuery.limit, totalItems);
  }

  async getConversation(
    authUser: AuthenticatedUser,
    otherUserId: string,
    query: ConversationQueryDto = defaultConversationQuery()
  ): Promise<PaginatedData<MessageResponseDto>> {
    if (otherUserId === authUser.userId) {
      throw buildSelfConversationError();
    }

    assertFound(await this.communicationRepository.findUserById(otherUserId), "Conversation user");

    const { rows, totalItems } = normalizePaginatedRows(
      await this.communicationRepository.listConversationMessages(
        authUser.userId,
        otherUserId,
        query
      )
    );

    return toPaginatedData(
      rows.map((row) => toMessageResponseDto(row)),
      query.page,
      query.limit,
      totalItems
    );
  }

  async markMessageAsRead(
    authUser: AuthenticatedUser,
    messageId: string
  ): Promise<MessageResponseDto> {
    const message = assertFound(
      await this.communicationRepository.findMessageById(messageId),
      "Message"
    );

    if (message.receiverUserId !== authUser.userId) {
      throw new NotFoundError("Message not found");
    }

    if (!message.readAt) {
      await this.communicationRepository.markMessageAsRead(messageId, authUser.userId);
    }

    const updatedMessage = assertFound(
      await this.communicationRepository.findMessageById(messageId),
      "Message"
    );

    return toMessageResponseDto(updatedMessage);
  }

  async createAnnouncement(
    authUser: AuthenticatedUser,
    payload: CreateAnnouncementRequestDto
  ): Promise<AnnouncementResponseDto> {
    assertAdmin(authUser);

    const normalizedTargetRoles = dedupeRoles(
      payload.targetRoles ?? (payload.targetRole ? [payload.targetRole] : [])
    );
    const legacyTargetRole = normalizedTargetRoles.length === 1 ? normalizedTargetRoles[0] : null;

    const announcement = await this.withTransaction(async (queryable) => {
      const announcementId = await this.communicationRepository.createAnnouncement(
        {
          createdBy: authUser.userId,
          title: payload.title,
          content: payload.content,
          targetRole: legacyTargetRole,
          expiresAt: payload.expiresAt ?? null
        },
        queryable
      );

      await this.communicationRepository.createAnnouncementTargetRoles(
        announcementId,
        normalizedTargetRoles,
        queryable
      );

      return assertFound(
        await this.communicationRepository.findAnnouncementById(announcementId, queryable),
        "Announcement"
      );
    });

    return toAnnouncementResponseDto(announcement);
  }

  async listAllAnnouncements(authUser: AuthenticatedUser): Promise<AnnouncementResponseDto[]> {
    assertAdmin(authUser);

    const rows = await this.communicationRepository.listAllAnnouncements();

    return rows.map((row) => toAnnouncementResponseDto(row));
  }

  async listActiveAnnouncementsFeed(
    authUser: AuthenticatedUser
  ): Promise<AnnouncementResponseDto[]> {
    const rows = await this.communicationRepository.listActiveAnnouncementsForRole(authUser.role);

    return rows.map((row) => toAnnouncementResponseDto(row));
  }

  async createNotification(
    authUser: AuthenticatedUser,
    payload: CreateNotificationRequestDto
  ): Promise<NotificationResponseDto> {
    assertAdmin(authUser);

    assertFound(await this.communicationRepository.findUserById(payload.userId), "Target user");

    const notificationId = await this.communicationRepository.createNotification({
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      notificationType: payload.notificationType,
      referenceType: payload.referenceType ?? null,
      referenceId: payload.referenceId ?? null
    });
    const notification = assertFound(
      await this.communicationRepository.findNotificationById(notificationId),
      "Notification"
    );

    return toNotificationResponseDto(notification);
  }

  async createBulkNotifications(
    authUser: AuthenticatedUser,
    payload: CreateBulkNotificationRequestDto
  ): Promise<CommunicationBulkDeliveryResponseDto> {
    assertAdmin(authUser);

    const audience = await this.resolveAudience(authUser, {
      explicitUserIds: payload.userIds,
      targetRoles: payload.targetRoles,
      explicitField: "userIds"
    });

    const successCount = await this.withTransaction((queryable) =>
      this.communicationRepository.createNotificationsBulk(
        {
          userIds: audience.recipientIds,
          title: payload.title,
          message: payload.message,
          notificationType: payload.notificationType,
          referenceType: payload.referenceType ?? null,
          referenceId: payload.referenceId ?? null
        },
        queryable
      )
    );

    return {
      resolvedRecipients: audience.recipientIds.length,
      duplicatesRemoved: audience.duplicatesRemoved,
      successCount,
      failedCount: 0,
      failedTargets: []
    };
  }

  async listMyNotifications(
    authUser: AuthenticatedUser,
    query: NotificationsQueryDto = defaultNotificationsQuery()
  ): Promise<NotificationsListResponseDto> {
    const [notificationResult, summary] = await Promise.all([
      this.communicationRepository.listNotificationsByUserId(authUser.userId, query),
      this.communicationRepository.findNotificationSummaryByUserId(authUser.userId)
    ]);
    const { rows, totalItems } = normalizePaginatedRows(notificationResult);

    return toPaginatedNotificationsResponseDto(
      summary?.unreadNotifications,
      toPaginatedData(
        rows.map((row) => toNotificationResponseDto(row)),
        query.page,
        query.limit,
        totalItems
      )
    );
  }

  async markNotificationAsRead(
    authUser: AuthenticatedUser,
    notificationId: string
  ): Promise<NotificationResponseDto> {
    const notification = assertFound(
      await this.communicationRepository.findNotificationById(notificationId),
      "Notification"
    );

    if (notification.userId !== authUser.userId) {
      throw new NotFoundError("Notification not found");
    }

    if (!notification.isRead) {
      await this.communicationRepository.markNotificationAsRead(notificationId, authUser.userId);
    }

    const updatedNotification = assertFound(
      await this.communicationRepository.findNotificationById(notificationId),
      "Notification"
    );

    return toNotificationResponseDto(updatedNotification);
  }
}

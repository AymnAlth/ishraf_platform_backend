import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/common/interfaces/queryable.interface";
import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import { NotFoundError } from "../../src/common/errors/not-found-error";
import { ValidationError } from "../../src/common/errors/validation-error";
import type { AuthenticatedUser } from "../../src/common/types/auth.types";
import type { CommunicationRepository } from "../../src/modules/communication/repository/communication.repository";
import type { CommunicationRecipientScopeService } from "../../src/modules/communication/service/communication-recipient-scope.service";
import { CommunicationService } from "../../src/modules/communication/service/communication.service";
import type {
  AnnouncementRow,
  CommunicationUserRow,
  MessageRow,
  NotificationRow
} from "../../src/modules/communication/types/communication.types";

const adminAuthUser: AuthenticatedUser = {
  userId: "1001",
  role: "admin",
  email: "admin@example.com",
  isActive: true
};

const teacherAuthUser: AuthenticatedUser = {
  userId: "1002",
  role: "teacher",
  email: "teacher@example.com",
  isActive: true
};

const parentAuthUser: AuthenticatedUser = {
  userId: "1006",
  role: "parent",
  email: "parent@example.com",
  isActive: true
};

const userRow = (
  overrides: Partial<CommunicationUserRow> = {}
): CommunicationUserRow => ({
  id: "1002",
  fullName: "Teacher User",
  email: "teacher@example.com",
  phone: "700000002",
  role: "teacher",
  isActive: true,
  ...overrides
});

const toPaginatedRecipients = (rows: CommunicationUserRow[]) => ({
  items: rows.map((row) => ({
    userId: row.id,
    fullName: row.fullName,
    role: row.role,
    phone: row.phone,
    email: row.email
  })),
  pagination: {
    page: 1,
    limit: 20,
    totalItems: rows.length,
    totalPages: rows.length > 0 ? 1 : 0,
    hasNextPage: false,
    hasPreviousPage: false
  }
});

const messageRow = (overrides: Partial<MessageRow> = {}): MessageRow => ({
  id: "1",
  senderUserId: "1001",
  senderName: "Admin User",
  receiverUserId: "1002",
  receiverName: "Teacher User",
  messageBody: "Hello",
  sentAt: new Date("2026-03-14T10:00:00.000Z"),
  readAt: null,
  ...overrides
});

const announcementRow = (
  overrides: Partial<AnnouncementRow> = {}
): AnnouncementRow => ({
  id: "5",
  title: "General notice",
  content: "School starts at 8 AM",
  targetRole: null,
  targetRoles: [],
  publishedAt: new Date("2026-03-14T08:00:00.000Z"),
  expiresAt: null,
  createdBy: "1001",
  createdByName: "Admin User",
  ...overrides
});

const notificationRow = (
  overrides: Partial<NotificationRow> = {}
): NotificationRow => ({
  id: "10",
  userId: "1002",
  userName: "Teacher User",
  title: "New announcement",
  message: "A new announcement was published",
  notificationType: "announcement",
  referenceType: "announcement",
  referenceId: "5",
  isRead: false,
  createdAt: new Date("2026-03-14T10:30:00.000Z"),
  readAt: null,
  ...overrides
});

describe("CommunicationService", () => {
  const repositoryMock = {
    listAvailableRecipients: vi.fn(),
    listParentScopedRecipients: vi.fn(),
    listParentScopedRecipientIdsByUserIds: vi.fn(),
    listAvailableRecipientIdsByUserIds: vi.fn(),
    listAvailableRecipientIdsByRoles: vi.fn(),
    findUserById: vi.fn(),
    createMessage: vi.fn(),
    createMessagesBulk: vi.fn(),
    findMessageById: vi.fn(),
    listInboxMessages: vi.fn(),
    listSentMessages: vi.fn(),
    listConversationMessages: vi.fn(),
    findInboxSummaryByUserId: vi.fn(),
    markMessageAsRead: vi.fn(),
    createAnnouncement: vi.fn(),
    createAnnouncementTargetRoles: vi.fn(),
    findAnnouncementById: vi.fn(),
    listAllAnnouncements: vi.fn(),
    listActiveAnnouncementsForRole: vi.fn(),
    createNotification: vi.fn(),
    createNotificationsBulk: vi.fn(),
    findNotificationById: vi.fn(),
    listNotificationsByUserId: vi.fn(),
    findNotificationSummaryByUserId: vi.fn(),
    markNotificationAsRead: vi.fn()
  };
  const recipientScopeServiceMock = {
    listRecipientsForScope: vi.fn(),
    assertRecipientAllowedForScope: vi.fn()
  };

  let communicationService: CommunicationService;
  let withTransaction: ReturnType<typeof vi.fn>;
  let transactionQueryable: Queryable;

  beforeEach(() => {
    transactionQueryable = {
      query: vi.fn()
    };
    withTransaction = vi.fn(async (callback) => callback(transactionQueryable));
    communicationService = new CommunicationService(
      repositoryMock as unknown as CommunicationRepository,
      withTransaction,
      recipientScopeServiceMock as unknown as CommunicationRecipientScopeService
    );

    Object.values(repositoryMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(recipientScopeServiceMock).forEach((mockFn) => mockFn.mockReset());
  });

  it("sends direct messages to another user", async () => {
    vi.mocked(repositoryMock.findUserById).mockResolvedValue(userRow());
    vi.mocked(repositoryMock.createMessage).mockResolvedValue("1");
    vi.mocked(repositoryMock.findMessageById).mockResolvedValue(messageRow());

    const response = await communicationService.sendMessage(adminAuthUser, {
      receiverUserId: "1002",
      messageBody: "Hello"
    });

    expect(response.id).toBe("1");
    expect(repositoryMock.createMessage).toHaveBeenCalledOnce();
  });

  it("returns the available recipients list using the current messaging policy contract", async () => {
    vi.mocked(repositoryMock.listAvailableRecipients).mockResolvedValue({
      rows: [
        userRow({
          id: "1003",
          fullName: "Supervisor User",
          role: "supervisor",
          email: "supervisor@example.com"
        }),
        userRow({
          id: "1004",
          fullName: "Admin User",
          role: "admin",
          email: "admin@example.com"
        })
      ],
      totalItems: 2
    });

    const response = await communicationService.listAvailableRecipients(teacherAuthUser, {
      page: 1,
      limit: 20
    });

    expect(repositoryMock.listAvailableRecipients).toHaveBeenCalledWith("1002", {
      page: 1,
      limit: 20
    });
    expect(response.items).toHaveLength(2);
    expect(response.pagination).toMatchObject({
      page: 1,
      limit: 20,
      totalItems: 2,
      totalPages: 1
    });
  });

  it("returns parent contact recipients through the scoped audience policy", async () => {
    vi.mocked(recipientScopeServiceMock.listRecipientsForScope).mockResolvedValue(
      toPaginatedRecipients([
        userRow({
          id: "1004",
          fullName: "Driver User",
          role: "driver",
          email: "driver@example.com"
        })
      ])
    );

    const response = await communicationService.listParentContactRecipients(parentAuthUser, {
      page: 1,
      limit: 20,
      search: "Driver"
    });

    expect(recipientScopeServiceMock.listRecipientsForScope).toHaveBeenCalledWith(
      "parent_contacts",
      parentAuthUser,
      {
        page: 1,
        limit: 20,
        search: "Driver"
      }
    );
    expect(response.items).toHaveLength(1);
    expect(response.items[0].role).toBe("driver");
  });

  it("rejects self-messaging and self-conversations", async () => {
    await expect(
      communicationService.sendMessage(adminAuthUser, {
        receiverUserId: "1001",
        messageBody: "Hello"
      })
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      communicationService.getConversation(adminAuthUser, "1001")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("blocks parents from messaging or opening conversations with disallowed recipients", async () => {
    vi.mocked(repositoryMock.findUserById).mockResolvedValue(
      userRow({
        id: "2001",
        fullName: "Other Teacher",
        role: "teacher"
      })
    );
    vi.mocked(recipientScopeServiceMock.assertRecipientAllowedForScope).mockRejectedValue(
      new ForbiddenError("You do not have permission to contact this user")
    );

    await expect(
      communicationService.sendMessage(parentAuthUser, {
        receiverUserId: "2001",
        messageBody: "Hello"
      })
    ).rejects.toBeInstanceOf(ForbiddenError);

    await expect(
      communicationService.getConversation(parentAuthUser, "2001", {
        page: 1,
        limit: 20,
        sortBy: "sentAt",
        sortOrder: "asc"
      })
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(recipientScopeServiceMock.assertRecipientAllowedForScope).toHaveBeenCalledTimes(2);
    expect(repositoryMock.createMessage).not.toHaveBeenCalled();
    expect(repositoryMock.listConversationMessages).not.toHaveBeenCalled();
  });

  it("creates bulk messages with deduped recipients and returns a delivery summary", async () => {
    vi.mocked(repositoryMock.listAvailableRecipientIdsByUserIds).mockResolvedValue([
      "2001",
      "2002"
    ]);
    vi.mocked(repositoryMock.listAvailableRecipientIdsByRoles).mockResolvedValue([
      "2002",
      "2003"
    ]);
    vi.mocked(repositoryMock.createMessagesBulk).mockResolvedValue(3);

    const response = await communicationService.sendBulkMessages(adminAuthUser, {
      receiverUserIds: ["2001", "2002"],
      targetRoles: ["teacher"],
      messageBody: "Important update"
    });

    expect(response).toMatchObject({
      resolvedRecipients: 3,
      duplicatesRemoved: 1,
      successCount: 3,
      failedCount: 0
    });
    expect(repositoryMock.createMessagesBulk).toHaveBeenCalledWith(
      {
        senderUserId: "1001",
        receiverUserIds: ["2001", "2002", "2003"],
        messageBody: "Important update"
      },
      transactionQueryable
    );
    expect(withTransaction).toHaveBeenCalledOnce();
  });

  it("rejects bulk messages that explicitly target the current user", async () => {
    await expect(
      communicationService.sendBulkMessages(adminAuthUser, {
        receiverUserIds: ["1001", "2002"],
        messageBody: "Important update"
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(repositoryMock.createMessagesBulk).not.toHaveBeenCalled();
  });

  it("rejects explicit bulk recipients that are outside the available audience", async () => {
    vi.mocked(repositoryMock.listAvailableRecipientIdsByUserIds).mockResolvedValue(["2002"]);

    await expect(
      communicationService.sendBulkMessages(adminAuthUser, {
        receiverUserIds: ["2002", "9999"],
        messageBody: "Important update"
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(repositoryMock.createMessagesBulk).not.toHaveBeenCalled();
  });

  it("returns inbox summaries and sent messages scoped to the current user", async () => {
    vi.mocked(repositoryMock.listInboxMessages).mockResolvedValue([messageRow()]);
    vi.mocked(repositoryMock.findInboxSummaryByUserId).mockResolvedValue({
      totalReceivedMessages: "5",
      unreadMessages: "2"
    });
    vi.mocked(repositoryMock.listSentMessages).mockResolvedValue([
      messageRow({
        senderUserId: "1002",
        senderName: "Teacher User",
        receiverUserId: "1001",
        receiverName: "Admin User"
      })
    ]);

    const inbox = await communicationService.listInbox(teacherAuthUser);
    const sent = await communicationService.listSent(teacherAuthUser);

    expect(inbox.unreadCount).toBe(2);
    expect(inbox.messages).toHaveLength(1);
    expect(sent[0].sender.userId).toBe("1002");
  });

  it("marks incoming messages as read and hides foreign messages", async () => {
    vi.mocked(repositoryMock.findMessageById)
      .mockResolvedValueOnce(messageRow())
      .mockResolvedValueOnce(
        messageRow({
          readAt: new Date("2026-03-14T11:00:00.000Z")
        })
      )
      .mockResolvedValueOnce(
        messageRow({
          receiverUserId: "1003",
          receiverName: "Driver User"
        })
      );
    vi.mocked(repositoryMock.markMessageAsRead).mockResolvedValue(undefined);

    const response = await communicationService.markMessageAsRead(teacherAuthUser, "1");

    expect(response.readAt).not.toBeNull();

    await expect(
      communicationService.markMessageAsRead(teacherAuthUser, "2")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("allows only admins to create announcements and notifications", async () => {
    vi.mocked(repositoryMock.createAnnouncement).mockResolvedValue("5");
    vi.mocked(repositoryMock.createAnnouncementTargetRoles).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.findAnnouncementById).mockResolvedValue(
      announcementRow({
        targetRole: "teacher",
        targetRoles: ["teacher"]
      })
    );
    vi.mocked(repositoryMock.findUserById).mockResolvedValue(userRow());
    vi.mocked(repositoryMock.createNotification).mockResolvedValue("10");
    vi.mocked(repositoryMock.findNotificationById).mockResolvedValue(notificationRow());

    const announcement = await communicationService.createAnnouncement(adminAuthUser, {
      title: "General notice",
      content: "School starts at 8 AM",
      targetRole: "teacher"
    });
    const notification = await communicationService.createNotification(adminAuthUser, {
      userId: "1002",
      title: "Reminder",
      message: "Please check the latest announcement",
      notificationType: "announcement"
    });

    expect(announcement.targetRole).toBe("teacher");
    expect(notification.id).toBe("10");

    await expect(
      communicationService.createAnnouncement(teacherAuthUser, {
        title: "General notice",
        content: "School starts at 8 AM"
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("stores multi-role announcements without legacy single-role fallback", async () => {
    vi.mocked(repositoryMock.createAnnouncement).mockResolvedValue("5");
    vi.mocked(repositoryMock.createAnnouncementTargetRoles).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.findAnnouncementById).mockResolvedValue(
      announcementRow({
        targetRole: null,
        targetRoles: ["teacher", "driver"]
      })
    );

    const response = await communicationService.createAnnouncement(adminAuthUser, {
      title: "Operations notice",
      content: "Transport and academics sync",
      targetRoles: ["teacher", "driver", "teacher"]
    });

    expect(repositoryMock.createAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: "1001",
        targetRole: null
      }),
      transactionQueryable
    );
    expect(repositoryMock.createAnnouncementTargetRoles).toHaveBeenCalledWith(
      "5",
      ["teacher", "driver"],
      transactionQueryable
    );
    expect(response.targetRole).toBeNull();
    expect(response.targetRoles).toEqual(["teacher", "driver"]);
  });

  it("creates bulk notifications with a resolved audience summary", async () => {
    vi.mocked(repositoryMock.listAvailableRecipientIdsByUserIds).mockResolvedValue(["2001"]);
    vi.mocked(repositoryMock.listAvailableRecipientIdsByRoles).mockResolvedValue([
      "2001",
      "2004"
    ]);
    vi.mocked(repositoryMock.createNotificationsBulk).mockResolvedValue(2);

    const response = await communicationService.createBulkNotifications(adminAuthUser, {
      userIds: ["2001"],
      targetRoles: ["teacher"],
      title: "Reminder",
      message: "Please review the new announcement",
      notificationType: "announcement"
    });

    expect(response).toMatchObject({
      resolvedRecipients: 2,
      duplicatesRemoved: 1,
      successCount: 2,
      failedCount: 0
    });
    expect(repositoryMock.createNotificationsBulk).toHaveBeenCalledWith(
      {
        userIds: ["2001", "2004"],
        title: "Reminder",
        message: "Please review the new announcement",
        notificationType: "announcement",
        referenceType: null,
        referenceId: null
      },
      transactionQueryable
    );
  });

  it("returns announcement feeds and personal notifications", async () => {
    vi.mocked(repositoryMock.listActiveAnnouncementsForRole).mockResolvedValue([
      announcementRow({
        targetRole: "teacher",
        targetRoles: ["teacher"]
      })
    ]);
    vi.mocked(repositoryMock.listNotificationsByUserId).mockResolvedValue([notificationRow()]);
    vi.mocked(repositoryMock.findNotificationSummaryByUserId).mockResolvedValue({
      totalNotifications: "1",
      unreadNotifications: "1"
    });

    const announcements = await communicationService.listActiveAnnouncementsFeed(teacherAuthUser);
    const notifications = await communicationService.listMyNotifications(teacherAuthUser);

    expect(announcements[0].targetRole).toBe("teacher");
    expect(announcements[0].targetRoles).toEqual(["teacher"]);
    expect(notifications.unreadCount).toBe(1);
  });

  it("marks only owned notifications as read", async () => {
    vi.mocked(repositoryMock.findNotificationById)
      .mockResolvedValueOnce(notificationRow())
      .mockResolvedValueOnce(
        notificationRow({
          isRead: true,
          readAt: new Date("2026-03-14T11:15:00.000Z")
        })
      )
      .mockResolvedValueOnce(
        notificationRow({
          userId: "1003",
          userName: "Driver User"
        })
      );
    vi.mocked(repositoryMock.markNotificationAsRead).mockResolvedValue(undefined);

    const response = await communicationService.markNotificationAsRead(teacherAuthUser, "10");

    expect(response.isRead).toBe(true);

    await expect(
      communicationService.markNotificationAsRead(teacherAuthUser, "11")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

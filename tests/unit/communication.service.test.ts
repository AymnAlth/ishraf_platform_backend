import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import { NotFoundError } from "../../src/common/errors/not-found-error";
import { ValidationError } from "../../src/common/errors/validation-error";
import { CommunicationService } from "../../src/modules/communication/service/communication.service";
import type { CommunicationRepository } from "../../src/modules/communication/repository/communication.repository";
import type {
  AnnouncementRow,
  CommunicationUserRow,
  MessageRow,
  NotificationRow
} from "../../src/modules/communication/types/communication.types";

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
    findUserById: vi.fn(),
    createMessage: vi.fn(),
    findMessageById: vi.fn(),
    listInboxMessages: vi.fn(),
    listSentMessages: vi.fn(),
    listConversationMessages: vi.fn(),
    findInboxSummaryByUserId: vi.fn(),
    markMessageAsRead: vi.fn(),
    createAnnouncement: vi.fn(),
    findAnnouncementById: vi.fn(),
    listAllAnnouncements: vi.fn(),
    listActiveAnnouncementsForRole: vi.fn(),
    createNotification: vi.fn(),
    findNotificationById: vi.fn(),
    listNotificationsByUserId: vi.fn(),
    findNotificationSummaryByUserId: vi.fn(),
    markNotificationAsRead: vi.fn()
  };

  let communicationService: CommunicationService;

  beforeEach(() => {
    communicationService = new CommunicationService(
      repositoryMock as unknown as CommunicationRepository
    );

    Object.values(repositoryMock).forEach((mockFn) => mockFn.mockReset());
  });

  it("sends direct messages to another user", async () => {
    vi.mocked(repositoryMock.findUserById).mockResolvedValue(userRow());
    vi.mocked(repositoryMock.createMessage).mockResolvedValue("1");
    vi.mocked(repositoryMock.findMessageById).mockResolvedValue(messageRow());

    const response = await communicationService.sendMessage(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        receiverUserId: "1002",
        messageBody: "Hello"
      }
    );

    expect(response.id).toBe("1");
    expect(repositoryMock.createMessage).toHaveBeenCalledOnce();
  });

  it("returns the available recipients list using the current Wave 1 messaging policy contract", async () => {
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

    const response = await communicationService.listAvailableRecipients(
      {
        userId: "1002",
        role: "teacher",
        email: "teacher@example.com",
        isActive: true
      },
      {
        page: 1,
        limit: 20
      }
    );

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
    expect(response.items[0]).toMatchObject({
      userId: "1003",
      fullName: "Supervisor User",
      role: "supervisor"
    });
  });

  it("rejects self-messaging and self-conversations", async () => {
    await expect(
      communicationService.sendMessage(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          receiverUserId: "1001",
          messageBody: "Hello"
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      communicationService.getConversation(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        "1001"
      )
    ).rejects.toBeInstanceOf(ValidationError);
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

    const inbox = await communicationService.listInbox({
      userId: "1002",
      role: "teacher",
      email: "teacher@example.com",
      isActive: true
    });
    const sent = await communicationService.listSent({
      userId: "1002",
      role: "teacher",
      email: "teacher@example.com",
      isActive: true
    });

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

    const response = await communicationService.markMessageAsRead(
      {
        userId: "1002",
        role: "teacher",
        email: "teacher@example.com",
        isActive: true
      },
      "1"
    );

    expect(response.readAt).not.toBeNull();

    await expect(
      communicationService.markMessageAsRead(
        {
          userId: "1002",
          role: "teacher",
          email: "teacher@example.com",
          isActive: true
        },
        "2"
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("allows only admins to create announcements and notifications", async () => {
    vi.mocked(repositoryMock.createAnnouncement).mockResolvedValue("5");
    vi.mocked(repositoryMock.findAnnouncementById).mockResolvedValue(announcementRow());
    vi.mocked(repositoryMock.findUserById).mockResolvedValue(userRow());
    vi.mocked(repositoryMock.createNotification).mockResolvedValue("10");
    vi.mocked(repositoryMock.findNotificationById).mockResolvedValue(notificationRow());

    const announcement = await communicationService.createAnnouncement(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        title: "General notice",
        content: "School starts at 8 AM"
      }
    );
    const notification = await communicationService.createNotification(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        userId: "1002",
        title: "Reminder",
        message: "Please check the latest announcement",
        notificationType: "announcement"
      }
    );

    expect(announcement.id).toBe("5");
    expect(notification.id).toBe("10");

    await expect(
      communicationService.createAnnouncement(
        {
          userId: "1002",
          role: "teacher",
          email: "teacher@example.com",
          isActive: true
        },
        {
          title: "General notice",
          content: "School starts at 8 AM"
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns announcement feeds and personal notifications", async () => {
    vi.mocked(repositoryMock.listActiveAnnouncementsForRole).mockResolvedValue([
      announcementRow({
        targetRole: "teacher"
      })
    ]);
    vi.mocked(repositoryMock.listNotificationsByUserId).mockResolvedValue([notificationRow()]);
    vi.mocked(repositoryMock.findNotificationSummaryByUserId).mockResolvedValue({
      totalNotifications: "1",
      unreadNotifications: "1"
    });

    const announcements = await communicationService.listActiveAnnouncementsFeed({
      userId: "1002",
      role: "teacher",
      email: "teacher@example.com",
      isActive: true
    });
    const notifications = await communicationService.listMyNotifications({
      userId: "1002",
      role: "teacher",
      email: "teacher@example.com",
      isActive: true
    });

    expect(announcements[0].targetRole).toBe("teacher");
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

    const response = await communicationService.markNotificationAsRead(
      {
        userId: "1002",
        role: "teacher",
        email: "teacher@example.com",
        isActive: true
      },
      "10"
    );

    expect(response.isRead).toBe(true);

    await expect(
      communicationService.markNotificationAsRead(
        {
          userId: "1002",
          role: "teacher",
          email: "teacher@example.com",
          isActive: true
        },
        "11"
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

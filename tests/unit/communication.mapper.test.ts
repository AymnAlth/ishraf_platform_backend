import { describe, expect, it } from "vitest";

import {
  toAnnouncementResponseDto,
  toInboxResponseDto,
  toMessageResponseDto,
  toNotificationResponseDto,
  toNotificationsListResponseDto
} from "../../src/modules/communication/mapper/communication.mapper";
import type {
  AnnouncementRow,
  MessageRow,
  NotificationRow
} from "../../src/modules/communication/types/communication.types";

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

describe("communication.mapper", () => {
  it("maps message responses and inbox summaries", () => {
    const message = toMessageResponseDto(messageRow());
    const inbox = toInboxResponseDto("3", [messageRow()]);

    expect(message.sender.userId).toBe("1001");
    expect(message.readAt).toBeNull();
    expect(inbox.unreadCount).toBe(3);
    expect(inbox.messages[0].receiver.fullName).toBe("Teacher User");
  });

  it("maps announcements", () => {
    const response = toAnnouncementResponseDto(
      announcementRow({
        targetRole: "teacher"
      })
    );

    expect(response.targetRole).toBe("teacher");
    expect(response.createdBy.fullName).toBe("Admin User");
  });

  it("maps notifications and notification lists", () => {
    const notification = toNotificationResponseDto(notificationRow());
    const response = toNotificationsListResponseDto(2, [notificationRow()]);

    expect(notification.referenceId).toBe("5");
    expect(response.unreadCount).toBe(2);
    expect(response.notifications[0].notificationType).toBe("announcement");
  });
});

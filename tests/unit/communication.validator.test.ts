import { describe, expect, it } from "vitest";

import {
  createAnnouncementSchema,
  createBulkNotificationSchema,
  createNotificationSchema,
  sendBulkMessageSchema,
  sendMessageSchema
} from "../../src/modules/communication/validator/communication.validator";

describe("communication.validator", () => {
  it("accepts valid message and notification payloads and normalizes identifiers", () => {
    const messageResult = sendMessageSchema.safeParse({
      receiverUserId: 2,
      messageBody: "Hello there"
    });
    const notificationResult = createNotificationSchema.safeParse({
      userId: "5",
      title: "Trip started",
      message: "The morning trip has started",
      notificationType: "transport",
      referenceId: 10
    });

    expect(messageResult.success).toBe(true);
    expect(notificationResult.success).toBe(true);

    if (messageResult.success) {
      expect(messageResult.data.receiverUserId).toBe("2");
    }

    if (notificationResult.success) {
      expect(notificationResult.data.userId).toBe("5");
      expect(notificationResult.data.referenceId).toBe("10");
    }
  });

  it("accepts valid bulk message and notification payloads", () => {
    const bulkMessageResult = sendBulkMessageSchema.safeParse({
      receiverUserIds: [2, "3"],
      targetRoles: ["teacher"],
      messageBody: "Hello everyone"
    });
    const bulkNotificationResult = createBulkNotificationSchema.safeParse({
      userIds: ["5"],
      targetRoles: ["driver"],
      title: "Trip update",
      message: "The trip has started",
      notificationType: "transport"
    });

    expect(bulkMessageResult.success).toBe(true);
    expect(bulkNotificationResult.success).toBe(true);
  });

  it("rejects invalid announcement expiry values", () => {
    const result = createAnnouncementSchema.safeParse({
      title: "Exam reminder",
      content: "Bring your calculator",
      expiresAt: "not-a-date"
    });

    expect(result.success).toBe(false);
  });

  it("rejects bulk payloads without any audience selector", () => {
    const bulkMessageResult = sendBulkMessageSchema.safeParse({
      messageBody: "Hello everyone"
    });
    const bulkNotificationResult = createBulkNotificationSchema.safeParse({
      title: "Trip update",
      message: "The trip has started",
      notificationType: "transport"
    });

    expect(bulkMessageResult.success).toBe(false);
    expect(bulkNotificationResult.success).toBe(false);
  });

  it("rejects announcements that send targetRole and targetRoles together", () => {
    const result = createAnnouncementSchema.safeParse({
      title: "Exam reminder",
      content: "Bring your calculator",
      targetRole: "teacher",
      targetRoles: ["driver"]
    });

    expect(result.success).toBe(false);
  });

  it("rejects blank message content", () => {
    const result = sendMessageSchema.safeParse({
      receiverUserId: "2",
      messageBody: "   "
    });

    expect(result.success).toBe(false);
  });
});

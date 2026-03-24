import { describe, expect, it } from "vitest";

import {
  createAnnouncementSchema,
  createNotificationSchema,
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

  it("rejects invalid announcement expiry values", () => {
    const result = createAnnouncementSchema.safeParse({
      title: "Exam reminder",
      content: "Bring your calculator",
      expiresAt: "not-a-date"
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

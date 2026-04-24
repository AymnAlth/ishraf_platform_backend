import { describe, expect, it, vi } from "vitest";

import { FirebasePushService } from "../../src/integrations/firebase/firebase-push.service";

describe("FirebasePushService", () => {
  it("stringifies structured FCM data values before dispatch", async () => {
    const sendEachForMulticast = vi.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }]
    });

    const service = new FirebasePushService({
      getMessaging: () => ({ sendEachForMulticast })
    } as never);

    await service.sendMessage({
      tokens: ["token-1"],
      title: "وصول الحافلة",
      body: "الحافلة بالخارج",
      data: {
        eventType: "bus_arrived",
        tripId: "1202",
        routeId: "31",
        studentIds: ["501", "502"],
        extra: { stopId: "10" },
        delivered: true,
        sequence: 3,
        ignoredNull: null,
        ignoredUndefined: undefined
      }
    });

    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ["token-1"],
      notification: {
        title: "وصول الحافلة",
        body: "الحافلة بالخارج"
      },
      data: {
        eventType: "bus_arrived",
        tripId: "1202",
        routeId: "31",
        studentIds: '["501","502"]',
        extra: '{"stopId":"10"}',
        delivered: "true",
        sequence: "3"
      }
    });
  });
});
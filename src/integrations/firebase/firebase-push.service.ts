import type { BatchResponse } from "firebase-admin/messaging";

import type {
  FirebasePushMessageInput,
  FirebasePushMessageResult
} from "./types/firebase.types";
import { FirebaseAppService } from "./firebase-app.service";

const FIREBASE_MULTICAST_LIMIT = 500;

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument"
]);

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const stringifyDataValue = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
};

const normalizeDataPayload = (
  data: FirebasePushMessageInput["data"]
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(data)
      .map(([key, value]) => [key, stringifyDataValue(value)])
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );

export class FirebasePushService {
  constructor(private readonly firebaseAppService: FirebaseAppService = new FirebaseAppService()) {}

  isConfigured(): boolean {
    return this.firebaseAppService.isConfigured();
  }

  async sendMessage(input: FirebasePushMessageInput): Promise<FirebasePushMessageResult> {
    if (input.tokens.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        invalidDeviceTokens: [],
        transientFailureCount: 0
      };
    }

    const messaging = this.firebaseAppService.getMessaging();
    const tokenChunks = chunkArray([...new Set(input.tokens)], FIREBASE_MULTICAST_LIMIT);
    const data = normalizeDataPayload(input.data);
    const aggregated: FirebasePushMessageResult = {
      successCount: 0,
      failureCount: 0,
      invalidDeviceTokens: [],
      transientFailureCount: 0
    };

    for (const tokens of tokenChunks) {
      const batchResult = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: input.title,
          body: input.body
        },
        data
      });

      this.mergeBatchResult(aggregated, tokens, batchResult);
    }

    aggregated.invalidDeviceTokens = [...new Set(aggregated.invalidDeviceTokens)];

    return aggregated;
  }

  private mergeBatchResult(
    target: FirebasePushMessageResult,
    tokens: string[],
    batchResult: BatchResponse
  ): void {
    target.successCount += batchResult.successCount;
    target.failureCount += batchResult.failureCount;

    batchResult.responses.forEach((response, index) => {
      if (response.success) {
        return;
      }

      const errorCode = response.error?.code ?? "messaging/unknown-error";

      if (INVALID_TOKEN_CODES.has(errorCode)) {
        target.invalidDeviceTokens.push(tokens[index]);
        return;
      }

      target.transientFailureCount += 1;
    });
  }
}

export const firebasePushService = new FirebasePushService();


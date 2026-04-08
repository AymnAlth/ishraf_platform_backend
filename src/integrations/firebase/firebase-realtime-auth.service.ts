import type {
  FirebaseTransportRealtimeTokenInput,
  FirebaseTransportRealtimeTokenResult
} from "./types/firebase.types";
import { FirebaseAppService } from "./firebase-app.service";

const DRIVER_REFRESH_AFTER_SECONDS = 240;
const DRIVER_WRITE_WINDOW_SECONDS = 300;
const READ_REFRESH_AFTER_SECONDS = 840;
const READ_WINDOW_SECONDS = 900;

const toUnixSeconds = (value: Date): number => Math.floor(value.getTime() / 1000);

const addSeconds = (value: Date, seconds: number): Date =>
  new Date(value.getTime() + seconds * 1000);

export class FirebaseRealtimeAuthService {
  constructor(private readonly firebaseAppService: FirebaseAppService = new FirebaseAppService()) {}

  isConfigured(): boolean {
    return this.firebaseAppService.isConfigured();
  }

  async createTransportRealtimeToken(
    input: FirebaseTransportRealtimeTokenInput
  ): Promise<FirebaseTransportRealtimeTokenResult> {
    const databaseUrl = this.firebaseAppService.getDatabaseUrl();

    if (!databaseUrl) {
      throw new Error("Firebase Realtime Database URL is not configured");
    }

    const now = input.now ?? new Date();
    const isWriteAccess = input.access === "write";
    const readUntil = addSeconds(now, READ_WINDOW_SECONDS);
    const writeUntil = isWriteAccess ? addSeconds(now, DRIVER_WRITE_WINDOW_SECONDS) : null;
    const refreshAfterSeconds = isWriteAccess
      ? DRIVER_REFRESH_AFTER_SECONDS
      : READ_REFRESH_AFTER_SECONDS;
    const path = `/transport/live-trips/${input.tripId}/latestLocation`;
    const customToken = await this.firebaseAppService.getAuth().createCustomToken(
      input.backendUserId,
      {
        backendUserId: input.backendUserId,
        role: input.role,
        transportRealtimeTripId: input.tripId,
        transportRealtimeAccess: input.access,
        transportRealtimeReadUntil: toUnixSeconds(readUntil),
        ...(writeUntil
          ? {
              transportRealtimeWriteUntil: toUnixSeconds(writeUntil)
            }
          : {})
      }
    );

    return {
      customToken,
      databaseUrl,
      path,
      tripId: input.tripId,
      access: input.access,
      refreshAfterSeconds
    };
  }
}

export const firebaseRealtimeAuthService = new FirebaseRealtimeAuthService();

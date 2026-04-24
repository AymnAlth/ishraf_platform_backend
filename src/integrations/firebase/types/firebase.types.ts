export interface FirebasePushMessageInput {
  tokens: string[];
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface FirebasePushMessageResult {
  successCount: number;
  failureCount: number;
  invalidDeviceTokens: string[];
  transientFailureCount: number;
}

export type FirebaseTransportRealtimeRole = "admin" | "parent" | "driver";
export type FirebaseTransportRealtimeAccess = "read" | "write";

export interface FirebaseTransportRealtimeTokenInput {
  backendUserId: string;
  role: FirebaseTransportRealtimeRole;
  tripId: string;
  access: FirebaseTransportRealtimeAccess;
  now?: Date;
}

export interface FirebaseTransportRealtimeTokenResult {
  customToken: string;
  databaseUrl: string;
  path: string;
  tripId: string;
  access: FirebaseTransportRealtimeAccess;
  refreshAfterSeconds: number;
}


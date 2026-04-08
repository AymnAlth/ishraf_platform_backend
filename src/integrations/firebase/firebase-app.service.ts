import {
  cert,
  getApps,
  initializeApp,
  type App,
  type AppOptions
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

import { env } from "../../config/env";

const FIREBASE_APP_NAME = "ishraf-platform-backend";

const normalizePrivateKey = (value: string): string => value.replace(/\\n/g, "\n");

const hasFirebaseCredentials = (): boolean =>
  Boolean(
    env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY &&
      env.FIREBASE_DATABASE_URL
  );

export class FirebaseAppService {
  private app: App | null = null;

  isConfigured(): boolean {
    return hasFirebaseCredentials();
  }

  getDatabaseUrl(): string | null {
    return env.FIREBASE_DATABASE_URL ?? null;
  }

  getAuth(): Auth {
    return getAuth(this.getApp());
  }

  getMessaging(): Messaging {
    return getMessaging(this.getApp());
  }

  private getApp(): App {
    if (this.app) {
      return this.app;
    }

    if (!this.isConfigured()) {
      throw new Error("Firebase integration is not configured");
    }

    const existing = getApps().find((app) => app.name === FIREBASE_APP_NAME);

    if (existing) {
      this.app = existing;
      return existing;
    }

    const options: AppOptions = {
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID as string,
        clientEmail: env.FIREBASE_CLIENT_EMAIL as string,
        privateKey: normalizePrivateKey(env.FIREBASE_PRIVATE_KEY as string)
      }),
      databaseURL: env.FIREBASE_DATABASE_URL as string
    };

    this.app = initializeApp(options, FIREBASE_APP_NAME);

    return this.app;
  }
}

export const firebaseAppService = new FirebaseAppService();

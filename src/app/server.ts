import type { Server } from "node:http";

import { logger } from "../config/logger";
import { db } from "../database/db";
import { createApp } from "./app";
import { env } from "../config/env";

let server: Server | null = null;
let isShuttingDown = false;

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Shutting down server");

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error, signal }, "Graceful shutdown failed");
    process.exit(1);
  }
};

export const startServer = async (): Promise<Server> => {
  await db.ping();

  const app = createApp();

  server = await new Promise<Server>((resolve, reject) => {
    const nextServer = app.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, environment: env.NODE_ENV },
        "HTTP server started"
      );
      resolve(nextServer);
    });

    nextServer.on("error", reject);
  });

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  return server;
};

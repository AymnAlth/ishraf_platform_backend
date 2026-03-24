import { Router } from "express";

import { buildErrorResponse, buildSuccessResponse } from "../common/base/http-response";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { db } from "../database/db";
import { getRegisteredModules } from "./module-registry";

export const createRoutes = (): Router => {
  const rootRouter = Router();
  const apiRouter = Router();

  rootRouter.get("/health", (_req, res) => {
    res.status(200).json(
      buildSuccessResponse("Service is healthy", {
        name: env.APP_NAME,
        environment: env.NODE_ENV
      })
    );
  });

  rootRouter.get("/health/ready", async (_req, res) => {
    try {
      await db.ping();

      res.status(200).json(
        buildSuccessResponse("Service is ready", {
          name: env.APP_NAME,
          environment: env.NODE_ENV
        })
      );
    } catch (error) {
      logger.warn({ err: error }, "Readiness check failed");

      res.status(503).json(
        buildErrorResponse("Service is not ready", [
          {
            code: "SERVICE_UNAVAILABLE",
            message: "Database connection is not ready"
          }
        ])
      );
    }
  });

  for (const moduleDefinition of getRegisteredModules()) {
    apiRouter.use(moduleDefinition.basePath, moduleDefinition.router);
  }

  rootRouter.use(env.API_PREFIX, apiRouter);

  return rootRouter;
};

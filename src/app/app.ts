import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";

import { buildErrorResponse } from "../common/base/http-response";
import { errorHandler } from "../common/middlewares/error-handler";
import { requestLoggerMiddleware } from "../common/middlewares/request-logger.middleware";
import { env } from "../config/env";
import { buildCorsOptions } from "../config/http";
import { createRoutes } from "./routes";

export const createApp = (): Express => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors(buildCorsOptions(env)));
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.REQUEST_BODY_LIMIT }));
  app.use(requestLoggerMiddleware);
  app.use(createRoutes());

  app.use((_req, res) => {
    res.status(404).json(
      buildErrorResponse("Route not found", [
        {
          code: "NOT_FOUND",
          message: "The requested route does not exist"
        }
      ])
    );
  });

  app.use(errorHandler);

  return app;
};

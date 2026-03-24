import type { NextFunction, Request, Response } from "express";

import { logger } from "../../config/logger";
import { buildSafeRequestLog } from "../utils/request-log.util";

export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationInMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const { requestBody, requestHeaders } = buildSafeRequestLog({
      body: req.body,
      authorization: req.header("authorization")
    });

    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationInMs: Number(durationInMs.toFixed(2)),
        requestBody,
        requestHeaders
      },
      "HTTP request completed"
    );
  });

  next();
};

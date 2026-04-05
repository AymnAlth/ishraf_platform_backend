import type { NextFunction, Request, Response } from "express";

import { logger } from "../../config/logger";
import { requestPerformanceAuditService } from "../services/request-performance-audit.service";
import { buildSafeRequestLog } from "../utils/request-log.util";

const buildRoutePattern = (req: Request): string => {
  if (req.baseUrl && req.route?.path) {
    return `${req.baseUrl}${req.route.path}`;
  }

  if (req.route?.path) {
    return String(req.route.path);
  }

  return req.originalUrl;
};

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
    const roundedDurationInMs = Number(durationInMs.toFixed(2));

    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationInMs: roundedDurationInMs,
        requestBody,
        requestHeaders
      },
      "HTTP request completed"
    );

    requestPerformanceAuditService.record({
      method: req.method,
      routePattern: buildRoutePattern(req),
      originalPath: req.originalUrl,
      statusCode: res.statusCode,
      durationInMs: roundedDurationInMs
    });
  });

  next();
};

import type { RequestHandler } from "express";

import { requestExecutionContextService } from "../services/request-execution-context.service";

export const requestExecutionContextMiddleware: RequestHandler = (req, _res, next) => {
  requestExecutionContextService.run(req, () => {
    next();
  });
};

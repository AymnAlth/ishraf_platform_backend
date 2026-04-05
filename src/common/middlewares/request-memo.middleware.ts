import type { RequestHandler } from "express";

import { requestMemoService } from "../services/request-memo.service";

export const requestMemoMiddleware: RequestHandler = (_req, _res, next) => {
  requestMemoService.run(() => {
    next();
  });
};

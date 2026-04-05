import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import type { Request } from "express";

export interface RequestExecutionContext {
  requestId: string;
  method: string;
  originalPath: string;
  req: Request;
}

export class RequestExecutionContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<RequestExecutionContext>();

  run<T>(req: Request, callback: () => T): T {
    return this.asyncLocalStorage.run(
      {
        requestId: randomUUID(),
        method: req.method,
        originalPath: req.originalUrl,
        req
      },
      callback
    );
  }

  getCurrentContext(): RequestExecutionContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  getCurrentRoutePattern(): string | null {
    const context = this.getCurrentContext();

    if (!context) {
      return null;
    }

    const { req } = context;

    if (req.baseUrl && req.route?.path) {
      return `${req.baseUrl}${req.route.path}`;
    }

    if (req.route?.path) {
      return String(req.route.path);
    }

    return req.originalUrl;
  }
}

export const requestExecutionContextService = new RequestExecutionContextService();

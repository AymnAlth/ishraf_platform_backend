import type { NextFunction, Request, Response } from "express";

import type { Role } from "../../config/constants";
import { ForbiddenError } from "../errors/forbidden-error";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { verifyAccessToken } from "../utils/token.util";

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const token = extractBearerToken(req.header("authorization"));

  if (!token) {
    next(new UnauthorizedError("Access token is required"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    req.authUser = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
      isActive: payload.isActive
    };

    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
};

export const requireActiveUser = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.authUser) {
    next(new UnauthorizedError("Authentication is required"));
    return;
  }

  if (!req.authUser.isActive) {
    next(new ForbiddenError("User account is inactive"));
    return;
  }

  next();
};

export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(new UnauthorizedError("Authentication is required"));
      return;
    }

    if (!roles.includes(req.authUser.role)) {
      next(new ForbiddenError("You do not have permission to access this resource"));
      return;
    }

    next();
  };

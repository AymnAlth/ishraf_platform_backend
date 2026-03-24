import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import type { Role } from "../../config/constants";
import { TOKEN_TYPES } from "../../config/constants";
import { jwtConfig } from "../../config/jwt";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: Role;
  email: string | null;
  isActive: boolean;
  type: typeof TOKEN_TYPES.ACCESS;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: typeof TOKEN_TYPES.REFRESH;
}

interface AccessTokenInput {
  userId: string;
  role: Role;
  email: string | null;
  isActive: boolean;
}

interface RefreshTokenInput {
  userId: string;
}

const signJwt = <T extends object>(
  payload: T,
  secret: string,
  expiresIn: SignOptions["expiresIn"]
): string =>
  jwt.sign(payload, secret, {
    expiresIn
  });

export const signAccessToken = (input: AccessTokenInput): string =>
  signJwt(
    {
      sub: input.userId,
      role: input.role,
      email: input.email,
      isActive: input.isActive,
      type: TOKEN_TYPES.ACCESS
    },
    jwtConfig.accessSecret,
    `${jwtConfig.accessTtlMinutes}m`
  );

export const signRefreshToken = (input: RefreshTokenInput): string =>
  jwt.sign(
    {
      sub: input.userId,
      type: TOKEN_TYPES.REFRESH
    },
    jwtConfig.refreshSecret,
    {
      expiresIn: `${jwtConfig.refreshTtlDays}d`,
      jwtid: randomUUID()
    }
  );

const assertPayload = <T extends JwtPayload>(
  decoded: string | JwtPayload,
  expectedType: string
): T => {
  if (
    typeof decoded === "string" ||
    decoded.type !== expectedType ||
    !decoded.sub
  ) {
    throw new Error("Invalid token payload");
  }

  return decoded as T;
};

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  assertPayload<AccessTokenPayload>(
    jwt.verify(token, jwtConfig.accessSecret) as JwtPayload,
    TOKEN_TYPES.ACCESS
  );

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  assertPayload<RefreshTokenPayload>(
    jwt.verify(token, jwtConfig.refreshSecret) as JwtPayload,
    TOKEN_TYPES.REFRESH
  );

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const compareTokenHash = (token: string, existingHash: string): boolean => {
  const candidateHash = hashToken(token);
  const left = Buffer.from(candidateHash, "utf8");
  const right = Buffer.from(existingHash, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
};

export const getAccessTokenExpiresInSeconds = (): number =>
  jwtConfig.accessTtlMinutes * 60;

export const getRefreshTokenExpiryDate = (): Date =>
  new Date(Date.now() + jwtConfig.refreshTtlDays * 24 * 60 * 60 * 1000);

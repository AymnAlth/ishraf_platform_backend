import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { databaseTables } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  AuthRefreshTokenRow,
  AuthRequestContext,
  AuthUserRow,
  PasswordResetTokenRow
} from "../types/auth.types";

interface RefreshTokenCreateInput extends AuthRequestContext {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

interface PasswordResetTokenCreateInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

export class AuthRepository {
  async findUserByIdentifier(
    identifier: string,
    queryable: Queryable = db
  ): Promise<AuthUserRow | null> {
    const result = await queryable.query<AuthUserRow>(
      `
        SELECT
          id,
          full_name AS "fullName",
          email,
          phone,
          password_hash AS "passwordHash",
          role,
          is_active AS "isActive",
          last_login_at AS "lastLoginAt"
        FROM ${databaseTables.users}
        WHERE LOWER(email) = LOWER($1) OR phone = $1
        LIMIT 1
      `,
      [identifier]
    );

    return mapSingleRow(result.rows);
  }

  async findUserById(
    userId: string,
    queryable: Queryable = db
  ): Promise<AuthUserRow | null> {
    const result = await queryable.query<AuthUserRow>(
      `
        SELECT
          id,
          full_name AS "fullName",
          email,
          phone,
          password_hash AS "passwordHash",
          role,
          is_active AS "isActive",
          last_login_at AS "lastLoginAt"
        FROM ${databaseTables.users}
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async updateLastLoginAt(
    userId: string,
    queryable: Queryable = db
  ): Promise<Date> {
    const result = await queryable.query<{ lastLoginAt: Date }>(
      `
        UPDATE ${databaseTables.users}
        SET last_login_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING last_login_at AS "lastLoginAt"
      `,
      [userId]
    );

    return result.rows[0].lastLoginAt;
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.users}
        SET password_hash = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [userId, passwordHash]
    );
  }

  async createRefreshToken(
    input: RefreshTokenCreateInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.authRefreshTokens} (
          user_id,
          token_hash,
          device_info,
          ip_address,
          expires_at,
          revoked_at
        )
        VALUES ($1, $2, $3, $4, $5, NULL)
      `,
      [
        input.userId,
        input.tokenHash,
        input.deviceInfo,
        input.ipAddress,
        input.expiresAt
      ]
    );
  }

  async findValidRefreshToken(
    tokenHash: string,
    queryable: Queryable = db
  ): Promise<AuthRefreshTokenRow | null> {
    const result = await queryable.query<AuthRefreshTokenRow>(
      `
        SELECT
          id,
          user_id AS "userId",
          token_hash AS "tokenHash",
          device_info AS "deviceInfo",
          ip_address AS "ipAddress",
          expires_at AS "expiresAt",
          revoked_at AS "revokedAt",
          created_at AS "createdAt"
        FROM ${databaseTables.authRefreshTokens}
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    return mapSingleRow(result.rows);
  }

  async revokeRefreshToken(
    tokenHash: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.authRefreshTokens}
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE token_hash = $1
      `,
      [tokenHash]
    );
  }

  async revokeAllUserRefreshTokens(
    userId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.authRefreshTokens}
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE user_id = $1
      `,
      [userId]
    );
  }

  async createPasswordResetToken(
    input: PasswordResetTokenCreateInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.passwordResetTokens} (
          user_id,
          token_hash,
          expires_at
        )
        VALUES ($1, $2, $3)
      `,
      [input.userId, input.tokenHash, input.expiresAt]
    );
  }

  async revokeAllUserPasswordResetTokens(
    userId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.passwordResetTokens}
        SET used_at = COALESCE(used_at, NOW())
        WHERE user_id = $1
      `,
      [userId]
    );
  }

  async findValidPasswordResetToken(
    tokenHash: string,
    queryable: Queryable = db
  ): Promise<PasswordResetTokenRow | null> {
    const result = await queryable.query<PasswordResetTokenRow>(
      `
        SELECT
          id,
          user_id AS "userId",
          token_hash AS "tokenHash",
          expires_at AS "expiresAt",
          used_at AS "usedAt",
          created_at AS "createdAt"
        FROM ${databaseTables.passwordResetTokens}
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    return mapSingleRow(result.rows);
  }

  async markPasswordResetTokenUsed(
    tokenId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.passwordResetTokens}
        SET used_at = COALESCE(used_at, NOW())
        WHERE id = $1
      `,
      [tokenId]
    );
  }
}

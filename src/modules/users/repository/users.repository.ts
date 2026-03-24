import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type { PaginatedQueryResult } from "../../../common/types/pagination.types";
import {
  buildLimitOffsetClause,
  buildOrderByClause,
  buildPaginationWindow
} from "../../../common/utils/pagination.util";
import { databaseTables } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  CreateUserRowInput,
  DriverProfileInput,
  ListUsersQuery,
  ParentProfileInput,
  SupervisorProfileInput,
  TeacherProfileInput,
  UpdateUserBaseInput,
  UserListSortField,
  UserWithProfileRow
} from "../types/users.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const userWithProfileSelect = `
  SELECT
    u.id,
    u.full_name AS "fullName",
    u.email,
    u.phone,
    u.role,
    u.is_active AS "isActive",
    u.last_login_at AS "lastLoginAt",
    u.created_at AS "createdAt",
    u.updated_at AS "updatedAt",
    p.address AS "parentAddress",
    p.relation_type AS "parentRelationType",
    t.specialization AS "teacherSpecialization",
    t.qualification AS "teacherQualification",
    t.hire_date AS "teacherHireDate",
    s.department AS "supervisorDepartment",
    d.license_number AS "driverLicenseNumber",
    d.driver_status AS "driverStatus"
  FROM ${databaseTables.users} u
  LEFT JOIN ${databaseTables.parents} p ON p.user_id = u.id
  LEFT JOIN ${databaseTables.teachers} t ON t.user_id = u.id
  LEFT JOIN ${databaseTables.supervisors} s ON s.user_id = u.id
  LEFT JOIN ${databaseTables.drivers} d ON d.user_id = u.id
`;

const buildAssignments = (updates: Record<string, unknown>, startIndex = 2) => {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  return {
    assignments: entries.map(([column], index) => `${column} = $${index + startIndex}`),
    values: entries.map(([, value]) => value)
  };
};

const updateProfileTable = async (
  tableName: string,
  userId: string,
  updates: Record<string, unknown>,
  queryable: Queryable
): Promise<boolean> => {
  const { assignments, values } = buildAssignments(updates);

  if (assignments.length === 0) {
    return true;
  }

  const result = await queryable.query(
    `
      UPDATE ${tableName}
      SET ${assignments.join(", ")}
      WHERE user_id = $1
    `,
    [userId, ...values]
  );

  return (result.rowCount ?? 0) > 0;
};

export class UsersRepository {
  private readonly listSortColumns: Record<UserListSortField, string> = {
    createdAt: "u.created_at",
    fullName: "u.full_name",
    email: "u.email",
    role: "u.role"
  };

  async createUser(
    input: CreateUserRowInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.users} (
          full_name,
          email,
          phone,
          password_hash,
          role,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id
      `,
      [input.fullName, input.email, input.phone, input.passwordHash, input.role]
    );

    return result.rows[0].id;
  }

  async createParentProfile(
    userId: string,
    input: ParentProfileInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.parents} (
          user_id,
          address,
          relation_type
        )
        VALUES ($1, $2, $3)
      `,
      [userId, input.address, input.relationType]
    );
  }

  async createTeacherProfile(
    userId: string,
    input: TeacherProfileInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.teachers} (
          user_id,
          specialization,
          qualification,
          hire_date
        )
        VALUES ($1, $2, $3, $4)
      `,
      [userId, input.specialization, input.qualification, input.hireDate]
    );
  }

  async createSupervisorProfile(
    userId: string,
    input: SupervisorProfileInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.supervisors} (
          user_id,
          department
        )
        VALUES ($1, $2)
      `,
      [userId, input.department]
    );
  }

  async createDriverProfile(
    userId: string,
    input: DriverProfileInput,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.drivers} (
          user_id,
          license_number,
          driver_status
        )
        VALUES ($1, $2, $3)
      `,
      [userId, input.licenseNumber, input.driverStatus]
    );
  }

  async findUserById(
    userId: string,
    queryable: Queryable = db
  ): Promise<UserWithProfileRow | null> {
    const result = await queryable.query<UserWithProfileRow>(
      `
        ${userWithProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async listUsers(
    filters: ListUsersQuery,
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<UserWithProfileRow>> {
    const values: unknown[] = [];
    const where: string[] = [];

    if (filters.role) {
      values.push(filters.role);
      where.push(`u.role = $${values.length}`);
    }

    if (filters.isActive !== undefined) {
      values.push(filters.isActive);
      where.push(`u.is_active = $${values.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await queryable.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM ${databaseTables.users} u
        ${whereClause}
      `,
      values
    );
    const { limit, offset } = buildPaginationWindow(filters.page, filters.limit);
    const selectValues: unknown[] = [...values, limit, offset];
    const result = await queryable.query<UserWithProfileRow>(
      `
        ${userWithProfileSelect}
        ${whereClause}
        ORDER BY ${buildOrderByClause(
          this.listSortColumns,
          filters.sortBy,
          filters.sortOrder,
          ["u.id"]
        )}
        ${buildLimitOffsetClause(values.length + 1)}
      `,
      selectValues
    );

    return {
      rows: result.rows,
      totalItems: Number(countResult.rows[0]?.count ?? 0)
    };
  }

  async updateUserBase(
    userId: string,
    input: UpdateUserBaseInput,
    queryable: Queryable = db
  ): Promise<void> {
    const { assignments, values } = buildAssignments({
      full_name: input.fullName,
      email: input.email,
      phone: input.phone
    });

    if (assignments.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.users}
        SET ${assignments.join(", ")},
            updated_at = NOW()
        WHERE id = $1
      `,
      [userId, ...values]
    );
  }

  async updateParentProfile(
    userId: string,
    input: Partial<ParentProfileInput>,
    queryable: Queryable = db
  ): Promise<boolean> {
    return updateProfileTable(
      databaseTables.parents,
      userId,
      {
        address: input.address,
        relation_type: input.relationType
      },
      queryable
    );
  }

  async updateTeacherProfile(
    userId: string,
    input: Partial<TeacherProfileInput>,
    queryable: Queryable = db
  ): Promise<boolean> {
    return updateProfileTable(
      databaseTables.teachers,
      userId,
      {
        specialization: input.specialization,
        qualification: input.qualification,
        hire_date: input.hireDate
      },
      queryable
    );
  }

  async updateSupervisorProfile(
    userId: string,
    input: Partial<SupervisorProfileInput>,
    queryable: Queryable = db
  ): Promise<boolean> {
    return updateProfileTable(
      databaseTables.supervisors,
      userId,
      {
        department: input.department
      },
      queryable
    );
  }

  async updateDriverProfile(
    userId: string,
    input: Partial<DriverProfileInput>,
    queryable: Queryable = db
  ): Promise<boolean> {
    return updateProfileTable(
      databaseTables.drivers,
      userId,
      {
        license_number: input.licenseNumber,
        driver_status: input.driverStatus
      },
      queryable
    );
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.users}
        SET is_active = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [userId, isActive]
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
}

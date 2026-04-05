import type { QueryResultRow } from "pg";

import { NotFoundError } from "../errors/not-found-error";
import { ValidationError } from "../errors/validation-error";
import type { Queryable } from "../interfaces/queryable.interface";
import type {
  DriverProfile,
  ParentProfile,
  SupervisorProfile,
  TeacherProfile
} from "../types/profile.types";
import { databaseTables } from "../../config/database";
import { db } from "../../database/db";
import { requestMemoService } from "./request-memo.service";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

type FlexibleProfileResolverOptions<T> = {
  field: string;
  label: string;
  ambiguousCode: string;
  getProfileId: (profile: T) => string;
};

const parentProfileSelect = `
  SELECT
    p.id AS "parentId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    p.address,
    p.relation_type AS "relationType"
  FROM ${databaseTables.parents} p
  JOIN ${databaseTables.users} u ON u.id = p.user_id
`;

const teacherProfileSelect = `
  SELECT
    t.id AS "teacherId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    t.specialization,
    t.qualification,
    t.hire_date AS "hireDate"
  FROM ${databaseTables.teachers} t
  JOIN ${databaseTables.users} u ON u.id = t.user_id
`;

const supervisorProfileSelect = `
  SELECT
    s.id AS "supervisorId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    s.department
  FROM ${databaseTables.supervisors} s
  JOIN ${databaseTables.users} u ON u.id = s.user_id
`;

const driverProfileSelect = `
  SELECT
    d.id AS "driverId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    d.license_number AS "licenseNumber",
    d.driver_status AS "driverStatus"
  FROM ${databaseTables.drivers} d
  JOIN ${databaseTables.users} u ON u.id = d.user_id
`;

const assertProfile = <T>(profile: T | null, label: string): T => {
  if (!profile) {
    throw new NotFoundError(`${label} not found`);
  }

  return profile;
};

const resolveFlexibleProfileIdentifier = <T>(
  byProfileId: T | null,
  byUserId: T | null,
  options: FlexibleProfileResolverOptions<T>
): T | null => {
  if (!byProfileId && !byUserId) {
    return null;
  }

  if (!byProfileId) {
    return byUserId;
  }

  if (!byUserId) {
    return byProfileId;
  }

  if (options.getProfileId(byProfileId) === options.getProfileId(byUserId)) {
    return byProfileId;
  }

  throw new ValidationError(`${options.field} is ambiguous`, [
    {
      field: options.field,
      code: options.ambiguousCode,
      message: `${options.field} matches both a ${options.label.toLowerCase()} user id and a different ${options.label.toLowerCase()} profile id`
    }
  ]);
};

export class ProfileResolutionService {
  private async memoizedLookup<T>(
    kind: string,
    identifier: string,
    queryable: Queryable,
    factory: () => Promise<T | null>
  ): Promise<T | null> {
    const memoKey = `profile-resolution:${kind}:${identifier}:${requestMemoService.getQueryableMemoKey(queryable)}`;

    return requestMemoService.memoize(memoKey, factory);
  }

  async findParentProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<ParentProfile | null> {
    return this.memoizedLookup("parent:user-id", userId, queryable, async () => {
      const result = await queryable.query<ParentProfile>(
        `
          ${parentProfileSelect}
          WHERE u.id = $1
          LIMIT 1
        `,
        [userId]
      );

      return mapSingleRow(result.rows);
    });
  }

  async findTeacherProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<TeacherProfile | null> {
    return this.memoizedLookup("teacher:user-id", userId, queryable, async () => {
      const result = await queryable.query<TeacherProfile>(
        `
          ${teacherProfileSelect}
          WHERE u.id = $1
          LIMIT 1
        `,
        [userId]
      );

      return mapSingleRow(result.rows);
    });
  }

  async findTeacherProfileById(
    teacherId: string,
    queryable: Queryable = db
  ): Promise<TeacherProfile | null> {
    return this.memoizedLookup("teacher:profile-id", teacherId, queryable, async () => {
      const result = await queryable.query<TeacherProfile>(
        `
          ${teacherProfileSelect}
          WHERE t.id = $1
          LIMIT 1
        `,
        [teacherId]
      );

      return mapSingleRow(result.rows);
    });
  }

  async findSupervisorProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<SupervisorProfile | null> {
    return this.memoizedLookup("supervisor:user-id", userId, queryable, async () => {
      const result = await queryable.query<SupervisorProfile>(
        `
          ${supervisorProfileSelect}
          WHERE u.id = $1
          LIMIT 1
        `,
        [userId]
      );

      return mapSingleRow(result.rows);
    });
  }

  async findSupervisorProfileById(
    supervisorId: string,
    queryable: Queryable = db
  ): Promise<SupervisorProfile | null> {
    return this.memoizedLookup(
      "supervisor:profile-id",
      supervisorId,
      queryable,
      async () => {
        const result = await queryable.query<SupervisorProfile>(
          `
            ${supervisorProfileSelect}
            WHERE s.id = $1
            LIMIT 1
          `,
          [supervisorId]
        );

        return mapSingleRow(result.rows);
      }
    );
  }

  async findDriverProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<DriverProfile | null> {
    return this.memoizedLookup("driver:user-id", userId, queryable, async () => {
      const result = await queryable.query<DriverProfile>(
        `
          ${driverProfileSelect}
          WHERE u.id = $1
          LIMIT 1
        `,
        [userId]
      );

      return mapSingleRow(result.rows);
    });
  }

  async requireParentProfile(
    userId: string,
    queryable: Queryable = db
  ): Promise<ParentProfile> {
    return assertProfile(await this.findParentProfileByUserId(userId, queryable), "Parent profile");
  }

  async requireTeacherProfile(
    userId: string,
    queryable: Queryable = db
  ): Promise<TeacherProfile> {
    return assertProfile(
      await this.findTeacherProfileByUserId(userId, queryable),
      "Teacher profile"
    );
  }

  async requireSupervisorProfile(
    userId: string,
    queryable: Queryable = db
  ): Promise<SupervisorProfile> {
    return assertProfile(
      await this.findSupervisorProfileByUserId(userId, queryable),
      "Supervisor profile"
    );
  }

  async requireDriverProfile(
    userId: string,
    queryable: Queryable = db
  ): Promise<DriverProfile> {
    return assertProfile(await this.findDriverProfileByUserId(userId, queryable), "Driver profile");
  }

  async resolveTeacherProfileIdentifier(
    identifier: string,
    queryable: Queryable = db,
    field = "teacherId"
  ): Promise<TeacherProfile | null> {
    const [teacherByProfileId, teacherByUserId] = await Promise.all([
      this.findTeacherProfileById(identifier, queryable),
      this.findTeacherProfileByUserId(identifier, queryable)
    ]);

    return resolveFlexibleProfileIdentifier(teacherByProfileId, teacherByUserId, {
      field,
      label: "Teacher",
      ambiguousCode: "TEACHER_ID_AMBIGUOUS",
      getProfileId: (profile) => profile.teacherId
    });
  }

  async requireTeacherProfileIdentifier(
    identifier: string,
    queryable: Queryable = db,
    field = "teacherId"
  ): Promise<TeacherProfile> {
    return assertProfile(
      await this.resolveTeacherProfileIdentifier(identifier, queryable, field),
      "Teacher"
    );
  }

  async resolveSupervisorProfileIdentifier(
    identifier: string,
    queryable: Queryable = db,
    field = "supervisorId"
  ): Promise<SupervisorProfile | null> {
    const [supervisorByProfileId, supervisorByUserId] = await Promise.all([
      this.findSupervisorProfileById(identifier, queryable),
      this.findSupervisorProfileByUserId(identifier, queryable)
    ]);

    return resolveFlexibleProfileIdentifier(
      supervisorByProfileId,
      supervisorByUserId,
      {
        field,
        label: "Supervisor",
        ambiguousCode: "SUPERVISOR_ID_AMBIGUOUS",
        getProfileId: (profile) => profile.supervisorId
      }
    );
  }

  async requireSupervisorProfileIdentifier(
    identifier: string,
    queryable: Queryable = db,
    field = "supervisorId"
  ): Promise<SupervisorProfile> {
    return assertProfile(
      await this.resolveSupervisorProfileIdentifier(identifier, queryable, field),
      "Supervisor"
    );
  }
}

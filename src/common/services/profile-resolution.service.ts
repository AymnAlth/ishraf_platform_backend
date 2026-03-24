import type { QueryResultRow } from "pg";

import { NotFoundError } from "../errors/not-found-error";
import type { Queryable } from "../interfaces/queryable.interface";
import type {
  DriverProfile,
  ParentProfile,
  SupervisorProfile,
  TeacherProfile
} from "../types/profile.types";
import { databaseTables } from "../../config/database";
import { db } from "../../database/db";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

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

export class ProfileResolutionService {
  async findParentProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<ParentProfile | null> {
    const result = await queryable.query<ParentProfile>(
      `
        ${parentProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async findTeacherProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<TeacherProfile | null> {
    const result = await queryable.query<TeacherProfile>(
      `
        ${teacherProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async findSupervisorProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<SupervisorProfile | null> {
    const result = await queryable.query<SupervisorProfile>(
      `
        ${supervisorProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async findDriverProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<DriverProfile | null> {
    const result = await queryable.query<DriverProfile>(
      `
        ${driverProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
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
}

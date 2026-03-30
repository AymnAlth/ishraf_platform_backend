import "dotenv/config";

import { Pool, type PoolClient } from "pg";
import { z } from "zod";

import { hashPassword } from "../common/utils/password.util";

const scriptEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_MIGRATIONS: z.string().min(1).optional(),
  DATABASE_SCHEMA: z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
    .default("public")
});

const PRIMARY_ADMIN_EMAIL = "mod87521@gmail.com";
const SHARED_PASSWORD = "SeedDev123!";
const DRIVER_PASSWORD = "SeedDriver123!";

const tablesToTruncate = [
  "notifications",
  "announcement_target_roles",
  "announcements",
  "messages",
  "trip_student_events",
  "bus_location_history",
  "trips",
  "transport_route_assignments",
  "student_transport_home_locations",
  "student_bus_assignments",
  "bus_stops",
  "routes",
  "buses",
  "behavior_records",
  "behavior_categories",
  "homework_submissions",
  "homework",
  "student_assessments",
  "assessments",
  "assessment_types",
  "attendance",
  "attendance_sessions",
  "student_promotions",
  "student_parents",
  "students",
  "auth_refresh_tokens",
  "password_reset_tokens",
  "teacher_classes",
  "supervisor_classes",
  "subject_offerings",
  "subjects",
  "classes",
  "semesters",
  "grade_levels",
  "academic_years",
  "drivers",
  "supervisors",
  "teachers",
  "parents"
] as const;

type Role = "teacher" | "parent" | "driver" | "supervisor";

interface ExistingAdminRow {
  id: string;
  email: string | null;
  passwordHash: string;
  role: string;
}

interface CreatedUserRow {
  id: string;
}

interface RoleAccountSeed {
  role: Role;
  fullName: string;
  email: string;
  password: string;
  profile: {
    address?: string | null;
    relationType?: string | null;
    specialization?: string | null;
    qualification?: string | null;
    hireDate?: string | null;
    department?: string | null;
    licenseNumber?: string | null;
    driverStatus?: "active" | "inactive" | "suspended";
  };
}

const seedAccounts: RoleAccountSeed[] = [
  {
    role: "teacher",
    fullName: "مروان أمين شعبان",
    email: "marwan-amin-shaban@ishraf.local",
    password: SHARED_PASSWORD,
    profile: {
      specialization: null,
      qualification: null,
      hireDate: null
    }
  },
  {
    role: "parent",
    fullName: "خالد العرامي",
    email: "khaled-alarami@ishraf.local",
    password: SHARED_PASSWORD,
    profile: {
      address: null,
      relationType: null
    }
  },
  {
    role: "driver",
    fullName: "هلال عبد الله الملصي",
    email: "hilal-abdullah-almolsi@ishraf.local",
    password: DRIVER_PASSWORD,
    profile: {
      licenseNumber: "DRV-HILAL-001",
      driverStatus: "active"
    }
  },
  {
    role: "supervisor",
    fullName: "إدريس مشوير",
    email: "idris-mashwir@ishraf.local",
    password: SHARED_PASSWORD,
    profile: {
      department: null
    }
  },
  {
    role: "supervisor",
    fullName: "بسام علي علي نحيلة",
    email: "bassam-ali-ali-nuhailah@ishraf.local",
    password: SHARED_PASSWORD,
    profile: {
      department: null
    }
  }
];

const getQualifiedTableList = (schema: string): string =>
  tablesToTruncate.map((tableName) => `${schema}.${tableName}`).join(", ");

const findPrimaryAdmin = async (
  client: PoolClient,
  schema: string
): Promise<ExistingAdminRow | null> => {
  const result = await client.query<ExistingAdminRow>(
    `
      SELECT id::text, email, password_hash AS "passwordHash", role
      FROM ${schema}.users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [PRIMARY_ADMIN_EMAIL]
  );

  return result.rows[0] ?? null;
};

const truncateNonUserTables = async (client: PoolClient, schema: string): Promise<void> => {
  await client.query(`TRUNCATE TABLE ${getQualifiedTableList(schema)} RESTART IDENTITY CASCADE;`);
};

const deleteNonPrimaryUsers = async (
  client: PoolClient,
  schema: string,
  adminUserId: string
): Promise<void> => {
  await client.query(
    `
      DELETE FROM ${schema}.users
      WHERE id <> $1
    `,
    [adminUserId]
  );
};

const insertUser = async (
  client: PoolClient,
  schema: string,
  input: {
    fullName: string;
    email: string;
    passwordHash: string;
    role: Role;
  }
): Promise<string> => {
  const result = await client.query<CreatedUserRow>(
    `
      INSERT INTO ${schema}.users (
        full_name,
        email,
        phone,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, NULL, $3, $4, TRUE)
      RETURNING id::text
    `,
    [input.fullName, input.email, input.passwordHash, input.role]
  );

  return result.rows[0].id;
};

const insertProfile = async (
  client: PoolClient,
  schema: string,
  userId: string,
  seed: RoleAccountSeed
): Promise<void> => {
  if (seed.role === "teacher") {
    await client.query(
      `
        INSERT INTO ${schema}.teachers (
          user_id,
          specialization,
          qualification,
          hire_date
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        userId,
        seed.profile.specialization ?? null,
        seed.profile.qualification ?? null,
        seed.profile.hireDate ?? null
      ]
    );
    return;
  }

  if (seed.role === "parent") {
    await client.query(
      `
        INSERT INTO ${schema}.parents (
          user_id,
          address,
          relation_type
        )
        VALUES ($1, $2, $3)
      `,
      [userId, seed.profile.address ?? null, seed.profile.relationType ?? null]
    );
    return;
  }

  if (seed.role === "supervisor") {
    await client.query(
      `
        INSERT INTO ${schema}.supervisors (
          user_id,
          department
        )
        VALUES ($1, $2)
      `,
      [userId, seed.profile.department ?? null]
    );
    return;
  }

  await client.query(
    `
      INSERT INTO ${schema}.drivers (
        user_id,
        license_number,
        driver_status
      )
      VALUES ($1, $2, $3)
    `,
    [userId, seed.profile.licenseNumber, seed.profile.driverStatus ?? "active"]
  );
};

const resetSequence = async (
  client: PoolClient,
  schema: string,
  tableName: string
): Promise<void> => {
  await client.query(
    `
      SELECT setval(
        pg_get_serial_sequence($1, 'id'),
        COALESCE((SELECT MAX(id) FROM ${schema}.${tableName}), 1),
        COALESCE((SELECT COUNT(*) > 0 FROM ${schema}.${tableName}), false)
      )
    `,
    [`${schema}.${tableName}`]
  );
};

const verifyAdminUnchanged = async (
  client: PoolClient,
  schema: string,
  originalAdmin: ExistingAdminRow
): Promise<void> => {
  const currentAdmin = await findPrimaryAdmin(client, schema);

  if (!currentAdmin) {
    throw new Error("Primary admin account is missing after reset.");
  }

  if (currentAdmin.id !== originalAdmin.id) {
    throw new Error("Primary admin account id changed unexpectedly.");
  }

  if (currentAdmin.passwordHash !== originalAdmin.passwordHash) {
    throw new Error("Primary admin password hash changed unexpectedly.");
  }
};

const printSummary = async (
  client: PoolClient,
  schema: string,
  adminUserId: string
): Promise<void> => {
  const usersResult = await client.query<{
    id: string;
    fullName: string;
    email: string | null;
    role: string;
  }>(
    `
      SELECT
        id::text,
        full_name AS "fullName",
        email,
        role
      FROM ${schema}.users
      ORDER BY
        CASE role
          WHEN 'admin' THEN 1
          WHEN 'teacher' THEN 2
          WHEN 'parent' THEN 3
          WHEN 'driver' THEN 4
          WHEN 'supervisor' THEN 5
          ELSE 99
        END,
        id
    `
  );

  const tableCounts = await client.query<{
    teachers: string;
    parents: string;
    drivers: string;
    supervisors: string;
    academicYears: string;
    students: string;
    messages: string;
    announcements: string;
    notifications: string;
  }>(
    `
      SELECT
        (SELECT COUNT(*)::text FROM ${schema}.teachers) AS teachers,
        (SELECT COUNT(*)::text FROM ${schema}.parents) AS parents,
        (SELECT COUNT(*)::text FROM ${schema}.drivers) AS drivers,
        (SELECT COUNT(*)::text FROM ${schema}.supervisors) AS supervisors,
        (SELECT COUNT(*)::text FROM ${schema}.academic_years) AS "academicYears",
        (SELECT COUNT(*)::text FROM ${schema}.students) AS students,
        (SELECT COUNT(*)::text FROM ${schema}.messages) AS messages,
        (SELECT COUNT(*)::text FROM ${schema}.announcements) AS announcements,
        (SELECT COUNT(*)::text FROM ${schema}.notifications) AS notifications
    `
  );

  console.log("Database reset completed successfully.");
  console.log(`Primary admin preserved with id=${adminUserId} and email=${PRIMARY_ADMIN_EMAIL}`);
  console.log("Created accounts:");

  for (const row of usersResult.rows) {
    console.log(`- [${row.role}] ${row.fullName} <${row.email ?? "no-email"}> (id=${row.id})`);
  }

  const counts = tableCounts.rows[0];
  console.log("Verification counts:");
  console.log(`- users=${usersResult.rowCount ?? 0}`);
  console.log(`- teachers=${counts.teachers}`);
  console.log(`- parents=${counts.parents}`);
  console.log(`- drivers=${counts.drivers}`);
  console.log(`- supervisors=${counts.supervisors}`);
  console.log(`- academic_years=${counts.academicYears}`);
  console.log(`- students=${counts.students}`);
  console.log(`- messages=${counts.messages}`);
  console.log(`- announcements=${counts.announcements}`);
  console.log(`- notifications=${counts.notifications}`);
  console.log("Default passwords:");
  console.log(`- teacher/parent/supervisor shared password: ${SHARED_PASSWORD}`);
  console.log(`- driver password: ${DRIVER_PASSWORD}`);
};

const resetMinimalAccounts = async (): Promise<void> => {
  const env = scriptEnvSchema.parse(process.env);
  const pool = new Pool({
    connectionString: env.DATABASE_URL_MIGRATIONS ?? env.DATABASE_URL
  });

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingAdmin = await findPrimaryAdmin(client, env.DATABASE_SCHEMA);

      if (!existingAdmin) {
        throw new Error(`Primary admin account ${PRIMARY_ADMIN_EMAIL} was not found.`);
      }

      if (existingAdmin.role !== "admin") {
        throw new Error(
          `Primary admin account ${PRIMARY_ADMIN_EMAIL} exists with role=${existingAdmin.role}, not admin.`
        );
      }

      await truncateNonUserTables(client, env.DATABASE_SCHEMA);
      await deleteNonPrimaryUsers(client, env.DATABASE_SCHEMA, existingAdmin.id);

      for (const seed of seedAccounts) {
        const passwordHash = await hashPassword(seed.password);
        const userId = await insertUser(client, env.DATABASE_SCHEMA, {
          fullName: seed.fullName,
          email: seed.email,
          passwordHash,
          role: seed.role
        });

        await insertProfile(client, env.DATABASE_SCHEMA, userId, seed);
      }

      await verifyAdminUnchanged(client, env.DATABASE_SCHEMA, existingAdmin);

      await resetSequence(client, env.DATABASE_SCHEMA, "users");
      await resetSequence(client, env.DATABASE_SCHEMA, "parents");
      await resetSequence(client, env.DATABASE_SCHEMA, "teachers");
      await resetSequence(client, env.DATABASE_SCHEMA, "supervisors");
      await resetSequence(client, env.DATABASE_SCHEMA, "drivers");

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const verificationClient = await pool.connect();

    try {
      const admin = await findPrimaryAdmin(verificationClient, env.DATABASE_SCHEMA);

      if (!admin) {
        throw new Error("Primary admin account is missing during post-commit verification.");
      }

      await printSummary(verificationClient, env.DATABASE_SCHEMA, admin.id);
    } finally {
      verificationClient.release();
    }
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  void resetMinimalAccounts().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

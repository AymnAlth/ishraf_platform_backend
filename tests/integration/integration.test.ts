import { afterAll, beforeAll, beforeEach, describe } from "vitest";

import { queryPerformanceAuditService } from "../../src/common/services/query-performance-audit.service";
import { requestPerformanceAuditService } from "../../src/common/services/request-performance-audit.service";
import { db } from "../../src/database/db";
import { createIntegrationTestContext } from "../helpers/integration-context";
import { registerAccessIntegrationTests } from "./access/access.integration";
import { registerAcademicIntegrationTests } from "./academic/academic.integration";
import { registerAdminImportsIntegrationTests } from "./admin-imports/admin-imports.integration";
import { registerAnalyticsIntegrationTests } from "./analytics/analytics.integration";
import { registerAppSecurityIntegrationTests } from "./app/security.integration";
import { registerAssessmentsIntegrationTests } from "./assessments/assessments.integration";
import { registerAttendanceIntegrationTests } from "./attendance/attendance.integration";
import { registerAuthIntegrationTests } from "./auth/auth.integration";
import { registerAutomationIntegrationTests } from "./automation/automation.integration";
import { registerBehaviorIntegrationTests } from "./behavior/behavior.integration";
import { registerCommunicationIntegrationTests } from "./communication/communication.integration";
import { registerHomeworkIntegrationTests } from "./homework/homework.integration";
import { registerMigrationSmokeTests } from "./migrations/migrations.integration";
import { registerReportingIntegrationTests } from "./reporting/reporting.integration";
import { registerStudentsIntegrationTests } from "./students/students.integration";
import { registerSystemSettingsIntegrationTests } from "./system-settings/system-settings.integration";
import {
  bootstrapTestDatabase,
  createTestPool,
  dropAllTestObjects,
  hasTestDatabase,
  resetTestDatabase,
  runMigration
} from "../setup/test-db";
import { registerTransportIntegrationTests } from "./transport/transport.integration";
import { registerUsersIntegrationTests } from "./users/users.integration";

const describeIfDatabase = hasTestDatabase ? describe.sequential : describe.skip;

describeIfDatabase("Migration smoke", () => {
  const pool = createTestPool();

  beforeAll(async () => {
    await dropAllTestObjects(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  registerMigrationSmokeTests({ pool });
});

describeIfDatabase("API integration", () => {
  const pool = createTestPool();
  const context = createIntegrationTestContext(pool);

  beforeAll(() => {
    bootstrapTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase(pool);
  });

  afterAll(async () => {
    requestPerformanceAuditService.flushNow();
    queryPerformanceAuditService.flushNow();
    runMigration("down");
    await pool.end();
    await db.close();
  });

  registerAuthIntegrationTests(context);
  registerAppSecurityIntegrationTests(context);
  registerUsersIntegrationTests(context);
  registerAcademicIntegrationTests(context);
  registerAdminImportsIntegrationTests(context);
  registerAnalyticsIntegrationTests(context);
  registerStudentsIntegrationTests(context);
  registerAssessmentsIntegrationTests(context);
  registerBehaviorIntegrationTests(context);
  registerAttendanceIntegrationTests(context);
  registerHomeworkIntegrationTests(context);
  registerTransportIntegrationTests(context);
  registerCommunicationIntegrationTests(context);
  registerAutomationIntegrationTests(context);
  registerAccessIntegrationTests(context);
  registerReportingIntegrationTests(context);
  registerSystemSettingsIntegrationTests(context);
});


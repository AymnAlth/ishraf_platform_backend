import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import { ValidationError } from "../../../common/errors/validation-error";
import { hashPassword } from "../../../common/utils/password.util";
import { databaseTables } from "../../../config/database";
import type {
  SchoolOnboardingApplyRequestDto,
  SchoolOnboardingDryRunRequestDto,
  SchoolOnboardingImportIssueDto,
  SchoolOnboardingImportResponseDto,
  SchoolOnboardingImportSummaryDto,
  SchoolOnboardingSheetSummaryDto,
  SchoolOnboardingWorkbookRowDto
} from "../dto/admin-imports.dto";
import {
  SCHOOL_ONBOARDING_IMPORT_STATUS_VALUES,
  SCHOOL_ONBOARDING_SHEET_DEFINITIONS,
  SCHOOL_ONBOARDING_SHEET_IDS,
  SCHOOL_ONBOARDING_TEMPLATE_VERSION,
  type SchoolOnboardingImportStatus,
  type SchoolOnboardingSheetId
} from "../school-onboarding.constants";
import type {
  SchoolOnboardingReferenceSnapshot,
  SchoolOnboardingReferenceUserRow
} from "../types/admin-imports.types";
import type { AcademicStructureRepository } from "../../academic-structure/repository/academic-structure.repository";
import type { StudentsRepository } from "../../students/repository/students.repository";
import type { TransportRepository } from "../../transport/repository/transport.repository";
import type { UsersRepository } from "../../users/repository/users.repository";

const NON_EDITABLE_SHEET_IDS = new Set<SchoolOnboardingSheetId>([
  "README",
  "CONFIG",
  "LOOKUPS_ENUMS",
  "REF_EXISTING_ACADEMIC",
  "REF_EXISTING_USERS"
]);

type EditableSheetId = Exclude<
  SchoolOnboardingSheetId,
  "README" | "CONFIG" | "LOOKUPS_ENUMS" | "REF_EXISTING_ACADEMIC" | "REF_EXISTING_USERS"
>;

type NormalizedCellValue = string | null;
type NormalizedRow = {
  rowNumber: number;
  values: Record<string, NormalizedCellValue>;
};

type NormalizedWorkbook = Record<EditableSheetId, NormalizedRow[]>;

type ImportResponseCore = Omit<SchoolOnboardingImportResponseDto, "importId">;

type EvaluationResult = {
  workbook: NormalizedWorkbook;
  response: ImportResponseCore;
};

type ContactRole = "teacher" | "supervisor" | "parent" | "driver";

type ReferenceCounts = Record<string, number>;
type EntityPlanCounts = Record<string, number>;

type UserStateEntry = {
  userId: string;
  profileId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  licenseNumber: string | null;
};

type ApplyState = {
  academicYearIdsByName: Map<string, string>;
  semesterIdsByKey: Map<string, string>;
  gradeLevelIdsByName: Map<string, string>;
  classIdsByKey: Map<string, string>;
  subjectIdsByCodeKey: Map<string, string>;
  subjectIdsByNameKey: Map<string, string>;
  userEntriesByRoleAndIdentifier: Map<ContactRole, Map<string, UserStateEntry[]>>;
  driverIdsByLicenseNumber: Map<string, string>;
  studentIdsByAcademicNo: Map<string, string>;
  newStudentIds: Set<string>;
  studentLinkKeys: Set<string>;
  studentPrimaryParentIds: Set<string>;
  studentEnrollmentKeys: Set<string>;
  subjectOfferingKeys: Set<string>;
  teacherAssignmentKeys: Set<string>;
  teacherAssignmentCoverageKeys: Set<string>;
  supervisorAssignmentKeys: Set<string>;
  busIdsByPlateNumber: Map<string, string>;
  routeIdsByName: Map<string, string>;
  routeStopIdsByKey: Map<string, string>;
  activeRouteAssignmentsByBusId: Set<string>;
  activeRouteAssignmentsByRouteId: Set<string>;
  routeAssignmentKeys: Set<string>;
  activeStudentTransportAssignmentsByStudentId: Set<string>;
  studentTransportAssignmentKeys: Set<string>;
  studentHomeLocationStudentIds: Set<string>;
};

const editableSheetIds = SCHOOL_ONBOARDING_SHEET_IDS.filter(
  (sheetId) => !NON_EDITABLE_SHEET_IDS.has(sheetId)
) as EditableSheetId[];

const toNormalizedText = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return String(value).trim() || null;
};

const toLookupKey = (value: string | null | undefined): string =>
  (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const buildCompositeKey = (...parts: Array<string | null | undefined>): string =>
  parts.map((part) => toLookupKey(part)).join("||");

const isBlank = (value: string | null | undefined): boolean => toLookupKey(value).length === 0;

const isIsoDate = (value: string | null): boolean =>
  value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const toNumberValue = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBooleanFlag = (value: string | null, defaultValue = true): boolean => {
  if (value === null) {
    return defaultValue;
  }

  return toLookupKey(value) === "true";
};

const toStudentStatus = (value: string): "active" | "transferred" | "graduated" | "dropped" | "suspended" => {
  const normalized = toLookupKey(value);

  if (normalized === "withdrawn") {
    return "dropped";
  }

  if (normalized === "inactive") {
    return "suspended";
  }

  if (
    normalized === "active" ||
    normalized === "transferred" ||
    normalized === "graduated" ||
    normalized === "dropped" ||
    normalized === "suspended"
  ) {
    return normalized;
  }

  throw new Error(`Unsupported student status: ${value}`);
};

const toContactIdentifier = (value: string | null | undefined): string | null => {
  const normalized = toNormalizedText(value);

  if (!normalized) {
    return null;
  }

  return normalized.includes("@") ? normalized.toLowerCase() : normalized;
};

const pushIssue = (
  issues: SchoolOnboardingImportIssueDto[],
  issue: SchoolOnboardingImportIssueDto
): void => {
  issues.push(issue);
};

const buildSummary = (
  presentSheets: number,
  totalRows: number,
  issues: SchoolOnboardingImportIssueDto[]
): SchoolOnboardingImportSummaryDto => ({
  totalSheets: SCHOOL_ONBOARDING_SHEET_IDS.length,
  presentSheets,
  totalRows,
  errorCount: issues.filter((issue) => issue.level === "error").length,
  warningCount: issues.filter((issue) => issue.level === "warning").length
});

const assertValidatedStatus = (status: SchoolOnboardingImportStatus): void => {
  if (!SCHOOL_ONBOARDING_IMPORT_STATUS_VALUES.includes(status)) {
    throw new Error(`Unexpected import status: ${status}`);
  }
};

export class SchoolOnboardingImportEngine {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly academicStructureRepository: AcademicStructureRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly transportRepository: TransportRepository
  ) {}

  evaluate(
    payload: SchoolOnboardingDryRunRequestDto,
    snapshot: SchoolOnboardingReferenceSnapshot
  ): EvaluationResult {
    const issues: SchoolOnboardingImportIssueDto[] = [];
    const workbook = this.normalizeWorkbook(payload, issues);
    const referenceCounts: ReferenceCounts = {};
    const entityPlanCounts: EntityPlanCounts = {};

    if (payload.templateVersion !== SCHOOL_ONBOARDING_TEMPLATE_VERSION) {
      pushIssue(issues, {
        level: "error",
        code: "template_version_mismatch",
        message: `Expected template version ${SCHOOL_ONBOARDING_TEMPLATE_VERSION} but received ${payload.templateVersion}`,
        suggestedFix: "Download a fresh template from the admin dashboard before importing again."
      });
    }

    this.validateRowShapes(workbook, issues);
    this.validateDuplicateRows(workbook, issues);
    this.validateAgainstExisting(snapshot, workbook, issues);
    this.validateReferences(snapshot, workbook, payload.config, issues, referenceCounts);

    for (const sheetId of editableSheetIds) {
      entityPlanCounts[sheetId] = workbook[sheetId].length;
    }

    const presentSheets = SCHOOL_ONBOARDING_SHEET_IDS.filter(
      (sheetId) => payload.workbook.sheets[sheetId]?.present
    ).length;
    const totalRows = SCHOOL_ONBOARDING_SHEET_IDS.reduce(
      (sum, sheetId) => sum + (payload.workbook.sheets[sheetId]?.rows.length ?? 0),
      0
    );
    const summary = buildSummary(presentSheets, totalRows, issues);
    const status: SchoolOnboardingImportStatus = summary.errorCount > 0 ? "rejected" : "validated";
    assertValidatedStatus(status);

    return {
      workbook,
      response: {
        mode: "dry-run",
        status,
        canApply: status === "validated",
        summary,
        sheetSummaries: this.buildSheetSummaries(payload, issues),
        issues,
        resolvedReferenceCounts: referenceCounts,
        entityPlanCounts
      }
    };
  }

  async apply(
    authUser: AuthenticatedUser,
    payload: SchoolOnboardingDryRunRequestDto,
    applyRequest: SchoolOnboardingApplyRequestDto,
    snapshot: SchoolOnboardingReferenceSnapshot,
    queryable: Queryable
  ): Promise<ImportResponseCore> {
    const evaluation = this.evaluate(payload, snapshot);

    if (!evaluation.response.canApply) {
      throw new ValidationError("Dry-run is stale or invalid and cannot be applied", [
        {
          field: "dryRunId",
          code: "DRY_RUN_STALE",
          message: "Run a fresh dry-run before applying this school onboarding import"
        }
      ]);
    }

    if (payload.config.activateAfterImport && !applyRequest.confirmActivateContext) {
      throw new ValidationError("Activation confirmation is required before applying", [
        {
          field: "confirmActivateContext",
          code: "ACTIVATION_CONFIRMATION_REQUIRED",
          message: "confirmActivateContext must be true when activateAfterImport is enabled"
        }
      ]);
    }

    await this.executeApply(authUser, evaluation.workbook, payload, snapshot, queryable, applyRequest);

    return {
      ...evaluation.response,
      mode: "apply",
      status: "applied",
      canApply: false,
      alreadyApplied: false
    };
  }

  private normalizeWorkbook(
    payload: SchoolOnboardingDryRunRequestDto,
    issues: SchoolOnboardingImportIssueDto[]
  ): NormalizedWorkbook {
    const workbook = Object.fromEntries(
      editableSheetIds.map((sheetId) => [sheetId, []])
    ) as unknown as NormalizedWorkbook;

    for (const sheetId of SCHOOL_ONBOARDING_SHEET_IDS) {
      const definition = SCHOOL_ONBOARDING_SHEET_DEFINITIONS[sheetId];
      const sheet = payload.workbook.sheets[sheetId];

      if (!sheet?.present) {
        pushIssue(issues, {
          level: "error",
          code: "missing_sheet",
          sheetId,
          message: `Sheet ${sheetId} is missing from the uploaded workbook`
        });
        continue;
      }

      if (JSON.stringify(sheet.headers) !== JSON.stringify(definition.expectedHeaders)) {
        pushIssue(issues, {
          level: "error",
          code: "header_mismatch",
          sheetId,
          message: `Sheet ${sheetId} headers do not match the expected template columns`
        });
      }

      if (NON_EDITABLE_SHEET_IDS.has(sheetId)) {
        continue;
      }

      const editableSheetId = sheetId as EditableSheetId;
      workbook[editableSheetId] = sheet.rows.map((row) => this.normalizeRow(row, definition.expectedHeaders));
    }

    return workbook;
  }

  private normalizeRow(
    row: SchoolOnboardingWorkbookRowDto,
    expectedHeaders: readonly string[]
  ): NormalizedRow {
    const values = Object.fromEntries(
      expectedHeaders.map((header) => [header, toNormalizedText(row.values[header])])
    );

    return {
      rowNumber: row.rowNumber,
      values
    };
  }

  private buildSheetSummaries(
    payload: SchoolOnboardingDryRunRequestDto,
    issues: SchoolOnboardingImportIssueDto[]
  ): SchoolOnboardingSheetSummaryDto[] {
    return SCHOOL_ONBOARDING_SHEET_IDS.map((sheetId) => ({
      sheetId,
      rowCount: payload.workbook.sheets[sheetId]?.rows.length ?? 0,
      errorCount: issues.filter((issue) => issue.sheetId === sheetId && issue.level === "error").length,
      warningCount: issues.filter((issue) => issue.sheetId === sheetId && issue.level === "warning").length,
      present: Boolean(payload.workbook.sheets[sheetId]?.present)
    }));
  }

  private validateRowShapes(
    workbook: NormalizedWorkbook,
    issues: SchoolOnboardingImportIssueDto[]
  ): void {
    for (const sheetId of editableSheetIds) {
      const definition = SCHOOL_ONBOARDING_SHEET_DEFINITIONS[sheetId];

      for (const row of workbook[sheetId]) {
        for (const column of definition.columns) {
          const value = row.values[column.key];

          if (column.required && isBlank(value)) {
            pushIssue(issues, {
              level: "error",
              code: "missing_required_value",
              sheetId,
              rowNumber: row.rowNumber,
              columnKey: column.key,
              message: `Column ${column.key} is required`
            });
            continue;
          }

          if (isBlank(value)) {
            continue;
          }

          if (column.type === "date" && !isIsoDate(value)) {
            pushIssue(issues, {
              level: "error",
              code: "invalid_date_value",
              sheetId,
              rowNumber: row.rowNumber,
              columnKey: column.key,
              message: `Column ${column.key} must be in YYYY-MM-DD format`
            });
          }

          if (column.type === "number" && toNumberValue(value) === null) {
            pushIssue(issues, {
              level: "error",
              code: "invalid_number_value",
              sheetId,
              rowNumber: row.rowNumber,
              columnKey: column.key,
              message: `Column ${column.key} must be a valid numeric value`
            });
          }

          if (
            column.type === "enum" &&
            column.enumValues &&
            !column.enumValues.includes(toLookupKey(value) as never)
          ) {
            pushIssue(issues, {
              level: "error",
              code: "invalid_enum_value",
              sheetId,
              rowNumber: row.rowNumber,
              columnKey: column.key,
              message: `Column ${column.key} must use one of the allowed lookup values`
            });
          }
        }

        this.validateDomainRowShape(sheetId, row, issues);
      }
    }
  }

  private validateDomainRowShape(
    sheetId: EditableSheetId,
    row: NormalizedRow,
    issues: SchoolOnboardingImportIssueDto[]
  ): void {
    const value = (key: string) => row.values[key];
    const numeric = (key: string) => toNumberValue(value(key));

    if (sheetId === "Users_Teachers" || sheetId === "Users_Supervisors" || sheetId === "Users_Parents" || sheetId === "Users_Drivers") {
      if (!toContactIdentifier(value("phone")) && !toContactIdentifier(value("email"))) {
        pushIssue(issues, {
          level: "error",
          code: "missing_contact_identifier",
          sheetId,
          rowNumber: row.rowNumber,
          message: "Each imported user must include at least one phone or email identifier"
        });
      }
    }

    if (sheetId === "AcademicYears" || sheetId === "Semesters" || sheetId === "RouteAssignments" || sheetId === "StudentTransportAssignments") {
      const startDate = value("start_date");
      const endDate = value("end_date");
      if (startDate && endDate && startDate >= endDate) {
        pushIssue(issues, {
          level: "error",
          code: "invalid_date_range",
          sheetId,
          rowNumber: row.rowNumber,
          message: "End date must be later than start date"
        });
      }
    }

    if (sheetId === "GradeLevels" && (numeric("level_order") ?? 0) <= 0) {
      pushIssue(issues, {
        level: "error",
        code: "invalid_number_value",
        sheetId,
        rowNumber: row.rowNumber,
        columnKey: "level_order",
        message: "level_order must be greater than zero"
      });
    }

    if (sheetId === "Classes" && value("capacity") !== null && (numeric("capacity") ?? 0) <= 0) {
      pushIssue(issues, {
        level: "error",
        code: "invalid_number_value",
        sheetId,
        rowNumber: row.rowNumber,
        columnKey: "capacity",
        message: "capacity must be greater than zero when provided"
      });
    }

    if (sheetId === "Routes" && value("estimated_duration_minutes") !== null && (numeric("estimated_duration_minutes") ?? -1) < 0) {
      pushIssue(issues, {
        level: "error",
        code: "invalid_number_value",
        sheetId,
        rowNumber: row.rowNumber,
        columnKey: "estimated_duration_minutes",
        message: "estimated_duration_minutes cannot be negative"
      });
    }

    if (sheetId === "RouteStops") {
      if ((numeric("stop_order") ?? 0) <= 0) {
        pushIssue(issues, {
          level: "error",
          code: "invalid_number_value",
          sheetId,
          rowNumber: row.rowNumber,
          columnKey: "stop_order",
          message: "stop_order must be greater than zero"
        });
      }

      const latitude = numeric("latitude");
      const longitude = numeric("longitude");
      if (latitude === null || latitude < -90 || latitude > 90) {
        pushIssue(issues, {
          level: "error",
          code: "invalid_number_value",
          sheetId,
          rowNumber: row.rowNumber,
          columnKey: "latitude",
          message: "latitude must be between -90 and 90"
        });
      }
      if (longitude === null || longitude < -180 || longitude > 180) {
        pushIssue(issues, {
          level: "error",
          code: "invalid_number_value",
          sheetId,
          rowNumber: row.rowNumber,
          columnKey: "longitude",
          message: "longitude must be between -180 and 180"
        });
      }
    }

    if (sheetId === "StudentHomeLocations") {
      const latitude = numeric("latitude");
      const longitude = numeric("longitude");
      if (latitude === null || latitude < -90 || latitude > 90) {
        pushIssue(issues, {
          level: "error",
          code: "invalid_number_value",
          sheetId,
          rowNumber: row.rowNumber,
          columnKey: "latitude",
          message: "latitude must be between -90 and 90"
        });
      }
      if (longitude === null || longitude < -180 || longitude > 180) {
        pushIssue(issues, {
          level: "error",
          code: "invalid_number_value",
          sheetId,
          rowNumber: row.rowNumber,
          columnKey: "longitude",
          message: "longitude must be between -180 and 180"
        });
      }
    }

    if (sheetId === "Students" && value("address") !== null) {
      pushIssue(issues, {
        level: "warning",
        code: "field_ignored_by_backend",
        sheetId,
        rowNumber: row.rowNumber,
        columnKey: "address",
        message: "Students.address is not persisted by the current backend import scope"
      });
    }
  }

  private validateDuplicateRows(
    workbook: NormalizedWorkbook,
    issues: SchoolOnboardingImportIssueDto[]
  ): void {
    const duplicateRules: Array<{ sheetId: EditableSheetId; columns: string[]; keyBuilder: (row: NormalizedRow) => string }> = [
      { sheetId: "AcademicYears", columns: ["year_name"], keyBuilder: (row) => buildCompositeKey(row.values.year_name) },
      { sheetId: "Semesters", columns: ["academic_year_name", "semester_name"], keyBuilder: (row) => buildCompositeKey(row.values.academic_year_name, row.values.semester_name) },
      { sheetId: "GradeLevels", columns: ["grade_level_name"], keyBuilder: (row) => buildCompositeKey(row.values.grade_level_name) },
      { sheetId: "Classes", columns: ["academic_year_name", "grade_level_name", "class_name", "section"], keyBuilder: (row) => buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section) },
      { sheetId: "Subjects", columns: ["grade_level_name", "subject_code"], keyBuilder: (row) => buildCompositeKey(row.values.grade_level_name, row.values.subject_code) },
      { sheetId: "Students", columns: ["academic_number"], keyBuilder: (row) => buildCompositeKey(row.values.academic_number) },
      { sheetId: "StudentParentLinks", columns: ["student_academic_number", "parent_phone_or_email"], keyBuilder: (row) => buildCompositeKey(row.values.student_academic_number, toContactIdentifier(row.values.parent_phone_or_email)) },
      { sheetId: "StudentEnrollments", columns: ["student_academic_number", "academic_year_name"], keyBuilder: (row) => buildCompositeKey(row.values.student_academic_number, row.values.academic_year_name) },
      { sheetId: "SubjectOfferings", columns: ["academic_year_name", "semester_name", "grade_level_name", "subject_code"], keyBuilder: (row) => buildCompositeKey(row.values.academic_year_name, row.values.semester_name, row.values.grade_level_name, row.values.subject_code) },
      { sheetId: "TeacherAssignments", columns: ["academic_year_name", "grade_level_name", "class_name", "section", "subject_code"], keyBuilder: (row) => buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section, row.values.subject_code) },
      { sheetId: "SupervisorAssignments", columns: ["academic_year_name", "grade_level_name", "class_name", "section", "supervisor_phone_or_email"], keyBuilder: (row) => buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section, toContactIdentifier(row.values.supervisor_phone_or_email)) },
      { sheetId: "Buses", columns: ["plate_number"], keyBuilder: (row) => buildCompositeKey(row.values.plate_number) },
      { sheetId: "Routes", columns: ["route_name"], keyBuilder: (row) => buildCompositeKey(row.values.route_name) },
      { sheetId: "RouteStops", columns: ["route_name", "stop_order"], keyBuilder: (row) => buildCompositeKey(row.values.route_name, row.values.stop_order) },
      { sheetId: "RouteAssignments", columns: ["bus_plate_number", "route_name", "start_date"], keyBuilder: (row) => buildCompositeKey(row.values.bus_plate_number, row.values.route_name, row.values.start_date) },
      { sheetId: "StudentTransportAssignments", columns: ["student_academic_number", "route_name", "stop_order", "start_date"], keyBuilder: (row) => buildCompositeKey(row.values.student_academic_number, row.values.route_name, row.values.stop_order, row.values.start_date) },
      { sheetId: "StudentHomeLocations", columns: ["student_academic_number"], keyBuilder: (row) => buildCompositeKey(row.values.student_academic_number) }
    ];

    for (const rule of duplicateRules) {
      const seen = new Map<string, number>();
      for (const row of workbook[rule.sheetId]) {
        const key = rule.keyBuilder(row);
        if (!key || key === "||") {
          continue;
        }
        if (seen.has(key)) {
          pushIssue(issues, {
            level: "error",
            code: "duplicate_row_in_sheet",
            sheetId: rule.sheetId,
            rowNumber: row.rowNumber,
            columnKey: rule.columns[0],
            message: `Duplicate row detected in ${rule.sheetId} for ${rule.columns.join(" + ")}`
          });
          continue;
        }
        seen.set(key, row.rowNumber);
      }
    }

    const userContactOwners = new Map<string, { sheetId: EditableSheetId; rowNumber: number }>();
    const driverLicenseOwners = new Map<string, number>();

    for (const sheetId of ["Users_Teachers", "Users_Supervisors", "Users_Parents", "Users_Drivers"] as const) {
      for (const row of workbook[sheetId]) {
        for (const identifier of [toContactIdentifier(row.values.phone), toContactIdentifier(row.values.email)].filter(Boolean) as string[]) {
          const existingOwner = userContactOwners.get(identifier);
          if (existingOwner) {
            pushIssue(issues, {
              level: "error",
              code: "duplicate_row_in_sheet",
              sheetId,
              rowNumber: row.rowNumber,
              message: `Contact identifier ${identifier} is repeated across imported user sheets`
            });
          } else {
            userContactOwners.set(identifier, { sheetId, rowNumber: row.rowNumber });
          }
        }

        if (sheetId === "Users_Drivers" && row.values.license_number) {
          const normalizedLicense = toLookupKey(row.values.license_number);
          if (driverLicenseOwners.has(normalizedLicense)) {
            pushIssue(issues, {
              level: "error",
              code: "duplicate_row_in_sheet",
              sheetId,
              rowNumber: row.rowNumber,
              columnKey: "license_number",
              message: "license_number is duplicated within imported drivers"
            });
          } else {
            driverLicenseOwners.set(normalizedLicense, row.rowNumber);
          }
        }
      }
    }
  }

  private validateAgainstExisting(
    snapshot: SchoolOnboardingReferenceSnapshot,
    workbook: NormalizedWorkbook,
    issues: SchoolOnboardingImportIssueDto[]
  ): void {
    const academicYearNames = new Set(snapshot.academicYears.map((row) => toLookupKey(row.name)));
    const semesterKeys = new Set(snapshot.semesters.map((row) => buildCompositeKey(row.academicYearName, row.name)));
    const gradeLevelNames = new Set(snapshot.gradeLevels.map((row) => toLookupKey(row.name)));
    const classKeys = new Set(snapshot.classes.map((row) => buildCompositeKey(row.academicYearName, row.gradeLevelName, row.className, row.section)));
    const subjectCodeKeys = new Set(snapshot.subjects.filter((row) => row.code).map((row) => buildCompositeKey(row.gradeLevelName, row.code)));
    const subjectNameKeys = new Set(snapshot.subjects.map((row) => buildCompositeKey(row.gradeLevelName, row.name)));
    const existingContactIdentifiers = new Set(
      snapshot.users.flatMap((row) => [toContactIdentifier(row.phone), toContactIdentifier(row.email)].filter(Boolean) as string[])
    );
    const existingDriverLicenses = new Set(
      snapshot.users.filter((row) => row.role === "driver" && row.licenseNumber).map((row) => toLookupKey(row.licenseNumber))
    );
    const studentAcademicNos = new Set(snapshot.students.map((row) => toLookupKey(row.academicNo)));
    const studentParentLinkKeys = new Set(
      snapshot.studentParentLinks.map((row) => buildCompositeKey(row.academicNo, row.parentUserId))
    );
    const studentEnrollmentKeys = new Set(
      snapshot.studentEnrollments.map((row) => buildCompositeKey(row.academicNo, row.academicYearName))
    );
    const subjectOfferingKeys = new Set(
      snapshot.subjectOfferings.map((row) => buildCompositeKey(row.subjectId, row.semesterId))
    );
    const teacherAssignmentKeys = new Set(
      snapshot.teacherAssignments.map((row) => buildCompositeKey(row.classId, row.subjectId, row.academicYearId))
    );
    const supervisorAssignmentKeys = new Set(
      snapshot.supervisorAssignments.map((row) => buildCompositeKey(row.supervisorId, row.classId, row.academicYearId))
    );
    const busPlates = new Set(snapshot.buses.map((row) => toLookupKey(row.plateNumber)));
    const routeNames = new Set(snapshot.routes.map((row) => toLookupKey(row.routeName)));
    const routeStopKeys = new Set(snapshot.routeStops.map((row) => buildCompositeKey(row.routeName, String(row.stopOrder))));
    const routeAssignmentKeys = new Set(snapshot.routeAssignments.map((row) => buildCompositeKey(row.busId, row.routeId, String(row.startDate))));
    const studentTransportAssignmentKeys = new Set(snapshot.studentTransportAssignments.map((row) => buildCompositeKey(row.studentId, row.routeId, row.stopId, String(row.startDate))));
    const studentHomeLocationAcademicNos = new Set(snapshot.studentHomeLocations.map((row) => toLookupKey(row.academicNo)));

    for (const row of workbook.AcademicYears) {
      if (academicYearNames.has(toLookupKey(row.values.year_name))) {
        this.pushDuplicateExistingIssue(issues, "AcademicYears", row.rowNumber, "year_name", row.values.year_name ?? "academic year");
      }
    }
    for (const row of workbook.Semesters) {
      if (semesterKeys.has(buildCompositeKey(row.values.academic_year_name, row.values.semester_name))) {
        this.pushDuplicateExistingIssue(issues, "Semesters", row.rowNumber, "semester_name", `${row.values.academic_year_name} / ${row.values.semester_name}`);
      }
    }
    for (const row of workbook.GradeLevels) {
      if (gradeLevelNames.has(toLookupKey(row.values.grade_level_name))) {
        this.pushDuplicateExistingIssue(issues, "GradeLevels", row.rowNumber, "grade_level_name", row.values.grade_level_name ?? "grade level");
      }
    }
    for (const row of workbook.Classes) {
      if (classKeys.has(buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section))) {
        this.pushDuplicateExistingIssue(issues, "Classes", row.rowNumber, "class_name", `${row.values.class_name} ${row.values.section ?? ""}`.trim());
      }
    }
    for (const row of workbook.Subjects) {
      if (subjectCodeKeys.has(buildCompositeKey(row.values.grade_level_name, row.values.subject_code)) || subjectNameKeys.has(buildCompositeKey(row.values.grade_level_name, row.values.subject_name))) {
        this.pushDuplicateExistingIssue(issues, "Subjects", row.rowNumber, "subject_code", row.values.subject_code ?? row.values.subject_name ?? "subject");
      }
    }
    for (const sheetId of ["Users_Teachers", "Users_Supervisors", "Users_Parents", "Users_Drivers"] as const) {
      for (const row of workbook[sheetId]) {
        for (const identifier of [toContactIdentifier(row.values.phone), toContactIdentifier(row.values.email)].filter(Boolean) as string[]) {
          if (existingContactIdentifiers.has(identifier)) {
            this.pushDuplicateExistingIssue(issues, sheetId, row.rowNumber, identifier.includes("@") ? "email" : "phone", identifier);
          }
        }
        if (sheetId === "Users_Drivers" && row.values.license_number && existingDriverLicenses.has(toLookupKey(row.values.license_number))) {
          this.pushDuplicateExistingIssue(issues, sheetId, row.rowNumber, "license_number", row.values.license_number);
        }
      }
    }
    for (const row of workbook.Students) {
      if (studentAcademicNos.has(toLookupKey(row.values.academic_number))) {
        this.pushDuplicateExistingIssue(issues, "Students", row.rowNumber, "academic_number", row.values.academic_number ?? "student");
      }
    }
    for (const row of workbook.StudentParentLinks) {
      const parentIdentifier = this.findUserInSnapshotByContact(snapshot, "parent", row.values.parent_phone_or_email);
      const key = parentIdentifier ? buildCompositeKey(row.values.student_academic_number, parentIdentifier.userId) : "";
      if (key && studentParentLinkKeys.has(key)) {
        this.pushDuplicateExistingIssue(issues, "StudentParentLinks", row.rowNumber, "parent_phone_or_email", row.values.parent_phone_or_email ?? "parent link");
      }
    }
    for (const row of workbook.StudentEnrollments) {
      if (studentEnrollmentKeys.has(buildCompositeKey(row.values.student_academic_number, row.values.academic_year_name))) {
        this.pushDuplicateExistingIssue(issues, "StudentEnrollments", row.rowNumber, "student_academic_number", row.values.student_academic_number ?? "student enrollment");
      }
    }
    for (const row of workbook.Buses) {
      if (busPlates.has(toLookupKey(row.values.plate_number))) {
        this.pushDuplicateExistingIssue(issues, "Buses", row.rowNumber, "plate_number", row.values.plate_number ?? "bus");
      }
    }
    for (const row of workbook.Routes) {
      if (routeNames.has(toLookupKey(row.values.route_name))) {
        this.pushDuplicateExistingIssue(issues, "Routes", row.rowNumber, "route_name", row.values.route_name ?? "route");
      }
    }
    for (const row of workbook.RouteStops) {
      if (routeStopKeys.has(buildCompositeKey(row.values.route_name, row.values.stop_order))) {
        this.pushDuplicateExistingIssue(issues, "RouteStops", row.rowNumber, "stop_order", `${row.values.route_name} / ${row.values.stop_order}`);
      }
    }
    for (const row of workbook.StudentHomeLocations) {
      if (studentHomeLocationAcademicNos.has(toLookupKey(row.values.student_academic_number))) {
        this.pushDuplicateExistingIssue(issues, "StudentHomeLocations", row.rowNumber, "student_academic_number", row.values.student_academic_number ?? "student home location");
      }
    }

    void subjectOfferingKeys;
    void teacherAssignmentKeys;
    void supervisorAssignmentKeys;
    void routeAssignmentKeys;
    void studentTransportAssignmentKeys;
  }

  private validateReferences(
    snapshot: SchoolOnboardingReferenceSnapshot,
    workbook: NormalizedWorkbook,
    config: SchoolOnboardingDryRunRequestDto["config"],
    issues: SchoolOnboardingImportIssueDto[],
    referenceCounts: ReferenceCounts
  ): void {
    const academicYearCatalog = this.buildSimpleCatalog(snapshot.academicYears.map((row) => ({ key: toLookupKey(row.name) })), workbook.AcademicYears.map((row) => ({ key: toLookupKey(row.values.year_name), rowNumber: row.rowNumber })));
    const semesterCatalog = this.buildSimpleCatalog(snapshot.semesters.map((row) => ({ key: buildCompositeKey(row.academicYearName, row.name) })), workbook.Semesters.map((row) => ({ key: buildCompositeKey(row.values.academic_year_name, row.values.semester_name), rowNumber: row.rowNumber })));
    const gradeLevelCatalog = this.buildSimpleCatalog(snapshot.gradeLevels.map((row) => ({ key: toLookupKey(row.name) })), workbook.GradeLevels.map((row) => ({ key: toLookupKey(row.values.grade_level_name), rowNumber: row.rowNumber })));
    const classCatalog = this.buildSimpleCatalog(snapshot.classes.map((row) => ({ key: buildCompositeKey(row.academicYearName, row.gradeLevelName, row.className, row.section), classId: row.id, gradeLevelName: row.gradeLevelName, academicYearName: row.academicYearName })), workbook.Classes.map((row) => ({ key: buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section), rowNumber: row.rowNumber, gradeLevelName: row.values.grade_level_name, academicYearName: row.values.academic_year_name })));
    const subjectCatalog = this.buildSimpleCatalog(snapshot.subjects.map((row) => ({ key: buildCompositeKey(row.gradeLevelName, row.code), gradeLevelName: row.gradeLevelName, subjectId: row.id })), workbook.Subjects.map((row) => ({ key: buildCompositeKey(row.values.grade_level_name, row.values.subject_code), rowNumber: row.rowNumber, gradeLevelName: row.values.grade_level_name })));
    const studentCatalog = this.buildSimpleCatalog(snapshot.students.map((row) => ({ key: toLookupKey(row.academicNo) })), workbook.Students.map((row) => ({ key: toLookupKey(row.values.academic_number), rowNumber: row.rowNumber })));
    const routeCatalog = this.buildSimpleCatalog(snapshot.routes.map((row) => ({ key: toLookupKey(row.routeName) })), workbook.Routes.map((row) => ({ key: toLookupKey(row.values.route_name), rowNumber: row.rowNumber })));
    const routeStopCatalog = this.buildSimpleCatalog(snapshot.routeStops.map((row) => ({ key: buildCompositeKey(row.routeName, String(row.stopOrder)) })), workbook.RouteStops.map((row) => ({ key: buildCompositeKey(row.values.route_name, row.values.stop_order), rowNumber: row.rowNumber })));

    const teacherContacts = this.buildUserContactCatalog(snapshot.users, workbook.Users_Teachers, "teacher");
    const supervisorContacts = this.buildUserContactCatalog(snapshot.users, workbook.Users_Supervisors, "supervisor");
    const parentContacts = this.buildUserContactCatalog(snapshot.users, workbook.Users_Parents, "parent");
    const driverContacts = this.buildUserContactCatalog(snapshot.users, workbook.Users_Drivers, "driver");

    for (const row of workbook.Semesters) {
      this.resolveCatalogRow(academicYearCatalog, row.values.academic_year_name, issues, {
        sheetId: "Semesters",
        rowNumber: row.rowNumber,
        columnKey: "academic_year_name",
        missingCode: "missing_reference",
        missingMessage: `Academic year ${row.values.academic_year_name} does not exist in current data or import payload`
      }, referenceCounts, "academic_year_name");
    }

    for (const row of workbook.Classes) {
      this.resolveCatalogRow(academicYearCatalog, row.values.academic_year_name, issues, {
        sheetId: "Classes",
        rowNumber: row.rowNumber,
        columnKey: "academic_year_name",
        missingCode: "missing_reference",
        missingMessage: `Academic year ${row.values.academic_year_name} does not exist in current data or import payload`
      }, referenceCounts, "academic_year_name");
      this.resolveCatalogRow(gradeLevelCatalog, row.values.grade_level_name, issues, {
        sheetId: "Classes",
        rowNumber: row.rowNumber,
        columnKey: "grade_level_name",
        missingCode: "missing_reference",
        missingMessage: `Grade level ${row.values.grade_level_name} does not exist in current data or import payload`
      }, referenceCounts, "grade_level_name");
    }

    for (const row of workbook.Subjects) {
      this.resolveCatalogRow(gradeLevelCatalog, row.values.grade_level_name, issues, {
        sheetId: "Subjects",
        rowNumber: row.rowNumber,
        columnKey: "grade_level_name",
        missingCode: "missing_reference",
        missingMessage: `Grade level ${row.values.grade_level_name} does not exist in current data or import payload`
      }, referenceCounts, "grade_level_name");
    }

    for (const row of workbook.Students) {
      const hasBootstrapEnrollment = workbook.StudentEnrollments.some(
        (enrollmentRow) => buildCompositeKey(enrollmentRow.values.student_academic_number) === buildCompositeKey(row.values.academic_number)
      );
      if (!hasBootstrapEnrollment) {
        pushIssue(issues, {
          level: "error",
          code: "missing_bootstrap_enrollment",
          sheetId: "Students",
          rowNumber: row.rowNumber,
          columnKey: "academic_number",
          message: `Student ${row.values.academic_number} requires at least one StudentEnrollments row in the same import`
        });
      }
    }

    for (const row of workbook.StudentParentLinks) {
      this.resolveCatalogRow(studentCatalog, row.values.student_academic_number, issues, {
        sheetId: "StudentParentLinks",
        rowNumber: row.rowNumber,
        columnKey: "student_academic_number",
        missingCode: "missing_reference",
        missingMessage: `Student ${row.values.student_academic_number} was not found`
      }, referenceCounts, "student_academic_number");
      this.resolveContactCatalog(parentContacts, row.values.parent_phone_or_email, issues, {
        sheetId: "StudentParentLinks",
        rowNumber: row.rowNumber,
        columnKey: "parent_phone_or_email",
        ambiguousCode: "ambiguous_parent_reference",
        label: "parent"
      }, referenceCounts, "parent_reference");
    }

    for (const row of workbook.StudentEnrollments) {
      this.resolveCatalogRow(studentCatalog, row.values.student_academic_number, issues, {
        sheetId: "StudentEnrollments",
        rowNumber: row.rowNumber,
        columnKey: "student_academic_number",
        missingCode: "missing_reference",
        missingMessage: `Student ${row.values.student_academic_number} was not found`
      }, referenceCounts, "student_academic_number");
      this.resolveCatalogRow(academicYearCatalog, row.values.academic_year_name, issues, {
        sheetId: "StudentEnrollments",
        rowNumber: row.rowNumber,
        columnKey: "academic_year_name",
        missingCode: "missing_reference",
        missingMessage: `Academic year ${row.values.academic_year_name} was not found`
      }, referenceCounts, "academic_year_name");
      this.resolveCatalogRow(classCatalog, buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section), issues, {
        sheetId: "StudentEnrollments",
        rowNumber: row.rowNumber,
        columnKey: "class_name",
        missingCode: "missing_reference",
        missingMessage: `Class ${row.values.class_name} / ${row.values.section} in ${row.values.academic_year_name} was not found`
      }, referenceCounts, "class_reference");
    }

    for (const row of workbook.SubjectOfferings) {
      this.resolveCatalogRow(semesterCatalog, buildCompositeKey(row.values.academic_year_name, row.values.semester_name), issues, {
        sheetId: "SubjectOfferings",
        rowNumber: row.rowNumber,
        columnKey: "semester_name",
        missingCode: "missing_reference",
        missingMessage: `Semester ${row.values.semester_name} in ${row.values.academic_year_name} was not found`
      }, referenceCounts, "semester_reference");
      this.resolveCatalogRow(subjectCatalog, buildCompositeKey(row.values.grade_level_name, row.values.subject_code), issues, {
        sheetId: "SubjectOfferings",
        rowNumber: row.rowNumber,
        columnKey: "subject_code",
        missingCode: "missing_reference",
        missingMessage: `Subject ${row.values.subject_code} in grade ${row.values.grade_level_name} was not found`
      }, referenceCounts, "subject_reference");
    }

    for (const row of workbook.TeacherAssignments) {
      this.resolveCatalogRow(classCatalog, buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section), issues, {
        sheetId: "TeacherAssignments",
        rowNumber: row.rowNumber,
        columnKey: "class_name",
        missingCode: "missing_reference",
        missingMessage: `Class ${row.values.class_name} / ${row.values.section} in ${row.values.academic_year_name} was not found`
      }, referenceCounts, "class_reference");
      this.resolveCatalogRow(subjectCatalog, buildCompositeKey(row.values.grade_level_name, row.values.subject_code), issues, {
        sheetId: "TeacherAssignments",
        rowNumber: row.rowNumber,
        columnKey: "subject_code",
        missingCode: "missing_reference",
        missingMessage: `Subject ${row.values.subject_code} in grade ${row.values.grade_level_name} was not found`
      }, referenceCounts, "subject_reference");
      this.resolveContactCatalog(teacherContacts, row.values.teacher_phone_or_email, issues, {
        sheetId: "TeacherAssignments",
        rowNumber: row.rowNumber,
        columnKey: "teacher_phone_or_email",
        ambiguousCode: "ambiguous_teacher_reference",
        label: "teacher"
      }, referenceCounts, "teacher_reference");
    }

    for (const row of workbook.SupervisorAssignments) {
      this.resolveCatalogRow(classCatalog, buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section), issues, {
        sheetId: "SupervisorAssignments",
        rowNumber: row.rowNumber,
        columnKey: "class_name",
        missingCode: "missing_reference",
        missingMessage: `Class ${row.values.class_name} / ${row.values.section} in ${row.values.academic_year_name} was not found`
      }, referenceCounts, "class_reference");
      this.resolveContactCatalog(supervisorContacts, row.values.supervisor_phone_or_email, issues, {
        sheetId: "SupervisorAssignments",
        rowNumber: row.rowNumber,
        columnKey: "supervisor_phone_or_email",
        ambiguousCode: "ambiguous_supervisor_reference",
        label: "supervisor"
      }, referenceCounts, "supervisor_reference");
    }

    for (const row of workbook.Buses) {
      if (!isBlank(row.values.driver_phone_or_email)) {
        this.resolveContactCatalog(driverContacts, row.values.driver_phone_or_email, issues, {
          sheetId: "Buses",
          rowNumber: row.rowNumber,
          columnKey: "driver_phone_or_email",
          ambiguousCode: "ambiguous_driver_reference",
          label: "driver"
        }, referenceCounts, "driver_reference");
      }
    }

    for (const row of workbook.RouteStops) {
      this.resolveCatalogRow(routeCatalog, row.values.route_name, issues, {
        sheetId: "RouteStops",
        rowNumber: row.rowNumber,
        columnKey: "route_name",
        missingCode: "missing_reference",
        missingMessage: `Route ${row.values.route_name} was not found`
      }, referenceCounts, "route_reference");
    }

    for (const row of workbook.RouteAssignments) {
      const routeResolution = this.resolveCatalogRow(routeCatalog, row.values.route_name, issues, {
        sheetId: "RouteAssignments",
        rowNumber: row.rowNumber,
        columnKey: "route_name",
        missingCode: "missing_reference",
        missingMessage: `Route ${row.values.route_name} was not found`
      }, referenceCounts, "route_reference");
      const busExists = snapshot.buses.some((bus) => toLookupKey(bus.plateNumber) === toLookupKey(row.values.bus_plate_number));
      const busImported = workbook.Buses.some((busRow) => toLookupKey(busRow.values.plate_number) === toLookupKey(row.values.bus_plate_number));
      if (!busExists && !busImported) {
        pushIssue(issues, {
          level: "error",
          code: "missing_reference",
          sheetId: "RouteAssignments",
          rowNumber: row.rowNumber,
          columnKey: "bus_plate_number",
          message: `Bus ${row.values.bus_plate_number} was not found`
        });
      } else {
        referenceCounts.bus_reference = (referenceCounts.bus_reference ?? 0) + 1;
      }
      void routeResolution;
    }

    for (const row of workbook.StudentTransportAssignments) {
      this.resolveCatalogRow(studentCatalog, row.values.student_academic_number, issues, {
        sheetId: "StudentTransportAssignments",
        rowNumber: row.rowNumber,
        columnKey: "student_academic_number",
        missingCode: "missing_reference",
        missingMessage: `Student ${row.values.student_academic_number} was not found`
      }, referenceCounts, "student_academic_number");
      this.resolveCatalogRow(routeStopCatalog, buildCompositeKey(row.values.route_name, row.values.stop_order), issues, {
        sheetId: "StudentTransportAssignments",
        rowNumber: row.rowNumber,
        columnKey: "stop_order",
        missingCode: "missing_reference",
        missingMessage: `Route stop ${row.values.route_name} / ${row.values.stop_order} was not found`
      }, referenceCounts, "route_stop_reference");
    }

    for (const row of workbook.StudentHomeLocations) {
      this.resolveCatalogRow(studentCatalog, row.values.student_academic_number, issues, {
        sheetId: "StudentHomeLocations",
        rowNumber: row.rowNumber,
        columnKey: "student_academic_number",
        missingCode: "missing_reference",
        missingMessage: `Student ${row.values.student_academic_number} was not found`
      }, referenceCounts, "student_academic_number");
    }

    if (config.activateAfterImport) {
      const yearResolution = this.resolveCatalogRow(academicYearCatalog, config.targetAcademicYearName, issues, {
        sheetId: "CONFIG",
        columnKey: "targetAcademicYearName",
        missingCode: "missing_target_active_year_reference",
        missingMessage: `Target academic year ${config.targetAcademicYearName ?? ""} was not found`
      }, referenceCounts, "activation_target_year");
      if (!yearResolution) {
        pushIssue(issues, {
          level: "error",
          code: "missing_target_active_year_reference",
          sheetId: "CONFIG",
          columnKey: "targetAcademicYearName",
          message: "activateAfterImport requires a resolvable targetAcademicYearName"
        });
      }
      const semesterResolution = this.resolveCatalogRow(semesterCatalog, buildCompositeKey(config.targetAcademicYearName, config.targetSemesterName), issues, {
        sheetId: "CONFIG",
        columnKey: "targetSemesterName",
        missingCode: "missing_target_active_semester_reference",
        missingMessage: `Target semester ${config.targetSemesterName ?? ""} in ${config.targetAcademicYearName ?? ""} was not found`
      }, referenceCounts, "activation_target_semester");
      if (!semesterResolution) {
        pushIssue(issues, {
          level: "error",
          code: "missing_target_active_semester_reference",
          sheetId: "CONFIG",
          columnKey: "targetSemesterName",
          message: "activateAfterImport requires a resolvable targetSemesterName inside the target academic year"
        });
      }
    }
  }

  private pushDuplicateExistingIssue(
    issues: SchoolOnboardingImportIssueDto[],
    sheetId: EditableSheetId,
    rowNumber: number,
    columnKey: string,
    label: string
  ): void {
    pushIssue(issues, {
      level: "error",
      code: "duplicate_existing_record",
      sheetId,
      rowNumber,
      columnKey,
      message: `${label} already exists in the system and create-only import cannot recreate it`
    });
  }

  private buildSimpleCatalog<TExisting extends { key: string }, TImported extends { key: string; rowNumber: number }>(
    existingRows: TExisting[],
    importedRows: TImported[]
  ): Map<string, Array<TExisting | TImported>> {
    const catalog = new Map<string, Array<TExisting | TImported>>();
    for (const row of existingRows) {
      const entries = catalog.get(row.key) ?? [];
      entries.push(row);
      catalog.set(row.key, entries);
    }
    for (const row of importedRows) {
      const entries = catalog.get(row.key) ?? [];
      entries.push(row);
      catalog.set(row.key, entries);
    }
    return catalog;
  }

  private resolveCatalogRow<T extends { key: string }>(
    catalog: Map<string, T[]>,
    keyValue: string | null | undefined,
    issues: SchoolOnboardingImportIssueDto[],
    options: {
      sheetId: SchoolOnboardingSheetId;
      rowNumber?: number;
      columnKey: string;
      missingCode: string;
      missingMessage: string;
    },
    referenceCounts: ReferenceCounts,
    referenceCounterKey: string
  ): T | null {
    const key = keyValue && keyValue.includes("||") ? keyValue : toLookupKey(keyValue);
    const matches = key ? catalog.get(key) ?? [] : [];

    if (matches.length === 1) {
      referenceCounts[referenceCounterKey] = (referenceCounts[referenceCounterKey] ?? 0) + 1;
      return matches[0];
    }

    pushIssue(issues, {
      level: "error",
      code: options.missingCode,
      sheetId: options.sheetId,
      rowNumber: options.rowNumber,
      columnKey: options.columnKey,
      message:
        matches.length > 1
          ? `${options.columnKey} resolved to multiple records and is ambiguous`
          : options.missingMessage
    });
    return null;
  }

  private buildUserContactCatalog(
    users: SchoolOnboardingReferenceUserRow[],
    importedRows: NormalizedRow[],
    role: ContactRole
  ): Map<string, Array<{ userId?: string; profileId?: string; rowNumber?: number }>> {
    const catalog = new Map<string, Array<{ userId?: string; profileId?: string; rowNumber?: number }>>();

    for (const row of users.filter((candidate) => candidate.role === role)) {
      for (const identifier of [toContactIdentifier(row.phone), toContactIdentifier(row.email)].filter(Boolean) as string[]) {
        const entries = catalog.get(identifier) ?? [];
        entries.push({ userId: row.userId, profileId: row.profileId });
        catalog.set(identifier, entries);
      }
    }

    for (const row of importedRows) {
      for (const identifier of [toContactIdentifier(row.values.phone), toContactIdentifier(row.values.email)].filter(Boolean) as string[]) {
        const entries = catalog.get(identifier) ?? [];
        entries.push({ rowNumber: row.rowNumber });
        catalog.set(identifier, entries);
      }
    }

    return catalog;
  }

  private resolveContactCatalog(
    catalog: Map<string, Array<{ userId?: string; profileId?: string; rowNumber?: number }>>,
    rawIdentifier: string | null | undefined,
    issues: SchoolOnboardingImportIssueDto[],
    options: {
      sheetId: SchoolOnboardingSheetId;
      rowNumber: number;
      columnKey: string;
      ambiguousCode: string;
      label: string;
    },
    referenceCounts: ReferenceCounts,
    referenceCounterKey: string
  ): { userId?: string; profileId?: string; rowNumber?: number } | null {
    const identifier = toContactIdentifier(rawIdentifier);
    const matches = identifier ? catalog.get(identifier) ?? [] : [];

    if (matches.length === 1) {
      referenceCounts[referenceCounterKey] = (referenceCounts[referenceCounterKey] ?? 0) + 1;
      return matches[0];
    }

    pushIssue(issues, {
      level: "error",
      code: matches.length > 1 ? options.ambiguousCode : "missing_reference",
      sheetId: options.sheetId,
      rowNumber: options.rowNumber,
      columnKey: options.columnKey,
      message:
        matches.length > 1
          ? `${options.label} reference ${rawIdentifier ?? ""} is ambiguous`
          : `${options.label} reference ${rawIdentifier ?? ""} was not found`
    });

    return null;
  }

  private findUserInSnapshotByContact(
    snapshot: SchoolOnboardingReferenceSnapshot,
    role: ContactRole,
    identifier: string | null | undefined
  ): SchoolOnboardingReferenceUserRow | null {
    const normalizedIdentifier = toContactIdentifier(identifier);

    if (!normalizedIdentifier) {
      return null;
    }

    const matches = snapshot.users.filter(
      (row) =>
        row.role === role &&
        (toContactIdentifier(row.phone) === normalizedIdentifier ||
          toContactIdentifier(row.email) === normalizedIdentifier)
    );

    return matches.length === 1 ? matches[0] : null;
  }

  private async executeApply(
    authUser: AuthenticatedUser,
    workbook: NormalizedWorkbook,
    payload: SchoolOnboardingDryRunRequestDto,
    snapshot: SchoolOnboardingReferenceSnapshot,
    queryable: Queryable,
    applyRequest: SchoolOnboardingApplyRequestDto
  ): Promise<void> {
    const state = this.buildApplyState(snapshot);

    for (const row of workbook.AcademicYears) {
      const yearId = await this.academicStructureRepository.createAcademicYear(
        {
          name: row.values.year_name!,
          startDate: row.values.start_date!,
          endDate: row.values.end_date!,
          isActive: false
        },
        queryable
      );
      state.academicYearIdsByName.set(toLookupKey(row.values.year_name), yearId);
    }

    for (const row of workbook.Semesters) {
      const academicYearId = this.requireMapValue(
        state.academicYearIdsByName,
        toLookupKey(row.values.academic_year_name),
        "academic_year_name",
        "Unable to resolve semester academic year during apply"
      );
      const semesterId = await this.academicStructureRepository.createSemester(
        {
          academicYearId,
          name: row.values.semester_name!,
          startDate: row.values.start_date!,
          endDate: row.values.end_date!,
          isActive: false
        },
        queryable
      );
      state.semesterIdsByKey.set(
        buildCompositeKey(row.values.academic_year_name, row.values.semester_name),
        semesterId
      );
    }

    for (const row of workbook.GradeLevels) {
      const gradeLevelId = await this.academicStructureRepository.createGradeLevel(
        {
          name: row.values.grade_level_name!,
          levelOrder: toNumberValue(row.values.level_order!)!
        },
        queryable
      );
      state.gradeLevelIdsByName.set(toLookupKey(row.values.grade_level_name), gradeLevelId);
    }

    for (const row of workbook.Classes) {
      const academicYearId = this.requireMapValue(
        state.academicYearIdsByName,
        toLookupKey(row.values.academic_year_name),
        "academic_year_name",
        "Unable to resolve class academic year during apply"
      );
      const gradeLevelId = this.requireMapValue(
        state.gradeLevelIdsByName,
        toLookupKey(row.values.grade_level_name),
        "grade_level_name",
        "Unable to resolve class grade level during apply"
      );
      const classId = await this.academicStructureRepository.createClass(
        {
          gradeLevelId,
          academicYearId,
          className: row.values.class_name!,
          section: row.values.section!,
          capacity: toNumberValue(row.values.capacity),
          isActive: toBooleanFlag(row.values.is_active, true)
        },
        queryable
      );
      state.classIdsByKey.set(
        buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section),
        classId
      );
    }

    for (const row of workbook.Subjects) {
      const gradeLevelId = this.requireMapValue(
        state.gradeLevelIdsByName,
        toLookupKey(row.values.grade_level_name),
        "grade_level_name",
        "Unable to resolve subject grade level during apply"
      );
      const subjectId = await this.academicStructureRepository.createSubject(
        {
          name: row.values.subject_name!,
          gradeLevelId,
          code: row.values.subject_code!,
          isActive: toBooleanFlag(row.values.is_active, true)
        },
        queryable
      );
      state.subjectIdsByCodeKey.set(
        buildCompositeKey(row.values.grade_level_name, row.values.subject_code),
        subjectId
      );
      state.subjectIdsByNameKey.set(
        buildCompositeKey(row.values.grade_level_name, row.values.subject_name),
        subjectId
      );
    }

    await this.createImportedUsers("teacher", workbook.Users_Teachers, state, queryable, applyRequest.fallbackPassword);
    await this.createImportedUsers("supervisor", workbook.Users_Supervisors, state, queryable, applyRequest.fallbackPassword);
    await this.createImportedUsers("parent", workbook.Users_Parents, state, queryable, applyRequest.fallbackPassword);
    await this.createImportedUsers("driver", workbook.Users_Drivers, state, queryable, applyRequest.fallbackPassword);

    for (const row of workbook.Students) {
      const bootstrapEnrollment = workbook.StudentEnrollments.find(
        (enrollmentRow) => toLookupKey(enrollmentRow.values.student_academic_number) === toLookupKey(row.values.academic_number)
      );
      if (!bootstrapEnrollment) {
        throw this.buildStaleConflictError("academic_number", "Student bootstrap enrollment was not found during apply");
      }
      const academicYearId = this.requireMapValue(
        state.academicYearIdsByName,
        toLookupKey(bootstrapEnrollment.values.academic_year_name),
        "academic_year_name",
        "Unable to resolve bootstrap academic year during student creation"
      );
      const classId = this.requireMapValue(
        state.classIdsByKey,
        buildCompositeKey(
          bootstrapEnrollment.values.academic_year_name,
          bootstrapEnrollment.values.grade_level_name,
          bootstrapEnrollment.values.class_name,
          bootstrapEnrollment.values.section
        ),
        "class_name",
        "Unable to resolve bootstrap class during student creation"
      );
      const studentId = await this.studentsRepository.createStudent(
        {
          academicNo: row.values.academic_number!,
          fullName: row.values.full_name!,
          dateOfBirth: row.values.date_of_birth!,
          gender: row.values.gender! as "male" | "female",
          classId,
          status: toStudentStatus(row.values.status!),
          enrollmentDate: row.values.enrollment_date ?? undefined
        },
        queryable
      );
      state.studentIdsByAcademicNo.set(toLookupKey(row.values.academic_number), studentId);
      state.newStudentIds.add(studentId);
      state.studentEnrollmentKeys.add(
        buildCompositeKey(studentId, academicYearId)
      );
    }

    for (const row of workbook.StudentParentLinks) {
      const studentId = this.requireMapValue(
        state.studentIdsByAcademicNo,
        toLookupKey(row.values.student_academic_number),
        "student_academic_number",
        "Unable to resolve student parent link student during apply"
      );
      const parent = this.requireUserByContact(state, "parent", row.values.parent_phone_or_email, "parent_phone_or_email");
      const isPrimary = toBooleanFlag(row.values.is_primary, false);
      if (isPrimary && state.studentPrimaryParentIds.has(studentId)) {
        throw this.buildStaleConflictError("is_primary", "Student already has a primary parent link");
      }
      await this.studentsRepository.createStudentParentLink(
        {
          studentId,
          parentId: parent.profileId,
          relationType: row.values.relation_type!,
          isPrimary
        },
        queryable
      );
      state.studentLinkKeys.add(buildCompositeKey(studentId, parent.profileId));
      if (isPrimary) {
        state.studentPrimaryParentIds.add(studentId);
      }
    }

    for (const row of workbook.StudentEnrollments) {
      const studentId = this.requireMapValue(
        state.studentIdsByAcademicNo,
        toLookupKey(row.values.student_academic_number),
        "student_academic_number",
        "Unable to resolve student enrollment student during apply"
      );
      const academicYearId = this.requireMapValue(
        state.academicYearIdsByName,
        toLookupKey(row.values.academic_year_name),
        "academic_year_name",
        "Unable to resolve student enrollment academic year during apply"
      );
      const classId = this.requireMapValue(
        state.classIdsByKey,
        buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section),
        "class_name",
        "Unable to resolve student enrollment class during apply"
      );
      const enrollmentKey = buildCompositeKey(studentId, academicYearId);
      if (state.studentEnrollmentKeys.has(enrollmentKey)) {
        if (state.newStudentIds.has(studentId)) {
          continue;
        }
        throw this.buildStaleConflictError("student_academic_number", "Student enrollment already exists for this academic year");
      }
      await queryable.query(
        `
          INSERT INTO ${databaseTables.studentAcademicEnrollments} (
            student_id,
            academic_year_id,
            class_id
          )
          VALUES ($1, $2, $3)
        `,
        [studentId, academicYearId, classId]
      );
      state.studentEnrollmentKeys.add(enrollmentKey);
    }

    for (const row of workbook.SubjectOfferings) {
      const subjectId = this.requireMapValue(
        state.subjectIdsByCodeKey,
        buildCompositeKey(row.values.grade_level_name, row.values.subject_code),
        "subject_code",
        "Unable to resolve subject offering subject during apply"
      );
      const semesterId = this.requireMapValue(
        state.semesterIdsByKey,
        buildCompositeKey(row.values.academic_year_name, row.values.semester_name),
        "semester_name",
        "Unable to resolve subject offering semester during apply"
      );
      const offeringKey = buildCompositeKey(subjectId, semesterId);
      if (state.subjectOfferingKeys.has(offeringKey)) {
        throw this.buildStaleConflictError("subject_code", "Subject offering already exists for this semester");
      }
      await this.academicStructureRepository.createSubjectOffering(
        {
          subjectId,
          semesterId,
          isActive: toBooleanFlag(row.values.is_active, true)
        },
        queryable
      );
      state.subjectOfferingKeys.add(offeringKey);
    }

    for (const row of workbook.TeacherAssignments) {
      const classId = this.requireMapValue(
        state.classIdsByKey,
        buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section),
        "class_name",
        "Unable to resolve teacher assignment class during apply"
      );
      const subjectId = this.requireMapValue(
        state.subjectIdsByCodeKey,
        buildCompositeKey(row.values.grade_level_name, row.values.subject_code),
        "subject_code",
        "Unable to resolve teacher assignment subject during apply"
      );
      const academicYearId = this.requireMapValue(
        state.academicYearIdsByName,
        toLookupKey(row.values.academic_year_name),
        "academic_year_name",
        "Unable to resolve teacher assignment academic year during apply"
      );
      const teacher = this.requireUserByContact(state, "teacher", row.values.teacher_phone_or_email, "teacher_phone_or_email");
      const coverageKey = buildCompositeKey(classId, subjectId, academicYearId);
      if (state.teacherAssignmentCoverageKeys.has(coverageKey)) {
        throw this.buildStaleConflictError("teacher_phone_or_email", "A teacher assignment already exists for this class, subject, and academic year");
      }
      await this.academicStructureRepository.createTeacherAssignment(
        {
          teacherId: teacher.profileId,
          classId,
          subjectId,
          academicYearId
        },
        queryable
      );
      state.teacherAssignmentCoverageKeys.add(coverageKey);
      state.teacherAssignmentKeys.add(buildCompositeKey(teacher.profileId, classId, subjectId, academicYearId));
    }

    for (const row of workbook.SupervisorAssignments) {
      const classId = this.requireMapValue(
        state.classIdsByKey,
        buildCompositeKey(row.values.academic_year_name, row.values.grade_level_name, row.values.class_name, row.values.section),
        "class_name",
        "Unable to resolve supervisor assignment class during apply"
      );
      const academicYearId = this.requireMapValue(
        state.academicYearIdsByName,
        toLookupKey(row.values.academic_year_name),
        "academic_year_name",
        "Unable to resolve supervisor assignment academic year during apply"
      );
      const supervisor = this.requireUserByContact(state, "supervisor", row.values.supervisor_phone_or_email, "supervisor_phone_or_email");
      const assignmentKey = buildCompositeKey(supervisor.profileId, classId, academicYearId);
      if (state.supervisorAssignmentKeys.has(assignmentKey)) {
        throw this.buildStaleConflictError("supervisor_phone_or_email", "Supervisor assignment already exists for this class and academic year");
      }
      await this.academicStructureRepository.createSupervisorAssignment(
        {
          supervisorId: supervisor.profileId,
          classId,
          academicYearId
        },
        queryable
      );
      state.supervisorAssignmentKeys.add(assignmentKey);
    }

    for (const row of workbook.Buses) {
      const driver = isBlank(row.values.driver_phone_or_email)
        ? null
        : this.requireUserByContact(state, "driver", row.values.driver_phone_or_email, "driver_phone_or_email");
      const busId = await this.transportRepository.createBus(
        {
          plateNumber: row.values.plate_number!,
          driverId: driver?.profileId ?? undefined,
          capacity: toNumberValue(row.values.capacity!)!,
          status: row.values.status! as "active" | "inactive" | "maintenance"
        },
        queryable
      );
      state.busIdsByPlateNumber.set(toLookupKey(row.values.plate_number), busId);
    }

    for (const row of workbook.Routes) {
      const routeId = await this.transportRepository.createRoute(
        {
          routeName: row.values.route_name!,
          startPoint: row.values.start_point!,
          endPoint: row.values.end_point!,
          estimatedDurationMinutes: toNumberValue(row.values.estimated_duration_minutes) ?? 0,
          isActive: toBooleanFlag(row.values.is_active, true)
        },
        queryable
      );
      state.routeIdsByName.set(toLookupKey(row.values.route_name), routeId);
    }

    for (const row of workbook.RouteStops) {
      const routeId = this.requireMapValue(
        state.routeIdsByName,
        toLookupKey(row.values.route_name),
        "route_name",
        "Unable to resolve route stop route during apply"
      );
      const stopId = await this.transportRepository.createRouteStop(
        {
          routeId,
          stopName: row.values.stop_name!,
          latitude: toNumberValue(row.values.latitude!)!,
          longitude: toNumberValue(row.values.longitude!)!,
          stopOrder: toNumberValue(row.values.stop_order!)!
        },
        queryable
      );
      state.routeStopIdsByKey.set(buildCompositeKey(row.values.route_name, row.values.stop_order), stopId);
    }

    const today = new Date().toISOString().slice(0, 10);

    for (const row of workbook.RouteAssignments) {
      const busId = this.requireMapValue(
        state.busIdsByPlateNumber,
        toLookupKey(row.values.bus_plate_number),
        "bus_plate_number",
        "Unable to resolve route assignment bus during apply"
      );
      const routeId = this.requireMapValue(
        state.routeIdsByName,
        toLookupKey(row.values.route_name),
        "route_name",
        "Unable to resolve route assignment route during apply"
      );
      const assignmentKey = buildCompositeKey(busId, routeId, row.values.start_date);
      if (state.routeAssignmentKeys.has(assignmentKey)) {
        throw this.buildStaleConflictError("bus_plate_number", "Route assignment already exists for this bus, route, and start date");
      }
      const isActive = !row.values.end_date || row.values.end_date >= today;
      if (isActive && (state.activeRouteAssignmentsByBusId.has(busId) || state.activeRouteAssignmentsByRouteId.has(routeId))) {
        throw this.buildStaleConflictError("route_name", "Active route assignment already exists for the selected bus or route");
      }
      await queryable.query(
        `
          INSERT INTO ${databaseTables.transportRouteAssignments} (
            bus_id,
            route_id,
            start_date,
            end_date,
            is_active
          )
          VALUES ($1, $2, $3::date, $4::date, $5)
        `,
        [busId, routeId, row.values.start_date!, row.values.end_date ?? null, isActive]
      );
      state.routeAssignmentKeys.add(assignmentKey);
      if (isActive) {
        state.activeRouteAssignmentsByBusId.add(busId);
        state.activeRouteAssignmentsByRouteId.add(routeId);
      }
    }

    for (const row of workbook.StudentTransportAssignments) {
      const studentId = this.requireMapValue(
        state.studentIdsByAcademicNo,
        toLookupKey(row.values.student_academic_number),
        "student_academic_number",
        "Unable to resolve student transport assignment student during apply"
      );
      const routeId = this.requireMapValue(
        state.routeIdsByName,
        toLookupKey(row.values.route_name),
        "route_name",
        "Unable to resolve student transport assignment route during apply"
      );
      const stopId = this.requireMapValue(
        state.routeStopIdsByKey,
        buildCompositeKey(row.values.route_name, row.values.stop_order),
        "stop_order",
        "Unable to resolve student transport assignment stop during apply"
      );
      const assignmentKey = buildCompositeKey(studentId, routeId, stopId, row.values.start_date);
      if (state.studentTransportAssignmentKeys.has(assignmentKey)) {
        throw this.buildStaleConflictError("student_academic_number", "Student transport assignment already exists for this route stop and date");
      }
      const isActive = !row.values.end_date || row.values.end_date >= today;
      if (isActive && state.activeStudentTransportAssignmentsByStudentId.has(studentId)) {
        throw this.buildStaleConflictError("student_academic_number", "Student already has an active transport assignment");
      }
      await queryable.query(
        `
          INSERT INTO ${databaseTables.studentBusAssignments} (
            student_id,
            route_id,
            stop_id,
            start_date,
            end_date,
            is_active
          )
          VALUES ($1, $2, $3, $4::date, $5::date, $6)
        `,
        [studentId, routeId, stopId, row.values.start_date!, row.values.end_date ?? null, isActive]
      );
      state.studentTransportAssignmentKeys.add(assignmentKey);
      if (isActive) {
        state.activeStudentTransportAssignmentsByStudentId.add(studentId);
      }
    }

    for (const row of workbook.StudentHomeLocations) {
      const studentId = this.requireMapValue(
        state.studentIdsByAcademicNo,
        toLookupKey(row.values.student_academic_number),
        "student_academic_number",
        "Unable to resolve student home location student during apply"
      );
      if (state.studentHomeLocationStudentIds.has(studentId)) {
        throw this.buildStaleConflictError("student_academic_number", "Student home location already exists");
      }
      const status = row.values.status ?? "pending";
      const approved = toLookupKey(status) === "approved";
      await queryable.query(
        `
          INSERT INTO ${databaseTables.studentTransportHomeLocations} (
            student_id,
            address_label,
            address_text,
            latitude,
            longitude,
            source,
            status,
            submitted_by_user_id,
            approved_by_user_id,
            approved_at,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, 'admin', $6, $7, $8, $9, $10)
        `,
        [
          studentId,
          row.values.address_label ?? null,
          row.values.address_text ?? null,
          toNumberValue(row.values.latitude!)!,
          toNumberValue(row.values.longitude!)!,
          status,
          authUser.userId,
          approved ? authUser.userId : null,
          approved ? new Date() : null,
          row.values.notes ?? null
        ]
      );
      state.studentHomeLocationStudentIds.add(studentId);
    }

    if (payload.config.activateAfterImport) {
      const academicYearId = this.requireMapValue(
        state.academicYearIdsByName,
        toLookupKey(payload.config.targetAcademicYearName),
        "targetAcademicYearName",
        "Unable to resolve target academic year during activation"
      );
      const semesterId = this.requireMapValue(
        state.semesterIdsByKey,
        buildCompositeKey(payload.config.targetAcademicYearName, payload.config.targetSemesterName),
        "targetSemesterName",
        "Unable to resolve target semester during activation"
      );
      await this.academicStructureRepository.deactivateAllAcademicYears(queryable);
      await this.academicStructureRepository.deactivateAllSemesters(queryable);
      await this.academicStructureRepository.updateAcademicYear(academicYearId, { isActive: true }, queryable);
      await this.academicStructureRepository.updateSemester(semesterId, { isActive: true }, queryable);
    }
  }

  private buildApplyState(snapshot: SchoolOnboardingReferenceSnapshot): ApplyState {
    const userEntriesByRoleAndIdentifier = new Map<ContactRole, Map<string, UserStateEntry[]>>([
      ["teacher", new Map()],
      ["supervisor", new Map()],
      ["parent", new Map()],
      ["driver", new Map()]
    ]);

    for (const user of snapshot.users) {
      const role = user.role as ContactRole;
      const entry: UserStateEntry = {
        userId: user.userId,
        profileId: user.profileId,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        licenseNumber: user.licenseNumber
      };
      this.addUserEntryToState(userEntriesByRoleAndIdentifier.get(role)!, entry);
    }

    return {
      academicYearIdsByName: new Map(snapshot.academicYears.map((row) => [toLookupKey(row.name), row.id])),
      semesterIdsByKey: new Map(snapshot.semesters.map((row) => [buildCompositeKey(row.academicYearName, row.name), row.id])),
      gradeLevelIdsByName: new Map(snapshot.gradeLevels.map((row) => [toLookupKey(row.name), row.id])),
      classIdsByKey: new Map(snapshot.classes.map((row) => [buildCompositeKey(row.academicYearName, row.gradeLevelName, row.className, row.section), row.id])),
      subjectIdsByCodeKey: new Map(snapshot.subjects.filter((row) => row.code).map((row) => [buildCompositeKey(row.gradeLevelName, row.code), row.id])),
      subjectIdsByNameKey: new Map(snapshot.subjects.map((row) => [buildCompositeKey(row.gradeLevelName, row.name), row.id])),
      userEntriesByRoleAndIdentifier,
      driverIdsByLicenseNumber: new Map(snapshot.users.filter((row) => row.role === "driver" && row.licenseNumber).map((row) => [toLookupKey(row.licenseNumber), row.profileId])),
      studentIdsByAcademicNo: new Map(snapshot.students.map((row) => [toLookupKey(row.academicNo), row.id])),
      newStudentIds: new Set(),
      studentLinkKeys: new Set(snapshot.studentParentLinks.map((row) => buildCompositeKey(row.studentId, row.parentId))),
      studentPrimaryParentIds: new Set(snapshot.studentParentLinks.filter((row) => row.isPrimary).map((row) => row.studentId)),
      studentEnrollmentKeys: new Set(snapshot.studentEnrollments.map((row) => buildCompositeKey(row.studentId, row.academicYearId))),
      subjectOfferingKeys: new Set(snapshot.subjectOfferings.map((row) => buildCompositeKey(row.subjectId, row.semesterId))),
      teacherAssignmentKeys: new Set(snapshot.teacherAssignments.map((row) => buildCompositeKey(row.teacherId, row.classId, row.subjectId, row.academicYearId))),
      teacherAssignmentCoverageKeys: new Set(snapshot.teacherAssignments.map((row) => buildCompositeKey(row.classId, row.subjectId, row.academicYearId))),
      supervisorAssignmentKeys: new Set(snapshot.supervisorAssignments.map((row) => buildCompositeKey(row.supervisorId, row.classId, row.academicYearId))),
      busIdsByPlateNumber: new Map(snapshot.buses.map((row) => [toLookupKey(row.plateNumber), row.id])),
      routeIdsByName: new Map(snapshot.routes.map((row) => [toLookupKey(row.routeName), row.id])),
      routeStopIdsByKey: new Map(snapshot.routeStops.map((row) => [buildCompositeKey(row.routeName, String(row.stopOrder)), row.stopId])),
      activeRouteAssignmentsByBusId: new Set(snapshot.routeAssignments.filter((row) => row.isActive).map((row) => row.busId)),
      activeRouteAssignmentsByRouteId: new Set(snapshot.routeAssignments.filter((row) => row.isActive).map((row) => row.routeId)),
      routeAssignmentKeys: new Set(snapshot.routeAssignments.map((row) => buildCompositeKey(row.busId, row.routeId, String(row.startDate)))),
      activeStudentTransportAssignmentsByStudentId: new Set(snapshot.studentTransportAssignments.filter((row) => row.isActive).map((row) => row.studentId)),
      studentTransportAssignmentKeys: new Set(snapshot.studentTransportAssignments.map((row) => buildCompositeKey(row.studentId, row.routeId, row.stopId, String(row.startDate)))),
      studentHomeLocationStudentIds: new Set(snapshot.studentHomeLocations.map((row) => row.studentId))
    };
  }

  private addUserEntryToState(
    map: Map<string, UserStateEntry[]>,
    entry: UserStateEntry
  ): void {
    for (const identifier of [toContactIdentifier(entry.phone), toContactIdentifier(entry.email)].filter(Boolean) as string[]) {
      const existingEntries = map.get(identifier) ?? [];
      existingEntries.push(entry);
      map.set(identifier, existingEntries);
    }
  }

  private async createImportedUsers(
    role: ContactRole,
    rows: NormalizedRow[],
    state: ApplyState,
    queryable: Queryable,
    fallbackPassword: string | undefined
  ): Promise<void> {
    for (const row of rows) {
      const passwordHash = await hashPassword(this.resolvePasswordSeed(row, fallbackPassword));
      const userId = await this.usersRepository.createUser(
        {
          fullName: row.values.full_name!,
          email: row.values.email ?? null,
          phone: row.values.phone ?? null,
          passwordHash,
          role
        },
        queryable
      );

      let profileId = "";

      if (role === "teacher") {
        await this.usersRepository.createTeacherProfile(
          userId,
          {
            specialization: row.values.specialization ?? null,
            qualification: row.values.qualification ?? null,
            hireDate: row.values.hire_date ?? null
          },
          queryable
        );
        const result = await queryable.query<{ id: string }>(`SELECT id::text AS id FROM ${databaseTables.teachers} WHERE user_id = $1 LIMIT 1`, [userId]);
        profileId = result.rows[0]?.id ?? "";
      }

      if (role === "supervisor") {
        await this.usersRepository.createSupervisorProfile(
          userId,
          {
            department: row.values.department ?? null
          },
          queryable
        );
        const result = await queryable.query<{ id: string }>(`SELECT id::text AS id FROM ${databaseTables.supervisors} WHERE user_id = $1 LIMIT 1`, [userId]);
        profileId = result.rows[0]?.id ?? "";
      }

      if (role === "parent") {
        await this.usersRepository.createParentProfile(
          userId,
          {
            address: row.values.address ?? null,
            relationType: null
          },
          queryable
        );
        const result = await queryable.query<{ id: string }>(`SELECT id::text AS id FROM ${databaseTables.parents} WHERE user_id = $1 LIMIT 1`, [userId]);
        profileId = result.rows[0]?.id ?? "";
      }

      if (role === "driver") {
        await this.usersRepository.createDriverProfile(
          userId,
          {
            licenseNumber: row.values.license_number!,
            driverStatus: (row.values.driver_status ?? "active") as "active" | "inactive" | "suspended"
          },
          queryable
        );
        const result = await queryable.query<{ id: string }>(`SELECT id::text AS id FROM ${databaseTables.drivers} WHERE user_id = $1 LIMIT 1`, [userId]);
        profileId = result.rows[0]?.id ?? "";
        state.driverIdsByLicenseNumber.set(toLookupKey(row.values.license_number), profileId);
      }

      const entry: UserStateEntry = {
        userId,
        profileId,
        fullName: row.values.full_name!,
        phone: row.values.phone ?? null,
        email: row.values.email ?? null,
        licenseNumber: role === "driver" ? row.values.license_number ?? null : null
      };
      this.addUserEntryToState(state.userEntriesByRoleAndIdentifier.get(role)!, entry);
    }
  }

  private resolvePasswordSeed(row: NormalizedRow, fallbackPassword?: string): string {
    const phonePassword = row.values.phone;
    if (!isBlank(phonePassword)) {
      return phonePassword!;
    }
    if (fallbackPassword) {
      return fallbackPassword;
    }
    throw new ValidationError("fallbackPassword is required for imported users without phone numbers", [
      {
        field: "fallbackPassword",
        code: "FALLBACK_PASSWORD_REQUIRED",
        message: `Row ${row.rowNumber} requires fallbackPassword because no phone number is available to derive the initial password`
      }
    ]);
  }

  private requireMapValue(
    map: Map<string, string>,
    key: string,
    field: string,
    message: string
  ): string {
    const value = map.get(key);
    if (!value) {
      throw this.buildStaleConflictError(field, message);
    }
    return value;
  }

  private requireUserByContact(
    state: ApplyState,
    role: ContactRole,
    identifier: string | null | undefined,
    field: string
  ): UserStateEntry {
    const normalizedIdentifier = toContactIdentifier(identifier);
    const matches = normalizedIdentifier
      ? state.userEntriesByRoleAndIdentifier.get(role)?.get(normalizedIdentifier) ?? []
      : [];

    if (matches.length !== 1) {
      throw this.buildStaleConflictError(field, `Unable to resolve a single ${role} by contact identifier during apply`);
    }

    return matches[0];
  }

  private buildStaleConflictError(field: string, message: string): ValidationError {
    return new ValidationError("Dry-run is stale or conflicted and can no longer be applied", [
      {
        field,
        code: "DRY_RUN_STALE",
        message
      }
    ]);
  }
}








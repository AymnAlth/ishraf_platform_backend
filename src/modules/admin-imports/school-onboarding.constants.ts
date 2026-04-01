export const SCHOOL_ONBOARDING_TEMPLATE_VERSION = "2026.04.phase-b";

export const SCHOOL_ONBOARDING_SHEET_IDS = [
  "README",
  "CONFIG",
  "LOOKUPS_ENUMS",
  "REF_EXISTING_ACADEMIC",
  "REF_EXISTING_USERS",
  "AcademicYears",
  "Semesters",
  "GradeLevels",
  "Classes",
  "Subjects",
  "Users_Teachers",
  "Users_Supervisors",
  "Users_Parents",
  "Users_Drivers",
  "Students",
  "StudentParentLinks",
  "StudentEnrollments",
  "SubjectOfferings",
  "TeacherAssignments",
  "SupervisorAssignments",
  "Buses",
  "Routes",
  "RouteStops",
  "RouteAssignments",
  "StudentTransportAssignments",
  "StudentHomeLocations"
] as const;

export type SchoolOnboardingSheetId = (typeof SCHOOL_ONBOARDING_SHEET_IDS)[number];

export const SCHOOL_ONBOARDING_IMPORT_MODE_VALUES = ["dry-run", "apply"] as const;
export type SchoolOnboardingImportMode = (typeof SCHOOL_ONBOARDING_IMPORT_MODE_VALUES)[number];

export const SCHOOL_ONBOARDING_IMPORT_STATUS_VALUES = [
  "validated",
  "rejected",
  "applied",
  "failed"
] as const;
export type SchoolOnboardingImportStatus =
  (typeof SCHOOL_ONBOARDING_IMPORT_STATUS_VALUES)[number];

export type SchoolOnboardingColumnType =
  | "text"
  | "date"
  | "number"
  | "boolean"
  | "phoneOrEmail"
  | "enum";

export interface SchoolOnboardingColumnDefinition {
  key: string;
  type: SchoolOnboardingColumnType;
  required: boolean;
  enumValues?: readonly string[];
}

export interface SchoolOnboardingSheetDefinition {
  expectedHeaders: readonly string[];
  columns: readonly SchoolOnboardingColumnDefinition[];
}

const booleanFlagValues = ["true", "false"] as const;
const genderValues = ["male", "female"] as const;
const studentStatusValues = [
  "active",
  "inactive",
  "suspended",
  "withdrawn",
  "graduated",
  "transferred",
  "dropped"
] as const;
const relationTypeValues = ["father", "mother", "guardian"] as const;
const driverStatusValues = ["active", "inactive", "suspended"] as const;
const busStatusValues = ["active", "inactive", "maintenance"] as const;
const homeLocationStatusValues = ["pending", "approved", "rejected"] as const;

const defineSheet = (
  columns: readonly SchoolOnboardingColumnDefinition[]
): SchoolOnboardingSheetDefinition => ({
  expectedHeaders: columns.map((column) => column.key),
  columns
});

export const SCHOOL_ONBOARDING_SHEET_DEFINITIONS: Record<
  SchoolOnboardingSheetId,
  SchoolOnboardingSheetDefinition
> = {
  README: defineSheet([
    { key: "section", type: "text", required: false },
    { key: "instruction", type: "text", required: false }
  ]),
  CONFIG: defineSheet([
    { key: "setting_key", type: "text", required: false },
    { key: "setting_value", type: "text", required: false },
    { key: "edit_policy", type: "text", required: false },
    { key: "note", type: "text", required: false }
  ]),
  LOOKUPS_ENUMS: defineSheet([
    { key: "lookup_name", type: "text", required: false },
    { key: "allowed_value", type: "text", required: false },
    { key: "display_label", type: "text", required: false }
  ]),
  REF_EXISTING_ACADEMIC: defineSheet([
    { key: "entity_type", type: "text", required: false },
    { key: "parent_name", type: "text", required: false },
    { key: "code", type: "text", required: false },
    { key: "name", type: "text", required: false },
    { key: "secondary_name", type: "text", required: false },
    { key: "status", type: "text", required: false }
  ]),
  REF_EXISTING_USERS: defineSheet([
    { key: "role", type: "text", required: false },
    { key: "full_name", type: "text", required: false },
    { key: "phone", type: "text", required: false },
    { key: "email", type: "text", required: false },
    { key: "status", type: "text", required: false }
  ]),
  AcademicYears: defineSheet([
    { key: "year_name", type: "text", required: true },
    { key: "start_date", type: "date", required: true },
    { key: "end_date", type: "date", required: true }
  ]),
  Semesters: defineSheet([
    { key: "academic_year_name", type: "text", required: true },
    { key: "semester_name", type: "text", required: true },
    { key: "start_date", type: "date", required: true },
    { key: "end_date", type: "date", required: true }
  ]),
  GradeLevels: defineSheet([
    { key: "grade_level_name", type: "text", required: true },
    { key: "level_order", type: "number", required: true }
  ]),
  Classes: defineSheet([
    { key: "academic_year_name", type: "text", required: true },
    { key: "grade_level_name", type: "text", required: true },
    { key: "class_name", type: "text", required: true },
    { key: "section", type: "text", required: true },
    { key: "capacity", type: "number", required: false },
    {
      key: "is_active",
      type: "enum",
      required: false,
      enumValues: booleanFlagValues
    }
  ]),
  Subjects: defineSheet([
    { key: "grade_level_name", type: "text", required: true },
    { key: "subject_code", type: "text", required: true },
    { key: "subject_name", type: "text", required: true },
    {
      key: "is_active",
      type: "enum",
      required: false,
      enumValues: booleanFlagValues
    }
  ]),
  Users_Teachers: defineSheet([
    { key: "full_name", type: "text", required: true },
    { key: "phone", type: "text", required: false },
    { key: "email", type: "text", required: false },
    { key: "specialization", type: "text", required: false },
    { key: "qualification", type: "text", required: false },
    { key: "hire_date", type: "date", required: false }
  ]),
  Users_Supervisors: defineSheet([
    { key: "full_name", type: "text", required: true },
    { key: "phone", type: "text", required: false },
    { key: "email", type: "text", required: false },
    { key: "department", type: "text", required: false }
  ]),
  Users_Parents: defineSheet([
    { key: "full_name", type: "text", required: true },
    { key: "phone", type: "text", required: false },
    { key: "email", type: "text", required: false },
    { key: "address", type: "text", required: false }
  ]),
  Users_Drivers: defineSheet([
    { key: "full_name", type: "text", required: true },
    { key: "phone", type: "text", required: false },
    { key: "email", type: "text", required: false },
    { key: "license_number", type: "text", required: true },
    {
      key: "driver_status",
      type: "enum",
      required: false,
      enumValues: driverStatusValues
    }
  ]),
  Students: defineSheet([
    { key: "academic_number", type: "text", required: true },
    { key: "full_name", type: "text", required: true },
    { key: "gender", type: "enum", required: true, enumValues: genderValues },
    { key: "date_of_birth", type: "date", required: true },
    {
      key: "status",
      type: "enum",
      required: true,
      enumValues: studentStatusValues
    },
    { key: "enrollment_date", type: "date", required: true },
    { key: "address", type: "text", required: false }
  ]),
  StudentParentLinks: defineSheet([
    { key: "student_academic_number", type: "text", required: true },
    { key: "parent_phone_or_email", type: "phoneOrEmail", required: true },
    {
      key: "relation_type",
      type: "enum",
      required: true,
      enumValues: relationTypeValues
    },
    {
      key: "is_primary",
      type: "enum",
      required: false,
      enumValues: booleanFlagValues
    }
  ]),
  StudentEnrollments: defineSheet([
    { key: "student_academic_number", type: "text", required: true },
    { key: "academic_year_name", type: "text", required: true },
    { key: "grade_level_name", type: "text", required: true },
    { key: "class_name", type: "text", required: true },
    { key: "section", type: "text", required: true }
  ]),
  SubjectOfferings: defineSheet([
    { key: "academic_year_name", type: "text", required: true },
    { key: "semester_name", type: "text", required: true },
    { key: "grade_level_name", type: "text", required: true },
    { key: "subject_code", type: "text", required: true },
    {
      key: "is_active",
      type: "enum",
      required: false,
      enumValues: booleanFlagValues
    }
  ]),
  TeacherAssignments: defineSheet([
    { key: "academic_year_name", type: "text", required: true },
    { key: "grade_level_name", type: "text", required: true },
    { key: "class_name", type: "text", required: true },
    { key: "section", type: "text", required: true },
    { key: "subject_code", type: "text", required: true },
    { key: "teacher_phone_or_email", type: "phoneOrEmail", required: true }
  ]),
  SupervisorAssignments: defineSheet([
    { key: "academic_year_name", type: "text", required: true },
    { key: "grade_level_name", type: "text", required: true },
    { key: "class_name", type: "text", required: true },
    { key: "section", type: "text", required: true },
    { key: "supervisor_phone_or_email", type: "phoneOrEmail", required: true }
  ]),
  Buses: defineSheet([
    { key: "plate_number", type: "text", required: true },
    { key: "capacity", type: "number", required: true },
    { key: "driver_phone_or_email", type: "phoneOrEmail", required: false },
    { key: "status", type: "enum", required: true, enumValues: busStatusValues }
  ]),
  Routes: defineSheet([
    { key: "route_name", type: "text", required: true },
    { key: "start_point", type: "text", required: true },
    { key: "end_point", type: "text", required: true },
    { key: "estimated_duration_minutes", type: "number", required: false },
    {
      key: "is_active",
      type: "enum",
      required: false,
      enumValues: booleanFlagValues
    }
  ]),
  RouteStops: defineSheet([
    { key: "route_name", type: "text", required: true },
    { key: "stop_order", type: "number", required: true },
    { key: "stop_name", type: "text", required: true },
    { key: "latitude", type: "number", required: true },
    { key: "longitude", type: "number", required: true }
  ]),
  RouteAssignments: defineSheet([
    { key: "bus_plate_number", type: "text", required: true },
    { key: "route_name", type: "text", required: true },
    { key: "start_date", type: "date", required: true },
    { key: "end_date", type: "date", required: false }
  ]),
  StudentTransportAssignments: defineSheet([
    { key: "student_academic_number", type: "text", required: true },
    { key: "route_name", type: "text", required: true },
    { key: "stop_order", type: "number", required: true },
    { key: "start_date", type: "date", required: true },
    { key: "end_date", type: "date", required: false }
  ]),
  StudentHomeLocations: defineSheet([
    { key: "student_academic_number", type: "text", required: true },
    { key: "address_label", type: "text", required: false },
    { key: "address_text", type: "text", required: false },
    { key: "latitude", type: "number", required: true },
    { key: "longitude", type: "number", required: true },
    {
      key: "status",
      type: "enum",
      required: false,
      enumValues: homeLocationStatusValues
    },
    { key: "notes", type: "text", required: false }
  ])
};

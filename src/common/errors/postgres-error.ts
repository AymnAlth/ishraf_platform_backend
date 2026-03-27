import type { DatabaseError } from "pg";

import type { ErrorDetail } from "../types/http.types";
import { ConflictError } from "./conflict-error";
import { ValidationError } from "./validation-error";

type PostgresErrorShape = Partial<DatabaseError> & {
  code: string;
  column?: string;
  constraint?: string;
  detail?: string;
};

interface ConstraintMapping {
  field?: string;
  message: string;
  detailCode: string;
  type: "conflict" | "validation";
}

interface PatternMapping extends ConstraintMapping {
  pattern: RegExp;
}

const toCamelCase = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.replace(/_([a-z])/g, (_match, group: string) => group.toUpperCase());
};

const toTitleCase = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\s]+/g, " ")
    .trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const extractFieldFromDetail = (detail?: string): string | undefined => {
  if (!detail) {
    return undefined;
  }

  const match = detail.match(/\(([^)]+)\)=/);

  return toCamelCase(match?.[1]);
};

const resolveField = (error: PostgresErrorShape): string | undefined =>
  toCamelCase(error.column) ?? extractFieldFromDetail(error.detail);

const buildFallbackMessage = (
  field: string | undefined,
  fallback: string,
  suffix: string
): string => {
  const title = toTitleCase(field);

  return title ? `${title} ${suffix}` : fallback;
};

const buildDetails = (
  message: string,
  detailCode: string,
  field?: string
): ErrorDetail[] => [
  {
    field,
    code: detailCode,
    message
  }
];

const UNIQUE_CONSTRAINT_MAP: Record<string, ConstraintMapping> = {
  uq_users_email_not_null: {
    field: "email",
    message: "Email already exists",
    detailCode: "EMAIL_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_users_phone_not_null: {
    field: "phone",
    message: "Phone already exists",
    detailCode: "PHONE_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_drivers_license_number: {
    field: "licenseNumber",
    message: "Driver license number already exists",
    detailCode: "DRIVER_LICENSE_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_academic_years_name: {
    field: "name",
    message: "Academic year name already exists",
    detailCode: "ACADEMIC_YEAR_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_academic_years_one_active: {
    field: "isActive",
    message: "Another academic year is already active",
    detailCode: "ACADEMIC_YEAR_ACTIVE_CONFLICT",
    type: "conflict"
  },
  uq_semesters_year_name: {
    field: "name",
    message: "Semester name already exists within the selected academic year",
    detailCode: "SEMESTER_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_grade_levels_name: {
    field: "name",
    message: "Grade level name already exists",
    detailCode: "GRADE_LEVEL_NAME_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_grade_levels_order: {
    field: "levelOrder",
    message: "Grade level order already exists",
    detailCode: "GRADE_LEVEL_ORDER_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_classes_unique_in_year: {
    field: "className",
    message: "Class already exists for the selected grade level and academic year",
    detailCode: "CLASS_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_subjects_grade_level_name: {
    field: "name",
    message: "Subject name already exists within the selected grade level",
    detailCode: "SUBJECT_NAME_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_subjects_code: {
    field: "code",
    message: "Subject code already exists",
    detailCode: "SUBJECT_CODE_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_subject_offerings_subject_semester: {
    field: "subjectId",
    message: "This subject is already offered in the selected semester",
    detailCode: "SUBJECT_OFFERING_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_teacher_classes_teacher_assignment: {
    field: "teacherId",
    message: "This teacher assignment already exists",
    detailCode: "TEACHER_ASSIGNMENT_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_teacher_classes_single_teacher_per_subject: {
    field: "teacherId",
    message: "This class subject already has an assigned teacher for the selected academic year",
    detailCode: "TEACHER_ASSIGNMENT_CONFLICT",
    type: "conflict"
  },
  uq_supervisor_classes_assignment: {
    field: "supervisorId",
    message: "This supervisor assignment already exists",
    detailCode: "SUPERVISOR_ASSIGNMENT_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_students_academic_no: {
    field: "academicNo",
    message: "Academic number already exists",
    detailCode: "STUDENT_ACADEMIC_NO_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_student_parents_pair: {
    field: "parentId",
    message: "This parent is already linked to the student",
    detailCode: "STUDENT_PARENT_LINK_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_student_primary_parent: {
    field: "isPrimary",
    message: "The student already has a primary parent",
    detailCode: "STUDENT_PRIMARY_PARENT_CONFLICT",
    type: "conflict"
  },
  uq_student_promotions_unique: {
    field: "toClassId",
    message: "This promotion record already exists",
    detailCode: "STUDENT_PROMOTION_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_assessment_types_code: {
    field: "code",
    message: "Assessment type code already exists",
    detailCode: "ASSESSMENT_TYPE_CODE_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_assessment_types_name: {
    field: "name",
    message: "Assessment type name already exists",
    detailCode: "ASSESSMENT_TYPE_NAME_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_student_assessments_unique: {
    field: "studentId",
    message: "This student already has a recorded score for the selected assessment",
    detailCode: "STUDENT_ASSESSMENT_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_homework_submissions_unique: {
    field: "studentId",
    message: "This student already has a submission status for the selected homework",
    detailCode: "HOMEWORK_SUBMISSION_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_behavior_categories_code: {
    field: "code",
    message: "Behavior category code already exists",
    detailCode: "BEHAVIOR_CATEGORY_CODE_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_behavior_categories_name: {
    field: "name",
    message: "Behavior category name already exists",
    detailCode: "BEHAVIOR_CATEGORY_NAME_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_attendance_sessions_unique: {
    field: "periodNo",
    message:
      "Attendance session already exists for the selected class, subject, teacher, semester, date, and period",
    detailCode: "ATTENDANCE_SESSION_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_attendance_unique: {
    field: "studentId",
    message: "Attendance has already been recorded for this student in the selected session",
    detailCode: "ATTENDANCE_RECORD_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_buses_plate_number: {
    field: "plateNumber",
    message: "Bus plate number already exists",
    detailCode: "BUS_PLATE_NUMBER_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_routes_name: {
    field: "routeName",
    message: "Route name already exists",
    detailCode: "ROUTE_NAME_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_bus_stops_route_order: {
    field: "stopOrder",
    message: "A stop already exists at this order for the selected route",
    detailCode: "BUS_STOP_ORDER_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_student_bus_assignments_one_active: {
    field: "studentId",
    message: "Student already has an active transport assignment",
    detailCode: "STUDENT_ACTIVE_TRANSPORT_ASSIGNMENT_EXISTS",
    type: "conflict"
  },
  uq_transport_route_assignments_one_active_bus: {
    field: "busId",
    message: "This bus already has an active route assignment",
    detailCode: "TRANSPORT_ROUTE_ACTIVE_BUS_CONFLICT",
    type: "conflict"
  },
  uq_transport_route_assignments_one_active_route: {
    field: "routeId",
    message: "This route already has an active bus assignment",
    detailCode: "TRANSPORT_ROUTE_ACTIVE_ROUTE_CONFLICT",
    type: "conflict"
  },
  uq_trips_bus_route_date_type: {
    field: "tripDate",
    message: "A trip already exists for the selected bus, route, date, and type",
    detailCode: "TRIP_ALREADY_EXISTS",
    type: "conflict"
  },
  uq_student_transport_home_locations_student: {
    field: "studentId",
    message: "Student already has a saved home location",
    detailCode: "STUDENT_HOME_LOCATION_ALREADY_EXISTS",
    type: "conflict"
  }
};

const FOREIGN_KEY_CONSTRAINT_MAP: Record<string, ConstraintMapping> = {
  fk_students_class: {
    field: "classId",
    message: "Selected class does not exist",
    detailCode: "CLASS_NOT_FOUND",
    type: "conflict"
  },
  fk_student_parents_student: {
    field: "studentId",
    message: "Student does not exist",
    detailCode: "STUDENT_NOT_FOUND",
    type: "conflict"
  },
  fk_student_parents_parent: {
    field: "parentId",
    message: "Parent does not exist",
    detailCode: "PARENT_NOT_FOUND",
    type: "conflict"
  },
  fk_student_promotions_student: {
    field: "studentId",
    message: "Student does not exist",
    detailCode: "STUDENT_NOT_FOUND",
    type: "conflict"
  },
  fk_student_promotions_from_class: {
    field: "fromClassId",
    message: "Source class does not exist",
    detailCode: "SOURCE_CLASS_NOT_FOUND",
    type: "conflict"
  },
  fk_student_promotions_to_class: {
    field: "toClassId",
    message: "Target class does not exist",
    detailCode: "TARGET_CLASS_NOT_FOUND",
    type: "conflict"
  },
  fk_student_promotions_academic_year: {
    field: "academicYearId",
    message: "Academic year does not exist",
    detailCode: "ACADEMIC_YEAR_NOT_FOUND",
    type: "conflict"
  },
  fk_semesters_academic_year: {
    field: "academicYearId",
    message: "Academic year does not exist",
    detailCode: "ACADEMIC_YEAR_NOT_FOUND",
    type: "conflict"
  },
  fk_classes_grade_level: {
    field: "gradeLevelId",
    message: "Grade level does not exist",
    detailCode: "GRADE_LEVEL_NOT_FOUND",
    type: "conflict"
  },
  fk_classes_academic_year: {
    field: "academicYearId",
    message: "Academic year does not exist",
    detailCode: "ACADEMIC_YEAR_NOT_FOUND",
    type: "conflict"
  },
  fk_subjects_grade_level: {
    field: "gradeLevelId",
    message: "Grade level does not exist",
    detailCode: "GRADE_LEVEL_NOT_FOUND",
    type: "conflict"
  },
  subject_offerings_subject_id_fkey: {
    field: "subjectId",
    message: "Subject does not exist",
    detailCode: "SUBJECT_NOT_FOUND",
    type: "conflict"
  },
  subject_offerings_semester_id_fkey: {
    field: "semesterId",
    message: "Semester does not exist",
    detailCode: "SEMESTER_NOT_FOUND",
    type: "conflict"
  },
  fk_teacher_classes_teacher: {
    field: "teacherId",
    message: "Teacher does not exist",
    detailCode: "TEACHER_NOT_FOUND",
    type: "conflict"
  },
  fk_teacher_classes_class: {
    field: "classId",
    message: "Class does not exist",
    detailCode: "CLASS_NOT_FOUND",
    type: "conflict"
  },
  fk_teacher_classes_subject: {
    field: "subjectId",
    message: "Subject does not exist",
    detailCode: "SUBJECT_NOT_FOUND",
    type: "conflict"
  },
  fk_teacher_classes_academic_year: {
    field: "academicYearId",
    message: "Academic year does not exist",
    detailCode: "ACADEMIC_YEAR_NOT_FOUND",
    type: "conflict"
  },
  fk_supervisor_classes_supervisor: {
    field: "supervisorId",
    message: "Supervisor does not exist",
    detailCode: "SUPERVISOR_NOT_FOUND",
    type: "conflict"
  },
  fk_supervisor_classes_class: {
    field: "classId",
    message: "Class does not exist",
    detailCode: "CLASS_NOT_FOUND",
    type: "conflict"
  },
  fk_supervisor_classes_academic_year: {
    field: "academicYearId",
    message: "Academic year does not exist",
    detailCode: "ACADEMIC_YEAR_NOT_FOUND",
    type: "conflict"
  },
  fk_assessments_type: {
    field: "assessmentTypeId",
    message: "Assessment type does not exist",
    detailCode: "ASSESSMENT_TYPE_NOT_FOUND",
    type: "conflict"
  },
  fk_assessments_class: {
    field: "classId",
    message: "Class does not exist",
    detailCode: "CLASS_NOT_FOUND",
    type: "conflict"
  },
  fk_assessments_subject: {
    field: "subjectId",
    message: "Subject does not exist",
    detailCode: "SUBJECT_NOT_FOUND",
    type: "conflict"
  },
  fk_assessments_teacher: {
    field: "teacherId",
    message: "Teacher does not exist",
    detailCode: "TEACHER_NOT_FOUND",
    type: "conflict"
  },
  fk_assessments_academic_year: {
    field: "academicYearId",
    message: "Academic year does not exist",
    detailCode: "ACADEMIC_YEAR_NOT_FOUND",
    type: "conflict"
  },
  fk_assessments_semester: {
    field: "semesterId",
    message: "Semester does not exist",
    detailCode: "SEMESTER_NOT_FOUND",
    type: "conflict"
  },
  fk_student_assessments_assessment: {
    field: "assessmentId",
    message: "Assessment does not exist",
    detailCode: "ASSESSMENT_NOT_FOUND",
    type: "conflict"
  },
  fk_student_assessments_student: {
    field: "studentId",
    message: "Student does not exist",
    detailCode: "STUDENT_NOT_FOUND",
    type: "conflict"
  },
  fk_homework_teacher: {
    field: "teacherId",
    message: "Teacher does not exist",
    detailCode: "TEACHER_NOT_FOUND",
    type: "conflict"
  },
  fk_homework_class: {
    field: "classId",
    message: "Class does not exist",
    detailCode: "CLASS_NOT_FOUND",
    type: "conflict"
  },
  fk_homework_subject: {
    field: "subjectId",
    message: "Subject does not exist",
    detailCode: "SUBJECT_NOT_FOUND",
    type: "conflict"
  },
  fk_homework_academic_year: {
    field: "academicYearId",
    message: "Academic year does not exist",
    detailCode: "ACADEMIC_YEAR_NOT_FOUND",
    type: "conflict"
  },
  fk_homework_semester: {
    field: "semesterId",
    message: "Semester does not exist",
    detailCode: "SEMESTER_NOT_FOUND",
    type: "conflict"
  },
  fk_homework_submissions_homework: {
    field: "homeworkId",
    message: "Homework does not exist",
    detailCode: "HOMEWORK_NOT_FOUND",
    type: "conflict"
  },
  fk_homework_submissions_student: {
    field: "studentId",
    message: "Student does not exist",
    detailCode: "STUDENT_NOT_FOUND",
    type: "conflict"
  },
  fk_behavior_records_student: {
    field: "studentId",
    message: "Student does not exist",
    detailCode: "STUDENT_NOT_FOUND",
    type: "conflict"
  },
  fk_behavior_records_category: {
    field: "behaviorCategoryId",
    message: "Behavior category does not exist",
    detailCode: "BEHAVIOR_CATEGORY_NOT_FOUND",
    type: "conflict"
  },
  fk_behavior_records_teacher: {
    field: "teacherId",
    message: "Teacher does not exist",
    detailCode: "TEACHER_NOT_FOUND",
    type: "conflict"
  },
  fk_behavior_records_supervisor: {
    field: "supervisorId",
    message: "Supervisor does not exist",
    detailCode: "SUPERVISOR_NOT_FOUND",
    type: "conflict"
  },
  fk_behavior_records_academic_year: {
    field: "academicYearId",
    message: "Academic year does not exist",
    detailCode: "ACADEMIC_YEAR_NOT_FOUND",
    type: "conflict"
  },
  fk_behavior_records_semester: {
    field: "semesterId",
    message: "Semester does not exist",
    detailCode: "SEMESTER_NOT_FOUND",
    type: "conflict"
  },
  fk_attendance_sessions_class: {
    field: "classId",
    message: "Class does not exist",
    detailCode: "CLASS_NOT_FOUND",
    type: "conflict"
  },
  fk_attendance_sessions_subject: {
    field: "subjectId",
    message: "Subject does not exist",
    detailCode: "SUBJECT_NOT_FOUND",
    type: "conflict"
  },
  fk_attendance_sessions_teacher: {
    field: "teacherId",
    message: "Teacher does not exist",
    detailCode: "TEACHER_NOT_FOUND",
    type: "conflict"
  },
  fk_attendance_sessions_academic_year: {
    field: "academicYearId",
    message: "Academic year does not exist",
    detailCode: "ACADEMIC_YEAR_NOT_FOUND",
    type: "conflict"
  },
  fk_attendance_sessions_semester: {
    field: "semesterId",
    message: "Semester does not exist",
    detailCode: "SEMESTER_NOT_FOUND",
    type: "conflict"
  },
  fk_attendance_session: {
    field: "attendanceSessionId",
    message: "Attendance session does not exist",
    detailCode: "ATTENDANCE_SESSION_NOT_FOUND",
    type: "conflict"
  },
  fk_attendance_student: {
    field: "studentId",
    message: "Student does not exist",
    detailCode: "STUDENT_NOT_FOUND",
    type: "conflict"
  },
  fk_buses_driver: {
    field: "driverId",
    message: "Driver does not exist",
    detailCode: "DRIVER_NOT_FOUND",
    type: "conflict"
  },
  fk_bus_stops_route: {
    field: "routeId",
    message: "Route does not exist",
    detailCode: "ROUTE_NOT_FOUND",
    type: "conflict"
  },
  fk_student_bus_assignments_student: {
    field: "studentId",
    message: "Student does not exist",
    detailCode: "STUDENT_NOT_FOUND",
    type: "conflict"
  },
  fk_student_bus_assignments_route: {
    field: "routeId",
    message: "Route does not exist",
    detailCode: "ROUTE_NOT_FOUND",
    type: "conflict"
  },
  fk_student_bus_assignments_stop: {
    field: "stopId",
    message: "Bus stop does not exist",
    detailCode: "BUS_STOP_NOT_FOUND",
    type: "conflict"
  },
  fk_trips_bus: {
    field: "busId",
    message: "Bus does not exist",
    detailCode: "BUS_NOT_FOUND",
    type: "conflict"
  },
  fk_trips_route: {
    field: "routeId",
    message: "Route does not exist",
    detailCode: "ROUTE_NOT_FOUND",
    type: "conflict"
  },
  fk_bus_location_history_trip: {
    field: "tripId",
    message: "Trip does not exist",
    detailCode: "TRIP_NOT_FOUND",
    type: "conflict"
  },
  fk_trip_student_events_trip: {
    field: "tripId",
    message: "Trip does not exist",
    detailCode: "TRIP_NOT_FOUND",
    type: "conflict"
  },
  fk_trip_student_events_student: {
    field: "studentId",
    message: "Student does not exist",
    detailCode: "STUDENT_NOT_FOUND",
    type: "conflict"
  },
  fk_trip_student_events_stop: {
    field: "stopId",
    message: "Bus stop does not exist",
    detailCode: "BUS_STOP_NOT_FOUND",
    type: "conflict"
  },
  transport_route_assignments_bus_id_fkey: {
    field: "busId",
    message: "Bus does not exist",
    detailCode: "BUS_NOT_FOUND",
    type: "conflict"
  },
  transport_route_assignments_route_id_fkey: {
    field: "routeId",
    message: "Route does not exist",
    detailCode: "ROUTE_NOT_FOUND",
    type: "conflict"
  },
  student_transport_home_locations_student_id_fkey: {
    field: "studentId",
    message: "Student does not exist",
    detailCode: "STUDENT_NOT_FOUND",
    type: "conflict"
  },
  student_transport_home_locations_submitted_by_user_id_fkey: {
    field: "submittedByUserId",
    message: "Submitting user does not exist",
    detailCode: "HOME_LOCATION_SUBMITTER_NOT_FOUND",
    type: "conflict"
  },
  student_transport_home_locations_approved_by_user_id_fkey: {
    field: "approvedByUserId",
    message: "Approving user does not exist",
    detailCode: "HOME_LOCATION_APPROVER_NOT_FOUND",
    type: "conflict"
  },
  fk_messages_sender: {
    field: "senderUserId",
    message: "Sender user does not exist",
    detailCode: "SENDER_USER_NOT_FOUND",
    type: "conflict"
  },
  fk_messages_receiver: {
    field: "receiverUserId",
    message: "Receiver user does not exist",
    detailCode: "RECEIVER_USER_NOT_FOUND",
    type: "conflict"
  },
  fk_announcements_created_by: {
    field: "createdBy",
    message: "Announcement creator does not exist",
    detailCode: "ANNOUNCEMENT_CREATOR_NOT_FOUND",
    type: "conflict"
  },
  fk_notifications_user: {
    field: "userId",
    message: "Notification user does not exist",
    detailCode: "NOTIFICATION_USER_NOT_FOUND",
    type: "conflict"
  }
};

const CHECK_CONSTRAINT_MAP: Record<string, ConstraintMapping> = {
  chk_users_role: {
    field: "role",
    message: "Role is invalid",
    detailCode: "INVALID_ROLE",
    type: "validation"
  },
  chk_drivers_status: {
    field: "driverStatus",
    message: "Driver status is invalid",
    detailCode: "INVALID_DRIVER_STATUS",
    type: "validation"
  },
  chk_academic_years_dates: {
    field: "endDate",
    message: "Academic year end date must be later than start date",
    detailCode: "INVALID_ACADEMIC_YEAR_DATE_RANGE",
    type: "validation"
  },
  chk_semesters_dates: {
    field: "endDate",
    message: "Semester end date must be later than start date",
    detailCode: "INVALID_SEMESTER_DATE_RANGE",
    type: "validation"
  },
  chk_grade_levels_order: {
    field: "levelOrder",
    message: "Grade level order must be greater than zero",
    detailCode: "INVALID_GRADE_LEVEL_ORDER",
    type: "validation"
  },
  chk_classes_capacity: {
    field: "capacity",
    message: "Class capacity must be greater than zero",
    detailCode: "INVALID_CLASS_CAPACITY",
    type: "validation"
  },
  chk_students_gender: {
    field: "gender",
    message: "Gender must be either male or female",
    detailCode: "INVALID_STUDENT_GENDER",
    type: "validation"
  },
  chk_students_status: {
    field: "status",
    message: "Student status is invalid",
    detailCode: "INVALID_STUDENT_STATUS",
    type: "validation"
  },
  chk_student_promotions_different_classes: {
    field: "toClassId",
    message: "Target class must be different from the current class",
    detailCode: "INVALID_STUDENT_PROMOTION_CLASS",
    type: "validation"
  },
  chk_assessments_max_score: {
    field: "maxScore",
    message: "Maximum score must be greater than zero",
    detailCode: "INVALID_ASSESSMENT_MAX_SCORE",
    type: "validation"
  },
  chk_assessments_weight: {
    field: "weight",
    message: "Assessment weight must be zero or greater",
    detailCode: "INVALID_ASSESSMENT_WEIGHT",
    type: "validation"
  },
  chk_student_assessments_score_non_negative: {
    field: "score",
    message: "Score must be zero or greater",
    detailCode: "INVALID_STUDENT_ASSESSMENT_SCORE",
    type: "validation"
  },
  chk_homework_dates: {
    field: "dueDate",
    message: "Homework due date must be later than or equal to the assigned date",
    detailCode: "INVALID_HOMEWORK_DATE_RANGE",
    type: "validation"
  },
  chk_homework_submissions_status: {
    field: "status",
    message: "Homework submission status is invalid",
    detailCode: "INVALID_HOMEWORK_SUBMISSION_STATUS",
    type: "validation"
  },
  chk_behavior_categories_type: {
    field: "behaviorType",
    message: "Behavior type is invalid",
    detailCode: "INVALID_BEHAVIOR_TYPE",
    type: "validation"
  },
  chk_behavior_categories_severity: {
    field: "defaultSeverity",
    message: "Default severity must be between 1 and 5",
    detailCode: "INVALID_BEHAVIOR_CATEGORY_SEVERITY",
    type: "validation"
  },
  chk_behavior_records_actor: {
    field: "teacherId",
    message: "Behavior record must include either a teacher or a supervisor",
    detailCode: "INVALID_BEHAVIOR_RECORD_ACTOR",
    type: "validation"
  },
  chk_behavior_records_severity: {
    field: "severity",
    message: "Behavior severity must be between 1 and 5",
    detailCode: "INVALID_BEHAVIOR_RECORD_SEVERITY",
    type: "validation"
  },
  chk_attendance_sessions_period_no: {
    field: "periodNo",
    message: "Period number must be greater than zero",
    detailCode: "INVALID_ATTENDANCE_PERIOD_NO",
    type: "validation"
  },
  chk_attendance_status: {
    field: "status",
    message: "Attendance status is invalid",
    detailCode: "INVALID_ATTENDANCE_STATUS",
    type: "validation"
  },
  chk_buses_capacity: {
    field: "capacity",
    message: "Bus capacity must be greater than zero",
    detailCode: "INVALID_BUS_CAPACITY",
    type: "validation"
  },
  chk_buses_status: {
    field: "status",
    message: "Bus status is invalid",
    detailCode: "INVALID_BUS_STATUS",
    type: "validation"
  },
  chk_routes_estimated_duration: {
    field: "estimatedDurationMinutes",
    message: "Estimated duration must be zero or greater",
    detailCode: "INVALID_ROUTE_ESTIMATED_DURATION",
    type: "validation"
  },
  chk_bus_stops_latitude: {
    field: "latitude",
    message: "Latitude must be between -90 and 90",
    detailCode: "INVALID_BUS_STOP_LATITUDE",
    type: "validation"
  },
  chk_bus_stops_longitude: {
    field: "longitude",
    message: "Longitude must be between -180 and 180",
    detailCode: "INVALID_BUS_STOP_LONGITUDE",
    type: "validation"
  },
  chk_bus_stops_order: {
    field: "stopOrder",
    message: "Stop order must be greater than zero",
    detailCode: "INVALID_BUS_STOP_ORDER",
    type: "validation"
  },
  chk_student_bus_assignments_dates: {
    field: "endDate",
    message: "Assignment end date must be later than or equal to the start date",
    detailCode: "INVALID_STUDENT_BUS_ASSIGNMENT_DATE_RANGE",
    type: "validation"
  },
  chk_transport_route_assignments_dates: {
    field: "endDate",
    message: "Route assignment end date must be later than or equal to the start date",
    detailCode: "INVALID_TRANSPORT_ROUTE_ASSIGNMENT_DATE_RANGE",
    type: "validation"
  },
  chk_trips_type: {
    field: "tripType",
    message: "Trip type is invalid",
    detailCode: "INVALID_TRIP_TYPE",
    type: "validation"
  },
  chk_trips_status: {
    field: "tripStatus",
    message: "Trip status is invalid",
    detailCode: "INVALID_TRIP_STATUS",
    type: "validation"
  },
  chk_trips_time_order: {
    field: "endedAt",
    message: "Trip end time must be later than or equal to the start time",
    detailCode: "INVALID_TRIP_TIME_ORDER",
    type: "validation"
  },
  chk_bus_location_history_latitude: {
    field: "latitude",
    message: "Latitude must be between -90 and 90",
    detailCode: "INVALID_BUS_LOCATION_LATITUDE",
    type: "validation"
  },
  chk_bus_location_history_longitude: {
    field: "longitude",
    message: "Longitude must be between -180 and 180",
    detailCode: "INVALID_BUS_LOCATION_LONGITUDE",
    type: "validation"
  },
  chk_trip_student_events_type: {
    field: "eventType",
    message: "Trip student event type is invalid",
    detailCode: "INVALID_TRIP_STUDENT_EVENT_TYPE",
    type: "validation"
  },
  chk_student_transport_home_locations_latitude: {
    field: "latitude",
    message: "Latitude must be between -90 and 90",
    detailCode: "INVALID_STUDENT_HOME_LOCATION_LATITUDE",
    type: "validation"
  },
  chk_student_transport_home_locations_longitude: {
    field: "longitude",
    message: "Longitude must be between -180 and 180",
    detailCode: "INVALID_STUDENT_HOME_LOCATION_LONGITUDE",
    type: "validation"
  },
  chk_student_transport_home_locations_source: {
    field: "source",
    message: "Home location source is invalid",
    detailCode: "INVALID_STUDENT_HOME_LOCATION_SOURCE",
    type: "validation"
  },
  chk_student_transport_home_locations_status: {
    field: "status",
    message: "Home location status is invalid",
    detailCode: "INVALID_STUDENT_HOME_LOCATION_STATUS",
    type: "validation"
  },
  chk_messages_not_self: {
    field: "receiverUserId",
    message: "You cannot send a message to yourself",
    detailCode: "MESSAGE_RECEIVER_SELF",
    type: "validation"
  },
  chk_messages_body_not_blank: {
    field: "messageBody",
    message: "Message body cannot be blank",
    detailCode: "INVALID_MESSAGE_BODY",
    type: "validation"
  },
  chk_announcements_title_not_blank: {
    field: "title",
    message: "Announcement title cannot be blank",
    detailCode: "INVALID_ANNOUNCEMENT_TITLE",
    type: "validation"
  },
  chk_announcements_content_not_blank: {
    field: "content",
    message: "Announcement content cannot be blank",
    detailCode: "INVALID_ANNOUNCEMENT_CONTENT",
    type: "validation"
  },
  chk_announcements_target_role: {
    field: "targetRole",
    message: "Announcement target role is invalid",
    detailCode: "INVALID_ANNOUNCEMENT_TARGET_ROLE",
    type: "validation"
  },
  chk_announcements_expiry: {
    field: "expiresAt",
    message: "Announcement expiry must be later than or equal to its publish time",
    detailCode: "INVALID_ANNOUNCEMENT_EXPIRY",
    type: "validation"
  },
  chk_notifications_title_not_blank: {
    field: "title",
    message: "Notification title cannot be blank",
    detailCode: "INVALID_NOTIFICATION_TITLE",
    type: "validation"
  },
  chk_notifications_message_not_blank: {
    field: "message",
    message: "Notification message cannot be blank",
    detailCode: "INVALID_NOTIFICATION_MESSAGE",
    type: "validation"
  },
  chk_notifications_read_consistency: {
    field: "isRead",
    message: "Notification read state is inconsistent",
    detailCode: "INVALID_NOTIFICATION_READ_STATE",
    type: "validation"
  }
};

const MESSAGE_PATTERN_MAP: PatternMapping[] = [
  {
    pattern: /assessment semester .* belongs to academic year .* not .*/i,
    field: "semesterId",
    message: "Semester must belong to the selected academic year",
    detailCode: "ASSESSMENT_SEMESTER_YEAR_MISMATCH",
    type: "validation"
  },
  {
    pattern: /score .* exceeds max_score .* for assessment .*/i,
    field: "score",
    message: "Score cannot exceed the assessment maximum score",
    detailCode: "ASSESSMENT_SCORE_EXCEEDS_MAX_SCORE",
    type: "validation"
  },
  {
    pattern: /student .* belongs to class .* but assessment .* is for class .*/i,
    field: "studentId",
    message: "Student does not belong to the assessment class",
    detailCode: "STUDENT_ASSESSMENT_CLASS_MISMATCH",
    type: "validation"
  },
  {
    pattern: /attendance session semester .* belongs to academic year .* not .*/i,
    field: "semesterId",
    message: "Semester must belong to the selected academic year",
    detailCode: "SEMESTER_YEAR_MISMATCH",
    type: "validation"
  },
  {
    pattern: /homework semester .* belongs to academic year .* not .*/i,
    field: "semesterId",
    message: "Semester must belong to the selected academic year",
    detailCode: "HOMEWORK_SEMESTER_YEAR_MISMATCH",
    type: "validation"
  },
  {
    pattern: /student .* belongs to class .* but homework .* is for class .*/i,
    field: "studentId",
    message: "Student does not belong to the homework class",
    detailCode: "HOMEWORK_SUBMISSION_CLASS_MISMATCH",
    type: "validation"
  },
  {
    pattern: /behavior record semester .* belongs to academic year .* not .*/i,
    field: "semesterId",
    message: "Semester must belong to the selected academic year",
    detailCode: "BEHAVIOR_SEMESTER_YEAR_MISMATCH",
    type: "validation"
  },
  {
    pattern: /student .* belongs to class .* but attendance session .* is for class .*/i,
    field: "studentId",
    message: "Student does not belong to the session class",
    detailCode: "ATTENDANCE_STUDENT_CLASS_MISMATCH",
    type: "validation"
  },
  {
    pattern: /bus stop .* belongs to route .*, not route .*/i,
    field: "stopId",
    message: "Bus stop must belong to the selected route",
    detailCode: "BUS_STOP_ROUTE_MISMATCH",
    type: "validation"
  },
  {
    pattern: /cannot insert location history for trip .* with status .*/i,
    field: "tripId",
    message: "Location history can only be recorded for an active trip",
    detailCode: "TRIP_LOCATION_STATUS_INVALID",
    type: "validation"
  },
  {
    pattern: /invalid trip status transition from .* to .*/i,
    field: "tripStatus",
    message: "Trip status transition is invalid",
    detailCode: "TRIP_STATUS_TRANSITION_INVALID",
    type: "validation"
  },
  {
    pattern: /student .* has no active bus assignment/i,
    field: "studentId",
    message: "Student does not have an active bus assignment",
    detailCode: "STUDENT_ACTIVE_BUS_ASSIGNMENT_NOT_FOUND",
    type: "validation"
  },
  {
    pattern: /student .* has no transport assignment for trip .* date .*/i,
    field: "studentId",
    message: "Student does not have a transport assignment for the trip date",
    detailCode: "STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND",
    type: "validation"
  },
  {
    pattern: /student .* is assigned to route .*, but trip .* is on route .*/i,
    field: "studentId",
    message: "Student bus assignment does not match the trip route",
    detailCode: "TRIP_STUDENT_ROUTE_MISMATCH",
    type: "validation"
  },
  {
    pattern: /stop .* belongs to route .*, not trip route .*/i,
    field: "stopId",
    message: "Stop must belong to the trip route",
    detailCode: "TRIP_EVENT_STOP_ROUTE_MISMATCH",
    type: "validation"
  },
  {
    pattern: /cannot create ended trip without started_at/i,
    field: "tripStatus",
    message: "Trip cannot end before it has started",
    detailCode: "TRIP_END_BEFORE_START",
    type: "validation"
  }
];

const createMappedError = (
  mapping: ConstraintMapping,
  fallbackField?: string
): ConflictError | ValidationError => {
  const details = buildDetails(mapping.message, mapping.detailCode, mapping.field ?? fallbackField);

  if (mapping.type === "validation") {
    return new ValidationError(mapping.message, details);
  }

  return new ConflictError(mapping.message, details);
};

const mapKnownConstraint = (error: PostgresErrorShape): ConflictError | ValidationError | null => {
  const constraint = error.constraint;

  if (!constraint) {
    return null;
  }

  const mapping =
    UNIQUE_CONSTRAINT_MAP[constraint] ??
    FOREIGN_KEY_CONSTRAINT_MAP[constraint] ??
    CHECK_CONSTRAINT_MAP[constraint];

  if (!mapping) {
    return null;
  }

  return createMappedError(mapping, resolveField(error));
};

const mapKnownMessage = (error: PostgresErrorShape): ConflictError | ValidationError | null => {
  const source = error.message ?? error.detail;

  if (!source) {
    return null;
  }

  const mapping = MESSAGE_PATTERN_MAP.find((candidate) => candidate.pattern.test(source));

  if (!mapping) {
    return null;
  }

  return createMappedError(mapping, resolveField(error));
};

export const isPostgresError = (error: unknown): error is PostgresErrorShape =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string";

export const mapPostgresError = (error: unknown): unknown => {
  if (!isPostgresError(error)) {
    return error;
  }

  const mappedConstraintError = mapKnownConstraint(error);

  if (mappedConstraintError) {
    return mappedConstraintError;
  }

  const mappedMessageError = mapKnownMessage(error);

  if (mappedMessageError) {
    return mappedMessageError;
  }

  switch (error.code) {
    case "23505":
      return new ConflictError(
        buildFallbackMessage(resolveField(error), "Resource already exists", "already exists"),
        [
          {
            field: resolveField(error),
            code: error.constraint ?? "UNIQUE_VIOLATION",
            message: buildFallbackMessage(
              resolveField(error),
              "Resource already exists",
              "already exists"
            )
          }
        ]
      );
    case "23503":
      return new ConflictError(
        buildFallbackMessage(
          resolveField(error),
          "Referenced resource does not exist",
          "references a resource that does not exist"
        ),
        [
          {
            field: resolveField(error),
            code: error.constraint ?? "FOREIGN_KEY_VIOLATION",
            message: buildFallbackMessage(
              resolveField(error),
              "Referenced resource does not exist",
              "references a resource that does not exist"
            )
          }
        ]
      );
    case "23502":
      return new ValidationError("Missing required field", [
        {
          field: resolveField(error),
          code: error.constraint ?? error.code,
          message: buildFallbackMessage(
            resolveField(error),
            "A required field is missing",
            "is required"
          )
        }
      ]);
    case "23514":
      return new ValidationError(
        buildFallbackMessage(
          resolveField(error),
          "Constraint validation failed",
          "has an invalid value"
        ),
        [
          {
            field: resolveField(error),
            code: error.constraint ?? error.code,
            message: buildFallbackMessage(
              resolveField(error),
              "One or more inputs failed validation",
              "has an invalid value"
            )
          }
        ]
      );
    case "22P02":
      return new ValidationError("Invalid input syntax", [
        {
          field: resolveField(error),
          code: error.code,
          message: buildFallbackMessage(
            resolveField(error),
            "One or more inputs have an invalid format",
            "has an invalid format"
          )
        }
      ]);
    default:
      return error;
  }
};

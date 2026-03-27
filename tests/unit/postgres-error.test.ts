import { describe, expect, it } from "vitest";

import { ConflictError } from "../../src/common/errors/conflict-error";
import { mapPostgresError } from "../../src/common/errors/postgres-error";
import { ValidationError } from "../../src/common/errors/validation-error";

describe("mapPostgresError", () => {
  describe("known unique constraints", () => {
    it("maps duplicate student academic numbers to a domain-aware ConflictError", () => {
      const error = mapPostgresError({
        code: "23505",
        constraint: "uq_students_academic_no",
        detail: "Key (academic_no)=(STU-1001) already exists."
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "Academic number already exists",
        details: [
          {
            field: "academicNo",
            code: "STUDENT_ACADEMIC_NO_ALREADY_EXISTS"
          }
        ]
      });
    });

    it("maps duplicate user emails to a domain-aware ConflictError", () => {
      const error = mapPostgresError({
        code: "23505",
        constraint: "uq_users_email_not_null"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "Email already exists",
        details: [
          {
            field: "email",
            code: "EMAIL_ALREADY_EXISTS"
          }
        ]
      });
    });

    it("maps duplicate parent links to a conflict error", () => {
      const error = mapPostgresError({
        code: "23505",
        constraint: "uq_student_parents_pair"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "This parent is already linked to the student",
        details: [
          {
            field: "parentId",
            code: "STUDENT_PARENT_LINK_ALREADY_EXISTS"
          }
        ]
      });
    });

    it("maps duplicate student assessments to a conflict error", () => {
      const error = mapPostgresError({
        code: "23505",
        constraint: "uq_student_assessments_unique"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "This student already has a recorded score for the selected assessment",
        details: [
          {
            field: "studentId",
            code: "STUDENT_ASSESSMENT_ALREADY_EXISTS"
          }
        ]
      });
    });

    it("maps one active transport assignment conflicts to a conflict error", () => {
      const error = mapPostgresError({
        code: "23505",
        constraint: "uq_student_bus_assignments_one_active"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "Student already has an active transport assignment",
        details: [
          {
            field: "studentId",
            code: "STUDENT_ACTIVE_TRANSPORT_ASSIGNMENT_EXISTS"
          }
        ]
      });
    });

    it("maps duplicate attendance sessions to a conflict error", () => {
      const error = mapPostgresError({
        code: "23505",
        constraint: "uq_attendance_sessions_unique"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message:
          "Attendance session already exists for the selected class, subject, teacher, semester, date, and period",
        details: [
          {
            field: "periodNo",
            code: "ATTENDANCE_SESSION_ALREADY_EXISTS"
          }
        ]
      });
    });

    it("maps duplicate route assignments and duplicate daily trips to conflict errors", () => {
      const busConflict = mapPostgresError({
        code: "23505",
        constraint: "uq_transport_route_assignments_one_active_bus"
      });
      const tripConflict = mapPostgresError({
        code: "23505",
        constraint: "uq_trips_bus_route_date_type"
      });

      expect(busConflict).toBeInstanceOf(ConflictError);
      expect(busConflict).toMatchObject({
        message: "This bus already has an active route assignment",
        details: [
          {
            field: "busId",
            code: "TRANSPORT_ROUTE_ACTIVE_BUS_CONFLICT"
          }
        ]
      });

      expect(tripConflict).toBeInstanceOf(ConflictError);
      expect(tripConflict).toMatchObject({
        message: "A trip already exists for the selected bus, route, date, and type",
        details: [
          {
            field: "tripDate",
            code: "TRIP_ALREADY_EXISTS"
          }
        ]
      });
    });

    it("maps duplicate subject offerings to a conflict error", () => {
      const error = mapPostgresError({
        code: "23505",
        constraint: "uq_subject_offerings_subject_semester"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "This subject is already offered in the selected semester",
        details: [
          {
            field: "subjectId",
            code: "SUBJECT_OFFERING_ALREADY_EXISTS"
          }
        ]
      });
    });
  });

  describe("known foreign key constraints", () => {
    it("maps known student foreign keys to a conflict error", () => {
      const error = mapPostgresError({
        code: "23503",
        constraint: "fk_students_class",
        column: "class_id"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "Selected class does not exist",
        details: [
          {
            field: "classId",
            code: "CLASS_NOT_FOUND"
          }
        ]
      });
    });

    it("maps communication foreign keys to a conflict error", () => {
      const error = mapPostgresError({
        code: "23503",
        constraint: "fk_notifications_user"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "Notification user does not exist",
        details: [
          {
            field: "userId",
            code: "NOTIFICATION_USER_NOT_FOUND"
          }
        ]
      });
    });

    it("maps transport home location foreign keys to conflict errors", () => {
      const error = mapPostgresError({
        code: "23503",
        constraint: "student_transport_home_locations_student_id_fkey"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "Student does not exist",
        details: [
          {
            field: "studentId",
            code: "STUDENT_NOT_FOUND"
          }
        ]
      });
    });

    it("maps subject offering foreign keys to conflict errors", () => {
      const subjectError = mapPostgresError({
        code: "23503",
        constraint: "subject_offerings_subject_id_fkey"
      });
      const semesterError = mapPostgresError({
        code: "23503",
        constraint: "subject_offerings_semester_id_fkey"
      });

      expect(subjectError).toBeInstanceOf(ConflictError);
      expect(subjectError).toMatchObject({
        message: "Subject does not exist"
      });

      expect(semesterError).toBeInstanceOf(ConflictError);
      expect(semesterError).toMatchObject({
        message: "Semester does not exist"
      });
    });
  });

  describe("known check constraints", () => {
    it("maps student promotion checks to a validation error", () => {
      const error = mapPostgresError({
        code: "23514",
        constraint: "chk_student_promotions_different_classes"
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Target class must be different from the current class",
        details: [
          {
            field: "toClassId",
            code: "INVALID_STUDENT_PROMOTION_CLASS"
          }
        ]
      });
    });

    it("maps attendance checks to a validation error", () => {
      const error = mapPostgresError({
        code: "23514",
        constraint: "chk_attendance_status"
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Attendance status is invalid",
        details: [
          {
            field: "status",
            code: "INVALID_ATTENDANCE_STATUS"
          }
        ]
      });
    });

    it("maps behavior checks to a validation error", () => {
      const error = mapPostgresError({
        code: "23514",
        constraint: "chk_behavior_records_severity"
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Behavior severity must be between 1 and 5",
        details: [
          {
            field: "severity",
            code: "INVALID_BEHAVIOR_RECORD_SEVERITY"
          }
        ]
      });
    });

    it("maps communication checks to validation errors", () => {
      const messageError = mapPostgresError({
        code: "23514",
        constraint: "chk_messages_not_self"
      });
      const announcementError = mapPostgresError({
        code: "23514",
        constraint: "chk_announcements_target_role"
      });

      expect(messageError).toBeInstanceOf(ValidationError);
      expect(messageError).toMatchObject({
        message: "You cannot send a message to yourself",
        details: [
          {
            field: "receiverUserId",
            code: "MESSAGE_RECEIVER_SELF"
          }
        ]
      });

      expect(announcementError).toBeInstanceOf(ValidationError);
      expect(announcementError).toMatchObject({
        message: "Announcement target role is invalid"
      });
    });

    it("maps transport alignment checks to validation errors", () => {
      const routeAssignmentError = mapPostgresError({
        code: "23514",
        constraint: "chk_transport_route_assignments_dates"
      });
      const homeLocationError = mapPostgresError({
        code: "23514",
        constraint: "chk_student_transport_home_locations_status"
      });

      expect(routeAssignmentError).toBeInstanceOf(ValidationError);
      expect(routeAssignmentError).toMatchObject({
        message: "Route assignment end date must be later than or equal to the start date"
      });

      expect(homeLocationError).toBeInstanceOf(ValidationError);
      expect(homeLocationError).toMatchObject({
        message: "Home location status is invalid"
      });
    });
  });

  describe("trigger and raised-message mappings", () => {
    it("maps attendance trigger messages to a validation error", () => {
      const error = mapPostgresError({
        code: "P0001",
        message: "Student 10 belongs to class 2, but attendance session 4 is for class 1"
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Student does not belong to the session class",
        details: [
          {
            field: "studentId",
            code: "ATTENDANCE_STUDENT_CLASS_MISMATCH"
          }
        ]
      });
    });

    it("maps assessment trigger messages to validation errors", () => {
      const semesterMismatch = mapPostgresError({
        code: "P0001",
        message: "Assessment semester 3 belongs to academic year 2, not 1"
      });
      const scoreExceeded = mapPostgresError({
        code: "P0001",
        message: "Score 11 exceeds max_score 10 for assessment 4"
      });
      const classMismatch = mapPostgresError({
        code: "P0001",
        message: "Student 3 belongs to class 2, but assessment 4 is for class 1"
      });

      expect(semesterMismatch).toBeInstanceOf(ValidationError);
      expect(semesterMismatch).toMatchObject({
        message: "Semester must belong to the selected academic year"
      });
      expect(scoreExceeded).toBeInstanceOf(ValidationError);
      expect(scoreExceeded).toMatchObject({
        message: "Score cannot exceed the assessment maximum score"
      });
      expect(classMismatch).toBeInstanceOf(ValidationError);
      expect(classMismatch).toMatchObject({
        message: "Student does not belong to the assessment class"
      });
    });

    it("maps behavior trigger messages to validation errors", () => {
      const error = mapPostgresError({
        code: "P0001",
        message: "Behavior record semester 3 belongs to academic year 2, not 1"
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Semester must belong to the selected academic year",
        details: [
          {
            field: "semesterId",
            code: "BEHAVIOR_SEMESTER_YEAR_MISMATCH"
          }
        ]
      });
    });

    it("maps transport trigger messages to validation errors", () => {
      const stopRouteMismatch = mapPostgresError({
        code: "P0001",
        message: "Bus stop 4 belongs to route 2, not route 1"
      });
      const tripStatusTransition = mapPostgresError({
        code: "P0001",
        message: "Invalid trip status transition from scheduled to ended"
      });
      const studentRouteMismatch = mapPostgresError({
        code: "P0001",
        message: "Student 1 is assigned to route 2, but trip 4 is on route 1"
      });

      expect(stopRouteMismatch).toBeInstanceOf(ValidationError);
      expect(stopRouteMismatch).toMatchObject({
        message: "Bus stop must belong to the selected route"
      });

      expect(tripStatusTransition).toBeInstanceOf(ValidationError);
      expect(tripStatusTransition).toMatchObject({
        message: "Trip status transition is invalid"
      });

      expect(studentRouteMismatch).toBeInstanceOf(ValidationError);
      expect(studentRouteMismatch).toMatchObject({
        message: "Student bus assignment does not match the trip route"
      });
    });

    it("maps trip-date-aware transport assignment messages to validation errors", () => {
      const error = mapPostgresError({
        code: "P0001",
        message: "Student 1 has no transport assignment for trip 4 date 2026-03-13"
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Student does not have a transport assignment for the trip date",
        details: [
          {
            field: "studentId",
            code: "STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND"
          }
        ]
      });
    });
  });

  describe("fallback mappings", () => {
    it("falls back to a humanized unique violation message using detail field extraction", () => {
      const error = mapPostgresError({
        code: "23505",
        detail: "Key (student_id)=(1) already exists."
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "Student Id already exists",
        details: [
          {
            field: "studentId",
            code: "UNIQUE_VIOLATION",
            message: "Student Id already exists"
          }
        ]
      });
    });

    it("falls back to a humanized foreign key message using the column name", () => {
      const error = mapPostgresError({
        code: "23503",
        column: "teacher_id"
      });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "Teacher Id references a resource that does not exist",
        details: [
          {
            field: "teacherId",
            code: "FOREIGN_KEY_VIOLATION",
            message: "Teacher Id references a resource that does not exist"
          }
        ]
      });
    });

    it("maps not-null violations to a validation error", () => {
      const error = mapPostgresError({
        code: "23502",
        column: "date_of_birth"
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Missing required field",
        details: [
          {
            field: "dateOfBirth",
            code: "23502",
            message: "Date Of Birth is required"
          }
        ]
      });
    });

    it("falls back to a humanized check violation message", () => {
      const error = mapPostgresError({
        code: "23514",
        column: "trip_status"
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Trip Status has an invalid value",
        details: [
          {
            field: "tripStatus",
            code: "23514",
            message: "Trip Status has an invalid value"
          }
        ]
      });
    });

    it("maps invalid syntax violations to a validation error", () => {
      const error = mapPostgresError({
        code: "22P02",
        column: "student_id",
        detail: "invalid input syntax for type bigint"
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Invalid input syntax",
        details: [
          {
            field: "studentId",
            code: "22P02",
            message: "Student Id has an invalid format"
          }
        ]
      });
    });
  });

  it("returns unknown errors untouched", () => {
    const error = new Error("boom");

    expect(mapPostgresError(error)).toBe(error);
  });
});

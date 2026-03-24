import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { OwnershipService } from "../../../common/services/ownership.service";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import { db } from "../../../database/db";
import type { AutomationPort } from "../../automation/types/automation.types";
import type {
  AttendanceRecordResponseDto,
  AttendanceSessionDetailResponseDto,
  AttendanceSessionListItemResponseDto,
  CreateAttendanceSessionRequestDto,
  ListAttendanceSessionsQueryDto,
  SaveAttendanceRecordsRequestDto,
  UpdateAttendanceRecordRequestDto
} from "../dto/attendance.dto";
import {
  toAttendanceRecordResponseDto,
  toAttendanceSessionDetailResponseDto,
  toAttendanceSessionListItemResponseDto
} from "../mapper/attendance.mapper";
import type { AttendanceRepository } from "../repository/attendance.repository";
import type {
  AttendanceRecordRow,
  AttendanceSessionRow,
  AttendanceSessionStudentRow,
  ClassReferenceRow,
  SemesterReferenceRow,
  SubjectReferenceRow
} from "../types/attendance.types";
import type { SupervisorProfile, TeacherProfile } from "../../../common/types/profile.types";

type AttendanceActor =
  | {
      role: "admin";
      authUser: AuthenticatedUser;
    }
  | {
      role: "teacher";
      authUser: AuthenticatedUser;
      teacher: TeacherProfile;
    }
  | {
      role: "supervisor";
      authUser: AuthenticatedUser;
      supervisor: SupervisorProfile;
    };

const assertFound = <T>(entity: T | null, label: string): T => {
  if (!entity) {
    throw new NotFoundError(`${label} not found`);
  }

  return entity;
};

const assertClassBelongsToAcademicYear = (
  classRow: ClassReferenceRow,
  academicYearId: string
): void => {
  if (classRow.academicYearId !== academicYearId) {
    throw new ValidationError("Class must belong to the selected academic year", [
      {
        field: "classId",
        code: "CLASS_YEAR_MISMATCH",
        message: "Class must belong to the selected academic year"
      }
    ]);
  }
};

const assertSemesterBelongsToAcademicYear = (
  semester: SemesterReferenceRow,
  academicYearId: string
): void => {
  if (semester.academicYearId !== academicYearId) {
    throw new ValidationError("Semester must belong to the selected academic year", [
      {
        field: "semesterId",
        code: "SEMESTER_YEAR_MISMATCH",
        message: "Semester must belong to the selected academic year"
      }
    ]);
  }
};

const assertSubjectBelongsToClassGradeLevel = (
  subject: SubjectReferenceRow,
  classRow: ClassReferenceRow
): void => {
  if (subject.gradeLevelId !== classRow.gradeLevelId) {
    throw new ValidationError(
      "Subject must belong to the same grade level as the selected class",
      [
        {
          field: "subjectId",
          code: "SUBJECT_GRADE_LEVEL_MISMATCH",
          message: "Subject must belong to the same grade level as the selected class"
        }
      ]
    );
  }
};

const assertAdminTeacherId = (teacherId?: string): string => {
  if (!teacherId) {
    throw new ValidationError("Teacher is required", [
      {
        field: "teacherId",
        code: "TEACHER_ID_REQUIRED",
        message: "Teacher is required for admin-created attendance sessions"
      }
    ]);
  }

  return teacherId;
};

const assertFullSnapshotRecords = (
  roster: AttendanceSessionStudentRow[],
  submittedStudentIds: string[]
): void => {
  const duplicateIds = submittedStudentIds.filter(
    (studentId, index) => submittedStudentIds.indexOf(studentId) !== index
  );

  if (duplicateIds.length > 0) {
    throw new ValidationError("Attendance payload contains duplicate students", [
      {
        field: "records",
        code: "ATTENDANCE_DUPLICATE_STUDENT",
        message: "Each student can only appear once in the attendance payload"
      }
    ]);
  }

  const expectedIds = roster.map((student) => student.studentId);
  const expectedSet = new Set(expectedIds);
  const submittedSet = new Set(submittedStudentIds);

  const missingIds = expectedIds.filter((studentId) => !submittedSet.has(studentId));
  const extraIds = submittedStudentIds.filter((studentId) => !expectedSet.has(studentId));

  if (missingIds.length > 0 || extraIds.length > 0) {
    throw new ValidationError(
      "Attendance payload must include every active student in the session roster exactly once",
      [
        ...missingIds.map((studentId) => ({
          field: "records",
          code: "ATTENDANCE_ROSTER_STUDENT_MISSING",
          message: `Student ${studentId} is missing from the attendance payload`
        })),
        ...extraIds.map((studentId) => ({
          field: "records",
          code: "ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED",
          message: `Student ${studentId} does not belong to the attendance session roster`
        }))
      ]
    );
  }
};

export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly profileResolutionService: ProfileResolutionService = new ProfileResolutionService(),
    private readonly ownershipService: OwnershipService = new OwnershipService(),
    private readonly automationService: AutomationPort | null = null
  ) {}

  async createSession(
    authUser: AuthenticatedUser,
    payload: CreateAttendanceSessionRequestDto
  ): Promise<AttendanceSessionListItemResponseDto> {
    const actor = await this.resolveActor(authUser);

    if (actor.role === "supervisor") {
      throw new ForbiddenError("Supervisors cannot create attendance sessions");
    }

    const classRow = assertFound(
      await this.attendanceRepository.findClassById(payload.classId),
      "Class"
    );
    const subjectRow = assertFound(
      await this.attendanceRepository.findSubjectById(payload.subjectId),
      "Subject"
    );
    const academicYear = assertFound(
      await this.attendanceRepository.findAcademicYearById(payload.academicYearId),
      "Academic year"
    );
    const semester = assertFound(
      await this.attendanceRepository.findSemesterById(payload.semesterId),
      "Semester"
    );

    assertClassBelongsToAcademicYear(classRow, academicYear.id);
    assertSemesterBelongsToAcademicYear(semester, academicYear.id);
    assertSubjectBelongsToClassGradeLevel(subjectRow, classRow);

    const teacherId =
      actor.role === "teacher" ? actor.teacher.teacherId : assertAdminTeacherId(payload.teacherId);

    assertFound(await this.attendanceRepository.findTeacherById(teacherId), "Teacher");

    await this.assertTeacherAssignment(
      teacherId,
      payload.classId,
      payload.academicYearId,
      payload.subjectId
    );

    const session = await db.withTransaction(async (client) => {
      const sessionId = await this.attendanceRepository.createAttendanceSession(
        {
          classId: payload.classId,
          subjectId: payload.subjectId,
          teacherId,
          academicYearId: payload.academicYearId,
          semesterId: payload.semesterId,
          sessionDate: payload.sessionDate,
          periodNo: payload.periodNo,
          title: payload.title,
          notes: payload.notes
        },
        client
      );

      return assertFound(
        await this.attendanceRepository.findAttendanceSessionById(sessionId, client),
        "Attendance session"
      );
    });

    return toAttendanceSessionListItemResponseDto(session);
  }

  async listSessions(
    authUser: AuthenticatedUser,
    filters: ListAttendanceSessionsQueryDto
  ): Promise<PaginatedData<AttendanceSessionListItemResponseDto>> {
    const actor = await this.resolveActor(authUser);
    const rows = await this.attendanceRepository.listAttendanceSessions(
      filters,
      this.toRepositoryScope(actor)
    );

    return toPaginatedData(
      rows.rows.map((row) => toAttendanceSessionListItemResponseDto(row)),
      filters.page,
      filters.limit,
      rows.totalItems
    );
  }

  async getSessionById(
    authUser: AuthenticatedUser,
    sessionId: string
  ): Promise<AttendanceSessionDetailResponseDto> {
    const { session } = await this.getAuthorizedSession(authUser, sessionId);
    const students = await this.attendanceRepository.listAttendanceSessionStudents(sessionId);

    return toAttendanceSessionDetailResponseDto(session, students);
  }

  async saveSessionAttendance(
    authUser: AuthenticatedUser,
    sessionId: string,
    payload: SaveAttendanceRecordsRequestDto
  ): Promise<AttendanceSessionDetailResponseDto> {
    await this.getAuthorizedSession(authUser, sessionId);

    const sessionDetail = await db.withTransaction(async (client) => {
      const roster = await this.attendanceRepository.listAttendanceSessionStudents(sessionId, client);

      assertFullSnapshotRecords(
        roster,
        payload.records.map((record) => record.studentId)
      );

      await this.attendanceRepository.upsertAttendanceRecords(sessionId, payload.records, client);

      const session = assertFound(
        await this.attendanceRepository.findAttendanceSessionById(sessionId, client),
        "Attendance session"
      );
      const students = await this.attendanceRepository.listAttendanceSessionStudents(
        sessionId,
        client
      );

      return {
        session,
        students
      };
    });

    await Promise.all(
      sessionDetail.students
        .filter(
          (student) =>
            student.attendanceStatus === "absent" && Boolean(student.attendanceId)
        )
        .map((student) =>
          this.automationService?.onStudentAbsent({
            attendanceId: student.attendanceId!,
            studentId: student.studentId,
            studentName: student.fullName,
            subjectName: sessionDetail.session.subjectName,
            sessionDate: sessionDetail.session.sessionDate
          }) ?? Promise.resolve()
        )
    );

    return toAttendanceSessionDetailResponseDto(
      sessionDetail.session,
      sessionDetail.students
    );
  }

  async updateAttendanceRecord(
    authUser: AuthenticatedUser,
    attendanceId: string,
    payload: UpdateAttendanceRecordRequestDto
  ): Promise<AttendanceRecordResponseDto> {
    const actor = await this.resolveActor(authUser);
    const existingRecord = assertFound(
      await this.attendanceRepository.findAttendanceRecordById(attendanceId),
      "Attendance record"
    );

    await this.assertActorCanAccessRecord(actor, existingRecord);

    const updatedRecord = await db.withTransaction(async (client) => {
      await this.attendanceRepository.updateAttendanceRecord(attendanceId, payload, client);

      return assertFound(
        await this.attendanceRepository.findAttendanceRecordById(attendanceId, client),
        "Attendance record"
      );
    });

    if (updatedRecord.status === "absent") {
      await (this.automationService?.onStudentAbsent({
        attendanceId: updatedRecord.attendanceId,
        studentId: updatedRecord.studentId,
        studentName: updatedRecord.fullName,
        subjectName: updatedRecord.subjectName,
        sessionDate: updatedRecord.sessionDate
      }) ?? Promise.resolve());
    }

    return toAttendanceRecordResponseDto(updatedRecord);
  }

  private async resolveActor(authUser: AuthenticatedUser): Promise<AttendanceActor> {
    switch (authUser.role) {
      case "admin":
        return {
          role: "admin",
          authUser
        };
      case "teacher": {
        const teacher = await this.resolveTeacherProfile(authUser.userId);

        return {
          role: "teacher",
          authUser,
          teacher
        };
      }
      case "supervisor": {
        const supervisor = await this.resolveSupervisorProfile(authUser.userId);

        return {
          role: "supervisor",
          authUser,
          supervisor
        };
      }
      default:
        throw new ForbiddenError("You do not have permission to access attendance");
    }
  }

  private toRepositoryScope(actor: AttendanceActor) {
    if (actor.role === "teacher") {
      return {
        teacherId: actor.teacher.teacherId
      };
    }

    if (actor.role === "supervisor") {
      return {
        supervisorId: actor.supervisor.supervisorId
      };
    }

    return {};
  }

  private async getAuthorizedSession(
    authUser: AuthenticatedUser,
    sessionId: string
  ): Promise<{ actor: AttendanceActor; session: AttendanceSessionRow }> {
    const actor = await this.resolveActor(authUser);
    const session = assertFound(
      await this.attendanceRepository.findAttendanceSessionById(sessionId),
      "Attendance session"
    );

    await this.assertActorCanAccessSession(actor, session);

    return { actor, session };
  }

  private async assertActorCanAccessSession(
    actor: AttendanceActor,
    session: AttendanceSessionRow
  ): Promise<void> {
    if (actor.role === "admin") {
      return;
    }

    if (actor.role === "teacher") {
      if (session.teacherId !== actor.teacher.teacherId) {
        throw new ForbiddenError(
          "You do not have permission to access this attendance session"
        );
      }

      return;
    }

    await this.assertSupervisorAssignment(
      actor.supervisor.supervisorId,
      session.classId,
      session.academicYearId
    );
  }

  private async assertActorCanAccessRecord(
    actor: AttendanceActor,
    record: AttendanceRecordRow
  ): Promise<void> {
    if (actor.role === "admin") {
      return;
    }

    if (actor.role === "teacher") {
      if (record.teacherId !== actor.teacher.teacherId) {
        throw new ForbiddenError(
          "You do not have permission to update this attendance record"
        );
      }

      return;
    }

    await this.assertSupervisorAssignment(
      actor.supervisor.supervisorId,
      record.classId,
      record.academicYearId
    );
  }

  private async resolveTeacherProfile(userId: string): Promise<TeacherProfile> {
    const teacher = await this.attendanceRepository.findTeacherProfileByUserId(userId);

    if (teacher) {
      return {
        teacherId: teacher.teacherId,
        userId: teacher.teacherUserId,
        fullName: teacher.teacherFullName,
        email: teacher.teacherEmail,
        phone: teacher.teacherPhone,
        specialization: null,
        qualification: null,
        hireDate: null
      };
    }

    throw new NotFoundError("Teacher profile not found");
  }

  private async resolveSupervisorProfile(userId: string): Promise<SupervisorProfile> {
    const supervisor = await this.attendanceRepository.findSupervisorProfileByUserId(userId);

    if (supervisor) {
      return {
        supervisorId: supervisor.supervisorId,
        userId: supervisor.supervisorUserId,
        fullName: supervisor.supervisorFullName,
        email: supervisor.supervisorEmail,
        phone: supervisor.supervisorPhone,
        department: null
      };
    }

    throw new NotFoundError("Supervisor profile not found");
  }

  private async assertTeacherAssignment(
    teacherId: string,
    classId: string,
    academicYearId: string,
    subjectId: string
  ): Promise<void> {
    const hasAssignment = await this.attendanceRepository.hasTeacherAssignment(
      teacherId,
      classId,
      subjectId,
      academicYearId
    );

    if (!hasAssignment) {
      throw new ForbiddenError(
        "Teacher is not assigned to the selected class and subject for the academic year"
      );
    }
  }

  private async assertSupervisorAssignment(
    supervisorId: string,
    classId: string,
    academicYearId: string
  ): Promise<void> {
    const hasAssignment = await this.attendanceRepository.hasSupervisorAssignment(
      supervisorId,
      classId,
      academicYearId
    );

    if (!hasAssignment) {
      throw new ForbiddenError("You do not have permission to access this attendance session");
    }
  }
}

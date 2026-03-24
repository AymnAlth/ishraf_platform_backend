import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import { OwnershipService } from "../../../common/services/ownership.service";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import type { ParentProfile, TeacherProfile } from "../../../common/types/profile.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import type {
  CreateHomeworkRequestDto,
  HomeworkDetailResponseDto,
  HomeworkListItemResponseDto,
  ListHomeworkQueryDto,
  SaveHomeworkSubmissionsRequestDto,
  StudentHomeworkListResponseDto
} from "../dto/homework.dto";
import {
  toHomeworkDetailResponseDto,
  toHomeworkListItemResponseDto,
  toStudentHomeworkListResponseDto
} from "../mapper/homework.mapper";
import type { HomeworkRepository } from "../repository/homework.repository";
import type {
  ClassReferenceRow,
  HomeworkRow,
  HomeworkSubmissionRosterRow,
  SemesterReferenceRow,
  SubjectReferenceRow
} from "../types/homework.types";

type HomeworkActor =
  | { role: "admin"; authUser: AuthenticatedUser }
  | { role: "teacher"; authUser: AuthenticatedUser; teacher: TeacherProfile }
  | { role: "parent"; authUser: AuthenticatedUser; parent: ParentProfile };

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
        message: "Teacher is required for admin-created homework"
      }
    ]);
  }

  return teacherId;
};

const assertTeacherCannotSendTeacherId = (teacherId?: string): void => {
  if (teacherId !== undefined) {
    throw new ValidationError("teacherId is not allowed for teacher-created homework", [
      {
        field: "teacherId",
        code: "TEACHER_ID_NOT_ALLOWED",
        message: "teacherId is not allowed for teacher-created homework"
      }
    ]);
  }
};

const assertNoDuplicateStudents = (studentIds: string[]): void => {
  const duplicateIds = studentIds.filter(
    (studentId, index) => studentIds.indexOf(studentId) !== index
  );

  if (duplicateIds.length > 0) {
    throw new ValidationError("Homework submissions payload contains duplicate students", [
      {
        field: "records",
        code: "HOMEWORK_SUBMISSION_DUPLICATE_STUDENT",
        message: "Each student can only appear once in the homework submissions payload"
      }
    ]);
  }
};

const assertStudentsBelongToHomeworkRoster = (
  roster: HomeworkSubmissionRosterRow[],
  submittedStudentIds: string[]
): void => {
  const allowedStudents = new Set(roster.map((student) => student.studentId));
  const extraStudents = submittedStudentIds.filter((studentId) => !allowedStudents.has(studentId));

  if (extraStudents.length > 0) {
    throw new ValidationError("One or more students do not belong to the homework class", [
      ...extraStudents.map((studentId) => ({
        field: "records",
        code: "HOMEWORK_SUBMISSION_STUDENT_NOT_ALLOWED",
        message: `Student ${studentId} does not belong to the homework class`
      }))
    ]);
  }
};

export class HomeworkService {
  constructor(
    private readonly homeworkRepository: HomeworkRepository,
    private readonly profileResolutionService: ProfileResolutionService = new ProfileResolutionService(),
    private readonly ownershipService: OwnershipService = new OwnershipService()
  ) {}

  async createHomework(
    authUser: AuthenticatedUser,
    payload: CreateHomeworkRequestDto
  ): Promise<HomeworkListItemResponseDto> {
    const actor = await this.resolveManageActor(authUser);
    const classRow = assertFound(
      await this.homeworkRepository.findClassById(payload.classId),
      "Class"
    );
    const subjectRow = assertFound(
      await this.homeworkRepository.findSubjectById(payload.subjectId),
      "Subject"
    );
    const academicYear = assertFound(
      await this.homeworkRepository.findAcademicYearById(payload.academicYearId),
      "Academic year"
    );
    const semester = assertFound(
      await this.homeworkRepository.findSemesterById(payload.semesterId),
      "Semester"
    );

    assertClassBelongsToAcademicYear(classRow, academicYear.id);
    assertSemesterBelongsToAcademicYear(semester, academicYear.id);
    assertSubjectBelongsToClassGradeLevel(subjectRow, classRow);

    const teacherId =
      actor.role === "teacher"
        ? (assertTeacherCannotSendTeacherId(payload.teacherId), actor.teacher.teacherId)
        : assertAdminTeacherId(payload.teacherId);

    assertFound(await this.homeworkRepository.findTeacherById(teacherId), "Teacher");
    await this.ownershipService.assertTeacherAssignedToClassYear(
      teacherId,
      payload.classId,
      payload.academicYearId,
      payload.subjectId
    );

    const homework = await db.withTransaction(async (client) => {
      const homeworkId = await this.homeworkRepository.createHomework(
        {
          teacherId,
          classId: payload.classId,
          subjectId: payload.subjectId,
          academicYearId: payload.academicYearId,
          semesterId: payload.semesterId,
          title: payload.title,
          description: payload.description,
          assignedDate: payload.assignedDate,
          dueDate: payload.dueDate
        },
        client
      );

      return assertFound(
        await this.homeworkRepository.findHomeworkById(homeworkId, client),
        "Homework"
      );
    });

    return toHomeworkListItemResponseDto(homework);
  }

  async listHomework(
    authUser: AuthenticatedUser,
    filters: ListHomeworkQueryDto
  ): Promise<PaginatedData<HomeworkListItemResponseDto>> {
    const actor = await this.resolveManageActor(authUser);
    const { rows, totalItems } = await this.homeworkRepository.listHomework(
      filters,
      actor.role === "teacher" ? { teacherId: actor.teacher.teacherId } : {}
    );

    return toPaginatedData(
      rows.map((row) => toHomeworkListItemResponseDto(row)),
      filters.page,
      filters.limit,
      totalItems
    );
  }

  async getHomeworkById(
    authUser: AuthenticatedUser,
    homeworkId: string
  ): Promise<HomeworkDetailResponseDto> {
    const homework = await this.getAuthorizedHomework(authUser, homeworkId);
    const students = await this.homeworkRepository.listHomeworkRoster(homeworkId);

    return toHomeworkDetailResponseDto(homework, students);
  }

  async saveHomeworkSubmissions(
    authUser: AuthenticatedUser,
    homeworkId: string,
    payload: SaveHomeworkSubmissionsRequestDto
  ): Promise<HomeworkDetailResponseDto> {
    await this.getAuthorizedHomework(authUser, homeworkId);
    assertNoDuplicateStudents(payload.records.map((record) => record.studentId));

    const detail = await db.withTransaction(async (client) => {
      const roster = await this.homeworkRepository.listHomeworkRoster(homeworkId, client);

      assertStudentsBelongToHomeworkRoster(
        roster,
        payload.records.map((record) => record.studentId)
      );

      await this.homeworkRepository.upsertHomeworkSubmissions(homeworkId, payload.records, client);

      const homework = assertFound(
        await this.homeworkRepository.findHomeworkById(homeworkId, client),
        "Homework"
      );
      const students = await this.homeworkRepository.listHomeworkRoster(homeworkId, client);

      return { homework, students };
    });

    return toHomeworkDetailResponseDto(detail.homework, detail.students);
  }

  async listStudentHomework(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<StudentHomeworkListResponseDto> {
    const actor = await this.resolveStudentActor(authUser);
    const student = assertFound(await this.homeworkRepository.findStudentById(studentId), "Student");

    if (actor.role === "parent") {
      await this.ownershipService.assertParentOwnsStudent(actor.parent.parentId, studentId);
    }

    if (actor.role === "teacher") {
      await this.ownershipService.assertTeacherAssignedToClassYear(
        actor.teacher.teacherId,
        student.classId,
        student.academicYearId
      );
    }

    const items = await this.homeworkRepository.listStudentHomework(
      student,
      actor.role === "teacher" ? { teacherId: actor.teacher.teacherId } : {}
    );

    return toStudentHomeworkListResponseDto(student, items);
  }

  private async getAuthorizedHomework(
    authUser: AuthenticatedUser,
    homeworkId: string
  ): Promise<HomeworkRow> {
    const actor = await this.resolveManageActor(authUser);
    const homework = assertFound(
      await this.homeworkRepository.findHomeworkById(homeworkId),
      "Homework"
    );

    if (actor.role === "teacher" && homework.teacherId !== actor.teacher.teacherId) {
      throw new ForbiddenError("You do not have permission to access this homework");
    }

    return homework;
  }

  private async resolveManageActor(
    authUser: AuthenticatedUser
  ): Promise<Exclude<HomeworkActor, { role: "parent" }>> {
    switch (authUser.role) {
      case "admin":
        return { role: "admin", authUser };
      case "teacher":
        return {
          role: "teacher",
          authUser,
          teacher: await this.profileResolutionService.requireTeacherProfile(authUser.userId)
        };
      default:
        throw new ForbiddenError("You do not have permission to access homework");
    }
  }

  private async resolveStudentActor(authUser: AuthenticatedUser): Promise<HomeworkActor> {
    switch (authUser.role) {
      case "admin":
        return { role: "admin", authUser };
      case "teacher":
        return {
          role: "teacher",
          authUser,
          teacher: await this.profileResolutionService.requireTeacherProfile(authUser.userId)
        };
      case "parent":
        return {
          role: "parent",
          authUser,
          parent: await this.profileResolutionService.requireParentProfile(authUser.userId)
        };
      default:
        throw new ForbiddenError("You do not have permission to access student homework");
    }
  }
}

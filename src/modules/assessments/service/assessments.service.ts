import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import { OwnershipService } from "../../../common/services/ownership.service";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import type { TeacherProfile } from "../../../common/types/profile.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import type {
  AssessmentDetailResponseDto,
  AssessmentListItemResponseDto,
  AssessmentScoresResponseDto,
  AssessmentTypeResponseDto,
  CreateAssessmentRequestDto,
  CreateAssessmentTypeRequestDto,
  ListAssessmentsQueryDto,
  SaveAssessmentScoresRequestDto,
  StudentAssessmentResponseDto,
  UpdateStudentAssessmentRequestDto
} from "../dto/assessments.dto";
import {
  toAssessmentDetailResponseDto,
  toAssessmentListItemResponseDto,
  toAssessmentScoresResponseDto,
  toAssessmentTypeResponseDto,
  toStudentAssessmentResponseDto
} from "../mapper/assessments.mapper";
import type { AssessmentsRepository } from "../repository/assessments.repository";
import type {
  AssessmentRow,
  AssessmentScoreRosterRow,
  ClassReferenceRow,
  SemesterReferenceRow,
  StudentAssessmentRow,
  SubjectReferenceRow
} from "../types/assessments.types";

type AssessmentActor =
  | {
      role: "admin";
      authUser: AuthenticatedUser;
    }
  | {
      role: "teacher";
      authUser: AuthenticatedUser;
      teacher: TeacherProfile;
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
        message: "Teacher is required for admin-created assessments"
      }
    ]);
  }

  return teacherId;
};

const assertScoreWithinMax = (score: number, maxScore: number): void => {
  if (score > maxScore) {
    throw new ValidationError("Score cannot exceed the assessment maximum score", [
      {
        field: "score",
        code: "ASSESSMENT_SCORE_EXCEEDS_MAX_SCORE",
        message: "Score cannot exceed the assessment maximum score"
      }
    ]);
  }
};

const assertTeacherCannotSendTeacherId = (teacherId?: string): void => {
  if (teacherId !== undefined) {
    throw new ValidationError("teacherId is not allowed for teacher-created assessments", [
      {
        field: "teacherId",
        code: "TEACHER_ID_NOT_ALLOWED",
        message: "teacherId is not allowed for teacher-created assessments"
      }
    ]);
  }
};

const assertNoDuplicateStudents = (studentIds: string[]): void => {
  const duplicateIds = studentIds.filter(
    (studentId, index) => studentIds.indexOf(studentId) !== index
  );

  if (duplicateIds.length > 0) {
    throw new ValidationError("Scores payload contains duplicate students", [
      {
        field: "records",
        code: "STUDENT_ASSESSMENT_DUPLICATE_STUDENT",
        message: "Each student can only appear once in the scores payload"
      }
    ]);
  }
};

const assertStudentsBelongToAssessmentRoster = (
  roster: AssessmentScoreRosterRow[],
  submittedStudentIds: string[]
): void => {
  const allowedStudents = new Set(roster.map((student) => student.studentId));
  const extraStudents = submittedStudentIds.filter((studentId) => !allowedStudents.has(studentId));

  if (extraStudents.length > 0) {
    throw new ValidationError("One or more students do not belong to the assessment class", [
      ...extraStudents.map((studentId) => ({
        field: "records",
        code: "STUDENT_ASSESSMENT_STUDENT_NOT_ALLOWED",
        message: `Student ${studentId} does not belong to the assessment class`
      }))
    ]);
  }
};

export class AssessmentsService {
  constructor(
    private readonly assessmentsRepository: AssessmentsRepository,
    private readonly profileResolutionService = new ProfileResolutionService(),
    private readonly ownershipService = new OwnershipService()
  ) {}

  async createAssessmentType(
    payload: CreateAssessmentTypeRequestDto
  ): Promise<AssessmentTypeResponseDto> {
    const assessmentTypeId = await this.assessmentsRepository.createAssessmentType({
      code: payload.code,
      name: payload.name,
      description: payload.description,
      isActive: payload.isActive ?? true
    });
    const assessmentType = assertFound(
      await this.assessmentsRepository.findAssessmentTypeById(assessmentTypeId),
      "Assessment type"
    );

    return toAssessmentTypeResponseDto(assessmentType);
  }

  async listAssessmentTypes(): Promise<AssessmentTypeResponseDto[]> {
    const rows = await this.assessmentsRepository.listActiveAssessmentTypes();

    return rows.map((row) => toAssessmentTypeResponseDto(row));
  }

  async createAssessment(
    authUser: AuthenticatedUser,
    payload: CreateAssessmentRequestDto
  ): Promise<AssessmentDetailResponseDto> {
    const actor = await this.resolveActor(authUser);

    assertFound(
      await this.assessmentsRepository.findAssessmentTypeById(payload.assessmentTypeId),
      "Assessment type"
    );
    const classRow = assertFound(
      await this.assessmentsRepository.findClassById(payload.classId),
      "Class"
    );
    const subjectRow = assertFound(
      await this.assessmentsRepository.findSubjectById(payload.subjectId),
      "Subject"
    );
    const academicYear = assertFound(
      await this.assessmentsRepository.findAcademicYearById(payload.academicYearId),
      "Academic year"
    );
    const semester = assertFound(
      await this.assessmentsRepository.findSemesterById(payload.semesterId),
      "Semester"
    );

    assertClassBelongsToAcademicYear(classRow, academicYear.id);
    assertSemesterBelongsToAcademicYear(semester, academicYear.id);
    assertSubjectBelongsToClassGradeLevel(subjectRow, classRow);

    let teacherId: string;

    if (actor.role === "teacher") {
      assertTeacherCannotSendTeacherId(payload.teacherId);
      teacherId = actor.teacher.teacherId;
    } else {
      teacherId = assertAdminTeacherId(payload.teacherId);
    }

    assertFound(await this.assessmentsRepository.findTeacherById(teacherId), "Teacher");

    await this.assertTeacherAssignment(
      teacherId,
      payload.classId,
      payload.academicYearId,
      payload.subjectId
    );

    const assessment = await db.withTransaction(async (client) => {
      const assessmentId = await this.assessmentsRepository.createAssessment(
        {
          assessmentTypeId: payload.assessmentTypeId,
          classId: payload.classId,
          subjectId: payload.subjectId,
          teacherId,
          academicYearId: payload.academicYearId,
          semesterId: payload.semesterId,
          title: payload.title,
          description: payload.description,
          maxScore: payload.maxScore,
          weight: payload.weight ?? 0,
          assessmentDate: payload.assessmentDate,
          isPublished: payload.isPublished ?? false
        },
        client
      );

      return assertFound(
        await this.assessmentsRepository.findAssessmentById(assessmentId, client),
        "Assessment"
      );
    });

    return toAssessmentDetailResponseDto(assessment);
  }

  async listAssessments(
    authUser: AuthenticatedUser,
    filters: ListAssessmentsQueryDto
  ): Promise<PaginatedData<AssessmentListItemResponseDto>> {
    const actor = await this.resolveActor(authUser);
    const { rows, totalItems } = await this.assessmentsRepository.listAssessments(
      filters,
      this.toRepositoryScope(actor)
    );

    return toPaginatedData(
      rows.map((row) => toAssessmentListItemResponseDto(row)),
      filters.page,
      filters.limit,
      totalItems
    );
  }

  async getAssessmentById(
    authUser: AuthenticatedUser,
    assessmentId: string
  ): Promise<AssessmentDetailResponseDto> {
    const assessment = await this.getAuthorizedAssessment(authUser, assessmentId);

    return toAssessmentDetailResponseDto(assessment);
  }

  async getAssessmentScores(
    authUser: AuthenticatedUser,
    assessmentId: string
  ): Promise<AssessmentScoresResponseDto> {
    const assessment = await this.getAuthorizedAssessment(authUser, assessmentId);
    const students = await this.assessmentsRepository.listAssessmentScores(assessmentId);

    return toAssessmentScoresResponseDto(assessment, students);
  }

  async saveAssessmentScores(
    authUser: AuthenticatedUser,
    assessmentId: string,
    payload: SaveAssessmentScoresRequestDto
  ): Promise<AssessmentScoresResponseDto> {
    const assessment = await this.getAuthorizedAssessment(authUser, assessmentId);

    assertNoDuplicateStudents(payload.records.map((record) => record.studentId));

    for (const record of payload.records) {
      assertScoreWithinMax(record.score, Number(assessment.maxScore));
    }

    const response = await db.withTransaction(async (client) => {
      const roster = await this.assessmentsRepository.listAssessmentScores(assessmentId, client);

      assertStudentsBelongToAssessmentRoster(
        roster,
        payload.records.map((record) => record.studentId)
      );

      await this.assessmentsRepository.upsertStudentAssessments(assessmentId, payload.records, client);

      const updatedAssessment = assertFound(
        await this.assessmentsRepository.findAssessmentById(assessmentId, client),
        "Assessment"
      );
      const updatedRoster = await this.assessmentsRepository.listAssessmentScores(
        assessmentId,
        client
      );

      return {
        assessment: updatedAssessment,
        roster: updatedRoster
      };
    });

    return toAssessmentScoresResponseDto(response.assessment, response.roster);
  }

  async updateStudentAssessment(
    authUser: AuthenticatedUser,
    studentAssessmentId: string,
    payload: UpdateStudentAssessmentRequestDto
  ): Promise<StudentAssessmentResponseDto> {
    const actor = await this.resolveActor(authUser);
    const currentRecord = assertFound(
      await this.assessmentsRepository.findStudentAssessmentById(studentAssessmentId),
      "Student assessment"
    );

    this.assertActorCanAccessStudentAssessment(actor, currentRecord);

    if (payload.score !== undefined) {
      assertScoreWithinMax(payload.score, Number(currentRecord.maxScore));
    }

    const updatedRecord = await db.withTransaction(async (client) => {
      await this.assessmentsRepository.updateStudentAssessment(
        studentAssessmentId,
        payload,
        client
      );

      return assertFound(
        await this.assessmentsRepository.findStudentAssessmentById(
          studentAssessmentId,
          client
        ),
        "Student assessment"
      );
    });

    return toStudentAssessmentResponseDto(updatedRecord);
  }

  private async resolveActor(authUser: AuthenticatedUser): Promise<AssessmentActor> {
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
      default:
        throw new ForbiddenError("You do not have permission to access assessments");
    }
  }

  private toRepositoryScope(actor: AssessmentActor) {
    if (actor.role === "teacher") {
      return {
        teacherId: actor.teacher.teacherId
      };
    }

    return {};
  }

  private async getAuthorizedAssessment(
    authUser: AuthenticatedUser,
    assessmentId: string
  ): Promise<AssessmentRow> {
    const actor = await this.resolveActor(authUser);
    const assessment = assertFound(
      await this.assessmentsRepository.findAssessmentById(assessmentId),
      "Assessment"
    );

    this.assertActorCanAccessAssessment(actor, assessment);

    return assessment;
  }

  private assertActorCanAccessAssessment(
    actor: AssessmentActor,
    assessment: AssessmentRow
  ): void {
    if (actor.role === "admin") {
      return;
    }

    if (assessment.teacherId !== actor.teacher.teacherId) {
      throw new ForbiddenError("You do not have permission to access this assessment");
    }
  }

  private assertActorCanAccessStudentAssessment(
    actor: AssessmentActor,
    studentAssessment: StudentAssessmentRow
  ): void {
    if (actor.role === "admin") {
      return;
    }

    if (studentAssessment.teacherId !== actor.teacher.teacherId) {
      throw new ForbiddenError(
        "You do not have permission to update this student assessment"
      );
    }
  }

  private async resolveTeacherProfile(userId: string): Promise<TeacherProfile> {
    const teacher = await this.assessmentsRepository.findTeacherProfileByUserId(userId);

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

  private async assertTeacherAssignment(
    teacherId: string,
    classId: string,
    academicYearId: string,
    subjectId: string
  ): Promise<void> {
    const hasAssignment = await this.assessmentsRepository.hasTeacherAssignment(
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
}

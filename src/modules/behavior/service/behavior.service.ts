import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import { ActiveAcademicContextService } from "../../../common/services/active-academic-context.service";
import { OwnershipService } from "../../../common/services/ownership.service";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import type {
  SupervisorProfile,
  TeacherProfile
} from "../../../common/types/profile.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import type { AutomationPort } from "../../automation/types/automation.types";
import type {
  BehaviorCategoryResponseDto,
  BehaviorRecordResponseDto,
  CreateBehaviorCategoryRequestDto,
  CreateBehaviorRecordRequestDto,
  ListBehaviorRecordsQueryDto,
  StudentBehaviorRecordsResponseDto,
  StudentBehaviorSummaryDto,
  UpdateBehaviorRecordRequestDto
} from "../dto/behavior.dto";
import {
  toBehaviorCategoryResponseDto,
  toBehaviorRecordResponseDto,
  toBehaviorStudentSummaryDto,
  toStudentBehaviorRecordsResponseDto
} from "../mapper/behavior.mapper";
import type { BehaviorRepository } from "../repository/behavior.repository";
import type {
  BehaviorCategoryRow,
  BehaviorRecordRow,
  BehaviorStudentSummaryRow,
  StudentBehaviorReferenceRow,
} from "../types/behavior.types";

type BehaviorActor =
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

const emptySummary: StudentBehaviorSummaryDto = {
  totalBehaviorRecords: 0,
  positiveCount: 0,
  negativeCount: 0,
  negativeSeverityTotal: 0
};

const assertFound = <T>(entity: T | null, label: string): T => {
  if (!entity) {
    throw new NotFoundError(`${label} not found`);
  }

  return entity;
};

const assertActiveCategory = (category: BehaviorCategoryRow): void => {
  if (!category.isActive) {
    throw new ValidationError("Behavior category is inactive", [
      {
        field: "behaviorCategoryId",
        code: "BEHAVIOR_CATEGORY_INACTIVE",
        message: "Behavior category is inactive"
      }
    ]);
  }
};

const assertSemesterBelongsToAcademicYear = (
  semesterAcademicYearId: string,
  academicYearId: string
): void => {
  if (semesterAcademicYearId !== academicYearId) {
    throw new ValidationError("Semester must belong to the selected academic year", [
      {
        field: "semesterId",
        code: "SEMESTER_YEAR_MISMATCH",
        message: "Semester must belong to the selected academic year"
      }
    ]);
  }
};

const assertStudentBelongsToAcademicYear = (
  student: StudentBehaviorReferenceRow,
  academicYearId: string
): void => {
  if (student.academicYearId !== academicYearId) {
    throw new ValidationError("Student must belong to the selected academic year", [
      {
        field: "academicYearId",
        code: "STUDENT_YEAR_MISMATCH",
        message: "Student must belong to the selected academic year"
      }
    ]);
  }
};

const assertSingleAdminActor = (
  teacherId?: string,
  supervisorId?: string
): {
  teacherId?: string;
  supervisorId?: string;
} => {
  if ((teacherId && supervisorId) || (!teacherId && !supervisorId)) {
    throw new ValidationError("Admin must provide exactly one actor", [
      {
        field: "teacherId",
        code: "BEHAVIOR_ACTOR_REQUIRED",
        message: "Provide exactly one of teacherId or supervisorId"
      }
    ]);
  }

  return {
    teacherId,
    supervisorId
  };
};

const assertNoActorIdsForNonAdmin = (teacherId?: string, supervisorId?: string): void => {
  if (teacherId !== undefined || supervisorId !== undefined) {
    throw new ValidationError("teacherId and supervisorId are not allowed", [
      {
        field: "teacherId",
        code: "BEHAVIOR_ACTOR_NOT_ALLOWED",
        message: "teacherId and supervisorId are not allowed for this role"
      }
    ]);
  }
};

const summarizeBehaviorRecords = (
  records: BehaviorRecordRow[]
): StudentBehaviorSummaryDto => ({
  totalBehaviorRecords: records.length,
  positiveCount: records.filter((record) => record.behaviorType === "positive").length,
  negativeCount: records.filter((record) => record.behaviorType === "negative").length,
  negativeSeverityTotal: records
    .filter((record) => record.behaviorType === "negative")
    .reduce((total, record) => total + Number(record.severity), 0)
});

const normalizeBehaviorRows = (
  value: BehaviorRecordRow[] | { rows: BehaviorRecordRow[]; totalItems: number }
): BehaviorRecordRow[] => (Array.isArray(value) ? value : value.rows);

export class BehaviorService {
  constructor(
    private readonly behaviorRepository: BehaviorRepository,
    private readonly profileResolutionService = new ProfileResolutionService(),
    private readonly ownershipService = new OwnershipService(),
    private readonly activeAcademicContextService: ActiveAcademicContextService = new ActiveAcademicContextService(),
    private readonly automationService: AutomationPort | null = null
  ) {}

  async createCategory(
    payload: CreateBehaviorCategoryRequestDto
  ): Promise<BehaviorCategoryResponseDto> {
    const categoryId = await this.behaviorRepository.createBehaviorCategory({
      code: payload.code,
      name: payload.name,
      behaviorType: payload.behaviorType,
      defaultSeverity: payload.defaultSeverity,
      isActive: payload.isActive ?? true
    });
    const category = assertFound(
      await this.behaviorRepository.findBehaviorCategoryById(categoryId),
      "Behavior category"
    );

    return toBehaviorCategoryResponseDto(category);
  }

  async listCategories(): Promise<BehaviorCategoryResponseDto[]> {
    const rows = await this.behaviorRepository.listActiveBehaviorCategories();

    return rows.map((row) => toBehaviorCategoryResponseDto(row));
  }

  async createRecord(
    authUser: AuthenticatedUser,
    payload: CreateBehaviorRecordRequestDto
  ): Promise<BehaviorRecordResponseDto> {
    const actor = await this.resolveActor(authUser);
    const operationalContext =
      await this.activeAcademicContextService.resolveOperationalContext({
        academicYearId: payload.academicYearId,
        semesterId: payload.semesterId
      });
    const student = assertFound(
      await this.behaviorRepository.findStudentBehaviorReferenceById(payload.studentId),
      "Student"
    );
    const category = assertFound(
      await this.behaviorRepository.findBehaviorCategoryById(payload.behaviorCategoryId),
      "Behavior category"
    );
    const academicYear = assertFound(
      await this.behaviorRepository.findAcademicYearById(operationalContext.academicYearId),
      "Academic year"
    );
    const semester = assertFound(
      await this.behaviorRepository.findSemesterById(operationalContext.semesterId),
      "Semester"
    );

    assertActiveCategory(category);
    assertSemesterBelongsToAcademicYear(semester.academicYearId, academicYear.id);
    assertStudentBelongsToAcademicYear(student, academicYear.id);

    const actorSelection = await this.resolveCreateActor(actor, student, academicYear.id, {
      teacherId: payload.teacherId,
      supervisorId: payload.supervisorId
    });

    const record = await db.withTransaction(async (client) => {
      const recordId = await this.behaviorRepository.createBehaviorRecord(
        {
          studentId: payload.studentId,
          behaviorCategoryId: payload.behaviorCategoryId,
          teacherId: actorSelection.teacherId,
          supervisorId: actorSelection.supervisorId,
          academicYearId: operationalContext.academicYearId,
          semesterId: operationalContext.semesterId,
          description: payload.description,
          severity: payload.severity ?? category.defaultSeverity,
          behaviorDate: payload.behaviorDate
        },
        client
      );

      return assertFound(
        await this.behaviorRepository.findBehaviorRecordById(recordId, client),
        "Behavior record"
      );
    });

    if (record.behaviorType === "negative") {
      await (this.automationService?.onNegativeBehavior({
        behaviorRecordId: record.id,
        studentId: record.studentId,
        studentName: record.studentFullName,
        categoryName: record.behaviorName,
        behaviorDate: record.behaviorDate
      }) ?? Promise.resolve());
    }

    return toBehaviorRecordResponseDto(record);
  }

  async listRecords(
    authUser: AuthenticatedUser,
    filters: ListBehaviorRecordsQueryDto
  ): Promise<PaginatedData<BehaviorRecordResponseDto>> {
    const actor = await this.resolveActor(authUser);
    const normalizedFilters = await this.normalizeFilters(filters);
    const operationalContext =
      await this.activeAcademicContextService.resolveOperationalContext({
        academicYearId: normalizedFilters.academicYearId,
        semesterId: normalizedFilters.semesterId
      });
    const { rows, totalItems } = await this.behaviorRepository.listBehaviorRecords(
      {
        ...normalizedFilters,
        academicYearId: operationalContext.academicYearId,
        semesterId: operationalContext.semesterId
      },
      this.toRepositoryScope(actor)
    );

    return toPaginatedData(
      rows.map((row) => toBehaviorRecordResponseDto(row)),
      normalizedFilters.page,
      normalizedFilters.limit,
      totalItems
    );
  }

  async getRecordById(
    authUser: AuthenticatedUser,
    behaviorRecordId: string
  ): Promise<BehaviorRecordResponseDto> {
    const record = await this.getAuthorizedRecord(authUser, behaviorRecordId);

    return toBehaviorRecordResponseDto(record);
  }

  async updateRecord(
    authUser: AuthenticatedUser,
    behaviorRecordId: string,
    payload: UpdateBehaviorRecordRequestDto
  ): Promise<BehaviorRecordResponseDto> {
    const actor = await this.resolveActor(authUser);
    const currentRecord = assertFound(
      await this.behaviorRepository.findBehaviorRecordById(behaviorRecordId),
      "Behavior record"
    );

    this.assertActorCanAccessRecord(actor, currentRecord);

    const nextAcademicYearId = payload.academicYearId ?? currentRecord.academicYearId;
    const nextSemesterId = payload.semesterId ?? currentRecord.semesterId;

    if (payload.behaviorCategoryId !== undefined) {
      const category = assertFound(
        await this.behaviorRepository.findBehaviorCategoryById(payload.behaviorCategoryId),
        "Behavior category"
      );

      assertActiveCategory(category);
    }

    if (payload.academicYearId !== undefined || payload.semesterId !== undefined) {
      const academicYear = assertFound(
        await this.behaviorRepository.findAcademicYearById(nextAcademicYearId),
        "Academic year"
      );
      const semester = assertFound(
        await this.behaviorRepository.findSemesterById(nextSemesterId),
        "Semester"
      );

      assertSemesterBelongsToAcademicYear(semester.academicYearId, academicYear.id);

      if (payload.academicYearId !== undefined) {
        const student = assertFound(
          await this.behaviorRepository.findStudentBehaviorReferenceById(currentRecord.studentId),
          "Student"
        );

        assertStudentBelongsToAcademicYear(student, academicYear.id);
        await this.assertExistingActorAssignment(
          currentRecord,
          student,
          academicYear.id
        );
      }
    }

    const updatedRecord = await db.withTransaction(async (client) => {
      await this.behaviorRepository.updateBehaviorRecord(behaviorRecordId, payload, client);

      return assertFound(
        await this.behaviorRepository.findBehaviorRecordById(behaviorRecordId, client),
        "Behavior record"
      );
    });

    if (updatedRecord.behaviorType === "negative") {
      await (this.automationService?.onNegativeBehavior({
        behaviorRecordId: updatedRecord.id,
        studentId: updatedRecord.studentId,
        studentName: updatedRecord.studentFullName,
        categoryName: updatedRecord.behaviorName,
        behaviorDate: updatedRecord.behaviorDate
      }) ?? Promise.resolve());
    }

    return toBehaviorRecordResponseDto(updatedRecord);
  }

  async listStudentRecords(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<StudentBehaviorRecordsResponseDto> {
    await this.activeAcademicContextService.requireActiveContext();
    const actor = await this.resolveActor(authUser);
    const student = assertFound(
      await this.behaviorRepository.findStudentBehaviorReferenceById(studentId),
      "Student"
    );

    if (actor.role === "teacher") {
      await this.assertTeacherAssignment(
        actor.teacher.teacherId,
        student.classId,
        student.academicYearId
      );
    }

    if (actor.role === "supervisor") {
      await this.assertSupervisorAssignment(
        actor.supervisor.supervisorId,
        student.classId,
        student.academicYearId
      );
    }

    const rows = normalizeBehaviorRows(
      await this.behaviorRepository.listBehaviorRecords(
      {
        page: 1,
        limit: 1000,
        sortBy: "behaviorDate",
        sortOrder: "desc",
        studentId
      },
      this.toRepositoryScope(actor)
      )
    );

    const summaryRow =
      actor.role === "admin"
        ? await this.behaviorRepository.findStudentBehaviorSummary(studentId)
        : null;
    const summary = summaryRow
      ? toBehaviorStudentSummaryDto(summaryRow as BehaviorStudentSummaryRow)
      : summarizeBehaviorRecords(rows);

    return toStudentBehaviorRecordsResponseDto(student, summary ?? emptySummary, rows);
  }

  private async resolveActor(authUser: AuthenticatedUser): Promise<BehaviorActor> {
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
        throw new ForbiddenError("You do not have permission to access behavior");
    }
  }

  private toRepositoryScope(actor: BehaviorActor) {
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

  private async resolveCreateActor(
    actor: BehaviorActor,
    student: StudentBehaviorReferenceRow,
    academicYearId: string,
    payload: {
      teacherId?: string;
      supervisorId?: string;
    }
  ): Promise<{
    teacherId?: string;
    supervisorId?: string;
  }> {
    if (actor.role === "teacher") {
      assertNoActorIdsForNonAdmin(payload.teacherId, payload.supervisorId);
      await this.assertTeacherAssignment(
        actor.teacher.teacherId,
        student.classId,
        academicYearId
      );

      return {
        teacherId: actor.teacher.teacherId
      };
    }

    if (actor.role === "supervisor") {
      assertNoActorIdsForNonAdmin(payload.teacherId, payload.supervisorId);
      await this.assertSupervisorAssignment(
        actor.supervisor.supervisorId,
        student.classId,
        academicYearId
      );

      return {
        supervisorId: actor.supervisor.supervisorId
      };
    }

    const selectedActor = assertSingleAdminActor(payload.teacherId, payload.supervisorId);

    if (selectedActor.teacherId) {
      const teacherId = await this.resolveTeacherIdentifier(selectedActor.teacherId);

      await this.assertTeacherAssignment(
        teacherId,
        student.classId,
        academicYearId
      );

      return {
        teacherId
      };
    }

    if (selectedActor.supervisorId) {
      const supervisorId = await this.resolveSupervisorIdentifier(selectedActor.supervisorId);

      await this.assertSupervisorAssignment(
        supervisorId,
        student.classId,
        academicYearId
      );

      return {
        supervisorId
      };
    }

    return selectedActor;
  }

  private async getAuthorizedRecord(
    authUser: AuthenticatedUser,
    behaviorRecordId: string
  ): Promise<BehaviorRecordRow> {
    const actor = await this.resolveActor(authUser);
    const record = assertFound(
      await this.behaviorRepository.findBehaviorRecordById(behaviorRecordId),
      "Behavior record"
    );

    this.assertActorCanAccessRecord(actor, record);

    return record;
  }

  private assertActorCanAccessRecord(actor: BehaviorActor, record: BehaviorRecordRow): void {
    if (actor.role === "admin") {
      return;
    }

    if (actor.role === "teacher" && record.teacherId !== actor.teacher.teacherId) {
      throw new ForbiddenError("You do not have permission to access this behavior record");
    }

    if (
      actor.role === "supervisor" &&
      record.supervisorId !== actor.supervisor.supervisorId
    ) {
      throw new ForbiddenError("You do not have permission to access this behavior record");
    }
  }

  private async assertExistingActorAssignment(
    record: BehaviorRecordRow,
    student: StudentBehaviorReferenceRow,
    academicYearId: string
  ): Promise<void> {
    if (record.teacherId) {
      await this.assertTeacherAssignment(
        record.teacherId,
        student.classId,
        academicYearId
      );
    }

    if (record.supervisorId) {
      await this.assertSupervisorAssignment(
        record.supervisorId,
        student.classId,
        academicYearId
      );
    }
  }

  private async resolveTeacherProfile(userId: string): Promise<TeacherProfile> {
    const teacher = await this.behaviorRepository.findTeacherProfileByUserId(userId);

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
    const supervisor = await this.behaviorRepository.findSupervisorProfileByUserId(userId);

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
    academicYearId: string
  ): Promise<void> {
    const hasAssignment = await this.behaviorRepository.hasTeacherBehaviorAssignment(
      teacherId,
      classId,
      academicYearId
    );

    if (!hasAssignment) {
      throw new ForbiddenError(
        "Teacher is not assigned to the student's class for the academic year"
      );
    }
  }

  private async assertSupervisorAssignment(
    supervisorId: string,
    classId: string,
    academicYearId: string
  ): Promise<void> {
    const hasAssignment = await this.behaviorRepository.hasSupervisorBehaviorAssignment(
      supervisorId,
      classId,
      academicYearId
    );

    if (!hasAssignment) {
      throw new ForbiddenError(
        "Supervisor is not assigned to the student's class for the academic year"
      );
    }
  }

  private async normalizeFilters(
    filters: ListBehaviorRecordsQueryDto
  ): Promise<ListBehaviorRecordsQueryDto> {
    let normalizedFilters = filters;

    if (filters.teacherId !== undefined) {
      normalizedFilters = {
        ...normalizedFilters,
        teacherId: await this.resolveTeacherIdentifier(filters.teacherId)
      };
    }

    if (filters.supervisorId !== undefined) {
      normalizedFilters = {
        ...normalizedFilters,
        supervisorId: await this.resolveSupervisorIdentifier(filters.supervisorId)
      };
    }

    return normalizedFilters;
  }

  private async resolveTeacherIdentifier(identifier: string): Promise<string> {
    const teacher = await this.profileResolutionService.requireTeacherProfileIdentifier(
      identifier
    );

    return teacher.teacherId;
  }

  private async resolveSupervisorIdentifier(identifier: string): Promise<string> {
    const supervisor = await this.profileResolutionService.requireSupervisorProfileIdentifier(
      identifier
    );

    return supervisor.supervisorId;
  }
}

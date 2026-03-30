import { ConflictError } from "../../../common/errors/conflict-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { ActiveAcademicContextService } from "../../../common/services/active-academic-context.service";
import type { PaginatedData } from "../../../common/types/pagination.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import type {
  BulkStudentAcademicEnrollmentsRequestDto,
  CreateStudentAcademicEnrollmentRequestDto,
  CreateStudentRequestDto,
  ListStudentAcademicEnrollmentsQueryDto,
  ListStudentsQueryDto,
  LinkStudentParentRequestDto,
  PromoteStudentRequestDto,
  PromoteStudentResponseDto,
  StudentAcademicEnrollmentResponseDto,
  StudentDetailResponseDto,
  StudentParentLinkResponseDto,
  StudentSummaryResponseDto,
  UpdateStudentAcademicEnrollmentRequestDto,
  UpdateStudentRequestDto
} from "../dto/students.dto";
import {
  toPromoteStudentResponseDto,
  toStudentAcademicEnrollmentResponseDto,
  toStudentDetailResponseDto,
  toStudentParentLinkResponseDto,
  toStudentSummaryResponseDto
} from "../mapper/students.mapper";
import type { StudentsRepository } from "../repository/students.repository";
import type {
  AcademicYearReferenceRow,
  ClassReferenceRow,
  CreateStudentAcademicEnrollmentInput,
  ParentReferenceRow,
  StudentAcademicEnrollmentRow,
  StudentParentLinkRow,
  StudentReadRow
} from "../types/students.types";

const assertFound = <T>(entity: T | null, label: string): T => {
  if (!entity) {
    throw new NotFoundError(`${label} not found`);
  }

  return entity;
};

const assertStudentCanBePromoted = (
  student: StudentReadRow,
  targetClass: ClassReferenceRow,
  academicYear: AcademicYearReferenceRow,
  academicYearId: string
): void => {
  if (student.classId === targetClass.id) {
    throw new ValidationError("Target class must be different from the current class", [
      {
        field: "toClassId",
        code: "INVALID_STUDENT_PROMOTION_CLASS",
        message: "Target class must be different from the current class"
      }
    ]);
  }

  if (academicYear.id !== academicYearId) {
    throw new ValidationError("Academic year does not exist", [
      {
        field: "academicYearId",
        code: "ACADEMIC_YEAR_NOT_FOUND",
        message: "Academic year does not exist"
      }
    ]);
  }

  if (targetClass.academicYearId !== academicYearId) {
    throw new ValidationError("Target class must belong to the selected academic year", [
      {
        field: "toClassId",
        code: "CLASS_YEAR_MISMATCH",
        message: "Target class must belong to the selected academic year"
      }
    ]);
  }
};

const assertParentLinkDoesNotExist = (link: StudentParentLinkRow | null): void => {
  if (link) {
    throw new ConflictError("This parent is already linked to the student", [
      {
        field: "parentId",
        code: "STUDENT_PARENT_LINK_ALREADY_EXISTS",
        message: "This parent is already linked to the student"
      }
    ]);
  }
};

const assertParentExists = (parent: ParentReferenceRow | null): ParentReferenceRow =>
  assertFound(parent, "Parent");

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

const assertEnrollmentDoesNotExist = (
  enrollment: StudentAcademicEnrollmentRow | null
): void => {
  if (enrollment) {
    throw new ConflictError("Student academic enrollment already exists for the selected year", [
      {
        field: "academicYearId",
        code: "STUDENT_ACADEMIC_ENROLLMENT_ALREADY_EXISTS",
        message: "Student academic enrollment already exists for the selected year"
      }
    ]);
  }
};

export class StudentsService {
  constructor(
    private readonly studentsRepository: StudentsRepository,
    private readonly activeAcademicContextService: ActiveAcademicContextService = new ActiveAcademicContextService()
  ) {}

  private async resolveParentReference(
    parentIdentifier: string,
    queryable: Queryable = db
  ): Promise<ParentReferenceRow> {
    return assertParentExists(
      await this.studentsRepository.findParentById(parentIdentifier, queryable)
    );
  }

  async createStudent(
    payload: CreateStudentRequestDto
  ): Promise<StudentDetailResponseDto> {
    const student = await db.withTransaction(async (client) => {
      const classRow = assertFound(
        await this.studentsRepository.findClassById(payload.classId, client),
        "Class"
      );

      const id = await this.studentsRepository.createStudent(
        {
          academicNo: payload.academicNo,
          fullName: payload.fullName,
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender,
          classId: payload.classId,
          status: payload.status ?? "active",
          enrollmentDate: payload.enrollmentDate
        },
        client
      );

      await this.studentsRepository.createStudentAcademicEnrollment(
        {
          studentId: id,
          academicYearId: classRow.academicYearId,
          classId: classRow.id
        },
        client
      );

      return assertFound(await this.studentsRepository.findStudentById(id, client), "Student");
    });

    return toStudentDetailResponseDto(student);
  }

  async listStudents(
    query: ListStudentsQueryDto
  ): Promise<PaginatedData<StudentSummaryResponseDto>> {
    const activeAcademicYear = await this.activeAcademicContextService.resolveActiveAcademicYear({
      academicYearId: query.academicYearId
    });
    const students = await this.studentsRepository.listStudents({
      ...query,
      academicYearId: activeAcademicYear.academicYearId
    });

    return toPaginatedData(
      students.rows.map((student) => toStudentSummaryResponseDto(student)),
      query.page,
      query.limit,
      students.totalItems
    );
  }

  async getStudentById(studentId: string): Promise<StudentDetailResponseDto> {
    await this.activeAcademicContextService.requireActiveContext();
    const student = assertFound(
      await this.studentsRepository.findStudentById(studentId),
      "Student"
    );

    return toStudentDetailResponseDto(student);
  }

  async updateStudent(
    studentId: string,
    payload: UpdateStudentRequestDto
  ): Promise<StudentDetailResponseDto> {
    const student = await db.withTransaction(async (client) => {
      assertFound(await this.studentsRepository.findStudentById(studentId, client), "Student");

      await this.studentsRepository.updateStudent(studentId, payload, client);

      return assertFound(
        await this.studentsRepository.findStudentById(studentId, client),
        "Student"
      );
    });

    return toStudentDetailResponseDto(student);
  }

  async linkParent(
    studentId: string,
    payload: LinkStudentParentRequestDto
  ): Promise<StudentParentLinkResponseDto> {
    const link = await db.withTransaction(async (client) => {
      assertFound(await this.studentsRepository.findStudentById(studentId, client), "Student");
      const parent = await this.resolveParentReference(payload.parentId, client);
      assertParentLinkDoesNotExist(
        await this.studentsRepository.findStudentParentLink(
          studentId,
          parent.parentId,
          client
        )
      );

      if (payload.isPrimary) {
        await this.studentsRepository.clearPrimaryParent(studentId, client);
      }

      await this.studentsRepository.createStudentParentLink(
        {
          studentId,
          parentId: parent.parentId,
          relationType: payload.relationType,
          isPrimary: payload.isPrimary ?? false
        },
        client
      );

      return assertFound(
        await this.studentsRepository.findStudentParentLink(
          studentId,
          parent.parentId,
          client
        ),
        "Student parent link"
      );
    });

    return toStudentParentLinkResponseDto(link);
  }

  async listStudentParents(studentId: string): Promise<StudentParentLinkResponseDto[]> {
    await this.activeAcademicContextService.requireActiveContext();
    assertFound(await this.studentsRepository.findStudentById(studentId), "Student");
    const links = await this.studentsRepository.listStudentParentLinks(studentId);

    return links.map((link) => toStudentParentLinkResponseDto(link));
  }

  async listAcademicEnrollments(
    query: ListStudentAcademicEnrollmentsQueryDto
  ): Promise<StudentAcademicEnrollmentResponseDto[]> {
    const enrollments = await this.studentsRepository.listStudentAcademicEnrollments(query);

    return enrollments.map((enrollment) => toStudentAcademicEnrollmentResponseDto(enrollment));
  }

  async listStudentAcademicEnrollments(
    studentId: string
  ): Promise<StudentAcademicEnrollmentResponseDto[]> {
    assertFound(await this.studentsRepository.findStudentById(studentId), "Student");
    const enrollments = await this.studentsRepository.listStudentAcademicEnrollments({ studentId });

    return enrollments.map((enrollment) => toStudentAcademicEnrollmentResponseDto(enrollment));
  }

  async createAcademicEnrollment(
    studentId: string,
    payload: CreateStudentAcademicEnrollmentRequestDto
  ): Promise<StudentAcademicEnrollmentResponseDto> {
    const enrollment = await db.withTransaction(async (client) => {
      assertFound(await this.studentsRepository.findStudentById(studentId, client), "Student");
      const academicYear = assertFound(
        await this.studentsRepository.findAcademicYearById(payload.academicYearId, client),
        "Academic year"
      );
      const classRow = assertFound(
        await this.studentsRepository.findClassById(payload.classId, client),
        "Class"
      );

      assertClassBelongsToAcademicYear(classRow, academicYear.id);
      assertEnrollmentDoesNotExist(
        await this.studentsRepository.findStudentAcademicEnrollmentByStudentAndAcademicYear(
          studentId,
          academicYear.id,
          client
        )
      );

      const enrollmentId = await this.studentsRepository.createStudentAcademicEnrollment(
        {
          studentId,
          academicYearId: academicYear.id,
          classId: classRow.id
        },
        client
      );

      return assertFound(
        await this.studentsRepository.findStudentAcademicEnrollmentById(enrollmentId, client),
        "Student academic enrollment"
      );
    });

    return toStudentAcademicEnrollmentResponseDto(enrollment);
  }

  async updateAcademicEnrollment(
    enrollmentId: string,
    payload: UpdateStudentAcademicEnrollmentRequestDto
  ): Promise<StudentAcademicEnrollmentResponseDto> {
    const enrollment = await db.withTransaction(async (client) => {
      const existing = assertFound(
        await this.studentsRepository.findStudentAcademicEnrollmentById(enrollmentId, client),
        "Student academic enrollment"
      );
      let classId = payload.classId;

      if (classId) {
        const classRow = assertFound(
          await this.studentsRepository.findClassById(classId, client),
          "Class"
        );

        assertClassBelongsToAcademicYear(classRow, existing.academicYearId);
      }

      await this.studentsRepository.updateStudentAcademicEnrollment(
        enrollmentId,
        { classId },
        client
      );

      const updated = assertFound(
        await this.studentsRepository.findStudentAcademicEnrollmentById(enrollmentId, client),
        "Student academic enrollment"
      );
      const activeContext = await this.activeAcademicContextService.getActiveContext(client);

      if (activeContext?.academicYearId === updated.academicYearId) {
        await this.studentsRepository.updateStudentClassId(
          updated.studentId,
          updated.classId,
          client
        );
      }

      return assertFound(
        await this.studentsRepository.findStudentAcademicEnrollmentById(enrollmentId, client),
        "Student academic enrollment"
      );
    });

    return toStudentAcademicEnrollmentResponseDto(enrollment);
  }

  async bulkUpsertAcademicEnrollments(
    payload: BulkStudentAcademicEnrollmentsRequestDto
  ): Promise<StudentAcademicEnrollmentResponseDto[]> {
    const enrollments = await db.withTransaction(async (client) => {
      const rows: StudentAcademicEnrollmentRow[] = [];

      for (const item of payload.items) {
        rows.push(
          await this.upsertStudentAcademicEnrollment(
            {
              studentId: item.studentId,
              academicYearId: item.academicYearId,
              classId: item.classId
            },
            client
          )
        );
      }

      return rows;
    });

    return enrollments.map((enrollment) => toStudentAcademicEnrollmentResponseDto(enrollment));
  }

  async setPrimaryParent(
    studentId: string,
    parentId: string
  ): Promise<StudentParentLinkResponseDto> {
    const link = await db.withTransaction(async (client) => {
      assertFound(await this.studentsRepository.findStudentById(studentId, client), "Student");
      const parent = await this.resolveParentReference(parentId, client);
      const existingLink = assertFound(
        await this.studentsRepository.findStudentParentLink(
          studentId,
          parent.parentId,
          client
        ),
        "Student parent link"
      );

      if (!existingLink.isPrimary) {
        await this.studentsRepository.clearPrimaryParent(studentId, client);
        await this.studentsRepository.setStudentParentPrimary(
          studentId,
          parent.parentId,
          client
        );
      }

      return assertFound(
        await this.studentsRepository.findStudentParentLink(
          studentId,
          parent.parentId,
          client
        ),
        "Student parent link"
      );
    });

    return toStudentParentLinkResponseDto(link);
  }

  async promoteStudent(
    studentId: string,
    payload: PromoteStudentRequestDto
  ): Promise<PromoteStudentResponseDto> {
    const result = await db.withTransaction(async (client) => {
      const student = assertFound(
        await this.studentsRepository.findStudentById(studentId, client),
        "Student"
      );
      const academicYear = assertFound(
        await this.studentsRepository.findAcademicYearById(payload.academicYearId, client),
        "Academic year"
      );
      const targetClass = assertFound(
        await this.studentsRepository.findClassById(payload.toClassId, client),
        "Class"
      );

      assertStudentCanBePromoted(student, targetClass, academicYear, payload.academicYearId);

      await this.upsertStudentAcademicEnrollment(
        {
          studentId,
          academicYearId: payload.academicYearId,
          classId: payload.toClassId
        },
        client
      );

      const promotionId = await this.studentsRepository.createStudentPromotion(
        {
          studentId,
          fromClassId: student.classId,
          toClassId: payload.toClassId,
          academicYearId: payload.academicYearId,
          notes: payload.notes
        },
        client
      );

      const activeContext = await this.activeAcademicContextService.getActiveContext(client);

      if (activeContext?.academicYearId === payload.academicYearId) {
        await this.studentsRepository.updateStudentClassId(studentId, payload.toClassId, client);
      }

      return {
        student: assertFound(
          await this.studentsRepository.findStudentById(studentId, client),
          "Student"
        ),
        promotion: assertFound(
          await this.studentsRepository.findStudentPromotionById(promotionId, client),
          "Student promotion"
        )
      };
    });

    return toPromoteStudentResponseDto(result.student, result.promotion);
  }

  private async assertClassExists(classId: string): Promise<ClassReferenceRow> {
    return assertFound(await this.studentsRepository.findClassById(classId), "Class");
  }

  private async upsertStudentAcademicEnrollment(
    input: CreateStudentAcademicEnrollmentInput,
    queryable: Queryable = db
  ): Promise<StudentAcademicEnrollmentRow> {
    assertFound(await this.studentsRepository.findStudentById(input.studentId, queryable), "Student");
    const academicYear = assertFound(
      await this.studentsRepository.findAcademicYearById(input.academicYearId, queryable),
      "Academic year"
    );
    const classRow = assertFound(
      await this.studentsRepository.findClassById(input.classId, queryable),
      "Class"
    );

    assertClassBelongsToAcademicYear(classRow, academicYear.id);

    const existing = await this.studentsRepository.findStudentAcademicEnrollmentByStudentAndAcademicYear(
      input.studentId,
      input.academicYearId,
      queryable
    );

    if (!existing) {
      const enrollmentId = await this.studentsRepository.createStudentAcademicEnrollment(
        input,
        queryable
      );

      return assertFound(
        await this.studentsRepository.findStudentAcademicEnrollmentById(enrollmentId, queryable),
        "Student academic enrollment"
      );
    }

    await this.studentsRepository.updateStudentAcademicEnrollment(
      existing.id,
      { classId: input.classId },
      queryable
    );

    return assertFound(
      await this.studentsRepository.findStudentAcademicEnrollmentById(existing.id, queryable),
      "Student academic enrollment"
    );
  }
}

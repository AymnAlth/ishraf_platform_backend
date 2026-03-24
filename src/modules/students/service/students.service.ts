import { ConflictError } from "../../../common/errors/conflict-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import type { PaginatedData } from "../../../common/types/pagination.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import type {
  CreateStudentRequestDto,
  ListStudentsQueryDto,
  LinkStudentParentRequestDto,
  PromoteStudentRequestDto,
  PromoteStudentResponseDto,
  StudentDetailResponseDto,
  StudentParentLinkResponseDto,
  StudentSummaryResponseDto,
  UpdateStudentRequestDto
} from "../dto/students.dto";
import {
  toPromoteStudentResponseDto,
  toStudentDetailResponseDto,
  toStudentParentLinkResponseDto,
  toStudentSummaryResponseDto
} from "../mapper/students.mapper";
import type { StudentsRepository } from "../repository/students.repository";
import type {
  AcademicYearReferenceRow,
  ClassReferenceRow,
  ParentReferenceRow,
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

export class StudentsService {
  constructor(private readonly studentsRepository: StudentsRepository) {}

  async createStudent(
    payload: CreateStudentRequestDto
  ): Promise<StudentDetailResponseDto> {
    await this.assertClassExists(payload.classId);

    const id = await this.studentsRepository.createStudent({
      academicNo: payload.academicNo,
      fullName: payload.fullName,
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      classId: payload.classId,
      status: payload.status ?? "active",
      enrollmentDate: payload.enrollmentDate
    });
    const student = assertFound(await this.studentsRepository.findStudentById(id), "Student");

    return toStudentDetailResponseDto(student);
  }

  async listStudents(
    query: ListStudentsQueryDto
  ): Promise<PaginatedData<StudentSummaryResponseDto>> {
    const students = await this.studentsRepository.listStudents(query);

    return toPaginatedData(
      students.rows.map((student) => toStudentSummaryResponseDto(student)),
      query.page,
      query.limit,
      students.totalItems
    );
  }

  async getStudentById(studentId: string): Promise<StudentDetailResponseDto> {
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
      assertParentExists(await this.studentsRepository.findParentById(payload.parentId, client));
      assertParentLinkDoesNotExist(
        await this.studentsRepository.findStudentParentLink(
          studentId,
          payload.parentId,
          client
        )
      );

      if (payload.isPrimary) {
        await this.studentsRepository.clearPrimaryParent(studentId, client);
      }

      await this.studentsRepository.createStudentParentLink(
        {
          studentId,
          parentId: payload.parentId,
          relationType: payload.relationType,
          isPrimary: payload.isPrimary ?? false
        },
        client
      );

      return assertFound(
        await this.studentsRepository.findStudentParentLink(
          studentId,
          payload.parentId,
          client
        ),
        "Student parent link"
      );
    });

    return toStudentParentLinkResponseDto(link);
  }

  async listStudentParents(studentId: string): Promise<StudentParentLinkResponseDto[]> {
    assertFound(await this.studentsRepository.findStudentById(studentId), "Student");
    const links = await this.studentsRepository.listStudentParentLinks(studentId);

    return links.map((link) => toStudentParentLinkResponseDto(link));
  }

  async setPrimaryParent(
    studentId: string,
    parentId: string
  ): Promise<StudentParentLinkResponseDto> {
    const link = await db.withTransaction(async (client) => {
      assertFound(await this.studentsRepository.findStudentById(studentId, client), "Student");
      const existingLink = assertFound(
        await this.studentsRepository.findStudentParentLink(studentId, parentId, client),
        "Student parent link"
      );

      if (!existingLink.isPrimary) {
        await this.studentsRepository.clearPrimaryParent(studentId, client);
        await this.studentsRepository.setStudentParentPrimary(studentId, parentId, client);
      }

      return assertFound(
        await this.studentsRepository.findStudentParentLink(studentId, parentId, client),
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

      await this.studentsRepository.updateStudentClassId(studentId, payload.toClassId, client);

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
}

import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import { db } from "../../../database/db";
import type {
  AcademicYearRequestDto,
  AcademicYearResponseDto,
  ClassRequestDto,
  ClassResponseDto,
  GradeLevelRequestDto,
  GradeLevelResponseDto,
  SemesterRequestDto,
  SemesterResponseDto,
  SubjectRequestDto,
  SubjectResponseDto,
  SupervisorAssignmentRequestDto,
  SupervisorAssignmentResponseDto,
  TeacherAssignmentRequestDto,
  TeacherAssignmentResponseDto,
  UpdateAcademicYearRequestDto,
  UpdateSemesterRequestDto
} from "../dto/academic-structure.dto";
import {
  toAcademicYearResponseDto,
  toClassResponseDto,
  toGradeLevelResponseDto,
  toSemesterResponseDto,
  toSubjectResponseDto,
  toSupervisorAssignmentResponseDto,
  toTeacherAssignmentResponseDto
} from "../mapper/academic-structure.mapper";
import type { AcademicStructureRepository } from "../repository/academic-structure.repository";
import type {
  AcademicYearRow,
  ClassRow,
  SubjectRow
} from "../types/academic-structure.types";

const padDatePart = (value: number): string => value.toString().padStart(2, "0");

const toDateOnly = (value: Date): string =>
  `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(
    value.getDate()
  )}`;

const assertDateRange = (
  startDate: string,
  endDate: string,
  label: string
): void => {
  if (endDate <= startDate) {
    throw new ValidationError(`${label} end date must be later than start date`, [
      {
        field: "endDate",
        code: "INVALID_DATE_RANGE",
        message: `${label} end date must be later than start date`
      }
    ]);
  }
};

const assertWithinAcademicYear = (
  startDate: string,
  endDate: string,
  academicYear: AcademicYearRow
): void => {
  const academicYearStart = toDateOnly(academicYear.startDate);
  const academicYearEnd = toDateOnly(academicYear.endDate);

  if (startDate < academicYearStart || endDate > academicYearEnd) {
    throw new ValidationError("Semester dates must stay within the academic year", [
      {
        field: "startDate",
        code: "SEMESTER_OUTSIDE_ACADEMIC_YEAR",
        message: "Semester dates must stay within the academic year"
      }
    ]);
  }
};

const assertFound = <T>(entity: T | null, label: string): T => {
  if (!entity) {
    throw new NotFoundError(`${label} not found`);
  }

  return entity;
};

const assertTeacherAssignmentCompatibility = (
  classRow: ClassRow,
  subjectRow: SubjectRow,
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

  if (subjectRow.gradeLevelId !== classRow.gradeLevelId) {
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

const assertSupervisorAssignmentCompatibility = (
  classRow: ClassRow,
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

export class AcademicStructureService {
  constructor(
    private readonly academicStructureRepository: AcademicStructureRepository
  ) {}

  async createAcademicYear(
    payload: AcademicYearRequestDto
  ): Promise<AcademicYearResponseDto> {
    assertDateRange(payload.startDate, payload.endDate, "Academic year");

    const academicYear = await db.withTransaction(async (client) => {
      if (payload.isActive) {
        await this.academicStructureRepository.deactivateAllAcademicYears(client);
      }

      const id = await this.academicStructureRepository.createAcademicYear(
        {
          name: payload.name,
          startDate: payload.startDate,
          endDate: payload.endDate,
          isActive: payload.isActive ?? false
        },
        client
      );

      return assertFound(
        await this.academicStructureRepository.findAcademicYearById(id, client),
        "Academic year"
      );
    });

    return toAcademicYearResponseDto(academicYear);
  }

  async listAcademicYears(): Promise<AcademicYearResponseDto[]> {
    const rows = await this.academicStructureRepository.listAcademicYears();

    return rows.map((row) => toAcademicYearResponseDto(row));
  }

  async getAcademicYearById(id: string): Promise<AcademicYearResponseDto> {
    const row = assertFound(
      await this.academicStructureRepository.findAcademicYearById(id),
      "Academic year"
    );

    return toAcademicYearResponseDto(row);
  }

  async updateAcademicYear(
    id: string,
    payload: UpdateAcademicYearRequestDto
  ): Promise<AcademicYearResponseDto> {
    const academicYear = await db.withTransaction(async (client) => {
      const existing = assertFound(
        await this.academicStructureRepository.findAcademicYearById(id, client),
        "Academic year"
      );
      const nextStartDate = payload.startDate ?? toDateOnly(existing.startDate);
      const nextEndDate = payload.endDate ?? toDateOnly(existing.endDate);

      assertDateRange(nextStartDate, nextEndDate, "Academic year");

      if (payload.isActive) {
        await this.academicStructureRepository.deactivateAllAcademicYears(client);
      }

      await this.academicStructureRepository.updateAcademicYear(
        id,
        {
          name: payload.name,
          startDate: payload.startDate,
          endDate: payload.endDate,
          isActive: payload.isActive
        },
        client
      );

      return assertFound(
        await this.academicStructureRepository.findAcademicYearById(id, client),
        "Academic year"
      );
    });

    return toAcademicYearResponseDto(academicYear);
  }

  async activateAcademicYear(id: string): Promise<AcademicYearResponseDto> {
    const academicYear = await db.withTransaction(async (client) => {
      assertFound(
        await this.academicStructureRepository.findAcademicYearById(id, client),
        "Academic year"
      );

      await this.academicStructureRepository.deactivateAllAcademicYears(client);
      await this.academicStructureRepository.updateAcademicYear(
        id,
        {
          isActive: true
        },
        client
      );

      return assertFound(
        await this.academicStructureRepository.findAcademicYearById(id, client),
        "Academic year"
      );
    });

    return toAcademicYearResponseDto(academicYear);
  }

  async createSemester(
    academicYearId: string,
    payload: SemesterRequestDto
  ): Promise<SemesterResponseDto> {
    assertDateRange(payload.startDate, payload.endDate, "Semester");

    const semester = await db.withTransaction(async (client) => {
      const academicYear = assertFound(
        await this.academicStructureRepository.findAcademicYearById(academicYearId, client),
        "Academic year"
      );

      assertWithinAcademicYear(payload.startDate, payload.endDate, academicYear);

      const id = await this.academicStructureRepository.createSemester(
        {
          academicYearId,
          name: payload.name,
          startDate: payload.startDate,
          endDate: payload.endDate,
          isActive: payload.isActive ?? false
        },
        client
      );

      return assertFound(
        await this.academicStructureRepository.findSemesterById(id, client),
        "Semester"
      );
    });

    return toSemesterResponseDto(semester);
  }

  async listSemestersByAcademicYear(
    academicYearId: string
  ): Promise<SemesterResponseDto[]> {
    assertFound(
      await this.academicStructureRepository.findAcademicYearById(academicYearId),
      "Academic year"
    );
    const rows =
      await this.academicStructureRepository.listSemestersByAcademicYear(academicYearId);

    return rows.map((row) => toSemesterResponseDto(row));
  }

  async updateSemester(
    id: string,
    payload: UpdateSemesterRequestDto
  ): Promise<SemesterResponseDto> {
    const semester = await db.withTransaction(async (client) => {
      const existing = assertFound(
        await this.academicStructureRepository.findSemesterById(id, client),
        "Semester"
      );
      const academicYear = assertFound(
        await this.academicStructureRepository.findAcademicYearById(
          existing.academicYearId,
          client
        ),
        "Academic year"
      );
      const nextStartDate = payload.startDate ?? toDateOnly(existing.startDate);
      const nextEndDate = payload.endDate ?? toDateOnly(existing.endDate);

      assertDateRange(nextStartDate, nextEndDate, "Semester");
      assertWithinAcademicYear(nextStartDate, nextEndDate, academicYear);

      await this.academicStructureRepository.updateSemester(
        id,
        {
          name: payload.name,
          startDate: payload.startDate,
          endDate: payload.endDate,
          isActive: payload.isActive
        },
        client
      );

      return assertFound(
        await this.academicStructureRepository.findSemesterById(id, client),
        "Semester"
      );
    });

    return toSemesterResponseDto(semester);
  }

  async createGradeLevel(
    payload: GradeLevelRequestDto
  ): Promise<GradeLevelResponseDto> {
    const id = await this.academicStructureRepository.createGradeLevel({
      name: payload.name,
      levelOrder: payload.levelOrder
    });
    const row = assertFound(
      await this.academicStructureRepository.findGradeLevelById(id),
      "Grade level"
    );

    return toGradeLevelResponseDto(row);
  }

  async listGradeLevels(): Promise<GradeLevelResponseDto[]> {
    const rows = await this.academicStructureRepository.listGradeLevels();

    return rows.map((row) => toGradeLevelResponseDto(row));
  }

  async createClass(payload: ClassRequestDto): Promise<ClassResponseDto> {
    assertFound(
      await this.academicStructureRepository.findAcademicYearById(payload.academicYearId),
      "Academic year"
    );
    assertFound(
      await this.academicStructureRepository.findGradeLevelById(payload.gradeLevelId),
      "Grade level"
    );

    const id = await this.academicStructureRepository.createClass({
      gradeLevelId: payload.gradeLevelId,
      academicYearId: payload.academicYearId,
      className: payload.className,
      section: payload.section,
      capacity: payload.capacity ?? null,
      isActive: payload.isActive ?? true
    });
    const row = assertFound(
      await this.academicStructureRepository.findClassById(id),
      "Class"
    );

    return toClassResponseDto(row);
  }

  async listClasses(): Promise<ClassResponseDto[]> {
    const rows = await this.academicStructureRepository.listClasses();

    return rows.map((row) => toClassResponseDto(row));
  }

  async getClassById(id: string): Promise<ClassResponseDto> {
    const row = assertFound(await this.academicStructureRepository.findClassById(id), "Class");

    return toClassResponseDto(row);
  }

  async createSubject(payload: SubjectRequestDto): Promise<SubjectResponseDto> {
    assertFound(
      await this.academicStructureRepository.findGradeLevelById(payload.gradeLevelId),
      "Grade level"
    );

    const id = await this.academicStructureRepository.createSubject({
      name: payload.name,
      gradeLevelId: payload.gradeLevelId,
      code: payload.code ?? null,
      isActive: payload.isActive ?? true
    });
    const row = assertFound(
      await this.academicStructureRepository.findSubjectById(id),
      "Subject"
    );

    return toSubjectResponseDto(row);
  }

  async listSubjects(): Promise<SubjectResponseDto[]> {
    const rows = await this.academicStructureRepository.listSubjects();

    return rows.map((row) => toSubjectResponseDto(row));
  }

  async getSubjectById(id: string): Promise<SubjectResponseDto> {
    const row = assertFound(
      await this.academicStructureRepository.findSubjectById(id),
      "Subject"
    );

    return toSubjectResponseDto(row);
  }

  async createTeacherAssignment(
    payload: TeacherAssignmentRequestDto
  ): Promise<TeacherAssignmentResponseDto> {
    assertFound(
      await this.academicStructureRepository.findAcademicYearById(payload.academicYearId),
      "Academic year"
    );
    assertFound(
      await this.academicStructureRepository.findTeacherById(payload.teacherId),
      "Teacher"
    );
    const classRow = assertFound(
      await this.academicStructureRepository.findClassById(payload.classId),
      "Class"
    );
    const subjectRow = assertFound(
      await this.academicStructureRepository.findSubjectById(payload.subjectId),
      "Subject"
    );

    assertTeacherAssignmentCompatibility(classRow, subjectRow, payload.academicYearId);

    const id = await this.academicStructureRepository.createTeacherAssignment({
      teacherId: payload.teacherId,
      classId: payload.classId,
      subjectId: payload.subjectId,
      academicYearId: payload.academicYearId
    });
    const row = assertFound(
      await this.academicStructureRepository.findTeacherAssignmentById(id),
      "Teacher assignment"
    );

    return toTeacherAssignmentResponseDto(row);
  }

  async listTeacherAssignments(): Promise<TeacherAssignmentResponseDto[]> {
    const rows = await this.academicStructureRepository.listTeacherAssignments();

    return rows.map((row) => toTeacherAssignmentResponseDto(row));
  }

  async createSupervisorAssignment(
    payload: SupervisorAssignmentRequestDto
  ): Promise<SupervisorAssignmentResponseDto> {
    assertFound(
      await this.academicStructureRepository.findAcademicYearById(payload.academicYearId),
      "Academic year"
    );
    assertFound(
      await this.academicStructureRepository.findSupervisorById(payload.supervisorId),
      "Supervisor"
    );
    const classRow = assertFound(
      await this.academicStructureRepository.findClassById(payload.classId),
      "Class"
    );

    assertSupervisorAssignmentCompatibility(classRow, payload.academicYearId);

    const id = await this.academicStructureRepository.createSupervisorAssignment({
      supervisorId: payload.supervisorId,
      classId: payload.classId,
      academicYearId: payload.academicYearId
    });
    const row = assertFound(
      await this.academicStructureRepository.findSupervisorAssignmentById(id),
      "Supervisor assignment"
    );

    return toSupervisorAssignmentResponseDto(row);
  }

  async listSupervisorAssignments(): Promise<SupervisorAssignmentResponseDto[]> {
    const rows = await this.academicStructureRepository.listSupervisorAssignments();

    return rows.map((row) => toSupervisorAssignmentResponseDto(row));
  }
}

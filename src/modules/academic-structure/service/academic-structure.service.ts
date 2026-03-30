import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import { db } from "../../../database/db";
import type {
  ActiveAcademicContextRequestDto,
  ActiveAcademicContextResponseDto,
  AcademicYearRequestDto,
  AcademicYearResponseDto,
  ClassRequestDto,
  ClassResponseDto,
  CreateSubjectOfferingRequestDto,
  GradeLevelRequestDto,
  GradeLevelResponseDto,
  ListClassesQueryDto,
  ListSubjectsQueryDto,
  ListSubjectOfferingsQueryDto,
  ListSupervisorAssignmentsQueryDto,
  ListTeacherAssignmentsQueryDto,
  SemesterRequestDto,
  SemesterResponseDto,
  SubjectOfferingResponseDto,
  SubjectRequestDto,
  SubjectResponseDto,
  SupervisorAssignmentRequestDto,
  SupervisorAssignmentResponseDto,
  TeacherAssignmentRequestDto,
  TeacherAssignmentResponseDto,
  UpdateClassRequestDto,
  UpdateSubjectOfferingRequestDto,
  UpdateSubjectRequestDto,
  UpdateSupervisorAssignmentRequestDto,
  UpdateTeacherAssignmentRequestDto,
  UpdateAcademicYearRequestDto,
  UpdateSemesterRequestDto
} from "../dto/academic-structure.dto";
import {
  toActiveAcademicContextResponseDto,
  toAcademicYearResponseDto,
  toClassResponseDto,
  toGradeLevelResponseDto,
  toSemesterResponseDto,
  toSubjectOfferingResponseDto,
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

const buildSemesterActivationYearError = (): ValidationError =>
  new ValidationError(
    "Active semesters must belong to the active academic year. Use the active context endpoint to switch year and semester together.",
    [
      {
        field: "isActive",
        code: "SEMESTER_ACTIVATION_REQUIRES_ACTIVE_ACADEMIC_YEAR",
        message:
          "Active semesters must belong to the active academic year. Use the active context endpoint to switch year and semester together."
      }
    ]
  );

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
    private readonly academicStructureRepository: AcademicStructureRepository,
    private readonly profileResolutionService: ProfileResolutionService = new ProfileResolutionService()
  ) {}

  async getActiveAcademicContext(): Promise<ActiveAcademicContextResponseDto> {
    const activeContext = assertFound(
      await this.academicStructureRepository.findActiveAcademicContext(),
      "Active academic context"
    );

    return toActiveAcademicContextResponseDto(activeContext);
  }

  async updateActiveAcademicContext(
    payload: ActiveAcademicContextRequestDto
  ): Promise<ActiveAcademicContextResponseDto> {
    const activeContext = await db.withTransaction(async (client) => {
      const academicYear = assertFound(
        await this.academicStructureRepository.findAcademicYearById(payload.academicYearId, client),
        "Academic year"
      );
      const semester = assertFound(
        await this.academicStructureRepository.findSemesterById(payload.semesterId, client),
        "Semester"
      );

      if (semester.academicYearId !== academicYear.id) {
        throw new ValidationError(
          "Semester must belong to the selected academic year",
          [
            {
              field: "semesterId",
              code: "SEMESTER_YEAR_MISMATCH",
              message: "Semester must belong to the selected academic year"
            }
          ]
        );
      }

      await this.academicStructureRepository.deactivateAllAcademicYears(client);
      await this.academicStructureRepository.deactivateAllSemesters(client);
      await this.academicStructureRepository.updateAcademicYear(
        academicYear.id,
        { isActive: true },
        client
      );
      await this.academicStructureRepository.updateSemester(
        semester.id,
        { isActive: true },
        client
      );

      return assertFound(
        await this.academicStructureRepository.findActiveAcademicContext(client),
        "Active academic context"
      );
    });

    return toActiveAcademicContextResponseDto(activeContext);
  }

  async createAcademicYear(
    payload: AcademicYearRequestDto
  ): Promise<AcademicYearResponseDto> {
    assertDateRange(payload.startDate, payload.endDate, "Academic year");

    const academicYear = await db.withTransaction(async (client) => {
      if (payload.isActive) {
        await this.academicStructureRepository.deactivateAllAcademicYears(client);
        await this.academicStructureRepository.deactivateAllSemesters(client);
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
        await this.academicStructureRepository.deactivateAllSemesters(client);
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
      await this.academicStructureRepository.deactivateAllSemesters(client);
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

      if (payload.isActive) {
        if (!academicYear.isActive) {
          throw buildSemesterActivationYearError();
        }

        await this.academicStructureRepository.deactivateAllSemesters(client);
      }

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

      if (payload.isActive) {
        if (!academicYear.isActive) {
          throw buildSemesterActivationYearError();
        }

        await this.academicStructureRepository.deactivateAllSemesters(client);
      }

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

  async listClasses(filters: ListClassesQueryDto = {}): Promise<ClassResponseDto[]> {
    const rows = await this.academicStructureRepository.listClasses(filters);

    return rows.map((row) => toClassResponseDto(row));
  }

  async getClassById(id: string): Promise<ClassResponseDto> {
    const row = assertFound(await this.academicStructureRepository.findClassById(id), "Class");

    return toClassResponseDto(row);
  }

  async updateClass(id: string, payload: UpdateClassRequestDto): Promise<ClassResponseDto> {
    assertFound(await this.academicStructureRepository.findClassById(id), "Class");

    await this.academicStructureRepository.updateClass(id, {
      className: payload.className,
      section: payload.section,
      capacity: payload.capacity,
      isActive: payload.isActive
    });

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

  async listSubjects(filters: ListSubjectsQueryDto = {}): Promise<SubjectResponseDto[]> {
    const rows = await this.academicStructureRepository.listSubjects(filters);

    return rows.map((row) => toSubjectResponseDto(row));
  }

  async getSubjectById(id: string): Promise<SubjectResponseDto> {
    const row = assertFound(
      await this.academicStructureRepository.findSubjectById(id),
      "Subject"
    );

    return toSubjectResponseDto(row);
  }

  async updateSubject(
    id: string,
    payload: UpdateSubjectRequestDto
  ): Promise<SubjectResponseDto> {
    assertFound(await this.academicStructureRepository.findSubjectById(id), "Subject");

    await this.academicStructureRepository.updateSubject(id, {
      name: payload.name,
      code: payload.code,
      isActive: payload.isActive
    });

    const row = assertFound(
      await this.academicStructureRepository.findSubjectById(id),
      "Subject"
    );

    return toSubjectResponseDto(row);
  }

  async createSubjectOffering(
    payload: CreateSubjectOfferingRequestDto
  ): Promise<SubjectOfferingResponseDto> {
    assertFound(
      await this.academicStructureRepository.findSubjectById(payload.subjectId),
      "Subject"
    );
    assertFound(
      await this.academicStructureRepository.findSemesterById(payload.semesterId),
      "Semester"
    );

    const id = await this.academicStructureRepository.createSubjectOffering({
      subjectId: payload.subjectId,
      semesterId: payload.semesterId,
      isActive: payload.isActive ?? true
    });
    const row = assertFound(
      await this.academicStructureRepository.findSubjectOfferingById(id),
      "Subject offering"
    );

    return toSubjectOfferingResponseDto(row);
  }

  async listSubjectOfferings(
    filters: ListSubjectOfferingsQueryDto
  ): Promise<SubjectOfferingResponseDto[]> {
    const rows = await this.academicStructureRepository.listSubjectOfferings(filters);

    return rows.map((row) => toSubjectOfferingResponseDto(row));
  }

  async getSubjectOfferingById(id: string): Promise<SubjectOfferingResponseDto> {
    const row = assertFound(
      await this.academicStructureRepository.findSubjectOfferingById(id),
      "Subject offering"
    );

    return toSubjectOfferingResponseDto(row);
  }

  async updateSubjectOffering(
    id: string,
    payload: UpdateSubjectOfferingRequestDto
  ): Promise<SubjectOfferingResponseDto> {
    assertFound(
      await this.academicStructureRepository.findSubjectOfferingById(id),
      "Subject offering"
    );

    await this.academicStructureRepository.updateSubjectOffering(id, {
      isActive: payload.isActive
    });

    const row = assertFound(
      await this.academicStructureRepository.findSubjectOfferingById(id),
      "Subject offering"
    );

    return toSubjectOfferingResponseDto(row);
  }

  async createTeacherAssignment(
    payload: TeacherAssignmentRequestDto
  ): Promise<TeacherAssignmentResponseDto> {
    const teacher = await this.profileResolutionService.requireTeacherProfileIdentifier(
      payload.teacherId
    );

    assertFound(
      await this.academicStructureRepository.findAcademicYearById(payload.academicYearId),
      "Academic year"
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
      teacherId: teacher.teacherId,
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

  async listTeacherAssignments(
    filters: ListTeacherAssignmentsQueryDto = {}
  ): Promise<TeacherAssignmentResponseDto[]> {
    const resolvedTeacher =
      filters.teacherId !== undefined
        ? await this.profileResolutionService.requireTeacherProfileIdentifier(filters.teacherId)
        : null;
    const rows = await this.academicStructureRepository.listTeacherAssignments({
      academicYearId: filters.academicYearId,
      classId: filters.classId,
      subjectId: filters.subjectId,
      teacherId: resolvedTeacher?.teacherId
    });

    return rows.map((row) => toTeacherAssignmentResponseDto(row));
  }

  async getTeacherAssignmentById(id: string): Promise<TeacherAssignmentResponseDto> {
    const row = assertFound(
      await this.academicStructureRepository.findTeacherAssignmentById(id),
      "Teacher assignment"
    );

    return toTeacherAssignmentResponseDto(row);
  }

  async updateTeacherAssignment(
    id: string,
    payload: UpdateTeacherAssignmentRequestDto
  ): Promise<TeacherAssignmentResponseDto> {
    const existing = assertFound(
      await this.academicStructureRepository.findTeacherAssignmentById(id),
      "Teacher assignment"
    );

    const resolvedTeacher =
      payload.teacherId !== undefined
        ? await this.profileResolutionService.requireTeacherProfileIdentifier(payload.teacherId)
        : null;
    const nextAcademicYearId = payload.academicYearId ?? existing.academicYearId;
    const nextClassId = payload.classId ?? existing.classId;
    const nextSubjectId = payload.subjectId ?? existing.subjectId;

    assertFound(
      await this.academicStructureRepository.findAcademicYearById(nextAcademicYearId),
      "Academic year"
    );
    const classRow = assertFound(
      await this.academicStructureRepository.findClassById(nextClassId),
      "Class"
    );
    const subjectRow = assertFound(
      await this.academicStructureRepository.findSubjectById(nextSubjectId),
      "Subject"
    );

    assertTeacherAssignmentCompatibility(classRow, subjectRow, nextAcademicYearId);

    await this.academicStructureRepository.updateTeacherAssignment(id, {
      teacherId: resolvedTeacher?.teacherId,
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

  async createSupervisorAssignment(
    payload: SupervisorAssignmentRequestDto
  ): Promise<SupervisorAssignmentResponseDto> {
    const supervisor = await this.profileResolutionService.requireSupervisorProfileIdentifier(
      payload.supervisorId
    );

    assertFound(
      await this.academicStructureRepository.findAcademicYearById(payload.academicYearId),
      "Academic year"
    );
    const classRow = assertFound(
      await this.academicStructureRepository.findClassById(payload.classId),
      "Class"
    );

    assertSupervisorAssignmentCompatibility(classRow, payload.academicYearId);

    const id = await this.academicStructureRepository.createSupervisorAssignment({
      supervisorId: supervisor.supervisorId,
      classId: payload.classId,
      academicYearId: payload.academicYearId
    });
    const row = assertFound(
      await this.academicStructureRepository.findSupervisorAssignmentById(id),
      "Supervisor assignment"
    );

    return toSupervisorAssignmentResponseDto(row);
  }

  async listSupervisorAssignments(
    filters: ListSupervisorAssignmentsQueryDto = {}
  ): Promise<SupervisorAssignmentResponseDto[]> {
    const resolvedSupervisor =
      filters.supervisorId !== undefined
        ? await this.profileResolutionService.requireSupervisorProfileIdentifier(
            filters.supervisorId
          )
        : null;
    const rows = await this.academicStructureRepository.listSupervisorAssignments({
      academicYearId: filters.academicYearId,
      classId: filters.classId,
      supervisorId: resolvedSupervisor?.supervisorId
    });

    return rows.map((row) => toSupervisorAssignmentResponseDto(row));
  }

  async getSupervisorAssignmentById(id: string): Promise<SupervisorAssignmentResponseDto> {
    const row = assertFound(
      await this.academicStructureRepository.findSupervisorAssignmentById(id),
      "Supervisor assignment"
    );

    return toSupervisorAssignmentResponseDto(row);
  }

  async updateSupervisorAssignment(
    id: string,
    payload: UpdateSupervisorAssignmentRequestDto
  ): Promise<SupervisorAssignmentResponseDto> {
    const existing = assertFound(
      await this.academicStructureRepository.findSupervisorAssignmentById(id),
      "Supervisor assignment"
    );

    const resolvedSupervisor =
      payload.supervisorId !== undefined
        ? await this.profileResolutionService.requireSupervisorProfileIdentifier(
            payload.supervisorId
          )
        : null;
    const nextAcademicYearId = payload.academicYearId ?? existing.academicYearId;
    const nextClassId = payload.classId ?? existing.classId;

    assertFound(
      await this.academicStructureRepository.findAcademicYearById(nextAcademicYearId),
      "Academic year"
    );
    const classRow = assertFound(
      await this.academicStructureRepository.findClassById(nextClassId),
      "Class"
    );

    assertSupervisorAssignmentCompatibility(classRow, nextAcademicYearId);

    await this.academicStructureRepository.updateSupervisorAssignment(id, {
      supervisorId: resolvedSupervisor?.supervisorId,
      classId: payload.classId,
      academicYearId: payload.academicYearId
    });

    const row = assertFound(
      await this.academicStructureRepository.findSupervisorAssignmentById(id),
      "Supervisor assignment"
    );

    return toSupervisorAssignmentResponseDto(row);
  }
}

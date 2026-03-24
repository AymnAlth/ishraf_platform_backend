import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type {
  AcademicYearParamsDto,
  AcademicYearRequestDto,
  ClassRequestDto,
  EntityIdParamsDto,
  GradeLevelRequestDto,
  SemesterRequestDto,
  SubjectRequestDto,
  SupervisorAssignmentRequestDto,
  TeacherAssignmentRequestDto,
  UpdateAcademicYearRequestDto,
  UpdateSemesterRequestDto
} from "../dto/academic-structure.dto";
import type { AcademicStructureService } from "../service/academic-structure.service";

export class AcademicStructureController {
  constructor(
    private readonly academicStructureService: AcademicStructureService
  ) {}

  async createAcademicYear(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as AcademicYearRequestDto;
    const response = await this.academicStructureService.createAcademicYear(payload);

    res
      .status(201)
      .json(buildSuccessResponse("Academic year created successfully", response));
  }

  async listAcademicYears(_req: Request, res: Response): Promise<void> {
    const response = await this.academicStructureService.listAcademicYears();

    res
      .status(200)
      .json(buildSuccessResponse("Academic years fetched successfully", response));
  }

  async getAcademicYearById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const response = await this.academicStructureService.getAcademicYearById(params.id);

    res
      .status(200)
      .json(buildSuccessResponse("Academic year fetched successfully", response));
  }

  async updateAcademicYear(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const payload = req.validated?.body as UpdateAcademicYearRequestDto;
    const response = await this.academicStructureService.updateAcademicYear(params.id, payload);

    res
      .status(200)
      .json(buildSuccessResponse("Academic year updated successfully", response));
  }

  async activateAcademicYear(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const response = await this.academicStructureService.activateAcademicYear(params.id);

    res
      .status(200)
      .json(buildSuccessResponse("Academic year activated successfully", response));
  }

  async createSemester(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AcademicYearParamsDto;
    const payload = req.validated?.body as SemesterRequestDto;
    const response = await this.academicStructureService.createSemester(
      params.academicYearId,
      payload
    );

    res.status(201).json(buildSuccessResponse("Semester created successfully", response));
  }

  async listSemestersByAcademicYear(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AcademicYearParamsDto;
    const response = await this.academicStructureService.listSemestersByAcademicYear(
      params.academicYearId
    );

    res.status(200).json(buildSuccessResponse("Semesters fetched successfully", response));
  }

  async updateSemester(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const payload = req.validated?.body as UpdateSemesterRequestDto;
    const response = await this.academicStructureService.updateSemester(params.id, payload);

    res.status(200).json(buildSuccessResponse("Semester updated successfully", response));
  }

  async createGradeLevel(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as GradeLevelRequestDto;
    const response = await this.academicStructureService.createGradeLevel(payload);

    res
      .status(201)
      .json(buildSuccessResponse("Grade level created successfully", response));
  }

  async listGradeLevels(_req: Request, res: Response): Promise<void> {
    const response = await this.academicStructureService.listGradeLevels();

    res
      .status(200)
      .json(buildSuccessResponse("Grade levels fetched successfully", response));
  }

  async createClass(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as ClassRequestDto;
    const response = await this.academicStructureService.createClass(payload);

    res.status(201).json(buildSuccessResponse("Class created successfully", response));
  }

  async listClasses(_req: Request, res: Response): Promise<void> {
    const response = await this.academicStructureService.listClasses();

    res.status(200).json(buildSuccessResponse("Classes fetched successfully", response));
  }

  async getClassById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const response = await this.academicStructureService.getClassById(params.id);

    res.status(200).json(buildSuccessResponse("Class fetched successfully", response));
  }

  async createSubject(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as SubjectRequestDto;
    const response = await this.academicStructureService.createSubject(payload);

    res.status(201).json(buildSuccessResponse("Subject created successfully", response));
  }

  async listSubjects(_req: Request, res: Response): Promise<void> {
    const response = await this.academicStructureService.listSubjects();

    res.status(200).json(buildSuccessResponse("Subjects fetched successfully", response));
  }

  async getSubjectById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const response = await this.academicStructureService.getSubjectById(params.id);

    res.status(200).json(buildSuccessResponse("Subject fetched successfully", response));
  }

  async createTeacherAssignment(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as TeacherAssignmentRequestDto;
    const response = await this.academicStructureService.createTeacherAssignment(payload);

    res
      .status(201)
      .json(buildSuccessResponse("Teacher assignment created successfully", response));
  }

  async listTeacherAssignments(_req: Request, res: Response): Promise<void> {
    const response = await this.academicStructureService.listTeacherAssignments();

    res
      .status(200)
      .json(buildSuccessResponse("Teacher assignments fetched successfully", response));
  }

  async createSupervisorAssignment(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as SupervisorAssignmentRequestDto;
    const response = await this.academicStructureService.createSupervisorAssignment(payload);

    res
      .status(201)
      .json(buildSuccessResponse("Supervisor assignment created successfully", response));
  }

  async listSupervisorAssignments(_req: Request, res: Response): Promise<void> {
    const response = await this.academicStructureService.listSupervisorAssignments();

    res
      .status(200)
      .json(buildSuccessResponse("Supervisor assignments fetched successfully", response));
  }
}

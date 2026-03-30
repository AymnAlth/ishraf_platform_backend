import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type {
  ActiveAcademicContextRequestDto,
  AcademicYearParamsDto,
  AcademicYearRequestDto,
  ClassRequestDto,
  CreateSubjectOfferingRequestDto,
  EntityIdParamsDto,
  GradeLevelRequestDto,
  ListClassesQueryDto,
  ListSubjectsQueryDto,
  ListSubjectOfferingsQueryDto,
  ListSupervisorAssignmentsQueryDto,
  ListTeacherAssignmentsQueryDto,
  SemesterRequestDto,
  SubjectRequestDto,
  SupervisorAssignmentRequestDto,
  TeacherAssignmentRequestDto,
  UpdateClassRequestDto,
  UpdateSubjectOfferingRequestDto,
  UpdateSubjectRequestDto,
  UpdateSupervisorAssignmentRequestDto,
  UpdateTeacherAssignmentRequestDto,
  UpdateAcademicYearRequestDto,
  UpdateSemesterRequestDto
} from "../dto/academic-structure.dto";
import type { AcademicStructureService } from "../service/academic-structure.service";

export class AcademicStructureController {
  constructor(
    private readonly academicStructureService: AcademicStructureService
  ) {}

  async getActiveAcademicContext(_req: Request, res: Response): Promise<void> {
    const response = await this.academicStructureService.getActiveAcademicContext();

    res
      .status(200)
      .json(buildSuccessResponse("Active academic context fetched successfully", response));
  }

  async updateActiveAcademicContext(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as ActiveAcademicContextRequestDto;
    const response = await this.academicStructureService.updateActiveAcademicContext(payload);

    res
      .status(200)
      .json(buildSuccessResponse("Active academic context updated successfully", response));
  }

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
    const query = _req.validated?.query as ListClassesQueryDto;
    const response = await this.academicStructureService.listClasses(query);

    res.status(200).json(buildSuccessResponse("Classes fetched successfully", response));
  }

  async getClassById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const response = await this.academicStructureService.getClassById(params.id);

    res.status(200).json(buildSuccessResponse("Class fetched successfully", response));
  }

  async updateClass(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const payload = req.validated?.body as UpdateClassRequestDto;
    const response = await this.academicStructureService.updateClass(params.id, payload);

    res.status(200).json(buildSuccessResponse("Class updated successfully", response));
  }

  async createSubject(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as SubjectRequestDto;
    const response = await this.academicStructureService.createSubject(payload);

    res.status(201).json(buildSuccessResponse("Subject created successfully", response));
  }

  async listSubjects(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListSubjectsQueryDto;
    const response = await this.academicStructureService.listSubjects(query);

    res.status(200).json(buildSuccessResponse("Subjects fetched successfully", response));
  }

  async getSubjectById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const response = await this.academicStructureService.getSubjectById(params.id);

    res.status(200).json(buildSuccessResponse("Subject fetched successfully", response));
  }

  async updateSubject(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const payload = req.validated?.body as UpdateSubjectRequestDto;
    const response = await this.academicStructureService.updateSubject(params.id, payload);

    res.status(200).json(buildSuccessResponse("Subject updated successfully", response));
  }

  async createSubjectOffering(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateSubjectOfferingRequestDto;
    const response = await this.academicStructureService.createSubjectOffering(payload);

    res
      .status(201)
      .json(buildSuccessResponse("Subject offering created successfully", response));
  }

  async listSubjectOfferings(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListSubjectOfferingsQueryDto;
    const response = await this.academicStructureService.listSubjectOfferings(query);

    res
      .status(200)
      .json(buildSuccessResponse("Subject offerings fetched successfully", response));
  }

  async getSubjectOfferingById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const response = await this.academicStructureService.getSubjectOfferingById(params.id);

    res
      .status(200)
      .json(buildSuccessResponse("Subject offering fetched successfully", response));
  }

  async updateSubjectOffering(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const payload = req.validated?.body as UpdateSubjectOfferingRequestDto;
    const response = await this.academicStructureService.updateSubjectOffering(
      params.id,
      payload
    );

    res
      .status(200)
      .json(buildSuccessResponse("Subject offering updated successfully", response));
  }

  async createTeacherAssignment(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as TeacherAssignmentRequestDto;
    const response = await this.academicStructureService.createTeacherAssignment(payload);

    res
      .status(201)
      .json(buildSuccessResponse("Teacher assignment created successfully", response));
  }

  async listTeacherAssignments(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListTeacherAssignmentsQueryDto;
    const response = await this.academicStructureService.listTeacherAssignments(query);

    res
      .status(200)
      .json(buildSuccessResponse("Teacher assignments fetched successfully", response));
  }

  async getTeacherAssignmentById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const response = await this.academicStructureService.getTeacherAssignmentById(params.id);

    res
      .status(200)
      .json(buildSuccessResponse("Teacher assignment fetched successfully", response));
  }

  async updateTeacherAssignment(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const payload = req.validated?.body as UpdateTeacherAssignmentRequestDto;
    const response = await this.academicStructureService.updateTeacherAssignment(
      params.id,
      payload
    );

    res
      .status(200)
      .json(buildSuccessResponse("Teacher assignment updated successfully", response));
  }

  async createSupervisorAssignment(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as SupervisorAssignmentRequestDto;
    const response = await this.academicStructureService.createSupervisorAssignment(payload);

    res
      .status(201)
      .json(buildSuccessResponse("Supervisor assignment created successfully", response));
  }

  async listSupervisorAssignments(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListSupervisorAssignmentsQueryDto;
    const response = await this.academicStructureService.listSupervisorAssignments(query);

    res
      .status(200)
      .json(buildSuccessResponse("Supervisor assignments fetched successfully", response));
  }

  async getSupervisorAssignmentById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const response = await this.academicStructureService.getSupervisorAssignmentById(params.id);

    res
      .status(200)
      .json(buildSuccessResponse("Supervisor assignment fetched successfully", response));
  }

  async updateSupervisorAssignment(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as EntityIdParamsDto;
    const payload = req.validated?.body as UpdateSupervisorAssignmentRequestDto;
    const response = await this.academicStructureService.updateSupervisorAssignment(
      params.id,
      payload
    );

    res
      .status(200)
      .json(buildSuccessResponse("Supervisor assignment updated successfully", response));
  }
}

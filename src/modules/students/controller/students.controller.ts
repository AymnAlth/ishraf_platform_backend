import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type {
  BulkStudentAcademicEnrollmentsRequestDto,
  CreateStudentAcademicEnrollmentRequestDto,
  CreateStudentRequestDto,
  ListStudentAcademicEnrollmentsQueryDto,
  ListStudentsQueryDto,
  LinkStudentParentRequestDto,
  PromoteStudentRequestDto,
  StudentAcademicEnrollmentIdParamsDto,
  StudentIdParamsDto,
  StudentParentParamsDto,
  UpdateStudentAcademicEnrollmentRequestDto,
  UpdateStudentRequestDto
} from "../dto/students.dto";
import type { StudentsService } from "../service/students.service";

export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  async create(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateStudentRequestDto;
    const response = await this.studentsService.createStudent(payload);

    res.status(201).json(buildSuccessResponse("Student created successfully", response));
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListStudentsQueryDto;
    const response = await this.studentsService.listStudents(query);

    res.status(200).json(buildSuccessResponse("Students fetched successfully", response));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const response = await this.studentsService.getStudentById(params.id);

    res.status(200).json(buildSuccessResponse("Student fetched successfully", response));
  }

  async listAcademicEnrollments(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListStudentAcademicEnrollmentsQueryDto;
    const response = await this.studentsService.listAcademicEnrollments(query);

    res
      .status(200)
      .json(buildSuccessResponse("Student academic enrollments fetched successfully", response));
  }

  async listStudentAcademicEnrollments(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const response = await this.studentsService.listStudentAcademicEnrollments(params.id);

    res
      .status(200)
      .json(buildSuccessResponse("Student academic enrollments fetched successfully", response));
  }

  async createAcademicEnrollment(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const payload = req.validated?.body as CreateStudentAcademicEnrollmentRequestDto;
    const response = await this.studentsService.createAcademicEnrollment(params.id, payload);

    res
      .status(201)
      .json(buildSuccessResponse("Student academic enrollment created successfully", response));
  }

  async updateAcademicEnrollment(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentAcademicEnrollmentIdParamsDto;
    const payload = req.validated?.body as UpdateStudentAcademicEnrollmentRequestDto;
    const response = await this.studentsService.updateAcademicEnrollment(
      params.enrollmentId,
      payload
    );

    res
      .status(200)
      .json(buildSuccessResponse("Student academic enrollment updated successfully", response));
  }

  async bulkUpsertAcademicEnrollments(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as BulkStudentAcademicEnrollmentsRequestDto;
    const response = await this.studentsService.bulkUpsertAcademicEnrollments(payload);

    res
      .status(200)
      .json(buildSuccessResponse("Student academic enrollments upserted successfully", response));
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const payload = req.validated?.body as UpdateStudentRequestDto;
    const response = await this.studentsService.updateStudent(params.id, payload);

    res.status(200).json(buildSuccessResponse("Student updated successfully", response));
  }

  async linkParent(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const payload = req.validated?.body as LinkStudentParentRequestDto;
    const response = await this.studentsService.linkParent(params.id, payload);

    res
      .status(201)
      .json(buildSuccessResponse("Student parent linked successfully", response));
  }

  async listParents(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const response = await this.studentsService.listStudentParents(params.id);

    res
      .status(200)
      .json(buildSuccessResponse("Student parents fetched successfully", response));
  }

  async setPrimaryParent(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentParentParamsDto;
    const response = await this.studentsService.setPrimaryParent(
      params.studentId,
      params.parentId
    );

    res
      .status(200)
      .json(buildSuccessResponse("Primary parent updated successfully", response));
  }

  async promote(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const payload = req.validated?.body as PromoteStudentRequestDto;
    const response = await this.studentsService.promoteStudent(params.id, payload);

    res.status(201).json(buildSuccessResponse("Student promoted successfully", response));
  }
}

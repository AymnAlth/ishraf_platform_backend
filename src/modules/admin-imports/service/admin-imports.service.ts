import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import { AcademicStructureRepository } from "../../academic-structure/repository/academic-structure.repository";
import { StudentsRepository } from "../../students/repository/students.repository";
import { TransportRepository } from "../../transport/repository/transport.repository";
import { UsersRepository } from "../../users/repository/users.repository";
import type {
  SchoolOnboardingApplyRequestDto,
  SchoolOnboardingDryRunRequestDto,
  SchoolOnboardingImportHistoryDetailDto,
  SchoolOnboardingImportHistoryItemDto,
  SchoolOnboardingImportResponseDto
} from "../dto/admin-imports.dto";
import type { AdminImportsRepository } from "../repository/admin-imports.repository";
import type { SchoolOnboardingImportRunRow } from "../types/admin-imports.types";
import { SchoolOnboardingImportEngine } from "./school-onboarding-import.engine";

const attachImportId = (
  importId: string,
  response: Omit<SchoolOnboardingImportResponseDto, "importId">
): SchoolOnboardingImportResponseDto => ({
  importId,
  ...response
});

const parseStoredResponse = (
  row: SchoolOnboardingImportRunRow,
  options: { alreadyApplied?: boolean } = {}
): SchoolOnboardingImportResponseDto => {
  const stored = row.resultJson as Omit<SchoolOnboardingImportResponseDto, "importId">;

  return {
    importId: row.id,
    ...stored,
    alreadyApplied: options.alreadyApplied ?? stored.alreadyApplied
  };
};

const toHistoryItem = (row: SchoolOnboardingImportRunRow): SchoolOnboardingImportHistoryItemDto => {
  const result = parseStoredResponse(row);

  return {
    importId: row.id,
    mode: row.mode,
    status: row.status,
    templateVersion: row.templateVersion,
    fileName: row.fileName,
    fileHash: row.fileHash,
    submittedAt: row.createdAt.toISOString(),
    appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
    submittedBy: {
      userId: row.submittedByUserId,
      fullName: row.submittedByFullName
    },
    canApply: result.canApply,
    summary: result.summary
  };
};

export class AdminImportsService {
  private readonly importEngine: SchoolOnboardingImportEngine;

  constructor(private readonly adminImportsRepository: AdminImportsRepository) {
    this.importEngine = new SchoolOnboardingImportEngine(
      new UsersRepository(),
      new AcademicStructureRepository(),
      new StudentsRepository(),
      new TransportRepository()
    );
  }

  async runSchoolOnboardingDryRun(
    authUser: AuthenticatedUser,
    payload: SchoolOnboardingDryRunRequestDto
  ): Promise<SchoolOnboardingImportResponseDto> {
    const snapshot = await this.adminImportsRepository.loadReferenceSnapshot();
    const evaluation = this.importEngine.evaluate(payload, snapshot);
    const importRun = await this.adminImportsRepository.createImportRun({
      mode: "dry-run",
      status: evaluation.response.status,
      templateVersion: payload.templateVersion,
      fileName: payload.fileName,
      fileHash: payload.fileHash,
      fileSize: payload.fileSize ?? null,
      submittedByUserId: authUser.userId,
      payloadJson: payload,
      resultJson: evaluation.response,
      summaryJson: evaluation.response.summary,
      issuesJson: evaluation.response.issues,
      entityCountsJson: evaluation.response.entityPlanCounts,
      resolvedReferenceCountsJson: evaluation.response.resolvedReferenceCounts
    });

    return attachImportId(importRun.id, evaluation.response);
  }

  async applySchoolOnboardingImport(
    authUser: AuthenticatedUser,
    payload: SchoolOnboardingApplyRequestDto
  ): Promise<SchoolOnboardingImportResponseDto> {
    const dryRun = await this.adminImportsRepository.findImportRunById(payload.dryRunId);

    if (!dryRun) {
      throw new NotFoundError("School onboarding dry-run not found");
    }

    if (dryRun.mode !== "dry-run") {
      throw new ValidationError("dryRunId must reference a dry-run import", [
        {
          field: "dryRunId",
          code: "DRY_RUN_REQUIRED",
          message: "Apply requests must reference a valid school onboarding dry-run"
        }
      ]);
    }

    if (dryRun.status !== "validated") {
      throw new ValidationError("Only validated dry-runs can be applied", [
        {
          field: "dryRunId",
          code: "DRY_RUN_REQUIRED",
          message: "Run a successful dry-run before applying the school onboarding import"
        }
      ]);
    }

    const existingApply = await this.adminImportsRepository.findAppliedImportRunByDryRunSourceId(
      payload.dryRunId
    );

    if (existingApply) {
      return parseStoredResponse(existingApply, { alreadyApplied: true });
    }

    const dryRunPayload = dryRun.payloadJson as SchoolOnboardingDryRunRequestDto;
    const snapshot = await this.adminImportsRepository.loadReferenceSnapshot();

    return db.withTransaction(async (client) => {
      const applyResponse = await this.importEngine.apply(
        authUser,
        dryRunPayload,
        payload,
        snapshot,
        client
      );
      const importRun = await this.adminImportsRepository.createImportRun(
        {
          mode: "apply",
          status: applyResponse.status,
          templateVersion: dryRunPayload.templateVersion,
          fileName: dryRunPayload.fileName,
          fileHash: dryRunPayload.fileHash,
          fileSize: dryRunPayload.fileSize ?? null,
          submittedByUserId: authUser.userId,
          payloadJson: dryRunPayload,
          resultJson: applyResponse,
          summaryJson: applyResponse.summary,
          issuesJson: applyResponse.issues,
          entityCountsJson: applyResponse.entityPlanCounts,
          resolvedReferenceCountsJson: applyResponse.resolvedReferenceCounts,
          dryRunSourceId: dryRun.id,
          appliedAt: new Date()
        },
        client
      );

      return attachImportId(importRun.id, applyResponse);
    });
  }

  async listSchoolOnboardingImportHistory(
    query: { page: number; limit: number }
  ): Promise<PaginatedData<SchoolOnboardingImportHistoryItemDto>> {
    const history = await this.adminImportsRepository.listImportRuns(query);

    return toPaginatedData(
      history.rows.map((row) => toHistoryItem(row)),
      query.page,
      query.limit,
      history.totalItems
    );
  }

  async getSchoolOnboardingImportHistoryDetail(
    importId: string
  ): Promise<SchoolOnboardingImportHistoryDetailDto> {
    const importRun = await this.adminImportsRepository.findImportRunById(importId);

    if (!importRun) {
      throw new NotFoundError("School onboarding import run not found");
    }

    return {
      ...toHistoryItem(importRun),
      dryRunSourceId: importRun.dryRunSourceId,
      result: parseStoredResponse(importRun)
    };
  }
}


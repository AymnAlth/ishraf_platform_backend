import type {
  SchoolOnboardingImportMode,
  SchoolOnboardingImportStatus,
  SchoolOnboardingSheetId
} from "../school-onboarding.constants";

export interface SchoolOnboardingImportHistoryParamsDto {
  importId: string;
}

export interface SchoolOnboardingWorkbookRowDto {
  rowNumber: number;
  values: Record<string, string | number | boolean | null>;
}

export interface SchoolOnboardingWorkbookSheetDto {
  sheetId: SchoolOnboardingSheetId;
  present: boolean;
  headers: string[];
  rows: SchoolOnboardingWorkbookRowDto[];
}

export interface SchoolOnboardingWorkbookDto {
  sheets: Record<SchoolOnboardingSheetId, SchoolOnboardingWorkbookSheetDto>;
}

export interface SchoolOnboardingImportConfigDto {
  activateAfterImport: boolean;
  targetAcademicYearName?: string;
  targetSemesterName?: string;
}

export interface SchoolOnboardingDryRunRequestDto {
  templateVersion: string;
  fileName: string;
  fileHash: string;
  fileSize?: number;
  config: SchoolOnboardingImportConfigDto;
  workbook: SchoolOnboardingWorkbookDto;
}

export interface SchoolOnboardingApplyRequestDto {
  dryRunId: string;
  fallbackPassword?: string;
  confirmActivateContext?: boolean;
}

export interface SchoolOnboardingImportIssueDto {
  level: "error" | "warning";
  code: string;
  sheetId?: SchoolOnboardingSheetId;
  rowNumber?: number;
  columnKey?: string;
  message: string;
  suggestedFix?: string;
}

export interface SchoolOnboardingSheetSummaryDto {
  sheetId: SchoolOnboardingSheetId;
  rowCount: number;
  errorCount: number;
  warningCount: number;
  present: boolean;
}

export interface SchoolOnboardingImportSummaryDto {
  totalSheets: number;
  presentSheets: number;
  totalRows: number;
  errorCount: number;
  warningCount: number;
}

export interface SchoolOnboardingImportResponseDto {
  importId: string;
  mode: SchoolOnboardingImportMode;
  status: SchoolOnboardingImportStatus;
  canApply: boolean;
  summary: SchoolOnboardingImportSummaryDto;
  sheetSummaries: SchoolOnboardingSheetSummaryDto[];
  issues: SchoolOnboardingImportIssueDto[];
  resolvedReferenceCounts: Record<string, number>;
  entityPlanCounts: Record<string, number>;
  alreadyApplied?: boolean;
}

export interface SchoolOnboardingImportHistoryItemDto {
  importId: string;
  mode: SchoolOnboardingImportMode;
  status: SchoolOnboardingImportStatus;
  templateVersion: string;
  fileName: string;
  fileHash: string;
  submittedAt: string;
  appliedAt: string | null;
  submittedBy: {
    userId: string;
    fullName: string;
  };
  canApply: boolean;
  summary: SchoolOnboardingImportSummaryDto;
}

export interface SchoolOnboardingImportHistoryDetailDto
  extends SchoolOnboardingImportHistoryItemDto {
  dryRunSourceId: string | null;
  result: SchoolOnboardingImportResponseDto;
}

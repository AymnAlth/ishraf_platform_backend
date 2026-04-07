import type {
  SystemIntegrationProviderKey,
  SystemSettingAuditAction,
  SystemSettingGroup,
  SystemSettingsGroupValueMap
} from "../types/system-settings.types";

export interface SystemSettingsGroupParamsDto {
  group: SystemSettingGroup;
}

export interface SystemSettingsPatchRequestDto<
  TGroup extends SystemSettingGroup = SystemSettingGroup
> {
  reason: string;
  values: Partial<SystemSettingsGroupValueMap[TGroup]>;
}

export interface ListSystemSettingAuditLogsQueryDto {
  page: number;
  limit: number;
  sortBy: "createdAt";
  sortOrder: "asc" | "desc";
  group?: SystemSettingGroup;
  key?: string;
  changedByUserId?: string;
  since?: string;
  until?: string;
}

export interface SystemSettingActorSummaryDto {
  userId: string;
  fullName: string;
}

export interface SystemSettingEntryResponseDto {
  key: string;
  value: unknown;
  defaultValue: unknown;
  source: "default" | "override";
  description: string;
  updatedAt: string | null;
  updatedBy: SystemSettingActorSummaryDto | null;
}

export interface SystemSettingsGroupResponseDto {
  group: SystemSettingGroup;
  description: string;
  entries: SystemSettingEntryResponseDto[];
}

export interface ListSystemSettingsResponseDto {
  groups: SystemSettingsGroupResponseDto[];
}

export interface SystemSettingAuditLogItemResponseDto {
  auditId: string;
  group: SystemSettingGroup;
  key: string;
  action: SystemSettingAuditAction;
  previousValue: unknown | null;
  newValue: unknown | null;
  reason: string;
  requestId: string;
  changedAt: string;
  changedBy: SystemSettingActorSummaryDto;
}

export interface SystemIntegrationStatusItemDto {
  providerKey: SystemIntegrationProviderKey;
  featureEnabled: boolean;
  pendingOutboxCount: number;
  failedOutboxCount: number;
}

export interface SystemIntegrationsStatusResponseDto {
  integrations: SystemIntegrationStatusItemDto[];
}

import { randomUUID } from "node:crypto";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { IntegrationOutboxRepository } from "../../../common/repositories/integration-outbox.repository";
import { requestExecutionContextService } from "../../../common/services/request-execution-context.service";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import type {
  ListSystemSettingAuditLogsQueryDto,
  ListSystemSettingsResponseDto,
  SystemIntegrationStatusItemDto,
  SystemIntegrationsStatusResponseDto,
  SystemSettingAuditLogItemResponseDto,
  SystemSettingsGroupResponseDto,
  SystemSettingsPatchRequestDto
} from "../dto/system-settings.dto";
import {
  getSystemSettingsDefaultValues,
  getSystemSettingsGroupKeys
} from "../system-settings.registry";
import type {
  SystemSettingAuditLogRow,
  SystemSettingChangeOperation,
  SystemSettingGroup,
  SystemSettingOverrideRow,
  SystemSettingsGroupValues
} from "../types/system-settings.types";
import type { SystemSettingsRepository } from "../repository/system-settings.repository";
import { SystemSettingsReadService } from "./system-settings-read.service";

const areValuesEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const toAuditLogItem = (row: SystemSettingAuditLogRow): SystemSettingAuditLogItemResponseDto => ({
  auditId: row.id,
  group: row.settingGroup,
  key: row.settingKey,
  action: row.action,
  previousValue: row.previousValueJson,
  newValue: row.newValueJson,
  reason: row.changeReason,
  requestId: row.requestId,
  changedAt: row.createdAt.toISOString(),
  changedBy: {
    userId: row.changedByUserId,
    fullName: row.changedByFullName
  }
});

export class SystemSettingsService {
  constructor(
    private readonly systemSettingsRepository: SystemSettingsRepository,
    private readonly systemSettingsReadService: SystemSettingsReadService,
    private readonly integrationOutboxRepository: IntegrationOutboxRepository = new IntegrationOutboxRepository()
  ) {}

  async listSettings(): Promise<ListSystemSettingsResponseDto> {
    return this.systemSettingsReadService.getAllGroups();
  }

  async getSettingsGroup<TGroup extends SystemSettingGroup>(
    group: TGroup
  ): Promise<SystemSettingsGroupResponseDto> {
    return this.systemSettingsReadService.getGroup(group);
  }

  async updateSettingsGroup<TGroup extends SystemSettingGroup>(
    authUser: AuthenticatedUser,
    group: TGroup,
    payload: SystemSettingsPatchRequestDto<TGroup>
  ): Promise<SystemSettingsGroupResponseDto> {
    return db.withTransaction(async (client) => {
      const existingOverrides = await this.systemSettingsRepository.listOverridesByGroup(
        group,
        client
      );
      const operations = await this.applyGroupPatch(
        authUser,
        group,
        payload.values,
        existingOverrides,
        client
      );

      if (operations.length > 0) {
        await this.systemSettingsRepository.insertAuditLogs(
          {
            changedByUserId: authUser.userId,
            changeReason: payload.reason,
            requestId:
              requestExecutionContextService.getCurrentContext()?.requestId ?? randomUUID(),
            operations
          },
          client
        );
      }

      this.systemSettingsReadService.invalidateGroup(group);

      return this.systemSettingsReadService.getGroup(group, client);
    });
  }

  async listAuditLogs(
    query: ListSystemSettingAuditLogsQueryDto
  ): Promise<PaginatedData<SystemSettingAuditLogItemResponseDto>> {
    const auditLogs = await this.systemSettingsRepository.listAuditLogs(query);

    return toPaginatedData(
      auditLogs.rows.map((row) => toAuditLogItem(row)),
      query.page,
      query.limit,
      auditLogs.totalItems
    );
  }

  async getIntegrationsStatus(): Promise<SystemIntegrationsStatusResponseDto> {
    const providerKeys = this.systemSettingsReadService.getIntegrationProviderKeys();
    const outboxSummary = await this.integrationOutboxRepository.summarizeByProvider(providerKeys);
    const summaryMap = new Map(outboxSummary.map((row) => [row.providerKey, row]));
    const integrations = await Promise.all(
      providerKeys.map(async (providerKey): Promise<SystemIntegrationStatusItemDto> => {
        const summary = summaryMap.get(providerKey);

        return {
          providerKey,
          featureEnabled: await this.systemSettingsReadService.isIntegrationFeatureEnabled(
            providerKey
          ),
          pendingOutboxCount: summary?.pendingOutboxCount ?? 0,
          failedOutboxCount: summary?.failedOutboxCount ?? 0
        };
      })
    );

    return { integrations };
  }

  private async applyGroupPatch<TGroup extends SystemSettingGroup>(
    authUser: AuthenticatedUser,
    group: TGroup,
    values: Partial<SystemSettingsGroupValues<TGroup>>,
    existingOverrides: SystemSettingOverrideRow[],
    queryable: Queryable
  ): Promise<SystemSettingChangeOperation[]> {
    const defaultValues = getSystemSettingsDefaultValues(group);
    const overrideMap = new Map(existingOverrides.map((row) => [row.settingKey, row]));
    const operations: SystemSettingChangeOperation[] = [];

    for (const key of getSystemSettingsGroupKeys(group)) {
      const nextValue = values[key];

      if (nextValue === undefined) {
        continue;
      }

      const existingOverride = overrideMap.get(key);
      const currentEffectiveValue = existingOverride
        ? (existingOverride.valueJson as SystemSettingsGroupValues<TGroup>[typeof key])
        : defaultValues[key];

      if (areValuesEqual(currentEffectiveValue, nextValue)) {
        continue;
      }

      if (areValuesEqual(defaultValues[key], nextValue)) {
        if (!existingOverride) {
          continue;
        }

        await this.systemSettingsRepository.deleteOverrideByGroupKey(group, key, queryable);
        operations.push({
          systemSettingId: null,
          settingGroup: group,
          settingKey: key,
          action: "cleared",
          previousValueJson: currentEffectiveValue,
          newValueJson: null
        });
        continue;
      }

      const persistedOverride = await this.systemSettingsRepository.upsertOverride(
        {
          group,
          key,
          valueJson: nextValue,
          updatedByUserId: authUser.userId
        },
        queryable
      );

      operations.push({
        systemSettingId: persistedOverride.id,
        settingGroup: group,
        settingKey: key,
        action: existingOverride ? "updated" : "created",
        previousValueJson: existingOverride ? currentEffectiveValue : null,
        newValueJson: nextValue
      });
    }

    return operations;
  }
}

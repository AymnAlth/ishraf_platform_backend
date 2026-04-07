import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { requestMemoService } from "../../../common/services/request-memo.service";
import { db } from "../../../database/db";
import type {
  ListSystemSettingsResponseDto,
  SystemSettingEntryResponseDto,
  SystemSettingsGroupResponseDto
} from "../dto/system-settings.dto";
import {
  getSystemSettingsDefaultValues,
  getSystemSettingsGroupDefinition,
  getSystemSettingsGroupKeys,
  isSystemIntegrationEnabled,
  listSystemSettingGroups,
  parseSystemSettingValue
} from "../system-settings.registry";
import type {
  AnalyticsSettings,
  ImportsSettings,
  PushNotificationsSettings,
  SystemIntegrationProviderKey,
  SystemSettingGroup,
  SystemSettingOverrideRow,
  SystemSettingsGroupValues,
  TransportMapsSettings
} from "../types/system-settings.types";
import { SYSTEM_INTEGRATION_PROVIDER_KEYS } from "../types/system-settings.types";
import type { SystemSettingsRepository } from "../repository/system-settings.repository";

interface CachedGroupState<TGroup extends SystemSettingGroup = SystemSettingGroup> {
  group: TGroup;
  description: string;
  values: SystemSettingsGroupValues<TGroup>;
  entries: SystemSettingEntryResponseDto[];
}

interface SystemSettingsReadServiceOptions {
  ttlMs?: number;
  now?: () => number;
}

export class SystemSettingsReadService {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly cache = new Map<
    SystemSettingGroup,
    { expiresAt: number; data: CachedGroupState }
  >();

  constructor(
    private readonly systemSettingsRepository: SystemSettingsRepository,
    options: SystemSettingsReadServiceOptions = {}
  ) {
    this.ttlMs = options.ttlMs ?? 15_000;
    this.now = options.now ?? (() => Date.now());
  }

  async getAllGroups(queryable: Queryable = db): Promise<ListSystemSettingsResponseDto> {
    const memoKey = [
      "system-settings",
      "all-groups",
      requestMemoService.getQueryableMemoKey(queryable)
    ].join(":");

    const groups = await requestMemoService.memoize(memoKey, async () => {
      if (queryable === db) {
        const cachedStates = this.getFreshCachedGroups();

        if (cachedStates) {
          return cachedStates.map((state) => this.toGroupResponse(state));
        }
      }

      const overrides = await this.systemSettingsRepository.listOverrides(queryable);
      const groupedOverrides = new Map<SystemSettingGroup, SystemSettingOverrideRow[]>();

      for (const group of listSystemSettingGroups()) {
        groupedOverrides.set(group, []);
      }

      for (const override of overrides) {
        groupedOverrides.get(override.settingGroup)?.push(override);
      }

      return listSystemSettingGroups().map((group) => {
        const state = this.buildResolvedGroupState(group, groupedOverrides.get(group) ?? []);

        if (queryable === db) {
          this.cache.set(group, {
            expiresAt: this.now() + this.ttlMs,
            data: state
          });
        }

        return this.toGroupResponse(state);
      });
    });

    return { groups };
  }

  async getGroup<TGroup extends SystemSettingGroup>(
    group: TGroup,
    queryable: Queryable = db
  ): Promise<SystemSettingsGroupResponseDto> {
    const state = await this.getResolvedGroupState(group, queryable);

    return this.toGroupResponse(state);
  }

  async getPushNotificationsSettings(
    queryable: Queryable = db
  ): Promise<PushNotificationsSettings> {
    return this.getGroupValues("pushNotifications", queryable);
  }

  async getTransportMapsSettings(queryable: Queryable = db): Promise<TransportMapsSettings> {
    return this.getGroupValues("transportMaps", queryable);
  }

  async getAnalyticsSettings(queryable: Queryable = db): Promise<AnalyticsSettings> {
    return this.getGroupValues("analytics", queryable);
  }

  async getImportsSettings(queryable: Queryable = db): Promise<ImportsSettings> {
    return this.getGroupValues("imports", queryable);
  }

  invalidateGroup(group: SystemSettingGroup): void {
    this.cache.delete(group);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getIntegrationProviderKeys(): readonly SystemIntegrationProviderKey[] {
    return SYSTEM_INTEGRATION_PROVIDER_KEYS;
  }

  async isIntegrationFeatureEnabled(
    providerKey: SystemIntegrationProviderKey,
    queryable: Queryable = db
  ): Promise<boolean> {
    if (providerKey === "pushNotifications") {
      return isSystemIntegrationEnabled(
        providerKey,
        await this.getPushNotificationsSettings(queryable)
      );
    }

    if (providerKey === "transportMaps") {
      return isSystemIntegrationEnabled(providerKey, await this.getTransportMapsSettings(queryable));
    }

    return isSystemIntegrationEnabled(providerKey, await this.getAnalyticsSettings(queryable));
  }

  private async getGroupValues<TGroup extends SystemSettingGroup>(
    group: TGroup,
    queryable: Queryable = db
  ): Promise<SystemSettingsGroupValues<TGroup>> {
    const state = await this.getResolvedGroupState(group, queryable);

    return state.values;
  }

  private async getResolvedGroupState<TGroup extends SystemSettingGroup>(
    group: TGroup,
    queryable: Queryable
  ): Promise<CachedGroupState<TGroup>> {
    const memoKey = [
      "system-settings",
      "group",
      group,
      requestMemoService.getQueryableMemoKey(queryable)
    ].join(":");

    return requestMemoService.memoize(memoKey, async () => {
      if (queryable === db) {
        const cached = this.cache.get(group);

        if (cached && cached.expiresAt > this.now()) {
          return cached.data as CachedGroupState<TGroup>;
        }
      }

      const overrides = await this.systemSettingsRepository.listOverridesByGroup(group, queryable);
      const state = this.buildResolvedGroupState(group, overrides);

      if (queryable === db) {
        this.cache.set(group, {
          expiresAt: this.now() + this.ttlMs,
          data: state
        });
      }

      return state;
    });
  }

  private buildResolvedGroupState<TGroup extends SystemSettingGroup>(
    group: TGroup,
    overrides: SystemSettingOverrideRow[]
  ): CachedGroupState<TGroup> {
    const definition = getSystemSettingsGroupDefinition(group);
    const defaultValues = getSystemSettingsDefaultValues(group);
    const overrideMap = new Map(overrides.map((row) => [row.settingKey, row]));
    const values = { ...defaultValues } as SystemSettingsGroupValues<TGroup>;
    const entries = getSystemSettingsGroupKeys(group).map((key) => {
      const override = overrideMap.get(key);
      const defaultValue = definition.settings[key].defaultValue;
      const value = override
        ? parseSystemSettingValue(group, key, override.valueJson)
        : defaultValue;

      values[key] = value;

      return {
        key,
        value,
        defaultValue,
        source: override ? "override" : "default",
        description: definition.settings[key].description,
        updatedAt: override ? override.updatedAt.toISOString() : null,
        updatedBy: override
          ? {
              userId: override.updatedByUserId,
              fullName: override.updatedByFullName
            }
          : null
      } satisfies SystemSettingEntryResponseDto;
    });

    return {
      group,
      description: definition.description,
      values,
      entries
    };
  }

  private toGroupResponse<TGroup extends SystemSettingGroup>(
    state: CachedGroupState<TGroup>
  ): SystemSettingsGroupResponseDto {
    return {
      group: state.group,
      description: state.description,
      entries: state.entries
    };
  }

  private getFreshCachedGroups(): CachedGroupState[] | null {
    const states: CachedGroupState[] = [];

    for (const group of listSystemSettingGroups()) {
      const cached = this.cache.get(group);

      if (!cached || cached.expiresAt <= this.now()) {
        return null;
      }

      states.push(cached.data);
    }

    return states;
  }
}

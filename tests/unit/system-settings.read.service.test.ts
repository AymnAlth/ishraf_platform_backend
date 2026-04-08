import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/common/interfaces/queryable.interface";
import { requestMemoService } from "../../src/common/services/request-memo.service";
import type { SystemSettingEntryResponseDto } from "../../src/modules/system-settings/dto/system-settings.dto";
import type { SystemSettingsRepository } from "../../src/modules/system-settings/repository/system-settings.repository";
import { SystemSettingsReadService } from "../../src/modules/system-settings/service/system-settings-read.service";
import type { SystemSettingOverrideRow } from "../../src/modules/system-settings/types/system-settings.types";

const createQueryable = (): Queryable => ({
  query: vi.fn()
});

const createOverride = (
  overrides: Partial<SystemSettingOverrideRow> = {}
): SystemSettingOverrideRow => ({
  id: overrides.id ?? "1",
  settingGroup: overrides.settingGroup ?? "imports",
  settingKey: overrides.settingKey ?? "schoolOnboardingEnabled",
  valueJson: overrides.valueJson ?? false,
  updatedByUserId: overrides.updatedByUserId ?? "1",
  updatedByFullName: overrides.updatedByFullName ?? "Admin User",
  createdAt: overrides.createdAt ?? new Date("2026-04-07T10:00:00.000Z"),
  updatedAt: overrides.updatedAt ?? new Date("2026-04-07T10:00:00.000Z")
});

const findEntry = (
  entries: SystemSettingEntryResponseDto[],
  key: string
): SystemSettingEntryResponseDto => {
  const entry = entries.find((item) => item.key === key);

  if (!entry) {
    throw new Error(`Expected system setting entry '${key}' to exist`);
  }

  return entry;
};

describe("system-settings.read.service", () => {
  it("returns default values when no overrides exist and memoizes within the same request scope", async () => {
    const repository = {
      listOverridesByGroup: vi.fn().mockResolvedValue([])
    } as unknown as SystemSettingsRepository;
    const service = new SystemSettingsReadService(repository);
    const queryable = createQueryable();

    const [firstResult, secondResult] = await requestMemoService.run(async () =>
      Promise.all([service.getGroup("imports", queryable), service.getGroup("imports", queryable)])
    );

    expect(findEntry(firstResult.entries, "schoolOnboardingEnabled")).toMatchObject({
      value: true,
      defaultValue: true,
      source: "default"
    });
    expect(secondResult.entries).toEqual(firstResult.entries);
    expect(repository.listOverridesByGroup).toHaveBeenCalledTimes(1);
  });

  it("surfaces the default transport ETA provider and derived estimate flag when no override exists", async () => {
    const repository = {
      listOverridesByGroup: vi.fn().mockResolvedValue([])
    } as unknown as SystemSettingsRepository;
    const service = new SystemSettingsReadService(repository);

    const result = await service.getGroup("transportMaps", createQueryable());

    expect(findEntry(result.entries, "etaProvider")).toMatchObject({
      value: "mapbox",
      defaultValue: "mapbox",
      source: "default"
    });
    expect(findEntry(result.entries, "etaDerivedEstimateEnabled")).toMatchObject({
      value: true,
      defaultValue: true,
      source: "default"
    });
  });

  it("lets overrides win over defaults", () => {
    const repository = {
      listOverridesByGroup: vi.fn().mockResolvedValue([createOverride()])
    } as unknown as SystemSettingsRepository;
    const service = new SystemSettingsReadService(repository);

    return service.getGroup("imports", createQueryable()).then((result) => {
      expect(findEntry(result.entries, "schoolOnboardingEnabled")).toMatchObject({
        value: false,
        defaultValue: true,
        source: "override",
        updatedBy: {
          userId: "1",
          fullName: "Admin User"
        }
      });
    });
  });

  it("hydrates all groups through one grouped cold-path read and reuses the warm cache", async () => {
    const repository = {
      listOverrides: vi.fn().mockResolvedValue([createOverride()]),
      listOverridesByGroup: vi.fn()
    } as unknown as SystemSettingsRepository;
    const service = new SystemSettingsReadService(repository);

    const firstResult = await service.getAllGroups();
    const secondResult = await service.getAllGroups();
    const importsGroup = firstResult.groups.find((group) => group.group === "imports");
    const transportMapsGroup = firstResult.groups.find((group) => group.group === "transportMaps");

    expect(firstResult.groups).toHaveLength(4);
    expect(secondResult.groups).toEqual(firstResult.groups);
    expect(findEntry(importsGroup?.entries ?? [], "schoolOnboardingEnabled")).toMatchObject({
      value: false,
      source: "override"
    });
    expect(findEntry(transportMapsGroup?.entries ?? [], "etaProvider")).toMatchObject({
      value: "mapbox",
      source: "default"
    });
    expect(findEntry(transportMapsGroup?.entries ?? [], "etaDerivedEstimateEnabled")).toMatchObject({
      value: true,
      source: "default"
    });
    expect(repository.listOverrides).toHaveBeenCalledTimes(1);
    expect(repository.listOverridesByGroup).not.toHaveBeenCalled();
  });

  it("drops stale cached group state after invalidation", async () => {
    const repository = {
      listOverridesByGroup: vi.fn().mockResolvedValueOnce([createOverride()]).mockResolvedValueOnce([])
    } as unknown as SystemSettingsRepository;
    const service = new SystemSettingsReadService(repository);

    const firstResult = await service.getGroup("imports");
    service.invalidateGroup("imports");
    const secondResult = await service.getGroup("imports");

    expect(findEntry(firstResult.entries, "schoolOnboardingEnabled")).toMatchObject({
      value: false,
      source: "override"
    });
    expect(findEntry(secondResult.entries, "schoolOnboardingEnabled")).toMatchObject({
      value: true,
      source: "default"
    });
    expect(repository.listOverridesByGroup).toHaveBeenCalledTimes(2);
  });
});
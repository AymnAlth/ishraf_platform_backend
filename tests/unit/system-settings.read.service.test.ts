import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/common/interfaces/queryable.interface";
import { requestMemoService } from "../../src/common/services/request-memo.service";
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

describe("system-settings.read.service", () => {
  it("returns default values when no overrides exist and memoizes within the same request scope", async () => {
    const repository = {
      listOverridesByGroup: vi.fn().mockResolvedValue([])
    } as unknown as SystemSettingsRepository;
    const service = new SystemSettingsReadService(repository);
    const queryable = createQueryable();

    const [firstResult, secondResult] = await requestMemoService.run(async () =>
      Promise.all([
        service.getGroup("imports", queryable),
        service.getGroup("imports", queryable)
      ])
    );

    const onboardingEntry = firstResult.entries.find(
      (entry) => entry.key === "schoolOnboardingEnabled"
    );

    expect(onboardingEntry).toMatchObject({
      value: true,
      defaultValue: true,
      source: "default"
    });
    expect(secondResult.entries).toEqual(firstResult.entries);
    expect(repository.listOverridesByGroup).toHaveBeenCalledTimes(1);
  });

  it("lets overrides win over defaults", async () => {
    const repository = {
      listOverridesByGroup: vi.fn().mockResolvedValue([createOverride()])
    } as unknown as SystemSettingsRepository;
    const service = new SystemSettingsReadService(repository);

    const result = await service.getGroup("imports", createQueryable());
    const onboardingEntry = result.entries.find(
      (entry) => entry.key === "schoolOnboardingEnabled"
    );

    expect(onboardingEntry).toMatchObject({
      value: false,
      defaultValue: true,
      source: "override",
      updatedBy: {
        userId: "1",
        fullName: "Admin User"
      }
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
    const onboardingEntry = importsGroup?.entries.find(
      (entry) => entry.key === "schoolOnboardingEnabled"
    );

    expect(firstResult.groups).toHaveLength(4);
    expect(secondResult.groups).toEqual(firstResult.groups);
    expect(onboardingEntry).toMatchObject({
      value: false,
      source: "override"
    });
    expect(repository.listOverrides).toHaveBeenCalledTimes(1);
    expect(repository.listOverridesByGroup).not.toHaveBeenCalled();
  });

  it("drops stale cached group state after invalidation", async () => {
    const repository = {
      listOverridesByGroup: vi
        .fn()
        .mockResolvedValueOnce([createOverride()])
        .mockResolvedValueOnce([])
    } as unknown as SystemSettingsRepository;
    const service = new SystemSettingsReadService(repository);

    const firstResult = await service.getGroup("imports");
    service.invalidateGroup("imports");
    const secondResult = await service.getGroup("imports");

    expect(
      firstResult.entries.find((entry) => entry.key === "schoolOnboardingEnabled")
    ).toMatchObject({
      value: false,
      source: "override"
    });
    expect(
      secondResult.entries.find((entry) => entry.key === "schoolOnboardingEnabled")
    ).toMatchObject({
      value: true,
      source: "default"
    });
    expect(repository.listOverridesByGroup).toHaveBeenCalledTimes(2);
  });
});

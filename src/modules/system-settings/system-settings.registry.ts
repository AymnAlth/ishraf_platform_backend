import { z } from "zod";

import type {
  AiAnalyticsProvider,
  AnalyticsSettings,
  ImportsSettings,
  PushNotificationsSettings,
  ScheduledAnalyticsTarget,
  SystemSettingGroup,
  SystemSettingsGroupValueMap,
  SystemSettingsGroupValues,
  TransportMapsSettings
} from "./types/system-settings.types";
import {
  AI_ANALYTICS_PROVIDER_VALUES,
  ETA_PROVIDER_VALUES,
  SCHEDULED_ANALYTICS_TARGET_VALUES,
  SYSTEM_SETTING_GROUP_VALUES
} from "./types/system-settings.types";

interface SystemSettingDefinition<TValue> {
  schema: z.ZodType<TValue>;
  defaultValue: TValue;
  description: string;
}

interface SystemSettingsGroupDefinition<TValues> {
  description: string;
  settings: {
    [TKey in keyof TValues]: SystemSettingDefinition<TValues[TKey]>;
  };
}

const booleanSetting = (
  defaultValue: boolean,
  description: string
): SystemSettingDefinition<boolean> => ({
  schema: z.boolean(),
  defaultValue,
  description
});

const positiveIntegerSetting = (
  defaultValue: number,
  description: string
): SystemSettingDefinition<number> => ({
  schema: z.coerce.number().int().positive(),
  defaultValue,
  description
});

const enumSetting = <TValue extends string>(
  allowedValues: readonly [TValue, ...TValue[]],
  defaultValue: TValue,
  description: string
): SystemSettingDefinition<TValue> => ({
  schema: z.enum(allowedValues),
  defaultValue,
  description
});

const enumArraySetting = <TValue extends string>(
  allowedValues: readonly [TValue, ...TValue[]],
  defaultValue: readonly TValue[],
  description: string
): SystemSettingDefinition<TValue[]> => ({
  schema: z
    .array(z.enum(allowedValues))
    .min(1)
    .transform((values) => [...new Set(values)] as TValue[]),
  defaultValue: [...defaultValue],
  description
});

const nullableIdentifierSetting = (
  description: string
): SystemSettingDefinition<string | null> => ({
  schema: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        return String(value);
      }

      if (typeof value === "string") {
        return value.trim();
      }

      return value;
    },
    z
      .string()
      .regex(/^\d+$/, "Expected a positive numeric identifier")
      .nullable()
  ),
  defaultValue: null,
  description
});

const hasDistinctAnalyticsProviders = (
  value: Record<string, unknown>
): boolean => {
  const primaryProvider = value.primaryProvider as AiAnalyticsProvider | undefined;
  const fallbackProvider = value.fallbackProvider as AiAnalyticsProvider | undefined;

  return (
    primaryProvider === undefined ||
    fallbackProvider === undefined ||
    primaryProvider !== fallbackProvider
  );
};

const DEFAULT_SCHEDULED_ANALYTICS_TARGETS: ScheduledAnalyticsTarget[] = [
  "student_risk_summary",
  "teacher_compliance_summary",
  "admin_operational_digest",
  "class_overview",
  "transport_route_anomaly_summary"
];

export const systemSettingsRegistry = {
  pushNotifications: {
    description: "Feature flags that gate future FCM and realtime push delivery behavior.",
    settings: {
      fcmEnabled: booleanSetting(
        false,
        "Enables Firebase Cloud Messaging provider usage when the provider phase is implemented."
      ),
      transportRealtimeEnabled: booleanSetting(
        false,
        "Allows transport realtime notification workflows to publish through the push pipeline."
      )
    }
  },
  transportMaps: {
    description: "Feature flags and provider selection for external map and ETA integrations used by transport surfaces.",
    settings: {
      etaProvider: enumSetting(
        ETA_PROVIDER_VALUES,
        "mapbox",
        "Selects the preferred ETA provider. Batch 2 activates runtime provider resolution with mapbox as the default selected provider."
      ),
      etaDerivedEstimateEnabled: booleanSetting(
        true,
        "Allows the backend worker to derive ETA snapshots locally between provider refreshes using the cached polyline and recent trip locations."
      ),
      googleMapsEtaEnabled: booleanSetting(
        false,
        "Keeps Google Maps ETA execution available when the admin explicitly selects Google as the active provider."
      ),
      etaProviderRefreshIntervalSeconds: positiveIntegerSetting(
        300,
        "Minimum seconds between provider refreshes for one active trip ETA snapshot."
      ),
      etaProviderDeviationThresholdMeters: positiveIntegerSetting(
        300,
        "Route deviation threshold in meters that forces a fresh provider ETA snapshot."
      )
    }
  },
  analytics: {
    description:
      "Feature flags, provider selection, and admin-controlled scheduled orchestration for AI analytics snapshots.",
    settings: {
      aiAnalyticsEnabled: booleanSetting(
        false,
        "Enables analytics job execution and AI-assisted insight generation for admin-triggered snapshots."
      ),
      primaryProvider: enumSetting(
        AI_ANALYTICS_PROVIDER_VALUES,
        "openai",
        "Selects the primary AI provider used to interpret deterministic analytics features into narrative insights."
      ),
      fallbackProvider: enumSetting(
        AI_ANALYTICS_PROVIDER_VALUES,
        "groq",
        "Selects the fallback AI provider used only when the primary provider cannot complete the analytics interpretation."
      ),
      scheduledRecomputeEnabled: booleanSetting(
        false,
        "Allows admin-controlled scheduled recompute dispatch cycles to create stale analytics jobs from the configured target list."
      ),
      scheduledRecomputeIntervalMinutes: positiveIntegerSetting(
        1440,
        "Defines the freshness window in minutes; scheduled dispatch only recreates analytics when no snapshot exists or the latest snapshot is older than this interval."
      ),
      scheduledRecomputeMaxSubjectsPerTarget: positiveIntegerSetting(
        25,
        "Caps how many stale subjects each scheduled dispatch cycle may enqueue per analytics target."
      ),
      scheduledTargets: enumArraySetting(
        SCHEDULED_ANALYTICS_TARGET_VALUES,
        DEFAULT_SCHEDULED_ANALYTICS_TARGETS,
        "Defines which analytics targets the scheduled dispatch cycle is allowed to recompute when stale."
      ),
      autonomousDispatchEnabled: booleanSetting(
        false,
        "Allows the autonomous analytics scheduler worker to trigger stale scheduled-dispatch cycles without an interactive dashboard request."
      ),
      autonomousDispatchActorUserId: nullableIdentifierSetting(
        "Defines the active admin user id that will own autonomous scheduled analytics jobs for audit traceability."
      ),
      retentionCleanupEnabled: booleanSetting(
        false,
        "Allows admin-triggered analytics retention cleanup to purge obsolete snapshots and terminal analytics execution records."
      ),
      obsoleteSnapshotRetentionDays: positiveIntegerSetting(
        30,
        "Defines how long obsolete analytics snapshots remain before cleanup deletes draft, rejected, and superseded snapshots. Approved snapshots remain available until they become superseded or rejected."
      ),
      jobRetentionDays: positiveIntegerSetting(
        30,
        "Defines how long completed, failed, and dead analytics jobs are retained before cleanup removes them."
      ),
      schedulerRunRetentionDays: positiveIntegerSetting(
        30,
        "Defines how long completed or failed analytics scheduler run records remain before cleanup removes them."
      )
    }
  },
  imports: {
    description: "Operational switches for admin-managed import capabilities.",
    settings: {
      schoolOnboardingEnabled: booleanSetting(
        true,
        "Enables the structured school onboarding dry-run/apply workflow."
      ),
      csvImportEnabled: booleanSetting(
        false,
        "Enables future CSV import surfaces when that operational flow is introduced."
      )
    }
  }
} as const satisfies {
  pushNotifications: SystemSettingsGroupDefinition<PushNotificationsSettings>;
  transportMaps: SystemSettingsGroupDefinition<TransportMapsSettings>;
  analytics: SystemSettingsGroupDefinition<AnalyticsSettings>;
  imports: SystemSettingsGroupDefinition<ImportsSettings>;
};

export const systemSettingGroupSchema = z.enum(SYSTEM_SETTING_GROUP_VALUES);

const hasAtLeastOneDefinedValue = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((item) => item !== undefined);

const createPatchBodySchema = <TGroup extends SystemSettingGroup>(group: TGroup) => {
  const definition = systemSettingsRegistry[group];
  const shape = Object.fromEntries(
    (Object.entries(definition.settings) as Array<[string, SystemSettingDefinition<unknown>]>).map(
      ([key, entry]) => [key, entry.schema.optional()]
    )
  );

  const schema = z
    .object({
      reason: z.string().trim().min(1, "Reason is required").max(500),
      values: z
        .object(shape)
        .strict()
        .refine(hasAtLeastOneDefinedValue, {
          message: "At least one setting value is required",
          path: ["values"]
        })
    })
    .strict();

  if (group === "analytics") {
    return schema.refine(
      (payload) => hasDistinctAnalyticsProviders(payload.values as Record<string, unknown>),
      {
        message: "primaryProvider and fallbackProvider must be different",
        path: ["values", "fallbackProvider"]
      }
    );
  }

  return schema;
};

const patchBodySchemaRegistry = {
  pushNotifications: createPatchBodySchema("pushNotifications"),
  transportMaps: createPatchBodySchema("transportMaps"),
  analytics: createPatchBodySchema("analytics"),
  imports: createPatchBodySchema("imports")
};

export const getSystemSettingsGroupDefinition = <TGroup extends SystemSettingGroup>(
  group: TGroup
) =>
  systemSettingsRegistry[group] as SystemSettingsGroupDefinition<SystemSettingsGroupValueMap[TGroup]>;

export const getSystemSettingsGroupPatchBodySchema = <TGroup extends SystemSettingGroup>(
  group: TGroup
) => patchBodySchemaRegistry[group];

export const getSystemSettingsGroupKeys = <TGroup extends SystemSettingGroup>(
  group: TGroup
): Array<keyof SystemSettingsGroupValueMap[TGroup] & string> =>
  Object.keys(systemSettingsRegistry[group].settings) as Array<
    keyof SystemSettingsGroupValueMap[TGroup] & string
  >;

export const getSystemSettingsDefaultValues = <TGroup extends SystemSettingGroup>(
  group: TGroup
): SystemSettingsGroupValues<TGroup> => {
  const defaults: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(
    systemSettingsRegistry[group].settings
  ) as Array<[string, SystemSettingDefinition<unknown>]>) {
    defaults[key] = Array.isArray(entry.defaultValue)
      ? [...entry.defaultValue]
      : entry.defaultValue;
  }

  return defaults as unknown as SystemSettingsGroupValues<TGroup>;
};

export const parseSystemSettingValue = <TGroup extends SystemSettingGroup>(
  group: TGroup,
  key: keyof SystemSettingsGroupValueMap[TGroup] & string,
  value: unknown
): SystemSettingsGroupValueMap[TGroup][typeof key] => {
  const settings = systemSettingsRegistry[group].settings as Record<
    string,
    SystemSettingDefinition<unknown>
  >;

  return settings[key].schema.parse(value) as SystemSettingsGroupValueMap[TGroup][typeof key];
};

export const listSystemSettingGroups = (): SystemSettingGroup[] => [...SYSTEM_SETTING_GROUP_VALUES];

export const isSystemIntegrationEnabled = (
  group: "pushNotifications" | "transportMaps" | "analytics",
  values:
    | PushNotificationsSettings
    | TransportMapsSettings
    | AnalyticsSettings
    | ImportsSettings
): boolean => {
  if (group === "pushNotifications") {
    const pushValues = values as PushNotificationsSettings;

    return pushValues.fcmEnabled || pushValues.transportRealtimeEnabled;
  }

  if (group === "transportMaps") {
    const transportValues = values as TransportMapsSettings;

    return (
      transportValues.etaProvider === "mapbox" ||
      transportValues.googleMapsEtaEnabled ||
      transportValues.etaDerivedEstimateEnabled
    );
  }

  return (values as AnalyticsSettings).aiAnalyticsEnabled;
};

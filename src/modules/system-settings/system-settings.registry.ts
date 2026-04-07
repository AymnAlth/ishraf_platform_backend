import { z } from "zod";

import type {
  AnalyticsSettings,
  ImportsSettings,
  PushNotificationsSettings,
  SystemSettingGroup,
  SystemSettingsGroupValueMap,
  SystemSettingsGroupValues,
  TransportMapsSettings
} from "./types/system-settings.types";
import { SYSTEM_SETTING_GROUP_VALUES } from "./types/system-settings.types";

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
    description: "Feature flags for external map and ETA integrations used by transport surfaces.",
    settings: {
      googleMapsEtaEnabled: booleanSetting(
        false,
        "Enables Google Maps ETA integration when the provider phase is implemented."
      )
    }
  },
  analytics: {
    description: "Feature flags for external analytics and AI-assisted insight generation.",
    settings: {
      aiAnalyticsEnabled: booleanSetting(
        false,
        "Enables AI analytics capabilities when the analytics provider phase is implemented."
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

  return z
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
    defaults[key] = entry.defaultValue;
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
    return (values as TransportMapsSettings).googleMapsEtaEnabled;
  }

  return (values as AnalyticsSettings).aiAnalyticsEnabled;
};

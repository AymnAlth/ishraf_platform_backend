export const SYSTEM_SETTING_GROUP_VALUES = [
  "pushNotifications",
  "transportMaps",
  "analytics",
  "imports"
] as const;

export type SystemSettingGroup = (typeof SYSTEM_SETTING_GROUP_VALUES)[number];

export const SYSTEM_SETTING_AUDIT_ACTION_VALUES = [
  "created",
  "updated",
  "cleared"
] as const;

export type SystemSettingAuditAction = (typeof SYSTEM_SETTING_AUDIT_ACTION_VALUES)[number];

export const SYSTEM_INTEGRATION_PROVIDER_KEYS = [
  "pushNotifications",
  "transportMaps",
  "analytics"
] as const;

export type SystemIntegrationProviderKey = (typeof SYSTEM_INTEGRATION_PROVIDER_KEYS)[number];

export const INTEGRATION_OUTBOX_STATUS_VALUES = [
  "pending",
  "processing",
  "delivered",
  "failed",
  "dead"
] as const;

export type IntegrationOutboxStatus = (typeof INTEGRATION_OUTBOX_STATUS_VALUES)[number];

export const ETA_PROVIDER_VALUES = ["mapbox", "google"] as const;
export const AI_ANALYTICS_PROVIDER_VALUES = ["openai", "groq"] as const;
export const SCHEDULED_ANALYTICS_TARGET_VALUES = [
  "student_risk_summary",
  "teacher_compliance_summary",
  "admin_operational_digest",
  "class_overview",
  "transport_route_anomaly_summary"
] as const;

export type EtaProvider = (typeof ETA_PROVIDER_VALUES)[number];
export type AiAnalyticsProvider = (typeof AI_ANALYTICS_PROVIDER_VALUES)[number];
export type ScheduledAnalyticsTarget = (typeof SCHEDULED_ANALYTICS_TARGET_VALUES)[number];

export interface PushNotificationsSettings {
  fcmEnabled: boolean;
  transportRealtimeEnabled: boolean;
}

export interface TransportMapsSettings {
  etaProvider: EtaProvider;
  etaDerivedEstimateEnabled: boolean;
  googleMapsEtaEnabled: boolean;
  etaProviderRefreshIntervalSeconds: number;
  etaProviderDeviationThresholdMeters: number;
}

export interface AnalyticsSettings {
  aiAnalyticsEnabled: boolean;
  primaryProvider: AiAnalyticsProvider;
  fallbackProvider: AiAnalyticsProvider;
  scheduledRecomputeEnabled: boolean;
  scheduledRecomputeIntervalMinutes: number;
  scheduledRecomputeMaxSubjectsPerTarget: number;
  scheduledTargets: ScheduledAnalyticsTarget[];
  autonomousDispatchEnabled: boolean;
  autonomousDispatchActorUserId: string | null;
  retentionCleanupEnabled: boolean;
  obsoleteSnapshotRetentionDays: number;
  jobRetentionDays: number;
  schedulerRunRetentionDays: number;
}

export interface ImportsSettings {
  schoolOnboardingEnabled: boolean;
  csvImportEnabled: boolean;
}

export interface SystemSettingsGroupValueMap {
  pushNotifications: PushNotificationsSettings;
  transportMaps: TransportMapsSettings;
  analytics: AnalyticsSettings;
  imports: ImportsSettings;
}

export type SystemSettingsGroupValues<TGroup extends SystemSettingGroup = SystemSettingGroup> =
  SystemSettingsGroupValueMap[TGroup];

export interface SystemSettingOverrideRow {
  id: string;
  settingGroup: SystemSettingGroup;
  settingKey: string;
  valueJson: unknown;
  updatedByUserId: string;
  updatedByFullName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSettingAuditLogRow {
  id: string;
  systemSettingId: string | null;
  settingGroup: SystemSettingGroup;
  settingKey: string;
  action: SystemSettingAuditAction;
  previousValueJson: unknown | null;
  newValueJson: unknown | null;
  changedByUserId: string;
  changedByFullName: string;
  changeReason: string;
  requestId: string;
  createdAt: Date;
}

export interface IntegrationOutboxStatusSummaryRow {
  providerKey: SystemIntegrationProviderKey;
  pendingOutboxCount: number;
  failedOutboxCount: number;
}

export interface IntegrationOutboxWriteInput {
  providerKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payloadJson: unknown;
  headersJson?: unknown;
  idempotencyKey?: string | null;
  availableAt?: Date | null;
  maxAttempts?: number;
  createdByUserId?: string | null;
  requestId?: string | null;
}

export interface SystemSettingChangeOperation {
  systemSettingId: string | null;
  settingGroup: SystemSettingGroup;
  settingKey: string;
  action: SystemSettingAuditAction;
  previousValueJson: unknown | null;
  newValueJson: unknown | null;
}

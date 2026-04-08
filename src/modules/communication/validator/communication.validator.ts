import { z } from "zod";

import {
  booleanQuerySchema,
  buildPaginatedQuerySchema,
  paginationQuerySchema
} from "../../../common/validators/query.validator";
import { ROLE_VALUES } from "../../../config/constants";
import {
  COMMUNICATION_DEVICE_PLATFORM_VALUES,
  COMMUNICATION_DEVICE_PROVIDER_VALUES,
  COMMUNICATION_DEVICE_SUBSCRIPTION_VALUES,
  MESSAGE_LIST_SORT_FIELDS,
  NOTIFICATION_LIST_SORT_FIELDS
} from "../types/communication.types";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const isoDateTimeSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Date-time must be a valid ISO 8601 string"
  });

const trimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, { message: "Value is required" })
    .max(maxLength, { message: `Value must not exceed ${maxLength} characters` });

const optionalTrimmedString = (maxLength: number) =>
  z
    .union([z.string(), z.null()])
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .refine((value) => value === null || (value.length > 0 && value.length <= maxLength), {
      message: `Value must be between 1 and ${maxLength} characters`
    })
    .optional();

const audienceIdsSchema = z.array(idSchema).min(1).optional();
const audienceRolesSchema = z.array(z.enum(ROLE_VALUES)).min(1).optional();
const deviceSubscriptionsSchema = z
  .array(z.enum(COMMUNICATION_DEVICE_SUBSCRIPTION_VALUES))
  .min(1)
  .transform((values) => [...new Set(values)]);

const ensureAudienceDefined = (
  data: {
    receiverUserIds?: string[];
    userIds?: string[];
    targetRoles?: string[];
  },
  ctx: z.RefinementCtx,
  idsField: "receiverUserIds" | "userIds"
): void => {
  const hasIds = Array.isArray(data[idsField]) && data[idsField]!.length > 0;
  const hasRoles = Array.isArray(data.targetRoles) && data.targetRoles.length > 0;

  if (!hasIds && !hasRoles) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [idsField],
      message: "At least one audience selector is required"
    });
  }
};

export const messageIdParamsSchema = z.object({
  messageId: idSchema
});

export const notificationIdParamsSchema = z.object({
  notificationId: idSchema
});

export const otherUserIdParamsSchema = z.object({
  otherUserId: idSchema
});

export const communicationDeviceIdParamsSchema = z.object({
  deviceId: idSchema
});

export const availableRecipientsQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(150).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    page: paginationQuerySchema.shape.page,
    limit: paginationQuerySchema.shape.limit
  })
  .strict();

export const sendMessageSchema = z
  .object({
    receiverUserId: idSchema,
    messageBody: trimmedString(5000)
  })
  .strict();

export const sendBulkMessageSchema = z
  .object({
    receiverUserIds: audienceIdsSchema,
    targetRoles: audienceRolesSchema,
    messageBody: trimmedString(5000)
  })
  .strict()
  .superRefine((data, ctx) => ensureAudienceDefined(data, ctx, "receiverUserIds"));

export const inboxQuerySchema = buildPaginatedQuerySchema(
  {
    isRead: booleanQuerySchema.optional()
  },
  MESSAGE_LIST_SORT_FIELDS,
  {
    sortBy: "sentAt"
  }
).strict();

export const sentQuerySchema = buildPaginatedQuerySchema(
  {
    receiverUserId: idSchema.optional()
  },
  MESSAGE_LIST_SORT_FIELDS,
  {
    sortBy: "sentAt"
  }
).strict();

export const conversationQuerySchema = buildPaginatedQuerySchema(
  {},
  MESSAGE_LIST_SORT_FIELDS,
  {
    sortBy: "sentAt",
    sortOrder: "asc"
  }
).strict();

export const createAnnouncementSchema = z
  .object({
    title: trimmedString(150),
    content: trimmedString(5000),
    targetRole: z.enum(ROLE_VALUES).nullable().optional(),
    targetRoles: audienceRolesSchema,
    expiresAt: isoDateTimeSchema.nullable().optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasTargetRole = data.targetRole !== undefined && data.targetRole !== null;
    const hasTargetRoles = Array.isArray(data.targetRoles) && data.targetRoles.length > 0;

    if (hasTargetRole && hasTargetRoles) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetRoles"],
        message: "Use either targetRole or targetRoles, not both"
      });
    }
  });

export const createNotificationSchema = z
  .object({
    userId: idSchema,
    title: trimmedString(150),
    message: trimmedString(2000),
    notificationType: trimmedString(50),
    referenceType: optionalTrimmedString(50),
    referenceId: idSchema.nullable().optional()
  })
  .strict();

export const createBulkNotificationSchema = z
  .object({
    userIds: audienceIdsSchema,
    targetRoles: audienceRolesSchema,
    title: trimmedString(150),
    message: trimmedString(2000),
    notificationType: trimmedString(50),
    referenceType: optionalTrimmedString(50),
    referenceId: idSchema.nullable().optional()
  })
  .strict()
  .superRefine((data, ctx) => ensureAudienceDefined(data, ctx, "userIds"));

export const notificationsQuerySchema = buildPaginatedQuerySchema(
  {
    isRead: booleanQuerySchema.optional(),
    notificationType: trimmedString(50).optional()
  },
  NOTIFICATION_LIST_SORT_FIELDS,
  {
    sortBy: "createdAt"
  }
).strict();

export const registerCommunicationDeviceSchema = z
  .object({
    providerKey: z.enum(COMMUNICATION_DEVICE_PROVIDER_VALUES),
    platform: z.enum(COMMUNICATION_DEVICE_PLATFORM_VALUES),
    appId: trimmedString(50),
    deviceToken: trimmedString(4096),
    deviceName: trimmedString(100).optional(),
    subscriptions: deviceSubscriptionsSchema
  })
  .strict();

export const updateCommunicationDeviceSchema = z
  .object({
    deviceToken: trimmedString(4096).optional(),
    deviceName: optionalTrimmedString(100),
    subscriptions: deviceSubscriptionsSchema.optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.deviceToken === undefined &&
      data.deviceName === undefined &&
      data.subscriptions === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deviceToken"],
        message: "At least one device field must be provided"
      });
    }
  });

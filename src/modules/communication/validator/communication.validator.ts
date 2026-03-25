import { z } from "zod";

import {
  booleanQuerySchema,
  buildPaginatedQuerySchema,
  paginationQuerySchema
} from "../../../common/validators/query.validator";
import { ROLE_VALUES } from "../../../config/constants";
import {
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

export const messageIdParamsSchema = z.object({
  messageId: idSchema
});

export const notificationIdParamsSchema = z.object({
  notificationId: idSchema
});

export const otherUserIdParamsSchema = z.object({
  otherUserId: idSchema
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
    expiresAt: isoDateTimeSchema.nullable().optional()
  })
  .strict();

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

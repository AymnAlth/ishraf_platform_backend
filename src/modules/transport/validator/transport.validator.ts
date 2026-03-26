import { z } from "zod";

import { buildPaginatedQuerySchema } from "../../../common/validators/query.validator";
import {
  BUS_STATUS_VALUES,
  HOME_LOCATION_STATUS_VALUES,
  TRIP_LIST_SORT_FIELDS,
  TRIP_STATUS_VALUES,
  TRIP_STUDENT_EVENT_TYPE_VALUES,
  TRIP_TYPE_VALUES
} from "../types/transport.types";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format"
});

const positiveIntSchema = z
  .union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)])
  .refine((value) => value > 0, {
    message: "Value must be greater than zero"
  });

const nonNegativeIntSchema = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/).transform(Number)])
  .refine((value) => value >= 0, {
    message: "Value must be zero or greater"
  });

const latitudeSchema = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)])
  .refine((value) => value >= -90 && value <= 90, {
    message: "Latitude must be between -90 and 90"
  });

const longitudeSchema = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)])
  .refine((value) => value >= -180 && value <= 180, {
    message: "Longitude must be between -180 and 180"
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
    .refine((value) => value === null || value.length <= maxLength, {
      message: `Value must not exceed ${maxLength} characters`
    })
    .optional();

export const routeIdParamsSchema = z.object({
  routeId: idSchema
});

export const assignmentIdParamsSchema = z.object({
  id: idSchema
});

export const studentIdParamsSchema = z.object({
  studentId: idSchema
});

export const tripIdParamsSchema = z.object({
  id: idSchema
});

export const tripStudentRosterQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(150).optional(),
    stopId: idSchema.optional()
  })
  .strict();

export const createBusSchema = z
  .object({
    plateNumber: trimmedString(30),
    driverId: idSchema.optional(),
    capacity: positiveIntSchema,
    status: z.enum(BUS_STATUS_VALUES).optional()
  })
  .strict();

export const createRouteSchema = z
  .object({
    routeName: trimmedString(100),
    startPoint: trimmedString(500),
    endPoint: trimmedString(500),
    estimatedDurationMinutes: nonNegativeIntSchema.optional(),
    isActive: z.boolean().optional()
  })
  .strict();

export const createRouteStopSchema = z
  .object({
    stopName: trimmedString(100),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    stopOrder: positiveIntSchema
  })
  .strict();

export const createStudentBusAssignmentSchema = z
  .object({
    studentId: idSchema,
    routeId: idSchema,
    stopId: idSchema,
    startDate: dateSchema,
    endDate: dateSchema.optional().nullable()
  })
  .strict()
  .refine(
    (payload) => !payload.endDate || payload.endDate >= payload.startDate,
    {
      path: ["endDate"],
      message: "endDate must be later than or equal to startDate"
    }
  );

export const deactivateStudentBusAssignmentSchema = z
  .object({
    endDate: dateSchema.optional()
  })
  .strict();

export const createTransportRouteAssignmentSchema = z
  .object({
    busId: idSchema,
    routeId: idSchema,
    startDate: dateSchema,
    endDate: dateSchema.optional().nullable()
  })
  .strict()
  .refine(
    (payload) => !payload.endDate || payload.endDate >= payload.startDate,
    {
      path: ["endDate"],
      message: "endDate must be later than or equal to startDate"
    }
  );

export const deactivateTransportRouteAssignmentSchema = z
  .object({
    endDate: dateSchema.optional()
  })
  .strict();

export const createTripSchema = z
  .object({
    busId: idSchema,
    routeId: idSchema,
    tripDate: dateSchema,
    tripType: z.enum(TRIP_TYPE_VALUES)
  })
  .strict();

export const ensureDailyTripSchema = z
  .object({
    routeAssignmentId: idSchema,
    tripDate: dateSchema,
    tripType: z.enum(TRIP_TYPE_VALUES)
  })
  .strict();

export const listTripsQuerySchema = buildPaginatedQuerySchema(
  {
    busId: idSchema.optional(),
    routeId: idSchema.optional(),
    tripType: z.enum(TRIP_TYPE_VALUES).optional(),
    tripStatus: z.enum(TRIP_STATUS_VALUES).optional(),
    tripDate: dateSchema.optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional()
  },
  TRIP_LIST_SORT_FIELDS,
  {
    sortBy: "tripDate"
  }
)
  .strict()
  .refine(
    (payload) =>
      !payload.dateFrom || !payload.dateTo || payload.dateTo >= payload.dateFrom,
    {
      path: ["dateTo"],
      message: "dateTo must be later than or equal to dateFrom"
    }
  );

export const recordTripLocationSchema = z
  .object({
    latitude: latitudeSchema,
    longitude: longitudeSchema
  })
  .strict();

export const createTripStudentEventSchema = z
  .object({
    studentId: idSchema,
    eventType: z.enum(TRIP_STUDENT_EVENT_TYPE_VALUES),
    stopId: idSchema.optional(),
    notes: optionalTrimmedString(1000)
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.eventType === "absent" && payload.stopId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stopId"],
        message: "stopId is not allowed for absent events"
      });
    }

    if (
      (payload.eventType === "boarded" || payload.eventType === "dropped_off") &&
      payload.stopId === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stopId"],
        message: "stopId is required for boarded and dropped_off events"
      });
    }
  });

export const saveStudentHomeLocationSchema = z
  .object({
    addressLabel: optionalTrimmedString(150),
    addressText: optionalTrimmedString(1000),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    status: z.enum(HOME_LOCATION_STATUS_VALUES).optional(),
    notes: optionalTrimmedString(1000)
  })
  .strict();

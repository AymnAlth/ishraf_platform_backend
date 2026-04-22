import { z } from "zod";

import { ANALYTICS_RECOMPUTE_TARGET_VALUES } from "../types/analytics.types";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const idArraySchema = z
  .array(idSchema)
  .min(1)
  .transform((values) => [...new Set(values)]);

export const analyticsJobIdParamsSchema = z.object({
  jobId: idSchema
});

export const analyticsSnapshotIdParamsSchema = z.object({
  snapshotId: idSchema
});

export const analyticsStudentIdParamsSchema = z.object({
  studentId: idSchema
});

export const analyticsTeacherIdParamsSchema = z.object({
  teacherId: idSchema
});

export const analyticsClassIdParamsSchema = z.object({
  classId: idSchema
});

export const analyticsRouteIdParamsSchema = z.object({
  routeId: idSchema
});

export const createStudentRiskJobBodySchema = z
  .object({
    studentId: idSchema
  })
  .strict();

export const createTeacherComplianceJobBodySchema = z
  .object({
    teacherId: idSchema
  })
  .strict();

export const createAdminOperationalDigestJobBodySchema = z.object({}).strict();

export const createClassOverviewJobBodySchema = z
  .object({
    classId: idSchema
  })
  .strict();

export const createTransportRouteAnomalyJobBodySchema = z
  .object({
    routeId: idSchema
  })
  .strict();

export const createAnalyticsScheduledDispatchBodySchema = z.object({}).strict();
export const createAnalyticsRetentionCleanupBodySchema = z.object({}).strict();

export const createAnalyticsRecomputeJobBodySchema = z
  .object({
    target: z.enum(ANALYTICS_RECOMPUTE_TARGET_VALUES),
    studentIds: idArraySchema.optional(),
    teacherIds: idArraySchema.optional(),
    classIds: idArraySchema.optional(),
    routeIds: idArraySchema.optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.target === "student_risk_summary") {
      if (value.teacherIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "teacherIds is not allowed for student_risk_summary recompute",
          path: ["teacherIds"]
        });
      }

      if (value.classIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "classIds is not allowed for student_risk_summary recompute",
          path: ["classIds"]
        });
      }

      if (value.routeIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "routeIds is not allowed for student_risk_summary recompute",
          path: ["routeIds"]
        });
      }
    }

    if (value.target === "teacher_compliance_summary") {
      if (value.studentIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "studentIds is not allowed for teacher_compliance_summary recompute",
          path: ["studentIds"]
        });
      }

      if (value.classIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "classIds is not allowed for teacher_compliance_summary recompute",
          path: ["classIds"]
        });
      }

      if (value.routeIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "routeIds is not allowed for teacher_compliance_summary recompute",
          path: ["routeIds"]
        });
      }
    }

    if (value.target === "class_overview") {
      if (value.studentIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "studentIds is not allowed for class_overview recompute",
          path: ["studentIds"]
        });
      }

      if (value.teacherIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "teacherIds is not allowed for class_overview recompute",
          path: ["teacherIds"]
        });
      }

      if (value.routeIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "routeIds is not allowed for class_overview recompute",
          path: ["routeIds"]
        });
      }
    }

    if (value.target === "transport_route_anomaly_summary") {
      if (value.studentIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "studentIds is not allowed for transport_route_anomaly_summary recompute",
          path: ["studentIds"]
        });
      }

      if (value.teacherIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "teacherIds is not allowed for transport_route_anomaly_summary recompute",
          path: ["teacherIds"]
        });
      }

      if (value.classIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "classIds is not allowed for transport_route_anomaly_summary recompute",
          path: ["classIds"]
        });
      }
    }

    if (value.target === "admin_operational_digest") {
      if (value.studentIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "studentIds is not allowed for admin_operational_digest recompute",
          path: ["studentIds"]
        });
      }

      if (value.teacherIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "teacherIds is not allowed for admin_operational_digest recompute",
          path: ["teacherIds"]
        });
      }

      if (value.classIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "classIds is not allowed for admin_operational_digest recompute",
          path: ["classIds"]
        });
      }

      if (value.routeIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "routeIds is not allowed for admin_operational_digest recompute",
          path: ["routeIds"]
        });
      }
    }
  });

export const reviewAnalyticsSnapshotBodySchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    reviewNotes: z.string().trim().min(1).max(2000).optional()
  })
  .strict();

export const createAnalyticsFeedbackBodySchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    feedbackText: z.string().trim().min(1).max(2000).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (typeof value.rating !== "number" && typeof value.feedbackText !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of rating or feedbackText is required",
        path: ["rating"]
      });
    }
  });

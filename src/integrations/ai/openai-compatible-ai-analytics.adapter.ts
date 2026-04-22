import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type {
  AdminOperationalDigestFeaturePayload,
  AdminOperationalDigestInsight,
  AnalyticsNarrativeRefinementContext,
  ClassOverviewFeaturePayload,
  ClassOverviewInsight,
  AiAnalyticsProviderKey,
  AiAnalyticsProviderPort,
  StudentRiskFeaturePayload,
  StudentRiskInsight,
  TeacherComplianceFeaturePayload,
  TeacherComplianceInsight,
  TransportRouteAnomalyFeaturePayload,
  TransportRouteAnomalyInsight
} from "./types/ai-analytics-provider.types";
import {
  ADMIN_OPERATIONAL_STATUS_VALUES,
  AiAnalyticsProviderError,
  CLASS_HEALTH_STATUS_VALUES,
  STUDENT_RISK_LEVEL_VALUES,
  TEACHER_COMPLIANCE_LEVEL_VALUES,
  TRANSPORT_ROUTE_ANOMALY_STATUS_VALUES
} from "./types/ai-analytics-provider.types";

interface OpenAiCompatibleAdapterOptions {
  providerKey: AiAnalyticsProviderKey;
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

const studentRiskInsightSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    riskLevel: {
      type: "string",
      enum: [...STUDENT_RISK_LEVEL_VALUES]
    },
    confidenceScore: {
      type: "number"
    },
    summary: {
      type: "string"
    },
    keySignals: {
      type: "array",
      items: {
        type: "string"
      }
    },
    adminRecommendations: {
      type: "array",
      items: {
        type: "string"
      }
    },
    parentGuidance: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "riskLevel",
    "confidenceScore",
    "summary",
    "keySignals",
    "adminRecommendations",
    "parentGuidance"
  ]
} as const;

const teacherComplianceInsightSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    complianceLevel: {
      type: "string",
      enum: [...TEACHER_COMPLIANCE_LEVEL_VALUES]
    },
    confidenceScore: {
      type: "number"
    },
    summary: {
      type: "string"
    },
    keySignals: {
      type: "array",
      items: {
        type: "string"
      }
    },
    operationalGaps: {
      type: "array",
      items: {
        type: "string"
      }
    },
    adminRecommendations: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "complianceLevel",
    "confidenceScore",
    "summary",
    "keySignals",
    "operationalGaps",
    "adminRecommendations"
  ]
} as const;

const adminOperationalDigestInsightSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: [...ADMIN_OPERATIONAL_STATUS_VALUES]
    },
    confidenceScore: {
      type: "number"
    },
    summary: {
      type: "string"
    },
    keySignals: {
      type: "array",
      items: {
        type: "string"
      }
    },
    adminRecommendations: {
      type: "array",
      items: {
        type: "string"
      }
    },
    priorityActions: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "status",
    "confidenceScore",
    "summary",
    "keySignals",
    "adminRecommendations",
    "priorityActions"
  ]
} as const;

const classOverviewInsightSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: [...CLASS_HEALTH_STATUS_VALUES]
    },
    confidenceScore: {
      type: "number"
    },
    summary: {
      type: "string"
    },
    keySignals: {
      type: "array",
      items: {
        type: "string"
      }
    },
    recommendedActions: {
      type: "array",
      items: {
        type: "string"
      }
    },
    focusAreas: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "status",
    "confidenceScore",
    "summary",
    "keySignals",
    "recommendedActions",
    "focusAreas"
  ]
} as const;

const transportRouteAnomalyInsightSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: [...TRANSPORT_ROUTE_ANOMALY_STATUS_VALUES]
    },
    confidenceScore: {
      type: "number"
    },
    summary: {
      type: "string"
    },
    keySignals: {
      type: "array",
      items: {
        type: "string"
      }
    },
    anomalyFlags: {
      type: "array",
      items: {
        type: "string"
      }
    },
    recommendedActions: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "status",
    "confidenceScore",
    "summary",
    "keySignals",
    "anomalyFlags",
    "recommendedActions"
  ]
} as const;

const studentRiskInstructions = [
  "أنت محلل تربوي مؤسسي يعمل داخل منصة مدرسية متعددة الأدوار.",
  "اعتمد فقط على البيانات المهيكلة المقدمة لك. ممنوع اختراع أي حقائق أو أرقام أو أحداث غير موجودة.",
  "اكتب باللغة العربية الفصحى الواضحة، بنبرة مهنية مباشرة، وبدون مبالغة.",
  "يجب أن يبقى مستوى الخطر مطابقًا للحقل computed.riskLevel ولا تغيّره.",
  "يجب أن تبقى confidenceScore بين 0 و 1.",
  "keySignals يجب أن تكون قصيرة ومباشرة وتعكس الأسباب الأهم الموجودة في البيانات.",
  "adminRecommendations تركز على المتابعة التشغيلية داخل المدرسة.",
  "parentGuidance تركز على ما يمكن لولي الأمر فعله عمليًا في المنزل أو بالتواصل مع المدرسة."
].join(" ");

const teacherComplianceInstructions = [
  "أنت محلل امتثال تشغيلي للعمليات التعليمية داخل منصة مدرسية متعددة الأدوار.",
  "اعتمد فقط على البيانات المهيكلة المقدمة لك. ممنوع اختراع أي حقائق أو نسب أو أحداث غير موجودة.",
  "اكتب باللغة العربية الفصحى الواضحة، بنبرة مهنية مباشرة، وبدون لغة إنشائية.",
  "يجب أن يبقى مستوى الامتثال مطابقًا للحقل computed.complianceLevel ولا تغيّره.",
  "يجب أن تبقى confidenceScore بين 0 و 1.",
  "keySignals و operationalGaps يجب أن تكون مختصرة وقابلة للتنفيذ.",
  "adminRecommendations يجب أن تركز على تدخلات الإدارة التشغيلية والمتابعة العملية فقط."
].join(" ");

const adminOperationalDigestInstructions = [
  "أنت محلل تشغيلي مؤسسي يقدم ملخصًا إداريًا عالي الانضباط لقيادة المدرسة.",
  "اعتمد فقط على البيانات المهيكلة المقدمة لك. ممنوع اختراع أي حقائق أو أرقام أو اتجاهات غير موجودة.",
  "اكتب باللغة العربية الفصحى الواضحة، بنبرة تنفيذية مباشرة، وبدون لغة عامة أو إنشائية.",
  "يجب أن تبقى الحالة العامة مطابقة للحقل computed.status ولا تغيّرها.",
  "يجب أن تبقى confidenceScore بين 0 و 1.",
  "keySignals يجب أن تلتقط أهم ثلاث إلى خمس إشارات تشغيلية فعلية من البيانات.",
  "adminRecommendations و priorityActions يجب أن تكون قابلة للتنفيذ إداريًا خلال فترة قصيرة."
].join(" ");

const classOverviewInstructions = [
  "أنت محلل أداء صفي داخل منصة مدرسية متعددة الأدوار.",
  "اعتمد فقط على البيانات المهيكلة المقدمة لك. ممنوع اختراع أي حقائق أو نسب أو أحداث غير موجودة.",
  "اكتب باللغة العربية الفصحى الواضحة، بنبرة تربوية تنفيذية مباشرة، وبدون لغة إنشائية.",
  "يجب أن تبقى الحالة العامة مطابقة للحقل computed.status ولا تغيّرها.",
  "يجب أن تبقى confidenceScore بين 0 و 1.",
  "keySignals يجب أن تعكس المؤشرات الصفية الأساسية فعلًا.",
  "recommendedActions و focusAreas يجب أن تكون قصيرة وقابلة للتنفيذ تربويًا وإداريًا."
].join(" ");

const transportRouteAnomalyInstructions = [
  "أنت محلل نقل مدرسي يقدم ملخص شذوذ تشغيلي لمسار حافلة داخل منصة مدرسية متعددة الأدوار.",
  "اعتمد فقط على البيانات المهيكلة المقدمة لك. ممنوع اختراع أي وقائع أو نسب أو رحلات أو أعطال غير موجودة.",
  "اكتب باللغة العربية الفصحى الواضحة، بنبرة تشغيلية مباشرة، وبدون لغة إنشائية أو مبالغة.",
  "يجب أن تبقى الحالة العامة مطابقة للحقل computed.status ولا تغيّرها.",
  "يجب أن تبقى confidenceScore بين 0 و 1.",
  "keySignals يجب أن تعكس أهم مؤشرات الشذوذ التشغيلية الموجودة في البيانات فعلًا.",
  "anomalyFlags يجب أن تبقى مختصرة وقابلة للاستخدام البرمجي.",
  "recommendedActions يجب أن تكون تدخلات تشغيلية قصيرة وقابلة للتنفيذ من الإدارة أو فريق النقل."
].join(" ");

const clampConfidence = (value: unknown): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, Number(value.toFixed(2))));
};

const ensureStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

const ensureStudentRiskInsight = (value: unknown): StudentRiskInsight => {
  if (!value || typeof value !== "object") {
    throw new Error("AI provider returned an empty student risk payload");
  }

  const payload = value as Record<string, unknown>;

  if (!STUDENT_RISK_LEVEL_VALUES.includes(payload.riskLevel as StudentRiskInsight["riskLevel"])) {
    throw new Error("AI provider returned an invalid student risk level");
  }

  return {
    riskLevel: payload.riskLevel as StudentRiskInsight["riskLevel"],
    confidenceScore: clampConfidence(payload.confidenceScore),
    summary: typeof payload.summary === "string" ? payload.summary : "",
    keySignals: ensureStringArray(payload.keySignals),
    adminRecommendations: ensureStringArray(payload.adminRecommendations),
    parentGuidance: ensureStringArray(payload.parentGuidance)
  };
};

const ensureTeacherComplianceInsight = (value: unknown): TeacherComplianceInsight => {
  if (!value || typeof value !== "object") {
    throw new Error("AI provider returned an empty teacher compliance payload");
  }

  const payload = value as Record<string, unknown>;

  if (
    !TEACHER_COMPLIANCE_LEVEL_VALUES.includes(
      payload.complianceLevel as TeacherComplianceInsight["complianceLevel"]
    )
  ) {
    throw new Error("AI provider returned an invalid teacher compliance level");
  }

  return {
    complianceLevel: payload.complianceLevel as TeacherComplianceInsight["complianceLevel"],
    confidenceScore: clampConfidence(payload.confidenceScore),
    summary: typeof payload.summary === "string" ? payload.summary : "",
    keySignals: ensureStringArray(payload.keySignals),
    operationalGaps: ensureStringArray(payload.operationalGaps),
    adminRecommendations: ensureStringArray(payload.adminRecommendations)
  };
};

const ensureAdminOperationalDigestInsight = (value: unknown): AdminOperationalDigestInsight => {
  if (!value || typeof value !== "object") {
    throw new Error("AI provider returned an empty admin operational digest payload");
  }

  const payload = value as Record<string, unknown>;

  if (!ADMIN_OPERATIONAL_STATUS_VALUES.includes(payload.status as AdminOperationalDigestInsight["status"])) {
    throw new Error("AI provider returned an invalid admin operational digest status");
  }

  return {
    status: payload.status as AdminOperationalDigestInsight["status"],
    confidenceScore: clampConfidence(payload.confidenceScore),
    summary: typeof payload.summary === "string" ? payload.summary : "",
    keySignals: ensureStringArray(payload.keySignals),
    adminRecommendations: ensureStringArray(payload.adminRecommendations),
    priorityActions: ensureStringArray(payload.priorityActions)
  };
};

const ensureClassOverviewInsight = (value: unknown): ClassOverviewInsight => {
  if (!value || typeof value !== "object") {
    throw new Error("AI provider returned an empty class overview payload");
  }

  const payload = value as Record<string, unknown>;

  if (!CLASS_HEALTH_STATUS_VALUES.includes(payload.status as ClassOverviewInsight["status"])) {
    throw new Error("AI provider returned an invalid class overview status");
  }

  return {
    status: payload.status as ClassOverviewInsight["status"],
    confidenceScore: clampConfidence(payload.confidenceScore),
    summary: typeof payload.summary === "string" ? payload.summary : "",
    keySignals: ensureStringArray(payload.keySignals),
    recommendedActions: ensureStringArray(payload.recommendedActions),
    focusAreas: ensureStringArray(payload.focusAreas)
  };
};

const ensureTransportRouteAnomalyInsight = (value: unknown): TransportRouteAnomalyInsight => {
  if (!value || typeof value !== "object") {
    throw new Error("AI provider returned an empty transport route anomaly payload");
  }

  const payload = value as Record<string, unknown>;

  if (
    !TRANSPORT_ROUTE_ANOMALY_STATUS_VALUES.includes(
      payload.status as TransportRouteAnomalyInsight["status"]
    )
  ) {
    throw new Error("AI provider returned an invalid transport route anomaly status");
  }

  return {
    status: payload.status as TransportRouteAnomalyInsight["status"],
    confidenceScore: clampConfidence(payload.confidenceScore),
    summary: typeof payload.summary === "string" ? payload.summary : "",
    keySignals: ensureStringArray(payload.keySignals),
    anomalyFlags: ensureStringArray(payload.anomalyFlags),
    recommendedActions: ensureStringArray(payload.recommendedActions)
  };
};

export class OpenAiCompatibleAiAnalyticsAdapter implements AiAnalyticsProviderPort {
  readonly providerKey: AiAnalyticsProviderKey;

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: OpenAiCompatibleAdapterOptions) {
    this.providerKey = options.providerKey;
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs;
  }

  isConfigured(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  async generateStudentRiskInsight(
    payload: StudentRiskFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<StudentRiskInsight> {
    const response = await this.requestStructuredOutput(
      "student_risk_insight",
      studentRiskInstructions,
      {
        featurePayload: payload,
        refinementContext: refinementContext ?? null
      },
      studentRiskInsightSchema
    );

    return ensureStudentRiskInsight(response);
  }

  async generateTeacherComplianceInsight(
    payload: TeacherComplianceFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<TeacherComplianceInsight> {
    const response = await this.requestStructuredOutput(
      "teacher_compliance_insight",
      teacherComplianceInstructions,
      {
        featurePayload: payload,
        refinementContext: refinementContext ?? null
      },
      teacherComplianceInsightSchema
    );

    return ensureTeacherComplianceInsight(response);
  }

  async generateAdminOperationalDigestInsight(
    payload: AdminOperationalDigestFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<AdminOperationalDigestInsight> {
    const response = await this.requestStructuredOutput(
      "admin_operational_digest_insight",
      adminOperationalDigestInstructions,
      {
        featurePayload: payload,
        refinementContext: refinementContext ?? null
      },
      adminOperationalDigestInsightSchema
    );

    return ensureAdminOperationalDigestInsight(response);
  }

  async generateClassOverviewInsight(
    payload: ClassOverviewFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<ClassOverviewInsight> {
    const response = await this.requestStructuredOutput(
      "class_overview_insight",
      classOverviewInstructions,
      {
        featurePayload: payload,
        refinementContext: refinementContext ?? null
      },
      classOverviewInsightSchema
    );

    return ensureClassOverviewInsight(response);
  }

  async generateTransportRouteAnomalyInsight(
    payload: TransportRouteAnomalyFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<TransportRouteAnomalyInsight> {
    const response = await this.requestStructuredOutput(
      "transport_route_anomaly_insight",
      transportRouteAnomalyInstructions,
      {
        featurePayload: payload,
        refinementContext: refinementContext ?? null
      },
      transportRouteAnomalyInsightSchema
    );

    return ensureTransportRouteAnomalyInsight(response);
  }

  private async requestStructuredOutput(
    schemaName: string,
    instructions: string,
    payload: unknown,
    schema: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new AiAnalyticsProviderError(
        this.providerKey,
        "INTEGRATION_NOT_CONFIGURED",
        `${this.providerKey} AI provider is not configured`,
        false
      );
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: instructions
            },
            {
              role: "user",
              content: JSON.stringify(payload)
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: schemaName,
              strict: true,
              schema
            }
          }
        })
      });

      if (!response.ok) {
        const responseBody = await response.text();

        logger.warn(
          {
            providerKey: this.providerKey,
            status: response.status,
            body: responseBody.slice(0, 500)
          },
          "AI analytics provider request failed"
        );

        throw new AiAnalyticsProviderError(
          this.providerKey,
          "AI_PROVIDER_HTTP_ERROR",
          `${this.providerKey} request failed with status ${response.status}`,
          response.status >= 500 || response.status === 429
        );
      }

      const parsed = (await response.json()) as ChatCompletionResponse;
      const content = parsed.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.trim().length === 0) {
        throw new AiAnalyticsProviderError(
          this.providerKey,
          "AI_PROVIDER_EMPTY_RESPONSE",
          `${this.providerKey} returned an empty response`,
          true
        );
      }

      return JSON.parse(content);
    } catch (error) {
      if (error instanceof AiAnalyticsProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new AiAnalyticsProviderError(
          this.providerKey,
          "AI_PROVIDER_TIMEOUT",
          `${this.providerKey} request timed out`,
          true
        );
      }

      throw new AiAnalyticsProviderError(
        this.providerKey,
        "AI_PROVIDER_REQUEST_FAILED",
        error instanceof Error ? error.message : "Unknown AI provider error",
        true
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

export const createOpenAiCompatibleAiAnalyticsAdapter = (
  options: OpenAiCompatibleAdapterOptions
): OpenAiCompatibleAiAnalyticsAdapter => new OpenAiCompatibleAiAnalyticsAdapter(options);

export const openAiCompatibleDefaults = {
  openai: {
    providerKey: "openai" as const,
    baseUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_API_MODEL,
    timeoutMs: env.OPENAI_API_TIMEOUT_MS
  },
  groq: {
    providerKey: "groq" as const,
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_API_MODEL,
    timeoutMs: env.GROQ_API_TIMEOUT_MS
  }
};












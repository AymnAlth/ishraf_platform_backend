import type {
  AdminOperationalDigestFeaturePayload,
  AdminOperationalDigestInsight,
  AnalyticsNarrativeFeedbackContext,
  ClassOverviewFeaturePayload,
  ClassOverviewInsight,
  StudentRiskFeaturePayload,
  StudentRiskInsight,
  TeacherComplianceFeaturePayload,
  TeacherComplianceInsight,
  TransportRouteAnomalyFeaturePayload,
  TransportRouteAnomalyInsight
} from "../../../integrations/ai/types/ai-analytics-provider.types";

const dedupeItems = (items: string[]): string[] => [
  ...new Set(items.filter((item) => item.trim().length > 0))
];

export const buildDeterministicStudentRiskInsight = (
  payload: StudentRiskFeaturePayload
): StudentRiskInsight => {
  const { attendance, assessments, behavior, homework, computed } = payload;

  const summaryByLevel: Record<typeof computed.riskLevel, string> = {
    low: `أظهر تحليل الطالب ${payload.student.fullName} مستوى خطر منخفضًا. المؤشرات الحالية مستقرة نسبيًا، مع درجة خطر ${computed.riskScore} وثقة ${computed.confidenceScore}.`,
    medium: `أظهر تحليل الطالب ${payload.student.fullName} مستوى خطر متوسطًا. توجد مؤشرات تشغيلية تحتاج متابعة قريبة، خصوصًا في الحضور أو الأداء الأكاديمي أو الالتزام بالواجبات.`,
    high: `أظهر تحليل الطالب ${payload.student.fullName} مستوى خطر مرتفعًا. تتجمع عدة مؤشرات سلبية في الأداء أو المواظبة أو السلوك، ما يستدعي تدخلًا سريعًا ومنسقًا.`
  };

  const adminRecommendations = dedupeItems([
    attendance.attendancePercentage !== null && attendance.attendancePercentage < 85
      ? "مراجعة انتظام الطالب في الحضور مع المرشد الأكاديمي وولي الأمر خلال أقرب متابعة."
      : "",
    assessments.averagePercentage !== null && assessments.averagePercentage < 70
      ? "إعداد خطة دعم أكاديمي مركزة للمواد ذات الأداء المنخفض ومتابعة نتائجها أسبوعيًا."
      : "",
    behavior.negativeCount > 0
      ? "مراجعة السجل السلوكي وتحديد إجراءات تدخل قصيرة المدى بالتنسيق مع الإشراف الطلابي."
      : "",
    homework.submissionPercentage !== null && homework.submissionPercentage < 80
      ? "متابعة التزام الطالب بالواجبات مع المعلمين وتحديد نقاط التعثر المنزلية أو التنظيمية."
      : "",
    computed.riskLevel === "high"
      ? "رفع الحالة إلى متابعة إدارية مباشرة حتى تتحسن المؤشرات الأساسية خلال الفترة القادمة."
      : ""
  ]);

  const parentGuidance = dedupeItems([
    attendance.attendancePercentage !== null && attendance.attendancePercentage < 85
      ? "التأكد من انتظام حضور الطالب يوميًا ومراجعة أسباب الغياب أو التأخر بشكل مباشر."
      : "",
    assessments.averagePercentage !== null && assessments.averagePercentage < 70
      ? "تنظيم وقت مذاكرة ثابت للمواد الأضعف ومراجعة التقدم مع المدرسة أسبوعيًا."
      : "",
    homework.submissionPercentage !== null && homework.submissionPercentage < 80
      ? "مراجعة الواجبات اليومية مع الطالب والتأكد من تسليمها في الوقت المحدد."
      : "",
    behavior.negativeCount > 0
      ? "مناقشة السلوكيات المسجلة مع الطالب بهدوء وتثبيت توقعات واضحة للتعامل داخل المدرسة."
      : "",
    computed.riskLevel === "low"
      ? "الاستمرار على نفس نمط المتابعة الحالي مع الحفاظ على انتظام الحضور والواجبات."
      : ""
  ]);

  return {
    riskLevel: computed.riskLevel,
    confidenceScore: computed.confidenceScore,
    summary: summaryByLevel[computed.riskLevel],
    keySignals: computed.keySignals,
    adminRecommendations:
      adminRecommendations.length > 0
        ? adminRecommendations
        : ["الاستمرار في المتابعة الدورية الحالية دون الحاجة إلى تدخل تصعيدي."],
    parentGuidance:
      parentGuidance.length > 0
        ? parentGuidance
        : ["الاستمرار في دعم الطالب والحفاظ على قنوات التواصل المعتادة مع المدرسة."]
  };
};

export const buildDeterministicTeacherComplianceInsight = (
  payload: TeacherComplianceFeaturePayload
): TeacherComplianceInsight => {
  const { attendance, assessments, homework, behavior, computed } = payload;

  const summaryByLevel: Record<typeof computed.complianceLevel, string> = {
    strong: `أظهر تحليل المعلم ${payload.teacher.fullName} مستوى امتثال قوي. المؤشرات التشغيلية مستقرة، مع درجة امتثال ${computed.complianceScore} وثقة ${computed.confidenceScore}.`,
    watch: `أظهر تحليل المعلم ${payload.teacher.fullName} مستوى امتثال يحتاج المتابعة. توجد فجوات تشغيلية محددة تتطلب دعمًا إداريًا قريبًا قبل أن تتحول إلى تعثر مستمر.`,
    critical: `أظهر تحليل المعلم ${payload.teacher.fullName} مستوى امتثال حرج. توجد فجوات واضحة في تنفيذ العمليات التعليمية الأساسية وتحتاج إلى تدخل إداري مباشر.`
  };

  const adminRecommendations = dedupeItems([
    attendance.coveragePercentage !== null && attendance.coveragePercentage < 80
      ? "متابعة التزام تسجيل الحضور مع المعلم ووضع نقطة تحقق أسبوعية واضحة."
      : "",
    assessments.publicationPercentage !== null && assessments.publicationPercentage < 80
      ? "مراجعة دورة إنشاء ونشر التقييمات والتأكد من التزام المعلم بالجدول الأكاديمي المعتمد."
      : "",
    assessments.gradingCoveragePercentage !== null && assessments.gradingCoveragePercentage < 80
      ? "متابعة سرعة التصحيح وإغلاق التقييمات المتأخرة ضمن إطار زمني محدد."
      : "",
    homework.submissionCoveragePercentage !== null && homework.submissionCoveragePercentage < 75
      ? "مراجعة آلية متابعة الواجبات وتوثيق التسليمات لضمان اكتمال السجل الأكاديمي."
      : "",
    behavior.totalRecords === 0
      ? "التحقق من آلية التوثيق السلوكي داخل الصف والتأكد من عدم وجود فجوة تشغيلية في التسجيل."
      : "",
    computed.complianceLevel === "critical"
      ? "إطلاق متابعة إدارية مباشرة بخطة تصحيح قصيرة المدى ومراجعة أثرها خلال الفترة القريبة."
      : ""
  ]);

  return {
    complianceLevel: computed.complianceLevel,
    confidenceScore: computed.confidenceScore,
    summary: summaryByLevel[computed.complianceLevel],
    keySignals: computed.keySignals,
    operationalGaps: computed.operationalGaps,
    adminRecommendations:
      adminRecommendations.length > 0
        ? adminRecommendations
        : ["الاستمرار في المتابعة الدورية الحالية لأن المؤشرات التشغيلية ضمن المستوى المقبول."]
  };
};

export const buildDeterministicAdminOperationalDigestInsight = (
  payload: AdminOperationalDigestFeaturePayload
): AdminOperationalDigestInsight => {
  const { attendance, assessments, homework, behavior, computed, overview } = payload;

  const summaryByStatus: Record<typeof computed.status, string> = {
    stable: `أظهر الملخص التشغيلي للإدارة حالة مستقرة في العام ${payload.context.academicYearName} والفصل ${payload.context.semesterName}. المؤشرات المؤسسية الأساسية ضمن الحدود المقبولة مع درجة تشغيلية ${computed.operationalScore}.`,
    watch: `أظهر الملخص التشغيلي للإدارة حالة تتطلب المتابعة القريبة. توجد فجوات تشغيلية متوسطة الأثر في بعض المسارات الأكاديمية أو التنفيذية، مع درجة تشغيلية ${computed.operationalScore}.`,
    critical: `أظهر الملخص التشغيلي للإدارة حالة حرجة نسبيًا. توجد فجوات مؤسسية واضحة في مؤشرات التنفيذ الأكاديمي والمتابعة، مع درجة تشغيلية ${computed.operationalScore}.`
  };

  const adminRecommendations = dedupeItems([
    attendance.coveragePercentage !== null && attendance.coveragePercentage < 80
      ? "إطلاق متابعة إدارية مركزة لتحسين اكتمال تسجيل الحضور على مستوى الصفوف خلال الفترة القريبة."
      : "",
    assessments.publicationPercentage !== null && assessments.publicationPercentage < 80
      ? "مراجعة انضباط نشر التقييمات مع قادة الأقسام والتأكد من الالتزام بالجدول الأكاديمي."
      : "",
    assessments.gradingCoveragePercentage !== null && assessments.gradingCoveragePercentage < 80
      ? "متابعة إغلاق التقييمات غير المصححة وتحديد مسؤوليات تنفيذية واضحة للمعلمين والإشراف."
      : "",
    homework.submissionCoveragePercentage !== null && homework.submissionCoveragePercentage < 75
      ? "تعزيز آلية متابعة الواجبات المنزلية وربطها بمراجعة أسبوعية على مستوى الإدارة الأكاديمية."
      : "",
    behavior.highSeverityNegativeRecords > 0
      ? "تصعيد مراجعة الحالات السلوكية عالية الشدة مع الإشراف الطلابي وخطة تدخل زمنية واضحة."
      : "",
    overview.totalActiveTrips > 0
      ? "متابعة توافق تشغيل النقل النشط مع بقية المشهد التشغيلي لضمان عدم وجود تعارضات ميدانية."
      : ""
  ]);

  const priorityActions = dedupeItems([
    computed.status !== "stable"
      ? "اعتماد قائمة متابعة أسبوعية للمؤشرات التشغيلية الأقل أداءً حتى يتحسن خط الأساس المؤسسي."
      : "",
    attendance.coveragePercentage !== null && attendance.coveragePercentage < 80
      ? "رفع اكتمال تسجيل الحضور إلى مستوى تشغيلي مقبول قبل نهاية الدورة الحالية."
      : "",
    assessments.gradingCoveragePercentage !== null && assessments.gradingCoveragePercentage < 80
      ? "إغلاق فجوات التصحيح المتأخر عبر متابعة يومية قصيرة مع الفرق التعليمية المعنية."
      : "",
    behavior.highSeverityNegativeRecords > 0
      ? "إعداد مراجعة عاجلة للحالات السلوكية عالية الشدة وتحديد أصحاب الإجراء مباشرة."
      : "",
    overview.totalActiveClasses === 0
      ? "التحقق من سلامة المدخلات التشغيلية لأن عدد الصفوف النشطة الحالي غير طبيعي."
      : ""
  ]);

  return {
    status: computed.status,
    confidenceScore: computed.confidenceScore,
    summary: summaryByStatus[computed.status],
    keySignals: computed.keySignals,
    adminRecommendations:
      adminRecommendations.length > 0
        ? adminRecommendations
        : ["الاستمرار في المتابعة المؤسسية الحالية لأن المؤشرات العامة لا تتطلب تصعيدًا فوريًا."],
    priorityActions:
      priorityActions.length > 0
        ? priorityActions
        : ["الاستمرار في المراقبة الأسبوعية المنتظمة للمؤشرات التشغيلية الأساسية."]
  };
};

export const mergeStudentRiskNarrative = (
  baseInsight: StudentRiskInsight,
  generated: Partial<StudentRiskInsight> | null
): StudentRiskInsight => ({
  riskLevel: baseInsight.riskLevel,
  confidenceScore: baseInsight.confidenceScore,
  summary:
    typeof generated?.summary === "string" && generated.summary.trim().length > 0
      ? generated.summary.trim()
      : baseInsight.summary,
  keySignals: baseInsight.keySignals,
  adminRecommendations:
    generated?.adminRecommendations && generated.adminRecommendations.length > 0
      ? dedupeItems(generated.adminRecommendations)
      : baseInsight.adminRecommendations,
  parentGuidance:
    generated?.parentGuidance && generated.parentGuidance.length > 0
      ? dedupeItems(generated.parentGuidance)
      : baseInsight.parentGuidance
});

export const mergeTeacherComplianceNarrative = (
  baseInsight: TeacherComplianceInsight,
  generated: Partial<TeacherComplianceInsight> | null
): TeacherComplianceInsight => ({
  complianceLevel: baseInsight.complianceLevel,
  confidenceScore: baseInsight.confidenceScore,
  summary:
    typeof generated?.summary === "string" && generated.summary.trim().length > 0
      ? generated.summary.trim()
      : baseInsight.summary,
  keySignals: baseInsight.keySignals,
  operationalGaps: baseInsight.operationalGaps,
  adminRecommendations:
    generated?.adminRecommendations && generated.adminRecommendations.length > 0
      ? dedupeItems(generated.adminRecommendations)
      : baseInsight.adminRecommendations
});

export const mergeAdminOperationalDigestNarrative = (
  baseInsight: AdminOperationalDigestInsight,
  generated: Partial<AdminOperationalDigestInsight> | null
): AdminOperationalDigestInsight => ({
  status: baseInsight.status,
  confidenceScore: baseInsight.confidenceScore,
  summary:
    typeof generated?.summary === "string" && generated.summary.trim().length > 0
      ? generated.summary.trim()
      : baseInsight.summary,
  keySignals: baseInsight.keySignals,
  adminRecommendations:
    generated?.adminRecommendations && generated.adminRecommendations.length > 0
      ? dedupeItems(generated.adminRecommendations)
      : baseInsight.adminRecommendations,
  priorityActions:
    generated?.priorityActions && generated.priorityActions.length > 0
      ? dedupeItems(generated.priorityActions)
      : baseInsight.priorityActions
});



export const buildDeterministicClassOverviewInsight = (
  payload: ClassOverviewFeaturePayload
): ClassOverviewInsight => {
  const { attendance, assessments, behavior, homework, computed } = payload;

  const summaryByStatus: Record<typeof computed.status, string> = {
    stable: `أظهر تحليل الصف ${payload.class.className}${payload.class.section ? `/${payload.class.section}` : ""} حالة مستقرة. المؤشرات الأكاديمية والتشغيلية ضمن الحدود المقبولة مع درجة صحة صفية ${computed.classHealthScore}.`,
    watch: `أظهر تحليل الصف ${payload.class.className}${payload.class.section ? `/${payload.class.section}` : ""} حالة تحتاج المتابعة. توجد فجوات متوسطة في الحضور أو الأداء أو الالتزام بالواجبات وتتطلب تدخلًا قريبًا.`,
    critical: `أظهر تحليل الصف ${payload.class.className}${payload.class.section ? `/${payload.class.section}` : ""} حالة حرجة نسبيًا. تتجمع مؤشرات واضحة على تعثر الحضور أو الأداء الأكاديمي أو الانضباط الصفي.`
  };

  const recommendedActions = dedupeItems([
    attendance.averageAttendancePercentage !== null && attendance.averageAttendancePercentage < 85
      ? "إطلاق متابعة صفية مركزة لتحسين انتظام الحضور للطلاب الأقل التزامًا خلال الفترة القريبة."
      : "",
    assessments.overallAveragePercentage !== null && assessments.overallAveragePercentage < 70
      ? "تنفيذ خطة دعم أكاديمي قصيرة المدى للمواد أو المجموعات ذات الأداء المنخفض."
      : "",
    behavior.studentsWithNegativeRecords > 0
      ? "مراجعة الحالات السلوكية السلبية مع الإشراف والمعلمين ووضع تدخلات صفية مباشرة."
      : "",
    homework.averageSubmissionPercentage !== null && homework.averageSubmissionPercentage < 80
      ? "تعزيز متابعة الواجبات للطلاب الأقل التزامًا وربطها بنقطة تحقق أسبوعية."
      : "",
    computed.status === "critical"
      ? "رفع الصف إلى متابعة إدارية أقرب حتى تتحسن مؤشرات الخط الأساس خلال الدورة الحالية."
      : ""
  ]);

  const focusAreas = dedupeItems([
    attendance.averageAttendancePercentage !== null && attendance.averageAttendancePercentage < 85
      ? "الحضور والانضباط الزمني"
      : "",
    assessments.overallAveragePercentage !== null && assessments.overallAveragePercentage < 70
      ? "الأداء الأكاديمي"
      : "",
    behavior.studentsWithNegativeRecords > 0
      ? "السلوك الصفي"
      : "",
    homework.averageSubmissionPercentage !== null && homework.averageSubmissionPercentage < 80
      ? "الواجبات والمتابعة المنزلية"
      : "",
    computed.status === "stable" ? "المحافظة على الاستقرار الحالي" : ""
  ]);

  return {
    status: computed.status,
    confidenceScore: computed.confidenceScore,
    summary: summaryByStatus[computed.status],
    keySignals: computed.keySignals,
    recommendedActions:
      recommendedActions.length > 0
        ? recommendedActions
        : ["الاستمرار في المتابعة الصفية الحالية لأن المؤشرات العامة ضمن المستوى المقبول."],
    focusAreas:
      focusAreas.length > 0 ? focusAreas : ["المراقبة الدورية للمؤشرات الصفية الأساسية"]
  };
};

export const mergeClassOverviewNarrative = (
  baseInsight: ClassOverviewInsight,
  generated: Partial<ClassOverviewInsight> | null
): ClassOverviewInsight => ({
  status: baseInsight.status,
  confidenceScore: baseInsight.confidenceScore,
  summary:
    typeof generated?.summary === "string" && generated.summary.trim().length > 0
      ? generated.summary.trim()
      : baseInsight.summary,
  keySignals: baseInsight.keySignals,
  recommendedActions:
    generated?.recommendedActions && generated.recommendedActions.length > 0
      ? dedupeItems(generated.recommendedActions)
      : baseInsight.recommendedActions,
  focusAreas:
    generated?.focusAreas && generated.focusAreas.length > 0
      ? dedupeItems(generated.focusAreas)
      : baseInsight.focusAreas
});

export const buildDeterministicTransportRouteAnomalyInsight = (
  payload: TransportRouteAnomalyFeaturePayload
): TransportRouteAnomalyInsight => {
  const { trips, eta, computed } = payload;

  const summaryByStatus: Record<typeof computed.status, string> = {
    stable: `أظهر تحليل المسار ${payload.route.routeName} وضعًا تشغيليًا مستقرًا خلال نافذة التحليل الحالية. المؤشرات العامة ضمن الحدود المقبولة مع درجة شذوذ ${computed.anomalyScore}.`,
    watch: `أظهر تحليل المسار ${payload.route.routeName} مؤشرات شذوذ متوسطة تحتاج متابعة تشغيلية قريبة. توجد فجوات واضحة في اكتمال الرحلات أو التتبع أو جودة لقطات ETA.`,
    critical: `أظهر تحليل المسار ${payload.route.routeName} شذوذًا تشغيليًا مرتفعًا. تتجمع على المسار مؤشرات تعثر في الإغلاق أو التتبع الحي أو موثوقية الرحلات وتتطلب تدخلًا إداريًا مباشرًا.`
  };

  const recommendedActions = dedupeItems([
    trips.completionPercentage !== null && trips.completionPercentage < 60
      ? "مراجعة دورة إغلاق الرحلات على هذا المسار والتأكد من اكتمال المحطات قبل إنهاء الرحلة."
      : "",
    trips.manualClosurePercentage !== null && trips.manualClosurePercentage >= 25
      ? "تقليل الاعتماد على الإنهاء اليدوي عبر متابعة السائقين ومسار إغلاق المحطات آليًا."
      : "",
    trips.tripsWithoutLocations > 0
      ? "التحقق من انضباط تحديثات الموقع الحي وربطها بمراقبة آخر موقع مسجل لكل رحلة."
      : "",
    eta.averageStopCompletionPercentage !== null && eta.averageStopCompletionPercentage < 85
      ? "مراجعة اكتمال لقطات ETA وإغلاق المحطات على هذا المسار لتحسين دقة التشغيل."
      : "",
    computed.anomalyFlags.includes("route_delay_pattern") || computed.anomalyFlags.includes("stale_active_trip")
      ? "تحليل أسباب تأخر الرحلات الفعلية مقارنة بالزمن المعياري للمسار وتحديث التخصيصات عند الحاجة."
      : "",
    trips.cancellationPercentage !== null && trips.cancellationPercentage >= 20
      ? "فحص أسباب إلغاء الرحلات المتكرر ومعالجة مصدر التعثر التشغيلي على المسار."
      : ""
  ]);

  return {
    status: computed.status,
    confidenceScore: computed.confidenceScore,
    summary: summaryByStatus[computed.status],
    keySignals: computed.keySignals,
    anomalyFlags: computed.anomalyFlags,
    recommendedActions:
      recommendedActions.length > 0
        ? recommendedActions
        : ["الاستمرار في المتابعة التشغيلية الحالية للمسار مع مراقبة المؤشرات الأسبوعية الأساسية."]
  };
};

export const mergeTransportRouteAnomalyNarrative = (
  baseInsight: TransportRouteAnomalyInsight,
  generated: Partial<TransportRouteAnomalyInsight> | null
): TransportRouteAnomalyInsight => ({
  status: baseInsight.status,
  confidenceScore: baseInsight.confidenceScore,
  summary:
    typeof generated?.summary === "string" && generated.summary.trim().length > 0
      ? generated.summary.trim()
      : baseInsight.summary,
  keySignals: baseInsight.keySignals,
  anomalyFlags:
    generated?.anomalyFlags && generated.anomalyFlags.length > 0
      ? dedupeItems(generated.anomalyFlags)
      : baseInsight.anomalyFlags,
  recommendedActions:
    generated?.recommendedActions && generated.recommendedActions.length > 0
      ? dedupeItems(generated.recommendedActions)
      : baseInsight.recommendedActions
});
const clampRefinedConfidence = (value: number): number =>
  Math.min(1, Math.max(0, Number(value.toFixed(2))));

const buildFeedbackAdjustedConfidence = (
  confidenceScore: number,
  feedback: AnalyticsNarrativeFeedbackContext | null
): number => {
  if (!feedback || feedback.totalFeedbackCount === 0) {
    return confidenceScore;
  }

  let adjustment = 0;

  if (typeof feedback.averageRating === "number") {
    if (feedback.averageRating >= 4 && feedback.totalFeedbackCount >= 2) {
      adjustment += 0.04;
    }

    if (feedback.averageRating <= 2.5 && feedback.totalFeedbackCount >= 2) {
      adjustment -= 0.08;
    }
  }

  if (feedback.negativeFeedbackCount > feedback.positiveFeedbackCount) {
    adjustment -= 0.03;
  }

  if (feedback.positiveFeedbackCount > feedback.negativeFeedbackCount * 2 && feedback.totalFeedbackCount >= 3) {
    adjustment += 0.02;
  }

  return clampRefinedConfidence(confidenceScore + adjustment);
};

const appendFeedbackGuidance = (
  items: string[],
  feedback: AnalyticsNarrativeFeedbackContext | null,
  negativeMessage: string,
  positiveMessage: string
): string[] => {
  if (!feedback || feedback.totalFeedbackCount === 0) {
    return items;
  }

  if (
    typeof feedback.averageRating === "number" &&
    feedback.averageRating <= 2.5 &&
    feedback.totalFeedbackCount >= 2
  ) {
    return dedupeItems([...items, negativeMessage]);
  }

  if (
    typeof feedback.averageRating === "number" &&
    feedback.averageRating >= 4 &&
    feedback.positiveFeedbackCount >= feedback.negativeFeedbackCount
  ) {
    return dedupeItems([...items, positiveMessage]);
  }

  return items;
};

export const refineStudentRiskInsightWithFeedback = (
  insight: StudentRiskInsight,
  feedback: AnalyticsNarrativeFeedbackContext | null
): StudentRiskInsight => ({
  ...insight,
  confidenceScore: buildFeedbackAdjustedConfidence(insight.confidenceScore, feedback),
  adminRecommendations: appendFeedbackGuidance(
    insight.adminRecommendations,
    feedback,
    "مراجعة دقة التوصيات السابقة لهذا الطالب مع المرشد الأكاديمي قبل تثبيت خطة المتابعة التالية.",
    "الاستفادة من التقييمات الإيجابية السابقة عند تثبيت خطة المتابعة الحالية لهذا الطالب."
  ),
  parentGuidance: appendFeedbackGuidance(
    insight.parentGuidance,
    feedback,
    "مراجعة أثر الإرشادات السابقة مع المدرسة وتحديث خطة المتابعة المنزلية للطالب بشكل أوضح.",
    "الاستمرار على الإرشادات المنزلية الحالية لأنها حظيت بردود فعل إيجابية في التحليلات السابقة."
  )
});

export const refineTeacherComplianceInsightWithFeedback = (
  insight: TeacherComplianceInsight,
  feedback: AnalyticsNarrativeFeedbackContext | null
): TeacherComplianceInsight => ({
  ...insight,
  confidenceScore: buildFeedbackAdjustedConfidence(insight.confidenceScore, feedback),
  adminRecommendations: appendFeedbackGuidance(
    insight.adminRecommendations,
    feedback,
    "مراجعة أثر التدخلات الإدارية السابقة لهذا المعلم قبل اعتماد دورة امتثال جديدة.",
    "الاستفادة من نجاح التدخلات السابقة عند تثبيت خطة الدعم التشغيلي الحالية لهذا المعلم."
  )
});

export const refineAdminOperationalDigestInsightWithFeedback = (
  insight: AdminOperationalDigestInsight,
  feedback: AnalyticsNarrativeFeedbackContext | null
): AdminOperationalDigestInsight => ({
  ...insight,
  confidenceScore: buildFeedbackAdjustedConfidence(insight.confidenceScore, feedback),
  adminRecommendations: appendFeedbackGuidance(
    insight.adminRecommendations,
    feedback,
    "مراجعة دقة الملخصات الإدارية السابقة ومطابقتها مع التنفيذ الميداني قبل تعميم الإجراء التالي.",
    "يمكن البناء على التقييمات الإيجابية السابقة لهذا الملخص الإداري عند تثبيت أولويات المتابعة."
  ),
  priorityActions: appendFeedbackGuidance(
    insight.priorityActions,
    feedback,
    "إضافة مراجعة سريعة لأثر الإجراءات السابقة ضمن الدورة الإدارية القادمة.",
    "الحفاظ على ترتيب الأولويات الحالي لأنه يتسق مع feedback إيجابي سابق."
  )
});

export const refineClassOverviewInsightWithFeedback = (
  insight: ClassOverviewInsight,
  feedback: AnalyticsNarrativeFeedbackContext | null
): ClassOverviewInsight => ({
  ...insight,
  confidenceScore: buildFeedbackAdjustedConfidence(insight.confidenceScore, feedback),
  recommendedActions: appendFeedbackGuidance(
    insight.recommendedActions,
    feedback,
    "مراجعة أثر الإجراءات الصفية السابقة مع المعلم والمشرف قبل اعتماد الخطة التالية للصف.",
    "يمكن الإبقاء على نمط التدخل الصفي الحالي لأنه حظي بقبول إيجابي في التحليلات السابقة."
  ),
  focusAreas: appendFeedbackGuidance(
    insight.focusAreas,
    feedback,
    "مراجعة توافق مجالات التركيز الحالية مع ملاحظات التنفيذ السابقة داخل الصف.",
    "تثبيت مجالات التركيز الحالية لأنها تتسق مع feedback إيجابي سابق."
  )
});

export const refineTransportRouteAnomalyInsightWithFeedback = (
  insight: TransportRouteAnomalyInsight,
  feedback: AnalyticsNarrativeFeedbackContext | null
): TransportRouteAnomalyInsight => ({
  ...insight,
  confidenceScore: buildFeedbackAdjustedConfidence(insight.confidenceScore, feedback),
  recommendedActions: appendFeedbackGuidance(
    insight.recommendedActions,
    feedback,
    "مراجعة أثر الإجراءات التشغيلية السابقة على هذا المسار قبل تثبيت أي تصعيد جديد.",
    "يمكن البناء على إجراءات التشغيل السابقة لهذا المسار لأنها حظيت بfeedback إيجابي."
  )
});


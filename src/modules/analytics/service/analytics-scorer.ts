import type { TeacherProfile } from "../../../common/types/profile.types";
import type { ClassRow } from "../../academic-structure/types/academic-structure.types";
import type {
  AdminDashboardSummaryRow,
  StudentAssessmentSummaryRow,
  StudentAttendanceSummaryRow,
  StudentBehaviorSummaryRow,
  ReportingStudentRow
} from "../../reporting/types/reporting.types";
import type {
  AdminOperationalDigestFeaturePayload,
  AdminOperationalStatus,
  ClassHealthStatus,
  ClassOverviewFeaturePayload,
  StudentRiskFeaturePayload,
  StudentRiskLevel,
  TeacherComplianceFeaturePayload,
  TeacherComplianceLevel,
  TransportRouteAnomalyFeaturePayload,
  TransportRouteAnomalyStatus
} from "../../../integrations/ai/types/ai-analytics-provider.types";
import type {
  AnalyticsClassHomeworkSummaryRow,
  AnalyticsOperationalAssessmentSummaryRow,
  AnalyticsOperationalAttendanceSummaryRow,
  AnalyticsOperationalBehaviorSummaryRow,
  AnalyticsOperationalHomeworkSummaryRow,
  AnalyticsStudentHomeworkSummaryRow,
  AnalyticsTeacherAssessmentSummaryRow,
  AnalyticsTeacherAssignmentCountRow,
  AnalyticsTeacherAttendanceSummaryRow,
  AnalyticsTeacherBehaviorSummaryRow,
  AnalyticsTeacherHomeworkSummaryRow,
  AnalyticsTransportRouteOperationalSummaryRow
} from "../types/analytics.types";

interface AnalyticsPeriodContext {
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
}

interface StudentRiskFeatureInput {
  student: ReportingStudentRow;
  activeContext: AnalyticsPeriodContext;
  attendanceSummary: StudentAttendanceSummaryRow | null;
  assessmentSummaries: StudentAssessmentSummaryRow[];
  behaviorSummary: StudentBehaviorSummaryRow | null;
  homeworkSummary: AnalyticsStudentHomeworkSummaryRow;
}

interface TeacherComplianceFeatureInput {
  teacher: TeacherProfile;
  activeContext: AnalyticsPeriodContext;
  assignmentCount: AnalyticsTeacherAssignmentCountRow;
  attendanceSummary: AnalyticsTeacherAttendanceSummaryRow;
  assessmentSummary: AnalyticsTeacherAssessmentSummaryRow;
  homeworkSummary: AnalyticsTeacherHomeworkSummaryRow;
  behaviorSummary: AnalyticsTeacherBehaviorSummaryRow;
}

interface AdminOperationalDigestFeatureInput {
  activeContext: AnalyticsPeriodContext;
  dashboardSummary: AdminDashboardSummaryRow;
  attendanceSummary: AnalyticsOperationalAttendanceSummaryRow;
  assessmentSummary: AnalyticsOperationalAssessmentSummaryRow;
  homeworkSummary: AnalyticsOperationalHomeworkSummaryRow;
  behaviorSummary: AnalyticsOperationalBehaviorSummaryRow;
}

interface ClassOverviewFeatureInput {
  classRow: ClassRow;
  activeContext: AnalyticsPeriodContext;
  students: ReportingStudentRow[];
  attendanceSummaries: StudentAttendanceSummaryRow[];
  assessmentSummaries: StudentAssessmentSummaryRow[];
  behaviorSummaries: StudentBehaviorSummaryRow[];
  homeworkSummary: AnalyticsClassHomeworkSummaryRow;
}

interface TransportRouteAnomalyFeatureInput {
  route: {
    id: string;
    routeName: string;
    startPoint: string;
    endPoint: string;
    estimatedDurationMinutes: number;
  };
  stopCount: number;
  activeContext: AnalyticsPeriodContext;
  inputWindow: {
    fromDate: string;
    toDate: string;
    totalDays: number;
  };
  operationalSummary: AnalyticsTransportRouteOperationalSummaryRow;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundToTwo = (value: unknown): number => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return Number(safeValue.toFixed(2));
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const averageNumbers = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }

  return roundToTwo(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const toIsoDate = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const buildStudentRiskLevel = (riskScore: number): StudentRiskLevel => {
  if (riskScore >= 70) {
    return "high";
  }

  if (riskScore >= 40) {
    return "medium";
  }

  return "low";
};

const buildTeacherComplianceLevel = (complianceScore: number): TeacherComplianceLevel => {
  if (complianceScore >= 75) {
    return "strong";
  }

  if (complianceScore >= 55) {
    return "watch";
  }

  return "critical";
};

const buildAdminOperationalStatus = (operationalScore: number): AdminOperationalStatus => {
  if (operationalScore >= 75) {
    return "stable";
  }

  if (operationalScore >= 55) {
    return "watch";
  }

  return "critical";
};

const buildClassHealthStatus = (classHealthScore: number): ClassHealthStatus => {
  if (classHealthScore >= 75) {
    return "stable";
  }

  if (classHealthScore >= 55) {
    return "watch";
  }

  return "critical";
};

const buildTransportRouteAnomalyStatus = (
  anomalyScore: number
): TransportRouteAnomalyStatus => {
  if (anomalyScore >= 65) {
    return "critical";
  }

  if (anomalyScore >= 35) {
    return "watch";
  }

  return "stable";
};
const buildStudentConfidenceScore = (input: {
  attendanceTotal: number;
  assessmentSubjects: number;
  behaviorTotal: number;
  homeworkTotal: number;
}): number => {
  let confidence = 0.35;

  if (input.attendanceTotal > 0) {
    confidence += 0.2;
  }

  if (input.assessmentSubjects > 0) {
    confidence += 0.2;
  }

  if (input.behaviorTotal > 0) {
    confidence += 0.15;
  }

  if (input.homeworkTotal > 0) {
    confidence += 0.1;
  }

  return roundToTwo(clamp(confidence, 0.35, 0.95));
};

const buildTeacherConfidenceScore = (input: {
  assignmentTotal: number;
  attendanceSessions: number;
  assessmentCount: number;
  homeworkCount: number;
  behaviorTotal: number;
}): number => {
  let confidence = 0.4;

  if (input.assignmentTotal > 0) {
    confidence += 0.1;
  }

  if (input.attendanceSessions > 0) {
    confidence += 0.15;
  }

  if (input.assessmentCount > 0) {
    confidence += 0.15;
  }

  if (input.homeworkCount > 0) {
    confidence += 0.1;
  }

  if (input.behaviorTotal > 0) {
    confidence += 0.05;
  }

  return roundToTwo(clamp(confidence, 0.4, 0.95));
};

const buildAdminConfidenceScore = (input: {
  activeStudents: number;
  activeClasses: number;
  attendanceSessions: number;
  assessmentCount: number;
  homeworkCount: number;
  behaviorTotal: number;
}): number => {
  let confidence = 0.45;

  if (input.activeStudents > 0) {
    confidence += 0.1;
  }

  if (input.activeClasses > 0) {
    confidence += 0.1;
  }

  if (input.attendanceSessions > 0) {
    confidence += 0.1;
  }

  if (input.assessmentCount > 0) {
    confidence += 0.08;
  }

  if (input.homeworkCount > 0) {
    confidence += 0.07;
  }

  if (input.behaviorTotal > 0) {
    confidence += 0.05;
  }

  return roundToTwo(clamp(confidence, 0.45, 0.95));
};

const buildClassConfidenceScore = (input: {
  activeStudents: number;
  studentsWithSessions: number;
  studentsWithAssessments: number;
  totalHomework: number;
  behaviorSignals: number;
}): number => {
  let confidence = 0.45;

  if (input.activeStudents > 0) {
    confidence += 0.1;
  }

  if (input.studentsWithSessions > 0) {
    confidence += 0.15;
  }

  if (input.studentsWithAssessments > 0) {
    confidence += 0.15;
  }

  if (input.totalHomework > 0) {
    confidence += 0.08;
  }

  if (input.behaviorSignals > 0) {
    confidence += 0.05;
  }

  return roundToTwo(clamp(confidence, 0.45, 0.95));
};

const buildStudentRiskSignals = (input: {
  attendancePercentage: number | null;
  averageAssessmentPercentage: number | null;
  lowPerformanceSubjects: Array<{ subjectName: string; overallPercentage: number | null }>;
  negativeCount: number;
  negativeSeverityTotal: number;
  submissionPercentage: number | null;
  lateHomeworkCount: number;
  absentCount: number;
}): string[] => {
  const signals: string[] = [];

  if (input.attendancePercentage !== null && input.attendancePercentage < 85) {
    signals.push(`نسبة الحضور الحالية منخفضة عند ${roundToTwo(input.attendancePercentage)}%.`);
  }

  if (input.absentCount >= 3) {
    signals.push(`عدد الغياب المسجل مرتفع (${input.absentCount}).`);
  }

  if (input.averageAssessmentPercentage !== null && input.averageAssessmentPercentage < 70) {
    signals.push(
      `متوسط الأداء الأكاديمي الحالي منخفض عند ${roundToTwo(input.averageAssessmentPercentage)}%.`
    );
  }

  if (input.lowPerformanceSubjects.length > 0) {
    const subjects = input.lowPerformanceSubjects
      .slice(0, 3)
      .map((item) => item.subjectName)
      .join("، ");
    signals.push(`توجد مواد ذات أداء منخفض تحتاج متابعة، أبرزها: ${subjects}.`);
  }

  if (input.negativeCount > 0 || input.negativeSeverityTotal > 0) {
    signals.push(
      `السجل السلوكي يتضمن مؤشرات سلبية (${input.negativeCount} حالات، شدة تراكمية ${input.negativeSeverityTotal}).`
    );
  }

  if (input.submissionPercentage !== null && input.submissionPercentage < 80) {
    signals.push(
      `معدل تسليم الواجبات منخفض عند ${roundToTwo(input.submissionPercentage)}%.`
    );
  }

  if (input.lateHomeworkCount > 0) {
    signals.push(`هناك ${input.lateHomeworkCount} واجبات تم تسليمها متأخرة.`);
  }

  if (signals.length === 0) {
    signals.push("المؤشرات الحالية مستقرة ولا تظهر عوامل خطر تشغيلية بارزة.");
  }

  return signals.slice(0, 5);
};

const buildTeacherSignals = (input: {
  totalAssignments: number;
  attendanceCoveragePercentage: number | null;
  publicationPercentage: number | null;
  gradingCoveragePercentage: number | null;
  submissionCoveragePercentage: number | null;
  totalBehaviorRecords: number;
}): { keySignals: string[]; operationalGaps: string[] } => {
  const keySignals: string[] = [];
  const operationalGaps: string[] = [];

  if (input.totalAssignments === 0) {
    operationalGaps.push("لا توجد تكليفات صفية فعالة للمعلم في العام النشط.");
  } else {
    keySignals.push(`المعلم مرتبط حاليًا بـ ${input.totalAssignments} تكليفات صفية في العام النشط.`);
  }

  if (input.attendanceCoveragePercentage !== null) {
    if (input.attendanceCoveragePercentage < 80) {
      operationalGaps.push(
        `تغطية تسجيل الحضور منخفضة عند ${roundToTwo(input.attendanceCoveragePercentage)}%.`
      );
    } else {
      keySignals.push(
        `تغطية تسجيل الحضور ضمن المستوى المقبول عند ${roundToTwo(input.attendanceCoveragePercentage)}%.`
      );
    }
  }

  if (input.publicationPercentage !== null && input.publicationPercentage < 80) {
    operationalGaps.push(
      `نشر التقييمات أقل من المستوى المطلوب عند ${roundToTwo(input.publicationPercentage)}%.`
    );
  }

  if (input.gradingCoveragePercentage !== null && input.gradingCoveragePercentage < 80) {
    operationalGaps.push(
      `تغطية تصحيح التقييمات منخفضة عند ${roundToTwo(input.gradingCoveragePercentage)}%.`
    );
  }

  if (input.submissionCoveragePercentage !== null && input.submissionCoveragePercentage < 75) {
    operationalGaps.push(
      `تغطية متابعة واجبات الطلبة منخفضة عند ${roundToTwo(input.submissionCoveragePercentage)}%.`
    );
  }

  if (input.totalBehaviorRecords === 0) {
    operationalGaps.push("لا توجد سجلات متابعة سلوكية حديثة ضمن الفصل النشط.");
  } else {
    keySignals.push(`تم تسجيل ${input.totalBehaviorRecords} حالات سلوكية ضمن الفصل النشط.`);
  }

  if (keySignals.length === 0) {
    keySignals.push("الصورة التشغيلية الحالية تتطلب متابعة مباشرة لغياب مؤشرات التزام قوية.");
  }

  return {
    keySignals: keySignals.slice(0, 5),
    operationalGaps: operationalGaps.slice(0, 5)
  };
};

const buildAdminOperationalSignals = (input: {
  attendanceCoveragePercentage: number | null;
  publicationPercentage: number | null;
  gradingCoveragePercentage: number | null;
  submissionCoveragePercentage: number | null;
  negativeRecords: number;
  highSeverityNegativeRecords: number;
  activeTrips: number;
}): string[] => {
  const signals: string[] = [];

  if (input.attendanceCoveragePercentage !== null) {
    if (input.attendanceCoveragePercentage < 80) {
      signals.push(
        `تغطية تسجيل الحضور المؤسسية منخفضة عند ${roundToTwo(input.attendanceCoveragePercentage)}%.`
      );
    } else {
      signals.push(
        `تغطية تسجيل الحضور ضمن المستوى المقبول عند ${roundToTwo(input.attendanceCoveragePercentage)}%.`
      );
    }
  }

  if (input.publicationPercentage !== null && input.publicationPercentage < 80) {
    signals.push(
      `نشر التقييمات أقل من المستوى المطلوب عند ${roundToTwo(input.publicationPercentage)}%.`
    );
  }

  if (input.gradingCoveragePercentage !== null && input.gradingCoveragePercentage < 80) {
    signals.push(
      `تغطية تصحيح التقييمات على مستوى المؤسسة منخفضة عند ${roundToTwo(input.gradingCoveragePercentage)}%.`
    );
  }

  if (input.submissionCoveragePercentage !== null && input.submissionCoveragePercentage < 75) {
    signals.push(
      `متابعة الواجبات تحتاج تعزيزًا؛ التغطية الحالية ${roundToTwo(input.submissionCoveragePercentage)}%.`
    );
  }

  if (input.highSeverityNegativeRecords > 0) {
    signals.push(
      `تم رصد ${input.highSeverityNegativeRecords} حالات سلوكية عالية الشدة ضمن الفصل النشط.`
    );
  } else if (input.negativeRecords > 0) {
    signals.push(`هناك ${input.negativeRecords} حالات سلوكية سلبية تحتاج مراقبة مستمرة.`);
  }

  if (input.activeTrips > 0) {
    signals.push(`هناك ${input.activeTrips} رحلات نقل نشطة ضمن المشهد التشغيلي الحالي.`);
  }

  if (signals.length === 0) {
    signals.push("المؤشرات التشغيلية العامة مستقرة ولا تظهر فجوات حرجة في الفترة الحالية.");
  }

  return signals.slice(0, 5);
};

const buildClassOverviewSignals = (input: {
  activeStudents: number;
  occupancyPercentage: number | null;
  averageAttendancePercentage: number | null;
  studentsBelowThreshold: number;
  chronicAbsenceStudents: number;
  overallAveragePercentage: number | null;
  lowPerformanceStudents: number;
  lowPerformanceSubjects: Array<{ subjectName: string; averagePercentage: number | null }>;
  studentsWithNegativeRecords: number;
  totalNegativeRecords: number;
  averageSubmissionPercentage: number | null;
  studentsBelowSubmissionThreshold: number;
}): string[] => {
  const signals: string[] = [];

  if (input.activeStudents > 0) {
    signals.push(`الصف يضم حاليًا ${input.activeStudents} طالبًا ضمن العام النشط.`);
  }

  if (input.occupancyPercentage !== null && input.occupancyPercentage > 100) {
    signals.push(`نسبة الإشغال الحالية تتجاوز السعة المحددة عند ${roundToTwo(input.occupancyPercentage)}%.`);
  }

  if (input.averageAttendancePercentage !== null && input.averageAttendancePercentage < 85) {
    signals.push(
      `متوسط الحضور الصفي منخفض عند ${roundToTwo(input.averageAttendancePercentage)}%.`
    );
  }

  if (input.chronicAbsenceStudents > 0) {
    signals.push(`هناك ${input.chronicAbsenceStudents} طلاب ضمن نطاق الغياب المزمن أو الحضور الحرج.`);
  } else if (input.studentsBelowThreshold > 0) {
    signals.push(`هناك ${input.studentsBelowThreshold} طلاب دون حد الحضور المستهدف.`);
  }

  if (input.overallAveragePercentage !== null && input.overallAveragePercentage < 70) {
    signals.push(
      `المتوسط الأكاديمي العام للصف منخفض عند ${roundToTwo(input.overallAveragePercentage)}%.`
    );
  }

  if (input.lowPerformanceStudents > 0) {
    signals.push(`يوجد ${input.lowPerformanceStudents} طلاب بمؤشرات أداء أكاديمي منخفضة.`);
  }

  if (input.lowPerformanceSubjects.length > 0) {
    const subjects = input.lowPerformanceSubjects
      .slice(0, 3)
      .map((item) => item.subjectName)
      .join("، ");
    signals.push(`المواد الأضعف أداءً في الصف حاليًا هي: ${subjects}.`);
  }

  if (input.studentsWithNegativeRecords > 0 || input.totalNegativeRecords > 0) {
    signals.push(
      `تم رصد ${input.totalNegativeRecords} سجلات سلوكية سلبية تخص ${input.studentsWithNegativeRecords} طلاب.`
    );
  }

  if (input.averageSubmissionPercentage !== null && input.averageSubmissionPercentage < 80) {
    signals.push(
      `متوسط التزام الصف بالواجبات منخفض عند ${roundToTwo(input.averageSubmissionPercentage)}%.`
    );
  }

  if (input.studentsBelowSubmissionThreshold > 0) {
    signals.push(`هناك ${input.studentsBelowSubmissionThreshold} طلاب دون حد الالتزام المستهدف بالواجبات.`);
  }

  if (signals.length === 0) {
    signals.push("المشهد الصفي الحالي مستقر ولا تظهر فيه فجوات تشغيلية أو أكاديمية حرجة.");
  }

  return signals.slice(0, 5);
};

export const buildStudentRiskFeaturePayload = (
  input: StudentRiskFeatureInput
): StudentRiskFeaturePayload => {
  const attendancePercentage = toNullableNumber(input.attendanceSummary?.attendancePercentage);
  const totalSessions = toNumber(input.attendanceSummary?.totalSessions);
  const presentCount = toNumber(input.attendanceSummary?.presentCount);
  const absentCount = toNumber(input.attendanceSummary?.absentCount);
  const lateCount = toNumber(input.attendanceSummary?.lateCount);
  const excusedCount = toNumber(input.attendanceSummary?.excusedCount);

  const lowPerformanceSubjects = input.assessmentSummaries
    .map((row) => ({
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      overallPercentage: toNullableNumber(row.overallPercentage)
    }))
    .filter((row) => row.overallPercentage !== null && row.overallPercentage < 65)
    .sort((left, right) => (left.overallPercentage ?? 100) - (right.overallPercentage ?? 100));

  const averageAssessmentPercentage =
    input.assessmentSummaries.length === 0
      ? null
      : roundToTwo(
          input.assessmentSummaries.reduce(
            (sum, row) => sum + (toNullableNumber(row.overallPercentage) ?? 0),
            0
          ) / input.assessmentSummaries.length
        );

  const totalBehaviorRecords = toNumber(input.behaviorSummary?.totalBehaviorRecords);
  const positiveCount = toNumber(input.behaviorSummary?.positiveCount);
  const negativeCount = toNumber(input.behaviorSummary?.negativeCount);
  const negativeSeverityTotal = toNumber(input.behaviorSummary?.negativeSeverityTotal);

  const submissionPercentage =
    input.homeworkSummary.totalHomework > 0
      ? roundToTwo(
          (input.homeworkSummary.submittedCount / input.homeworkSummary.totalHomework) * 100
        )
      : null;

  const attendanceRisk =
    attendancePercentage === null ? 25 : clamp(100 - attendancePercentage, 0, 100);
  const assessmentRisk =
    averageAssessmentPercentage === null ? 20 : clamp(100 - averageAssessmentPercentage, 0, 100);
  const behaviorRisk = clamp(
    negativeCount * 12 + negativeSeverityTotal * 6 - positiveCount * 4,
    0,
    100
  );
  const homeworkRisk =
    submissionPercentage === null ? 20 : clamp(100 - submissionPercentage, 0, 100);

  const riskScore = roundToTwo(
    clamp(
      attendanceRisk * 0.35 +
        assessmentRisk * 0.3 +
        behaviorRisk * 0.2 +
        homeworkRisk * 0.15,
      0,
      100
    )
  );

  const riskLevel = buildStudentRiskLevel(riskScore);
  const confidenceScore = buildStudentConfidenceScore({
    attendanceTotal: totalSessions,
    assessmentSubjects: input.assessmentSummaries.length,
    behaviorTotal: totalBehaviorRecords,
    homeworkTotal: input.homeworkSummary.totalHomework
  });

  const keySignals = buildStudentRiskSignals({
    attendancePercentage,
    averageAssessmentPercentage,
    lowPerformanceSubjects,
    negativeCount,
    negativeSeverityTotal,
    submissionPercentage,
    lateHomeworkCount: input.homeworkSummary.lateCount,
    absentCount
  });

  return {
    student: {
      studentId: input.student.studentId,
      academicNo: input.student.academicNo,
      fullName: input.student.fullName,
      classId: input.student.classId,
      className: input.student.className,
      section: input.student.section,
      academicYearId: input.activeContext.academicYearId,
      academicYearName: input.activeContext.academicYearName,
      semesterId: input.activeContext.semesterId,
      semesterName: input.activeContext.semesterName
    },
    attendance: {
      totalSessions,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendancePercentage
    },
    assessments: {
      totalSubjects: input.assessmentSummaries.length,
      averagePercentage: averageAssessmentPercentage,
      lowPerformanceSubjects
    },
    behavior: {
      totalBehaviorRecords,
      positiveCount,
      negativeCount,
      negativeSeverityTotal
    },
    homework: {
      totalHomework: input.homeworkSummary.totalHomework,
      submittedCount: input.homeworkSummary.submittedCount,
      lateCount: input.homeworkSummary.lateCount,
      notSubmittedCount: input.homeworkSummary.notSubmittedCount,
      submissionPercentage
    },
    computed: {
      riskScore,
      riskLevel,
      confidenceScore,
      keySignals
    }
  };
};

export const buildTeacherComplianceFeaturePayload = (
  input: TeacherComplianceFeatureInput
): TeacherComplianceFeaturePayload => {
  const totalAssignments = toNumber(input.assignmentCount.totalAssignments);
  const attendanceCoveragePercentage = toNullableNumber(input.attendanceSummary.coveragePercentage);
  const publicationPercentage = toNullableNumber(input.assessmentSummary.publicationPercentage);
  const gradingCoveragePercentage = toNullableNumber(
    input.assessmentSummary.gradingCoveragePercentage
  );
  const submissionCoveragePercentage = toNullableNumber(
    input.homeworkSummary.submissionCoveragePercentage
  );

  const assignmentScore = totalAssignments > 0 ? 100 : 20;
  const attendanceScore =
    attendanceCoveragePercentage === null
      ? input.attendanceSummary.sessionCount > 0
        ? 40
        : 55
      : clamp(attendanceCoveragePercentage, 0, 100);
  const assessmentScore = clamp(
    (publicationPercentage ?? 55) * 0.4 + (gradingCoveragePercentage ?? 55) * 0.6,
    0,
    100
  );
  const homeworkScore =
    submissionCoveragePercentage === null
      ? input.homeworkSummary.homeworkCount > 0
        ? 45
        : 55
      : clamp(submissionCoveragePercentage, 0, 100);
  const behaviorScore =
    input.behaviorSummary.totalRecords === 0
      ? 45
      : clamp(
          55 + input.behaviorSummary.positiveRecords * 6 - input.behaviorSummary.negativeRecords * 4,
          0,
          100
        );

  const complianceScore = roundToTwo(
    clamp(
      assignmentScore * 0.15 +
        attendanceScore * 0.25 +
        assessmentScore * 0.3 +
        homeworkScore * 0.2 +
        behaviorScore * 0.1,
      0,
      100
    )
  );

  const complianceLevel = buildTeacherComplianceLevel(complianceScore);
  const { keySignals, operationalGaps } = buildTeacherSignals({
    totalAssignments,
    attendanceCoveragePercentage,
    publicationPercentage,
    gradingCoveragePercentage,
    submissionCoveragePercentage,
    totalBehaviorRecords: input.behaviorSummary.totalRecords
  });

  const confidenceScore = buildTeacherConfidenceScore({
    assignmentTotal: totalAssignments,
    attendanceSessions: input.attendanceSummary.sessionCount,
    assessmentCount: input.assessmentSummary.assessmentCount,
    homeworkCount: input.homeworkSummary.homeworkCount,
    behaviorTotal: input.behaviorSummary.totalRecords
  });

  return {
    teacher: {
      teacherId: input.teacher.teacherId,
      teacherUserId: input.teacher.userId,
      fullName: input.teacher.fullName,
      specialization: input.teacher.specialization,
      academicYearId: input.activeContext.academicYearId,
      academicYearName: input.activeContext.academicYearName,
      semesterId: input.activeContext.semesterId,
      semesterName: input.activeContext.semesterName
    },
    assignments: {
      totalAssignments
    },
    attendance: {
      sessionCount: input.attendanceSummary.sessionCount,
      recordedCount: input.attendanceSummary.recordedCount,
      expectedCount: input.attendanceSummary.expectedCount,
      coveragePercentage: attendanceCoveragePercentage,
      lastSessionDate: toIsoDate(input.attendanceSummary.lastSessionDate)
    },
    assessments: {
      assessmentCount: input.assessmentSummary.assessmentCount,
      publishedCount: input.assessmentSummary.publishedCount,
      gradedCount: input.assessmentSummary.gradedCount,
      expectedCount: input.assessmentSummary.expectedCount,
      publicationPercentage,
      gradingCoveragePercentage,
      lastAssessmentDate: toIsoDate(input.assessmentSummary.lastAssessmentDate)
    },
    homework: {
      homeworkCount: input.homeworkSummary.homeworkCount,
      recordedCount: input.homeworkSummary.recordedCount,
      expectedCount: input.homeworkSummary.expectedCount,
      submissionCoveragePercentage,
      lastDueDate: toIsoDate(input.homeworkSummary.lastDueDate)
    },
    behavior: {
      totalRecords: input.behaviorSummary.totalRecords,
      positiveRecords: input.behaviorSummary.positiveRecords,
      negativeRecords: input.behaviorSummary.negativeRecords,
      lastBehaviorDate: toIsoDate(input.behaviorSummary.lastBehaviorDate)
    },
    computed: {
      complianceScore,
      complianceLevel,
      confidenceScore,
      keySignals,
      operationalGaps
    }
  };
};

export const buildAdminOperationalDigestFeaturePayload = (
  input: AdminOperationalDigestFeatureInput
): AdminOperationalDigestFeaturePayload => {
  const totalActiveStudents = toNumber(input.dashboardSummary.totalActiveStudents);
  const totalActiveClasses = toNumber(input.dashboardSummary.totalActiveClasses);
  const totalTeachers = toNumber(input.dashboardSummary.totalTeachers);
  const totalSupervisors = toNumber(input.dashboardSummary.totalSupervisors);
  const totalDrivers = toNumber(input.dashboardSummary.totalDrivers);
  const totalActiveTrips = toNumber(input.dashboardSummary.totalActiveTrips);
  const totalActiveRoutes = toNumber(input.dashboardSummary.totalActiveRoutes);
  const totalActiveBuses = toNumber(input.dashboardSummary.totalActiveBuses);

  const attendanceCoveragePercentage = toNullableNumber(input.attendanceSummary.coveragePercentage);
  const publicationPercentage = toNullableNumber(input.assessmentSummary.publicationPercentage);
  const gradingCoveragePercentage = toNullableNumber(
    input.assessmentSummary.gradingCoveragePercentage
  );
  const submissionCoveragePercentage = toNullableNumber(
    input.homeworkSummary.submissionCoveragePercentage
  );

  const attendanceScore =
    attendanceCoveragePercentage === null
      ? input.attendanceSummary.sessionCount > 0
        ? 40
        : 60
      : clamp(attendanceCoveragePercentage, 0, 100);
  const assessmentScore = clamp(
    (publicationPercentage ?? 55) * 0.45 + (gradingCoveragePercentage ?? 55) * 0.55,
    0,
    100
  );
  const homeworkScore =
    submissionCoveragePercentage === null
      ? input.homeworkSummary.homeworkCount > 0
        ? 45
        : 60
      : clamp(submissionCoveragePercentage, 0, 100);
  const behaviorScore = clamp(
    100 - input.behaviorSummary.negativeRecords * 1.5 - input.behaviorSummary.highSeverityNegativeRecords * 6,
    0,
    100
  );

  const operationalScore = roundToTwo(
    clamp(
      attendanceScore * 0.35 +
        assessmentScore * 0.3 +
        homeworkScore * 0.2 +
        behaviorScore * 0.15,
      0,
      100
    )
  );

  const status = buildAdminOperationalStatus(operationalScore);
  const confidenceScore = buildAdminConfidenceScore({
    activeStudents: totalActiveStudents,
    activeClasses: totalActiveClasses,
    attendanceSessions: input.attendanceSummary.sessionCount,
    assessmentCount: input.assessmentSummary.assessmentCount,
    homeworkCount: input.homeworkSummary.homeworkCount,
    behaviorTotal: input.behaviorSummary.totalRecords
  });

  const keySignals = buildAdminOperationalSignals({
    attendanceCoveragePercentage,
    publicationPercentage,
    gradingCoveragePercentage,
    submissionCoveragePercentage,
    negativeRecords: input.behaviorSummary.negativeRecords,
    highSeverityNegativeRecords: input.behaviorSummary.highSeverityNegativeRecords,
    activeTrips: totalActiveTrips
  });

  return {
    context: {
      academicYearId: input.activeContext.academicYearId,
      academicYearName: input.activeContext.academicYearName,
      semesterId: input.activeContext.semesterId,
      semesterName: input.activeContext.semesterName
    },
    overview: {
      totalActiveStudents,
      totalActiveClasses,
      totalTeachers,
      totalSupervisors,
      totalDrivers,
      totalActiveTrips,
      totalActiveRoutes,
      totalActiveBuses
    },
    attendance: {
      sessionCount: input.attendanceSummary.sessionCount,
      recordedCount: input.attendanceSummary.recordedCount,
      expectedCount: input.attendanceSummary.expectedCount,
      coveragePercentage: attendanceCoveragePercentage
    },
    assessments: {
      assessmentCount: input.assessmentSummary.assessmentCount,
      publishedCount: input.assessmentSummary.publishedCount,
      gradedCount: input.assessmentSummary.gradedCount,
      expectedCount: input.assessmentSummary.expectedCount,
      publicationPercentage,
      gradingCoveragePercentage
    },
    homework: {
      homeworkCount: input.homeworkSummary.homeworkCount,
      recordedCount: input.homeworkSummary.recordedCount,
      expectedCount: input.homeworkSummary.expectedCount,
      submissionCoveragePercentage
    },
    behavior: {
      totalRecords: input.behaviorSummary.totalRecords,
      negativeRecords: input.behaviorSummary.negativeRecords,
      highSeverityNegativeRecords: input.behaviorSummary.highSeverityNegativeRecords
    },
    computed: {
      operationalScore,
      status,
      confidenceScore,
      keySignals
    }
  };
};






export const buildClassOverviewFeaturePayload = (
  input: ClassOverviewFeatureInput
): ClassOverviewFeaturePayload => {
  const activeStudents = input.students.length;
  const capacity = input.classRow.capacity;
  const occupancyPercentage =
    capacity !== null && capacity > 0 ? roundToTwo((activeStudents / capacity) * 100) : null;

  const attendancePercentages = input.attendanceSummaries
    .map((row) => toNullableNumber(row.attendancePercentage))
    .filter((value): value is number => value !== null);
  const averageAttendancePercentage = averageNumbers(attendancePercentages);
  const studentsWithSessions = input.attendanceSummaries.filter(
    (row) => toNumber(row.totalSessions) > 0
  ).length;
  const studentsBelowThreshold = input.attendanceSummaries.filter((row) => {
    const attendancePercentage = toNullableNumber(row.attendancePercentage);
    return attendancePercentage !== null && attendancePercentage < 85;
  }).length;
  const chronicAbsenceStudents = input.attendanceSummaries.filter((row) => {
    const attendancePercentage = toNullableNumber(row.attendancePercentage);
    return (attendancePercentage !== null && attendancePercentage < 75) || toNumber(row.absentCount) >= 3;
  }).length;

  const overallAssessmentPercentages = input.assessmentSummaries
    .map((row) => toNullableNumber(row.overallPercentage))
    .filter((value): value is number => value !== null);
  const overallAveragePercentage = averageNumbers(overallAssessmentPercentages);
  const studentsWithAssessments = new Set(input.assessmentSummaries.map((row) => row.studentId)).size;
  const lowPerformanceStudents = new Set(
    input.assessmentSummaries
      .filter((row) => {
        const percentage = toNullableNumber(row.overallPercentage);
        return percentage !== null && percentage < 65;
      })
      .map((row) => row.studentId)
  ).size;

  const subjectBuckets = new Map<
    string,
    { subjectId: string; subjectName: string; percentages: number[] }
  >();

  input.assessmentSummaries.forEach((row) => {
    const overallPercentage = toNullableNumber(row.overallPercentage);

    if (overallPercentage === null) {
      return;
    }

    const bucket = subjectBuckets.get(row.subjectId) ?? {
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      percentages: []
    };

    bucket.percentages.push(overallPercentage);
    subjectBuckets.set(row.subjectId, bucket);
  });

  const lowPerformanceSubjects = [...subjectBuckets.values()]
    .map((bucket) => ({
      subjectId: bucket.subjectId,
      subjectName: bucket.subjectName,
      averagePercentage: averageNumbers(bucket.percentages)
    }))
    .filter((bucket) => bucket.averagePercentage !== null && bucket.averagePercentage < 70)
    .sort((left, right) => (left.averagePercentage ?? 100) - (right.averagePercentage ?? 100))
    .slice(0, 5);

  const studentsWithNegativeRecords = input.behaviorSummaries.filter(
    (row) => toNumber(row.negativeCount) > 0
  ).length;
  const totalNegativeRecords = input.behaviorSummaries.reduce(
    (sum, row) => sum + toNumber(row.negativeCount),
    0
  );
  const negativeSeverityTotal = input.behaviorSummaries.reduce(
    (sum, row) => sum + toNumber(row.negativeSeverityTotal),
    0
  );
  const positiveRecords = input.behaviorSummaries.reduce(
    (sum, row) => sum + toNumber(row.positiveCount),
    0
  );

  const attendanceScore =
    averageAttendancePercentage === null
      ? studentsWithSessions > 0
        ? 45
        : 60
      : clamp(averageAttendancePercentage, 0, 100);
  const assessmentScore =
    overallAveragePercentage === null
      ? studentsWithAssessments > 0
        ? 45
        : 60
      : clamp(overallAveragePercentage, 0, 100);
  const behaviorScore = clamp(
    100 - totalNegativeRecords * 4 - negativeSeverityTotal * 5 + positiveRecords * 1.5,
    0,
    100
  );
  const homeworkScore =
    input.homeworkSummary.averageSubmissionPercentage === null
      ? input.homeworkSummary.totalHomework > 0
        ? 45
        : 60
      : clamp(input.homeworkSummary.averageSubmissionPercentage, 0, 100);

  const classHealthScore = roundToTwo(
    clamp(
      attendanceScore * 0.35 + assessmentScore * 0.3 + behaviorScore * 0.2 + homeworkScore * 0.15,
      0,
      100
    )
  );
  const status = buildClassHealthStatus(classHealthScore);
  const confidenceScore = buildClassConfidenceScore({
    activeStudents,
    studentsWithSessions,
    studentsWithAssessments,
    totalHomework: input.homeworkSummary.totalHomework,
    behaviorSignals: totalNegativeRecords + positiveRecords
  });
  const keySignals = buildClassOverviewSignals({
    activeStudents,
    occupancyPercentage,
    averageAttendancePercentage,
    studentsBelowThreshold,
    chronicAbsenceStudents,
    overallAveragePercentage,
    lowPerformanceStudents,
    lowPerformanceSubjects,
    studentsWithNegativeRecords,
    totalNegativeRecords,
    averageSubmissionPercentage: input.homeworkSummary.averageSubmissionPercentage,
    studentsBelowSubmissionThreshold: input.homeworkSummary.studentsBelowSubmissionThreshold
  });

  return {
    class: {
      classId: input.classRow.id,
      className: input.classRow.className,
      section: input.classRow.section,
      capacity,
      gradeLevelId: input.classRow.gradeLevelId,
      gradeLevelName: input.classRow.gradeLevelName,
      academicYearId: input.activeContext.academicYearId,
      academicYearName: input.activeContext.academicYearName,
      semesterId: input.activeContext.semesterId,
      semesterName: input.activeContext.semesterName
    },
    roster: {
      activeStudents,
      capacity,
      occupancyPercentage
    },
    attendance: {
      studentsWithSessions,
      averageAttendancePercentage,
      studentsBelowThreshold,
      chronicAbsenceStudents
    },
    assessments: {
      studentsWithAssessments,
      overallAveragePercentage,
      lowPerformanceStudents,
      lowPerformanceSubjects
    },
    behavior: {
      studentsWithNegativeRecords,
      totalNegativeRecords,
      negativeSeverityTotal,
      positiveRecords
    },
    homework: {
      totalHomework: input.homeworkSummary.totalHomework,
      submittedCount: input.homeworkSummary.submittedCount,
      lateCount: input.homeworkSummary.lateCount,
      notSubmittedCount: input.homeworkSummary.notSubmittedCount,
      averageSubmissionPercentage: input.homeworkSummary.averageSubmissionPercentage,
      studentsBelowSubmissionThreshold: input.homeworkSummary.studentsBelowSubmissionThreshold
    },
    computed: {
      classHealthScore,
      status,
      confidenceScore,
      keySignals
    }
  };
};




const buildTransportRouteConfidenceScore = (input: {
  totalTrips: number;
  tripsWithLocations: number;
  tripsWithEvents: number;
  etaSignals: number;
  stopCount: number;
}): number => {
  let confidence = 0.4;

  if (input.totalTrips >= 3) {
    confidence += 0.2;
  } else if (input.totalTrips > 0) {
    confidence += 0.08;
  }

  if (input.tripsWithLocations > 0) {
    confidence += 0.12;
  }

  if (input.tripsWithEvents > 0) {
    confidence += 0.1;
  }

  if (input.etaSignals > 0) {
    confidence += 0.08;
  }

  if (input.stopCount > 0) {
    confidence += 0.05;
  }

  return roundToTwo(clamp(confidence, 0.4, 0.95));
};

const buildTransportRouteAnomalyFlags = (input: {
  totalTrips: number;
  completionPercentage: number | null;
  manualClosurePercentage: number | null;
  cancellationPercentage: number | null;
  tripsWithoutLocations: number;
  totalTripsWithLocationsWindow: number;
  tripsWithoutEvents: number;
  etaIssuePercentage: number | null;
  averageStopCompletionPercentage: number | null;
  delayedTripsCount: number;
  staleActiveTripsCount: number;
  averageAbsentPerTrip: number | null;
}): string[] => {
  const flags: string[] = [];

  if (input.totalTrips === 0) {
    flags.push("insufficient_recent_trips");
    return flags;
  }

  if (input.completionPercentage !== null && input.completionPercentage < 60) {
    flags.push("low_completion_rate");
  }

  if (input.manualClosurePercentage !== null && input.manualClosurePercentage >= 25) {
    flags.push("manual_trip_closures");
  }

  if (input.cancellationPercentage !== null && input.cancellationPercentage >= 20) {
    flags.push("elevated_cancellation_rate");
  }

  if (input.tripsWithoutLocations > 0 && input.totalTripsWithLocationsWindow > 0) {
    flags.push("live_tracking_gaps");
  }

  if (input.etaIssuePercentage !== null && input.etaIssuePercentage >= 35) {
    flags.push("eta_snapshot_degradation");
  }

  if (
    input.averageStopCompletionPercentage !== null &&
    input.averageStopCompletionPercentage < 85
  ) {
    flags.push("weak_stop_completion");
  }

  if (input.tripsWithoutEvents > 0) {
    flags.push("missing_trip_events");
  }

  if (input.delayedTripsCount > 0) {
    flags.push("route_delay_pattern");
  }

  if (input.staleActiveTripsCount > 0) {
    flags.push("stale_active_trip");
  }

  if (input.averageAbsentPerTrip !== null && input.averageAbsentPerTrip >= 2) {
    flags.push("elevated_student_absence");
  }

  return flags;
};

const buildTransportRouteSignals = (input: {
  routeName: string;
  totalTrips: number;
  completionPercentage: number | null;
  manualClosurePercentage: number | null;
  cancellationPercentage: number | null;
  tripsWithoutLocations: number;
  tripsWithoutEvents: number;
  etaIssuePercentage: number | null;
  averageStopCompletionPercentage: number | null;
  delayedTripsCount: number;
  staleActiveTripsCount: number;
  averageActualDurationMinutes: number | null;
  averageAbsentPerTrip: number | null;
}): string[] => {
  const signals: string[] = [];

  if (input.totalTrips === 0) {
    signals.push(`لا توجد رحلات تشغيلية حديثة على المسار ${input.routeName} ضمن نافذة التحليل الحالية.`);
    return signals;
  }

  signals.push(`تم تحليل ${input.totalTrips} رحلات حديثة على المسار ${input.routeName}.`);

  if (input.completionPercentage !== null && input.completionPercentage < 60) {
    signals.push(`معدل الإغلاق الكامل للرحلات منخفض عند ${roundToTwo(input.completionPercentage)}%.`);
  }

  if (input.manualClosurePercentage !== null && input.manualClosurePercentage >= 25) {
    signals.push(`نسبة الإنهاء اليدوي للرحلات مرتفعة عند ${roundToTwo(input.manualClosurePercentage)}%.`);
  }

  if (input.cancellationPercentage !== null && input.cancellationPercentage >= 20) {
    signals.push(`معدل إلغاء الرحلات مرتفع عند ${roundToTwo(input.cancellationPercentage)}%.`);
  }

  if (input.tripsWithoutLocations > 0) {
    signals.push(`هناك ${input.tripsWithoutLocations} رحلات بدون آخر موقع حي مسجل.`);
  }

  if (input.etaIssuePercentage !== null && input.etaIssuePercentage >= 35) {
    signals.push(`حالة لقطات ETA غير مستقرة؛ نسبة التعثر الحالية ${roundToTwo(input.etaIssuePercentage)}%.`);
  }

  if (
    input.averageStopCompletionPercentage !== null &&
    input.averageStopCompletionPercentage < 85
  ) {
    signals.push(
      `متوسط إغلاق المحطات ضمن الرحلات أدنى من المطلوب عند ${roundToTwo(input.averageStopCompletionPercentage)}%.`
    );
  }

  if (input.tripsWithoutEvents > 0) {
    signals.push(`هناك ${input.tripsWithoutEvents} رحلات لا تحتوي على أحداث طلاب مسجلة.`);
  }

  if (input.delayedTripsCount > 0) {
    signals.push(`تم رصد ${input.delayedTripsCount} رحلات تجاوزت الزمن التشغيلي المتوقع للمسار.`);
  }

  if (input.staleActiveTripsCount > 0) {
    signals.push(`هناك ${input.staleActiveTripsCount} رحلات نشطة تبدو متأخرة عن زمنها التشغيلي المتوقع.`);
  }

  if (input.averageActualDurationMinutes !== null) {
    signals.push(`متوسط زمن الرحلة الفعلي الحالي ${roundToTwo(input.averageActualDurationMinutes)} دقيقة.`);
  }

  if (input.averageAbsentPerTrip !== null && input.averageAbsentPerTrip >= 2) {
    signals.push(`متوسط الغياب لكل رحلة مرتفع عند ${roundToTwo(input.averageAbsentPerTrip)} طالب.`);
  }

  return signals.slice(0, 6);
};

export const buildTransportRouteAnomalyFeaturePayload = (
  input: TransportRouteAnomalyFeatureInput
): TransportRouteAnomalyFeaturePayload => {
  const totalTrips = input.operationalSummary.totalTrips;
  const completionPercentage =
    totalTrips > 0
      ? roundToTwo((input.operationalSummary.completedTrips / totalTrips) * 100)
      : null;
  const manualClosurePercentage =
    totalTrips > 0
      ? roundToTwo((input.operationalSummary.endedTrips / totalTrips) * 100)
      : null;
  const cancellationPercentage =
    totalTrips > 0
      ? roundToTwo((input.operationalSummary.cancelledTrips / totalTrips) * 100)
      : null;
  const etaIssueCount =
    input.operationalSummary.etaStaleCount + input.operationalSummary.etaUnavailableCount;
  const etaIssuePercentage =
    totalTrips > 0 ? roundToTwo((etaIssueCount / totalTrips) * 100) : null;
  const averageBoardedPerTrip =
    totalTrips > 0
      ? roundToTwo(input.operationalSummary.totalBoardedCount / totalTrips)
      : null;
  const averageAbsentPerTrip =
    totalTrips > 0
      ? roundToTwo(input.operationalSummary.totalAbsentCount / totalTrips)
      : null;

  const completionRisk = completionPercentage === null ? 25 : clamp(100 - completionPercentage, 0, 100);
  const manualClosureRisk = manualClosurePercentage === null ? 0 : clamp(manualClosurePercentage, 0, 100);
  const cancellationRisk = cancellationPercentage === null ? 0 : clamp(cancellationPercentage, 0, 100);
  const liveTrackingRisk =
    totalTrips === 0
      ? 20
      : clamp((input.operationalSummary.tripsWithoutLocations / totalTrips) * 100, 0, 100);
  const eventCoverageRisk =
    totalTrips === 0
      ? 20
      : clamp((input.operationalSummary.tripsWithoutEvents / totalTrips) * 100, 0, 100);
  const etaRisk = etaIssuePercentage === null ? 20 : clamp(etaIssuePercentage, 0, 100);
  const stopCompletionRisk =
    input.operationalSummary.averageStopCompletionPercentage === null
      ? 20
      : clamp(100 - input.operationalSummary.averageStopCompletionPercentage, 0, 100);
  const delayRisk =
    totalTrips === 0
      ? 20
      : clamp(
          ((input.operationalSummary.delayedTripsCount + input.operationalSummary.staleActiveTripsCount) /
            totalTrips) *
            100,
          0,
          100
        );

  const anomalyScore = roundToTwo(
    clamp(
      completionRisk * 0.22 +
        manualClosureRisk * 0.12 +
        cancellationRisk * 0.12 +
        liveTrackingRisk * 0.14 +
        eventCoverageRisk * 0.1 +
        etaRisk * 0.12 +
        stopCompletionRisk * 0.08 +
        delayRisk * 0.1,
      0,
      100
    )
  );
  const status = buildTransportRouteAnomalyStatus(anomalyScore);
  const anomalyFlags = buildTransportRouteAnomalyFlags({
    totalTrips,
    completionPercentage,
    manualClosurePercentage,
    cancellationPercentage,
    tripsWithoutLocations: input.operationalSummary.tripsWithoutLocations,
    totalTripsWithLocationsWindow: totalTrips,
    tripsWithoutEvents: input.operationalSummary.tripsWithoutEvents,
    etaIssuePercentage,
    averageStopCompletionPercentage: input.operationalSummary.averageStopCompletionPercentage,
    delayedTripsCount: input.operationalSummary.delayedTripsCount,
    staleActiveTripsCount: input.operationalSummary.staleActiveTripsCount,
    averageAbsentPerTrip
  });
  const keySignals = buildTransportRouteSignals({
    routeName: input.route.routeName,
    totalTrips,
    completionPercentage,
    manualClosurePercentage,
    cancellationPercentage,
    tripsWithoutLocations: input.operationalSummary.tripsWithoutLocations,
    tripsWithoutEvents: input.operationalSummary.tripsWithoutEvents,
    etaIssuePercentage,
    averageStopCompletionPercentage: input.operationalSummary.averageStopCompletionPercentage,
    delayedTripsCount: input.operationalSummary.delayedTripsCount,
    staleActiveTripsCount: input.operationalSummary.staleActiveTripsCount,
    averageActualDurationMinutes: input.operationalSummary.averageActualDurationMinutes,
    averageAbsentPerTrip
  });
  const confidenceScore = buildTransportRouteConfidenceScore({
    totalTrips,
    tripsWithLocations: input.operationalSummary.tripsWithLocations,
    tripsWithEvents: input.operationalSummary.tripsWithEvents,
    etaSignals:
      input.operationalSummary.etaFreshCount +
      input.operationalSummary.etaStaleCount +
      input.operationalSummary.etaUnavailableCount +
      input.operationalSummary.etaCompletedCount,
    stopCount: input.stopCount
  });

  return {
    route: {
      routeId: input.route.id,
      routeName: input.route.routeName,
      startPoint: input.route.startPoint,
      endPoint: input.route.endPoint,
      stopCount: input.stopCount,
      estimatedDurationMinutes: input.route.estimatedDurationMinutes,
      academicYearId: input.activeContext.academicYearId,
      academicYearName: input.activeContext.academicYearName,
      semesterId: input.activeContext.semesterId,
      semesterName: input.activeContext.semesterName
    },
    inputWindow: input.inputWindow,
    trips: {
      totalTrips,
      completedTrips: input.operationalSummary.completedTrips,
      endedTrips: input.operationalSummary.endedTrips,
      cancelledTrips: input.operationalSummary.cancelledTrips,
      activeTrips: input.operationalSummary.activeTrips,
      completionPercentage,
      manualClosurePercentage,
      cancellationPercentage,
      tripsWithLocations: input.operationalSummary.tripsWithLocations,
      tripsWithoutLocations: input.operationalSummary.tripsWithoutLocations,
      tripsWithEvents: input.operationalSummary.tripsWithEvents,
      tripsWithoutEvents: input.operationalSummary.tripsWithoutEvents,
      averageActualDurationMinutes: input.operationalSummary.averageActualDurationMinutes,
      delayedTripsCount: input.operationalSummary.delayedTripsCount,
      staleActiveTripsCount: input.operationalSummary.staleActiveTripsCount
    },
    events: {
      totalBoardedCount: input.operationalSummary.totalBoardedCount,
      totalDroppedOffCount: input.operationalSummary.totalDroppedOffCount,
      totalAbsentCount: input.operationalSummary.totalAbsentCount,
      averageBoardedPerTrip,
      averageAbsentPerTrip
    },
    eta: {
      freshSnapshots: input.operationalSummary.etaFreshCount,
      staleSnapshots: input.operationalSummary.etaStaleCount,
      unavailableSnapshots: input.operationalSummary.etaUnavailableCount,
      completedSnapshots: input.operationalSummary.etaCompletedCount,
      averageStopCompletionPercentage: input.operationalSummary.averageStopCompletionPercentage
    },
    computed: {
      anomalyScore,
      status,
      confidenceScore,
      keySignals,
      anomalyFlags
    }
  };
};




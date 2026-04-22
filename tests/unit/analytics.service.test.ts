import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError } from "../../src/common/errors/conflict-error";
import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import type { ActiveAcademicContextService } from "../../src/common/services/active-academic-context.service";
import type { OwnershipService } from "../../src/common/services/ownership.service";
import type { ProfileResolutionService } from "../../src/common/services/profile-resolution.service";
import type { AuthenticatedUser } from "../../src/common/types/auth.types";
import { db } from "../../src/database/db";
import type { AcademicStructureRepository } from "../../src/modules/academic-structure/repository/academic-structure.repository";
import type { AnalyticsOutboxRepository } from "../../src/modules/analytics/repository/analytics-outbox.repository";
import type { AnalyticsRepository } from "../../src/modules/analytics/repository/analytics.repository";
import { AnalyticsService } from "../../src/modules/analytics/service/analytics.service";
import type { ReportingRepository } from "../../src/modules/reporting/repository/reporting.repository";
import type { SystemSettingsReadService } from "../../src/modules/system-settings/service/system-settings-read.service";
import type { TransportRepository } from "../../src/modules/transport/repository/transport.repository";
import type { UsersRepository } from "../../src/modules/users/repository/users.repository";
import type { AiAnalyticsProviderResolverPort } from "../../src/integrations/ai/ai-analytics-provider.resolver";
import type { AiAnalyticsProviderPort } from "../../src/integrations/ai/types/ai-analytics-provider.types";

const activeContext = {
  academicYearId: "2",
  academicYearName: "2025-2026",
  academicYearStartDate: new Date("2025-09-01T00:00:00.000Z"),
  academicYearEndDate: new Date("2026-06-30T00:00:00.000Z"),
  academicYearCreatedAt: new Date("2025-09-01T00:00:00.000Z"),
  academicYearUpdatedAt: new Date("2025-09-01T00:00:00.000Z"),
  semesterId: "3",
  semesterName: "Semester 1",
  semesterStartDate: new Date("2025-09-01T00:00:00.000Z"),
  semesterEndDate: new Date("2026-01-15T00:00:00.000Z"),
  semesterCreatedAt: new Date("2025-09-01T00:00:00.000Z"),
  semesterUpdatedAt: new Date("2025-09-01T00:00:00.000Z")
};

const adminUser: AuthenticatedUser = {
  userId: "1001",
  role: "admin",
  email: "admin@example.com",
  isActive: true
};

const parentUser: AuthenticatedUser = {
  userId: "1006",
  role: "parent",
  email: "parent@example.com",
  isActive: true
};

const studentRow = {
  studentId: "5",
  academicNo: "STU-0005",
  fullName: "Student Five",
  dateOfBirth: new Date("2016-03-01T00:00:00.000Z"),
  gender: "male" as const,
  status: "active",
  enrollmentDate: new Date("2025-09-01T00:00:00.000Z"),
  classId: "12",
  className: "Grade 5 - A",
  section: "A",
  gradeLevelId: "5",
  gradeLevelName: "Grade 5",
  academicYearId: "2",
  academicYearName: "2025-2026"
};

const classRow = {
  id: "12",
  className: "A",
  section: "A",
  capacity: 40,
  isActive: true,
  academicYearId: "2",
  academicYearName: "2025-2026",
  gradeLevelId: "5",
  gradeLevelName: "Grade 5",
  gradeLevelOrder: 5,
  createdAt: new Date("2025-09-01T00:00:00.000Z"),
  updatedAt: new Date("2025-09-01T00:00:00.000Z")
};

const semesterRow = {
  id: "3",
  academicYearId: "2",
  academicYearName: "2025-2026",
  name: "Semester 1",
  startDate: new Date("2025-09-01T00:00:00.000Z"),
  endDate: new Date("2026-01-15T00:00:00.000Z"),
  isActive: true,
  createdAt: new Date("2025-09-01T00:00:00.000Z"),
  updatedAt: new Date("2025-09-01T00:00:00.000Z")
};

const routeRow = {
  id: "9",
  routeName: "North Route",
  startPoint: "School",
  endPoint: "North District",
  estimatedDurationMinutes: 35,
  isActive: true,
  createdAt: new Date("2025-09-01T00:00:00.000Z"),
  updatedAt: new Date("2025-09-01T00:00:00.000Z")
};

const routeStops = [
  {
    routeId: "9",
    routeName: "North Route",
    stopId: "91",
    stopName: "Stop 1",
    latitude: 14.6,
    longitude: 44.1,
    stopOrder: 1,
    createdAt: new Date("2025-09-01T00:00:00.000Z")
  },
  {
    routeId: "9",
    routeName: "North Route",
    stopId: "92",
    stopName: "Stop 2",
    latitude: 14.61,
    longitude: 44.11,
    stopOrder: 2,
    createdAt: new Date("2025-09-01T00:00:00.000Z")
  },
  {
    routeId: "9",
    routeName: "North Route",
    stopId: "93",
    stopName: "Stop 3",
    latitude: 14.62,
    longitude: 44.12,
    stopOrder: 3,
    createdAt: new Date("2025-09-01T00:00:00.000Z")
  }
];

const routeOperationalSummary = {
  totalTrips: 12,
  completedTrips: 7,
  endedTrips: 2,
  cancelledTrips: 1,
  activeTrips: 2,
  tripsWithLocations: 10,
  tripsWithoutLocations: 2,
  tripsWithEvents: 9,
  tripsWithoutEvents: 3,
  totalBoardedCount: 86,
  totalDroppedOffCount: 81,
  totalAbsentCount: 5,
  etaFreshCount: 7,
  etaStaleCount: 2,
  etaUnavailableCount: 2,
  etaCompletedCount: 1,
  averageStopCompletionPercentage: 76.5,
  averageActualDurationMinutes: 41.2,
  delayedTripsCount: 3,
  staleActiveTripsCount: 1
};

const classStudents = [
  studentRow,
  {
    ...studentRow,
    studentId: "6",
    academicNo: "STU-0006",
    fullName: "Student Six"
  }
];

const classAttendanceSummaries = [
  {
    studentId: "5",
    academicNo: "STU-0005",
    studentName: "Student Five",
    classId: "12",
    className: "Grade 5 - A",
    section: "A",
    academicYearId: "2",
    academicYearName: "2025-2026",
    semesterId: "3",
    semesterName: "Semester 1",
    totalSessions: 10,
    presentCount: 8,
    absentCount: 2,
    lateCount: 0,
    excusedCount: 0,
    attendancePercentage: 80
  },
  {
    studentId: "6",
    academicNo: "STU-0006",
    studentName: "Student Six",
    classId: "12",
    className: "Grade 5 - A",
    section: "A",
    academicYearId: "2",
    academicYearName: "2025-2026",
    semesterId: "3",
    semesterName: "Semester 1",
    totalSessions: 10,
    presentCount: 9,
    absentCount: 1,
    lateCount: 0,
    excusedCount: 0,
    attendancePercentage: 90
  }
];

const classAssessmentSummaries = [
  {
    studentId: "5",
    academicNo: "STU-0005",
    studentName: "Student Five",
    classId: "12",
    className: "Grade 5 - A",
    section: "A",
    academicYearId: "2",
    academicYearName: "2025-2026",
    semesterId: "3",
    semesterName: "Semester 1",
    subjectId: "1",
    subjectName: "Science",
    totalAssessments: 2,
    totalScore: 55,
    totalMaxScore: 100,
    overallPercentage: 55
  },
  {
    studentId: "6",
    academicNo: "STU-0006",
    studentName: "Student Six",
    classId: "12",
    className: "Grade 5 - A",
    section: "A",
    academicYearId: "2",
    academicYearName: "2025-2026",
    semesterId: "3",
    semesterName: "Semester 1",
    subjectId: "2",
    subjectName: "Mathematics",
    totalAssessments: 2,
    totalScore: 78,
    totalMaxScore: 100,
    overallPercentage: 78
  }
];
const classBehaviorSummaries = [
  {
    studentId: "5",
    academicNo: "STU-0005",
    studentName: "Student Five",
    academicYearId: "2",
    academicYearName: "2025-2026",
    semesterId: "3",
    semesterName: "Semester 1",
    totalBehaviorRecords: 2,
    positiveCount: 0,
    negativeCount: 2,
    negativeSeverityTotal: 4
  },
  {
    studentId: "6",
    academicNo: "STU-0006",
    studentName: "Student Six",
    academicYearId: "2",
    academicYearName: "2025-2026",
    semesterId: "3",
    semesterName: "Semester 1",
    totalBehaviorRecords: 1,
    positiveCount: 1,
    negativeCount: 0,
    negativeSeverityTotal: 0
  }
];

const teacherProfile = {
  teacherId: "7",
  userId: "2007",
  fullName: "Teacher Seven",
  email: "teacher7@example.com",
  phone: "700000007",
  specialization: "Math",
  qualification: "Bachelor",
  hireDate: new Date("2025-09-01T00:00:00.000Z")
};

const teacherComplianceJobRow = {
  id: "301",
  analysisType: "teacher_compliance_summary" as const,
  subjectType: "teacher" as const,
  subjectId: "7",
  academicYearId: "2",
  semesterId: "3",
  requestedByUserId: "1001",
  status: "pending" as const,
  primaryProvider: "openai" as const,
  fallbackProvider: "groq" as const,
  selectedProvider: null,
  fallbackUsed: false,
  inputJson: {
    trigger: "admin_manual",
    academicYearName: "2025-2026",
    semesterName: "Semester 1",
    subjectDisplayName: "Teacher Seven"
  },
  snapshotId: null,
  startedAt: null,
  completedAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  createdAt: new Date("2026-04-22T10:00:00.000Z"),
  updatedAt: new Date("2026-04-22T10:00:00.000Z")
};

const adminOperationalDigestJobRow = {
  id: "401",
  analysisType: "admin_operational_digest" as const,
  subjectType: "system" as const,
  subjectId: "0",
  academicYearId: "2",
  semesterId: "3",
  requestedByUserId: "1001",
  status: "pending" as const,
  primaryProvider: "openai" as const,
  fallbackProvider: "groq" as const,
  selectedProvider: null,
  fallbackUsed: false,
  inputJson: {
    trigger: "admin_manual",
    academicYearName: "2025-2026",
    semesterName: "Semester 1",
    subjectDisplayName: "Admin Operational Digest"
  },
  snapshotId: null,
  startedAt: null,
  completedAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  createdAt: new Date("2026-04-22T11:00:00.000Z"),
  updatedAt: new Date("2026-04-22T11:00:00.000Z")
};

const classOverviewJobRow = {
  id: "501",
  analysisType: "class_overview" as const,
  subjectType: "class" as const,
  subjectId: "12",
  academicYearId: "2",
  semesterId: "3",
  requestedByUserId: "1001",
  status: "pending" as const,
  primaryProvider: "openai" as const,
  fallbackProvider: "groq" as const,
  selectedProvider: null,
  fallbackUsed: false,
  inputJson: {
    trigger: "admin_manual",
    academicYearName: "2025-2026",
    semesterName: "Semester 1",
    subjectDisplayName: "Grade 5 A/A"
  },
  snapshotId: null,
  startedAt: null,
  completedAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  createdAt: new Date("2026-04-22T12:00:00.000Z"),
  updatedAt: new Date("2026-04-22T12:00:00.000Z")
};

const routeAnomalyJobRow = {
  id: "601",
  analysisType: "transport_route_anomaly_summary" as const,
  subjectType: "route" as const,
  subjectId: "9",
  academicYearId: "2",
  semesterId: "3",
  requestedByUserId: "1001",
  status: "pending" as const,
  primaryProvider: "openai" as const,
  fallbackProvider: "groq" as const,
  selectedProvider: null,
  fallbackUsed: false,
  inputJson: {
    trigger: "admin_manual",
    academicYearName: "2025-2026",
    semesterName: "Semester 1",
    subjectDisplayName: "North Route"
  },
  snapshotId: null,
  startedAt: null,
  completedAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  createdAt: new Date("2026-04-22T13:00:00.000Z"),
  updatedAt: new Date("2026-04-22T13:00:00.000Z")
};

describe("AnalyticsService", () => {
  const analyticsRepositoryMock = {
    findActiveJobByNaturalKey: vi.fn(),
    createJob: vi.fn(),
    findJobById: vi.fn(),
    claimJobForExecution: vi.fn(),
    markJobCompleted: vi.fn(),
    markJobFailed: vi.fn(),
    createSnapshot: vi.fn(),
    findLatestSnapshot: vi.fn(),
    findSnapshotById: vi.fn(),
    createFeedback: vi.fn(),
    listFeedbackBySnapshotId: vi.fn(),
    aggregateFeedbackForSubjectContext: vi.fn(),
    findLatestSchedulerRun: vi.fn(),
    createSchedulerRun: vi.fn(),
    markSchedulerRunCompleted: vi.fn(),
    markSchedulerRunFailed: vi.fn(),
    findStudentHomeworkSummary: vi.fn(),
    findTeacherAssignmentCount: vi.fn(),
    findTeacherAttendanceSummary: vi.fn(),
    findTeacherAssessmentSummary: vi.fn(),
    findTeacherHomeworkSummary: vi.fn(),
    findTeacherBehaviorSummary: vi.fn(),
    findOperationalAttendanceSummary: vi.fn(),
    findOperationalAssessmentSummary: vi.fn(),
    findOperationalHomeworkSummary: vi.fn(),
    findOperationalBehaviorSummary: vi.fn(),
    findClassHomeworkSummary: vi.fn(),
    listActiveStudentSubjectsByAcademicYear: vi.fn(),
    listStaleStudentRiskCandidates: vi.fn(),
    listStaleTeacherComplianceCandidates: vi.fn(),
    listStaleClassOverviewCandidates: vi.fn(),
    listStaleTransportRouteAnomalyCandidates: vi.fn(),
    findTransportRouteOperationalSummary: vi.fn(),
    deleteObsoleteSnapshots: vi.fn(),
    deleteStaleTerminalJobs: vi.fn(),
    deleteStaleSchedulerRuns: vi.fn()
  };
  const analyticsOutboxRepositoryMock = {
    enqueueJobExecutionEvent: vi.fn()
  };
  const reportingRepositoryMock = {
    findStudentById: vi.fn(),
    findStudentAttendanceSummary: vi.fn(),
    listStudentAssessmentSummaries: vi.fn(),
    findStudentBehaviorSummary: vi.fn(),
    findAdminDashboardSummary: vi.fn(),
    listStudentsByClass: vi.fn(),
    listStudentAttendanceSummaries: vi.fn(),
    listStudentAssessmentSummariesByStudentIds: vi.fn(),
    listStudentBehaviorSummaries: vi.fn()
  };
  const academicStructureRepositoryMock = {
    findClassById: vi.fn(),
    findSemesterById: vi.fn(),
    listTeacherAssignments: vi.fn(),
    listClasses: vi.fn()
  };
  const transportRepositoryMock = {
    findRouteById: vi.fn(),
    listRouteStopsByRouteId: vi.fn(),
    listRoutes: vi.fn()
  };
  const systemSettingsReadServiceMock = {
    getAnalyticsSettings: vi.fn()
  };
  const activeAcademicContextServiceMock = {
    requireActiveContext: vi.fn()
  };
  const profileResolutionServiceMock = {
    requireTeacherProfileIdentifier: vi.fn(),
    requireParentProfile: vi.fn(),
    requireTeacherProfile: vi.fn(),
    requireSupervisorProfile: vi.fn()
  };
  const ownershipServiceMock = {
    assertParentOwnsStudent: vi.fn(),
    assertTeacherAssignedToClassYear: vi.fn(),
    assertSupervisorAssignedToClassYear: vi.fn()
  };
  const usersRepositoryMock = {
    findUserById: vi.fn()
  };
  const primaryProviderMock: AiAnalyticsProviderPort = {
    providerKey: "openai",
    isConfigured: vi.fn(),
    generateStudentRiskInsight: vi.fn(),
    generateTeacherComplianceInsight: vi.fn(),
    generateAdminOperationalDigestInsight: vi.fn(),
    generateClassOverviewInsight: vi.fn(),
    generateTransportRouteAnomalyInsight: vi.fn()
  };
  const fallbackProviderMock: AiAnalyticsProviderPort = {
    providerKey: "groq",
    isConfigured: vi.fn(),
    generateStudentRiskInsight: vi.fn(),
    generateTeacherComplianceInsight: vi.fn(),
    generateAdminOperationalDigestInsight: vi.fn(),
    generateClassOverviewInsight: vi.fn(),
    generateTransportRouteAnomalyInsight: vi.fn()
  };
  const providerResolverMock: AiAnalyticsProviderResolverPort = {
    resolve: vi.fn()
  };

  const buildService = () =>
    new AnalyticsService(
      systemSettingsReadServiceMock as unknown as SystemSettingsReadService,
      analyticsRepositoryMock as unknown as AnalyticsRepository,
      analyticsOutboxRepositoryMock as unknown as AnalyticsOutboxRepository,
      reportingRepositoryMock as unknown as ReportingRepository,
      academicStructureRepositoryMock as unknown as AcademicStructureRepository,
      transportRepositoryMock as unknown as TransportRepository,
      activeAcademicContextServiceMock as unknown as ActiveAcademicContextService,
      profileResolutionServiceMock as unknown as ProfileResolutionService,
      ownershipServiceMock as unknown as OwnershipService,
      usersRepositoryMock as unknown as UsersRepository,
      providerResolverMock
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db, "withTransaction").mockImplementation(async (callback) => {
      const fakeClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      return callback(fakeClient as never);
    });

    [
      analyticsRepositoryMock,
      analyticsOutboxRepositoryMock,
      reportingRepositoryMock,
      academicStructureRepositoryMock,
      transportRepositoryMock,
      systemSettingsReadServiceMock,
      activeAcademicContextServiceMock,
      profileResolutionServiceMock,
      ownershipServiceMock,
      usersRepositoryMock
    ].forEach((mockGroup) => {
      Object.values(mockGroup).forEach((mockFn) => mockFn.mockReset());
    });

    [primaryProviderMock, fallbackProviderMock].forEach((provider) => {
      vi.mocked(provider.generateStudentRiskInsight).mockReset();
      vi.mocked(provider.generateTeacherComplianceInsight).mockReset();
      vi.mocked(provider.generateAdminOperationalDigestInsight).mockReset();
      vi.mocked(provider.generateClassOverviewInsight).mockReset();
      vi.mocked(provider.generateTransportRouteAnomalyInsight).mockReset();
    });
    vi.mocked(providerResolverMock.resolve).mockReset();

    vi.mocked(systemSettingsReadServiceMock.getAnalyticsSettings).mockResolvedValue({
      aiAnalyticsEnabled: true,
      primaryProvider: "openai",
      fallbackProvider: "groq",
      scheduledRecomputeEnabled: false,
      scheduledRecomputeIntervalMinutes: 1440,
      scheduledRecomputeMaxSubjectsPerTarget: 25,
      scheduledTargets: [
        "student_risk_summary",
        "teacher_compliance_summary",
        "admin_operational_digest",
        "class_overview",
        "transport_route_anomaly_summary"
      ],
      autonomousDispatchEnabled: false,
      autonomousDispatchActorUserId: null,
      retentionCleanupEnabled: false,
      obsoleteSnapshotRetentionDays: 30,
      jobRetentionDays: 30,
      schedulerRunRetentionDays: 30
    });
    vi.mocked(activeAcademicContextServiceMock.requireActiveContext).mockResolvedValue(activeContext);
    vi.mocked(analyticsRepositoryMock.findActiveJobByNaturalKey).mockResolvedValue(null);
    vi.mocked(analyticsOutboxRepositoryMock.enqueueJobExecutionEvent).mockResolvedValue("9001");
    vi.mocked(reportingRepositoryMock.findStudentById).mockResolvedValue(studentRow);
    vi.mocked(reportingRepositoryMock.findAdminDashboardSummary).mockResolvedValue({
      totalActiveStudents: 420,
      totalActiveClasses: 18,
      totalTeachers: 26,
      totalSupervisors: 4,
      totalDrivers: 6,
      totalActiveTrips: 3,
      totalActiveRoutes: 5,
      totalActiveBuses: 4,
      totalPendingNotifications: 0
    });
    vi.mocked(reportingRepositoryMock.listStudentsByClass).mockResolvedValue(classStudents);
    vi.mocked(reportingRepositoryMock.listStudentAttendanceSummaries).mockResolvedValue(
      classAttendanceSummaries
    );
    vi.mocked(
      reportingRepositoryMock.listStudentAssessmentSummariesByStudentIds
    ).mockResolvedValue(classAssessmentSummaries);
    vi.mocked(reportingRepositoryMock.listStudentBehaviorSummaries).mockResolvedValue(
      classBehaviorSummaries
    );
    vi.mocked(academicStructureRepositoryMock.findClassById).mockResolvedValue(classRow);
    vi.mocked(academicStructureRepositoryMock.findSemesterById).mockResolvedValue(semesterRow);
    vi.mocked(academicStructureRepositoryMock.listTeacherAssignments).mockResolvedValue([]);
    vi.mocked(academicStructureRepositoryMock.listClasses).mockResolvedValue([]);
    vi.mocked(transportRepositoryMock.findRouteById).mockResolvedValue(routeRow);
    vi.mocked(transportRepositoryMock.listRouteStopsByRouteId).mockResolvedValue(routeStops);
    vi.mocked(transportRepositoryMock.listRoutes).mockResolvedValue([routeRow]);
    vi.mocked(analyticsRepositoryMock.listActiveStudentSubjectsByAcademicYear).mockResolvedValue([]);
    vi.mocked(analyticsRepositoryMock.listStaleStudentRiskCandidates).mockResolvedValue([]);
    vi.mocked(analyticsRepositoryMock.listStaleTeacherComplianceCandidates).mockResolvedValue([]);
    vi.mocked(analyticsRepositoryMock.listStaleClassOverviewCandidates).mockResolvedValue([]);
    vi.mocked(analyticsRepositoryMock.listStaleTransportRouteAnomalyCandidates).mockResolvedValue([]);
    vi.mocked(analyticsRepositoryMock.findTransportRouteOperationalSummary).mockResolvedValue(
      routeOperationalSummary
    );
    vi.mocked(analyticsRepositoryMock.aggregateFeedbackForSubjectContext).mockResolvedValue(null);
    vi.mocked(analyticsRepositoryMock.findLatestSchedulerRun).mockResolvedValue(null);
    vi.mocked(analyticsRepositoryMock.createSchedulerRun).mockResolvedValue({
      id: "99001",
      triggerMode: "autonomous_dispatch",
      status: "processing",
      requestedByUserId: "1001",
      requestedByFullName: "Admin User",
      academicYearId: "2",
      semesterId: "3",
      staleBefore: new Date("2026-04-22T00:00:00.000Z"),
      scheduledTargetsJson: ["student_risk_summary"],
      summaryJson: { triggerMode: "autonomous_dispatch", state: "started" },
      startedAt: new Date("2026-04-22T00:00:00.000Z"),
      completedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: new Date("2026-04-22T00:00:00.000Z"),
      updatedAt: new Date("2026-04-22T00:00:00.000Z")
    });
    vi.mocked(analyticsRepositoryMock.markSchedulerRunCompleted).mockResolvedValue(undefined);
    vi.mocked(analyticsRepositoryMock.markSchedulerRunFailed).mockResolvedValue(undefined);
    vi.mocked(profileResolutionServiceMock.requireTeacherProfileIdentifier).mockResolvedValue(
      teacherProfile
    );
    vi.mocked(profileResolutionServiceMock.requireParentProfile).mockResolvedValue({
      parentId: "15",
      userId: "1006",
      fullName: "Parent User",
      email: "parent@example.com",
      phone: "700000006",
      address: "Dhamar",
      relationType: "father"
    });
    vi.mocked(ownershipServiceMock.assertParentOwnsStudent).mockResolvedValue(undefined);
    vi.mocked(ownershipServiceMock.assertTeacherAssignedToClassYear).mockResolvedValue(undefined);
    vi.mocked(ownershipServiceMock.assertSupervisorAssignedToClassYear).mockResolvedValue(undefined);
    vi.mocked(usersRepositoryMock.findUserById).mockResolvedValue({
      id: "1001",
      fullName: "Admin User",
      email: "admin@example.com",
      phone: "700000001",
      role: "admin",
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date("2026-04-22T00:00:00.000Z"),
      updatedAt: new Date("2026-04-22T00:00:00.000Z"),
      parentAddress: null,
      parentRelationType: null,
      teacherSpecialization: null,
      teacherQualification: null,
      teacherHireDate: null,
      supervisorDepartment: null,
      driverLicenseNumber: null,
      driverStatus: null
    });
    vi.mocked(providerResolverMock.resolve).mockReturnValue({
      primarySelection: "openai",
      fallbackSelection: "groq",
      primaryProvider: primaryProviderMock,
      fallbackProvider: fallbackProviderMock
    });
  });

  it("rejects job creation when analytics is disabled", async () => {
    vi.mocked(systemSettingsReadServiceMock.getAnalyticsSettings).mockResolvedValue({
      aiAnalyticsEnabled: false,
      primaryProvider: "openai",
      fallbackProvider: "groq",
      scheduledRecomputeEnabled: false,
      scheduledRecomputeIntervalMinutes: 1440,
      scheduledRecomputeMaxSubjectsPerTarget: 25,
      scheduledTargets: [
        "student_risk_summary",
        "teacher_compliance_summary",
        "admin_operational_digest",
        "class_overview",
        "transport_route_anomaly_summary"
      ],
      autonomousDispatchEnabled: false,
      autonomousDispatchActorUserId: null,
      retentionCleanupEnabled: false,
      obsoleteSnapshotRetentionDays: 30,
      jobRetentionDays: 30,
      schedulerRunRetentionDays: 30
    });

    const service = buildService();

    await expect(service.createStudentRiskJob(adminUser, { studentId: "5" })).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(analyticsRepositoryMock.createJob).not.toHaveBeenCalled();
    expect(analyticsOutboxRepositoryMock.enqueueJobExecutionEvent).not.toHaveBeenCalled();
  });

  it("returns the existing active teacher job instead of creating a duplicate", async () => {
    vi.mocked(analyticsRepositoryMock.findActiveJobByNaturalKey).mockResolvedValue(
      teacherComplianceJobRow
    );

    const service = buildService();
    const response = await service.createTeacherComplianceJob(adminUser, { teacherId: "7" });

    expect(response.created).toBe(false);
    expect(response.job.jobId).toBe("301");
    expect(analyticsRepositoryMock.createJob).not.toHaveBeenCalled();
    expect(analyticsOutboxRepositoryMock.enqueueJobExecutionEvent).not.toHaveBeenCalled();
  });
  it("dispatches recompute jobs across all supported analytics targets using one active-context expansion pass", async () => {
    const classExistingJobRow = {
      id: "777",
      analysisType: "class_overview" as const,
      subjectType: "class" as const,
      subjectId: "12",
      academicYearId: "2",
      semesterId: "3",
      requestedByUserId: "1001",
      status: "pending" as const,
      primaryProvider: "openai" as const,
      fallbackProvider: "groq" as const,
      selectedProvider: null,
      fallbackUsed: false,
      inputJson: {
        trigger: "admin_recompute",
        academicYearName: "2025-2026",
        semesterName: "Semester 1",
        subjectDisplayName: "Grade 5 A/A"
      },
      snapshotId: null,
      startedAt: null,
      completedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: new Date("2026-04-22T13:00:00.000Z"),
      updatedAt: new Date("2026-04-22T13:00:00.000Z")
    };

    vi.mocked(analyticsRepositoryMock.listActiveStudentSubjectsByAcademicYear).mockResolvedValue([
      {
        studentId: "5",
        fullName: "Student Five"
      }
    ]);
    vi.mocked(academicStructureRepositoryMock.listTeacherAssignments).mockResolvedValue([
      {
        teacherId: "7",
        teacherUserId: "2007",
        teacherFullName: "Teacher Seven"
      },
      {
        teacherId: "7",
        teacherUserId: "2007",
        teacherFullName: "Teacher Seven"
      }
    ]);
    vi.mocked(academicStructureRepositoryMock.listClasses).mockResolvedValue([classRow]);
    vi.mocked(transportRepositoryMock.listRoutes).mockResolvedValue([routeRow]);
    vi.mocked(analyticsRepositoryMock.findActiveJobByNaturalKey)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(classExistingJobRow)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    vi.mocked(analyticsRepositoryMock.createJob)
      .mockResolvedValueOnce({
        ...teacherComplianceJobRow,
        id: "901",
        analysisType: "student_risk_summary",
        subjectType: "student",
        subjectId: "5",
        inputJson: {
          trigger: "admin_recompute",
          academicYearName: "2025-2026",
          semesterName: "Semester 1",
          subjectDisplayName: "Student Five"
        }
      })
      .mockResolvedValueOnce({
        ...teacherComplianceJobRow,
        id: "902",
        subjectId: "7",
        inputJson: {
          trigger: "admin_recompute",
          academicYearName: "2025-2026",
          semesterName: "Semester 1",
          subjectDisplayName: "Teacher Seven",
          teacherUserId: "2007"
        }
      })
      .mockResolvedValueOnce({
        ...routeAnomalyJobRow,
        id: "904",
        subjectId: "9",
        inputJson: {
          trigger: "admin_recompute",
          academicYearName: "2025-2026",
          semesterName: "Semester 1",
          subjectDisplayName: "North Route"
        }
      })
      .mockResolvedValueOnce({
        ...adminOperationalDigestJobRow,
        id: "903",
        inputJson: {
          trigger: "admin_recompute",
          academicYearName: "2025-2026",
          semesterName: "Semester 1",
          subjectDisplayName: "Admin Operational Digest"
        }
      });

    const service = buildService();
    const response = await service.createRecomputeJobs(adminUser, {
      target: "all_supported"
    });

    expect(analyticsRepositoryMock.listActiveStudentSubjectsByAcademicYear).toHaveBeenCalledWith(
      "2",
      expect.anything()
    );
    expect(academicStructureRepositoryMock.listTeacherAssignments).toHaveBeenCalledWith(
      { academicYearId: "2" },
      expect.anything()
    );
    expect(academicStructureRepositoryMock.listClasses).toHaveBeenCalledWith(
      { academicYearId: "2", isActive: true },
      expect.anything()
    );
    expect(transportRepositoryMock.listRoutes).toHaveBeenCalledWith(expect.anything());
    expect(response.summary).toEqual({
      totalJobs: 5,
      createdCount: 4,
      reusedCount: 1
    });
    expect(response.breakdown).toEqual(
      expect.arrayContaining([
        {
          analysisType: "student_risk_summary",
          totalJobs: 1,
          createdCount: 1,
          reusedCount: 0
        },
        {
          analysisType: "teacher_compliance_summary",
          totalJobs: 1,
          createdCount: 1,
          reusedCount: 0
        },
        {
          analysisType: "class_overview",
          totalJobs: 1,
          createdCount: 0,
          reusedCount: 1
        },
        {
          analysisType: "transport_route_anomaly_summary",
          totalJobs: 1,
          createdCount: 1,
          reusedCount: 0
        },
        {
          analysisType: "admin_operational_digest",
          totalJobs: 1,
          createdCount: 1,
          reusedCount: 0
        }
      ])
    );
    expect(response.items).toHaveLength(5);
    expect(analyticsRepositoryMock.createJob).toHaveBeenCalledTimes(4);
    expect(analyticsOutboxRepositoryMock.enqueueJobExecutionEvent).toHaveBeenCalledTimes(4);
  });

  it("rejects scheduled dispatch when scheduled recompute is disabled", async () => {
    vi.mocked(systemSettingsReadServiceMock.getAnalyticsSettings).mockResolvedValue({
      aiAnalyticsEnabled: true,
      primaryProvider: "openai",
      fallbackProvider: "groq",
      scheduledRecomputeEnabled: false,
      scheduledRecomputeIntervalMinutes: 1440,
      scheduledRecomputeMaxSubjectsPerTarget: 25,
      scheduledTargets: [
        "student_risk_summary",
        "teacher_compliance_summary",
        "admin_operational_digest",
        "class_overview",
        "transport_route_anomaly_summary"
      ],
      autonomousDispatchEnabled: false,
      autonomousDispatchActorUserId: null,
      retentionCleanupEnabled: false,
      obsoleteSnapshotRetentionDays: 30,
      jobRetentionDays: 30,
      schedulerRunRetentionDays: 30
    });

    const service = buildService();

    await expect(service.dispatchScheduledRecomputeJobs(adminUser)).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(analyticsRepositoryMock.createJob).not.toHaveBeenCalled();
  });

  it("dispatches scheduled recompute jobs for stale configured targets and reuses active jobs when present", async () => {
    vi.mocked(systemSettingsReadServiceMock.getAnalyticsSettings).mockResolvedValue({
      aiAnalyticsEnabled: true,
      primaryProvider: "openai",
      fallbackProvider: "groq",
      scheduledRecomputeEnabled: true,
      scheduledRecomputeIntervalMinutes: 720,
      scheduledRecomputeMaxSubjectsPerTarget: 2,
      scheduledTargets: [
        "student_risk_summary",
        "teacher_compliance_summary",
        "admin_operational_digest"
      ],
      autonomousDispatchEnabled: false,
      autonomousDispatchActorUserId: null,
      retentionCleanupEnabled: false,
      obsoleteSnapshotRetentionDays: 30,
      jobRetentionDays: 30,
      schedulerRunRetentionDays: 30
    });
    vi.mocked(analyticsRepositoryMock.listStaleStudentRiskCandidates).mockResolvedValue([
      {
        studentId: "5",
        fullName: "Student Five",
        latestComputedAt: null
      }
    ]);
    vi.mocked(analyticsRepositoryMock.listStaleTeacherComplianceCandidates).mockResolvedValue([
      {
        teacherId: "7",
        teacherUserId: "2007",
        fullName: "Teacher Seven",
        latestComputedAt: new Date("2026-04-20T00:00:00.000Z")
      }
    ]);
    vi.mocked(analyticsRepositoryMock.findLatestSnapshot).mockResolvedValueOnce(null);
    vi.mocked(analyticsRepositoryMock.findActiveJobByNaturalKey)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(teacherComplianceJobRow)
      .mockResolvedValueOnce(null);
    vi.mocked(analyticsRepositoryMock.createJob)
      .mockResolvedValueOnce({
        ...teacherComplianceJobRow,
        id: "9301",
        analysisType: "student_risk_summary",
        subjectType: "student",
        subjectId: "5",
        inputJson: {
          trigger: "scheduled_recompute",
          academicYearName: "2025-2026",
          semesterName: "Semester 1",
          subjectDisplayName: "Student Five"
        }
      })
      .mockResolvedValueOnce({
        ...adminOperationalDigestJobRow,
        id: "9302",
        inputJson: {
          trigger: "scheduled_recompute",
          academicYearName: "2025-2026",
          semesterName: "Semester 1",
          subjectDisplayName: "Admin Operational Digest"
        }
      });

    const service = buildService();
    const response = await service.dispatchScheduledRecomputeJobs(adminUser);

    expect(analyticsRepositoryMock.listStaleStudentRiskCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        academicYearId: "2",
        semesterId: "3",
        limit: 2,
        staleBefore: expect.any(Date)
      }),
      expect.anything()
    );
    expect(analyticsRepositoryMock.listStaleTeacherComplianceCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        academicYearId: "2",
        semesterId: "3",
        limit: 2,
        staleBefore: expect.any(Date)
      }),
      expect.anything()
    );
    expect(response.triggerMode).toBe("admin_scheduled_dispatch");
    expect(response.schedule.intervalMinutes).toBe(720);
    expect(response.schedule.maxSubjectsPerTarget).toBe(2);
    expect(response.schedule.targets).toEqual([
      "student_risk_summary",
      "teacher_compliance_summary",
      "admin_operational_digest"
    ]);
    expect(response.summary).toEqual({
      totalEligibleSubjects: 3,
      dispatchedCount: 2,
      reusedCount: 1
    });
    expect(response.breakdown).toEqual([
      {
        analysisType: "student_risk_summary",
        eligibleCount: 1,
        dispatchedCount: 1,
        reusedCount: 0
      },
      {
        analysisType: "teacher_compliance_summary",
        eligibleCount: 1,
        dispatchedCount: 0,
        reusedCount: 1
      },
      {
        analysisType: "admin_operational_digest",
        eligibleCount: 1,
        dispatchedCount: 1,
        reusedCount: 0
      }
    ]);
    expect(response.items).toHaveLength(3);
    expect(analyticsRepositoryMock.createJob).toHaveBeenCalledTimes(2);
    expect(analyticsOutboxRepositoryMock.enqueueJobExecutionEvent).toHaveBeenCalledTimes(2);
  });

  it("hides admin recommendations from parent-facing student risk summaries", async () => {
    vi.mocked(analyticsRepositoryMock.findLatestSnapshot).mockResolvedValue({
      id: "7001",
      analysisType: "student_risk_summary",
      subjectType: "student",
      subjectId: "5",
      academicYearId: "2",
      semesterId: "3",
      sourceJobId: "500",
      providerKey: "openai",
      fallbackUsed: false,
      featurePayloadJson: {
        student: {
          studentId: "5",
          academicNo: "STU-0005",
          fullName: "Student Five",
          classId: "12",
          className: "Grade 5 - A",
          section: "A",
          academicYearId: "2",
          academicYearName: "2025-2026",
          semesterId: "3",
          semesterName: "Semester 1"
        },
        attendance: {
          totalSessions: 10,
          presentCount: 8,
          absentCount: 2,
          lateCount: 0,
          excusedCount: 0,
          attendancePercentage: 80
        },
        assessments: {
          totalSubjects: 3,
          averagePercentage: 68,
          lowPerformanceSubjects: []
        },
        behavior: {
          totalBehaviorRecords: 1,
          positiveCount: 0,
          negativeCount: 1,
          negativeSeverityTotal: 2
        },
        homework: {
          totalHomework: 5,
          submittedCount: 3,
          lateCount: 1,
          notSubmittedCount: 1,
          submissionPercentage: 60
        },
        computed: {
          riskScore: 62,
          riskLevel: "medium",
          confidenceScore: 0.8,
          keySignals: ["signal"]
        }
      },
      resultJson: {
        riskLevel: "medium",
        confidenceScore: 0.8,
        summary: "Summary",
        keySignals: ["signal"],
        adminRecommendations: ["internal follow-up"],
        parentGuidance: ["home guidance"]
      },
      computedAt: new Date("2026-04-22T12:00:00.000Z"),
      createdAt: new Date("2026-04-22T12:00:00.000Z"),
      updatedAt: new Date("2026-04-22T12:00:00.000Z")
    });

    const service = buildService();
    const response = await service.getStudentRiskSummary(parentUser, "5");

    expect(profileResolutionServiceMock.requireParentProfile).toHaveBeenCalledWith("1006");
    expect(ownershipServiceMock.assertParentOwnsStudent).toHaveBeenCalledWith("15", "5");
    expect(response.analysisMode).toBe("ai_assisted");
    expect(response.insight.adminRecommendations).toEqual([]);
    expect(response.insight.parentGuidance).toEqual(["home guidance"]);
  });
  it("uses the fallback provider and persists an AI-assisted teacher snapshot when the primary fails", async () => {
    vi.mocked(analyticsRepositoryMock.claimJobForExecution).mockResolvedValue(
      teacherComplianceJobRow
    );
    vi.mocked(analyticsRepositoryMock.findTeacherAssignmentCount).mockResolvedValue({
      totalAssignments: 3
    });
    vi.mocked(analyticsRepositoryMock.findTeacherAttendanceSummary).mockResolvedValue({
      sessionCount: 12,
      recordedCount: 280,
      expectedCount: 300,
      coveragePercentage: 93.3,
      lastSessionDate: new Date("2026-04-20T00:00:00.000Z")
    });
    vi.mocked(analyticsRepositoryMock.findTeacherAssessmentSummary).mockResolvedValue({
      assessmentCount: 5,
      publishedCount: 5,
      gradedCount: 145,
      expectedCount: 150,
      publicationPercentage: 100,
      gradingCoveragePercentage: 96.7,
      lastAssessmentDate: new Date("2026-04-19T00:00:00.000Z")
    });
    vi.mocked(analyticsRepositoryMock.findTeacherHomeworkSummary).mockResolvedValue({
      homeworkCount: 4,
      recordedCount: 118,
      expectedCount: 120,
      submissionCoveragePercentage: 98.3,
      lastDueDate: new Date("2026-04-18T00:00:00.000Z")
    });
    vi.mocked(analyticsRepositoryMock.findTeacherBehaviorSummary).mockResolvedValue({
      totalRecords: 4,
      positiveRecords: 3,
      negativeRecords: 1,
      lastBehaviorDate: new Date("2026-04-17T00:00:00.000Z")
    });
    vi.mocked(primaryProviderMock.generateTeacherComplianceInsight).mockRejectedValue(
      new Error("OpenAI unavailable")
    );
    vi.mocked(fallbackProviderMock.generateTeacherComplianceInsight).mockResolvedValue({
      complianceLevel: "strong",
      confidenceScore: 0.99,
      summary: "Groq narrative",
      keySignals: ["ignored"],
      operationalGaps: ["ignored"],
      adminRecommendations: ["Monitor weekly"]
    });
    vi.mocked(analyticsRepositoryMock.createSnapshot).mockImplementation(async (input) => ({
      id: "8801",
      analysisType: input.analysisType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      academicYearId: input.academicYearId,
      semesterId: input.semesterId,
      sourceJobId: input.sourceJobId,
      providerKey: input.providerKey,
      fallbackUsed: input.fallbackUsed,
      featurePayloadJson: input.featurePayloadJson,
      resultJson: input.resultJson,
      computedAt: input.computedAt,
      createdAt: input.computedAt,
      updatedAt: input.computedAt
    }));
    vi.mocked(analyticsRepositoryMock.markJobCompleted).mockResolvedValue(undefined);

    const service = buildService();
    const processed = await service.executeJob("301");

    expect(processed).toBe(true);
    expect(primaryProviderMock.generateTeacherComplianceInsight).toHaveBeenCalledOnce();
    expect(fallbackProviderMock.generateTeacherComplianceInsight).toHaveBeenCalledOnce();
    expect(analyticsRepositoryMock.createSnapshot).toHaveBeenCalledOnce();
    expect(analyticsRepositoryMock.createSnapshot.mock.calls[0][0]).toMatchObject({
      providerKey: "groq",
      fallbackUsed: true
    });
    expect(
      (analyticsRepositoryMock.createSnapshot.mock.calls[0][0] as { resultJson: { summary: string } })
        .resultJson.summary
    ).toBe("Groq narrative");
    expect(analyticsRepositoryMock.markJobCompleted).toHaveBeenCalledWith(
      "301",
      expect.objectContaining({
        selectedProvider: "groq",
        fallbackUsed: true,
        snapshotId: "8801"
      }),
      expect.anything()
    );
  });

  it("creates an admin operational digest snapshot using the primary provider when available", async () => {
    vi.mocked(analyticsRepositoryMock.claimJobForExecution).mockResolvedValue(
      adminOperationalDigestJobRow
    );
    vi.mocked(analyticsRepositoryMock.findOperationalAttendanceSummary).mockResolvedValue({
      sessionCount: 80,
      recordedCount: 2140,
      expectedCount: 2400,
      coveragePercentage: 89.17
    });
    vi.mocked(analyticsRepositoryMock.findOperationalAssessmentSummary).mockResolvedValue({
      assessmentCount: 36,
      publishedCount: 32,
      gradedCount: 930,
      expectedCount: 980,
      publicationPercentage: 88.89,
      gradingCoveragePercentage: 94.9
    });
    vi.mocked(analyticsRepositoryMock.findOperationalHomeworkSummary).mockResolvedValue({
      homeworkCount: 44,
      recordedCount: 1010,
      expectedCount: 1120,
      submissionCoveragePercentage: 90.18
    });
    vi.mocked(analyticsRepositoryMock.findOperationalBehaviorSummary).mockResolvedValue({
      totalRecords: 18,
      negativeRecords: 5,
      highSeverityNegativeRecords: 1
    });
    vi.mocked(primaryProviderMock.generateAdminOperationalDigestInsight).mockResolvedValue({
      status: "stable",
      confidenceScore: 0.93,
      summary: "OpenAI operational digest",
      keySignals: ["ignored"],
      adminRecommendations: ["Keep weekly monitoring active"],
      priorityActions: ["Validate attendance coverage weekly"]
    });
    vi.mocked(analyticsRepositoryMock.createSnapshot).mockImplementation(async (input) => ({
      id: "9901",
      analysisType: input.analysisType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      academicYearId: input.academicYearId,
      semesterId: input.semesterId,
      sourceJobId: input.sourceJobId,
      providerKey: input.providerKey,
      fallbackUsed: input.fallbackUsed,
      featurePayloadJson: input.featurePayloadJson,
      resultJson: input.resultJson,
      computedAt: input.computedAt,
      createdAt: input.computedAt,
      updatedAt: input.computedAt
    }));
    vi.mocked(analyticsRepositoryMock.markJobCompleted).mockResolvedValue(undefined);

    const service = buildService();
    const processed = await service.executeJob("401");

    expect(processed).toBe(true);
    expect(reportingRepositoryMock.findAdminDashboardSummary).toHaveBeenCalledOnce();
    expect(primaryProviderMock.generateAdminOperationalDigestInsight).toHaveBeenCalledOnce();
    expect(fallbackProviderMock.generateAdminOperationalDigestInsight).not.toHaveBeenCalled();
    expect(analyticsRepositoryMock.createSnapshot).toHaveBeenCalledOnce();
    expect(analyticsRepositoryMock.createSnapshot.mock.calls[0][0]).toMatchObject({
      analysisType: "admin_operational_digest",
      subjectType: "system",
      subjectId: "0",
      providerKey: "openai",
      fallbackUsed: false
    });
    expect(
      (analyticsRepositoryMock.createSnapshot.mock.calls[0][0] as { resultJson: { summary: string } })
        .resultJson.summary
    ).toBe("OpenAI operational digest");
    expect(analyticsRepositoryMock.markJobCompleted).toHaveBeenCalledWith(
      "401",
      expect.objectContaining({
        selectedProvider: "openai",
        fallbackUsed: false,
        snapshotId: "9901"
      }),
      expect.anything()
    );
  });

  it("creates a class overview snapshot using the primary provider when available", async () => {
    vi.mocked(analyticsRepositoryMock.claimJobForExecution).mockResolvedValue(classOverviewJobRow);
    vi.mocked(analyticsRepositoryMock.findClassHomeworkSummary).mockResolvedValue({
      totalHomework: 6,
      submittedCount: 9,
      lateCount: 1,
      notSubmittedCount: 2,
      averageSubmissionPercentage: 75,
      studentsBelowSubmissionThreshold: 1
    });
    vi.mocked(primaryProviderMock.generateClassOverviewInsight).mockResolvedValue({
      status: "watch",
      confidenceScore: 0.91,
      summary: "OpenAI class overview",
      keySignals: ["ignored"],
      recommendedActions: ["Review attendance interventions"],
      focusAreas: ["Attendance"]
    });
    vi.mocked(analyticsRepositoryMock.createSnapshot).mockImplementation(async (input) => ({
      id: "9902",
      analysisType: input.analysisType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      academicYearId: input.academicYearId,
      semesterId: input.semesterId,
      sourceJobId: input.sourceJobId,
      providerKey: input.providerKey,
      fallbackUsed: input.fallbackUsed,
      featurePayloadJson: input.featurePayloadJson,
      resultJson: input.resultJson,
      computedAt: input.computedAt,
      createdAt: input.computedAt,
      updatedAt: input.computedAt
    }));
    vi.mocked(analyticsRepositoryMock.markJobCompleted).mockResolvedValue(undefined);

    const service = buildService();
    const processed = await service.executeJob("501");

    expect(processed).toBe(true);
    expect(academicStructureRepositoryMock.findClassById).toHaveBeenCalledWith("12");
    expect(reportingRepositoryMock.listStudentsByClass).toHaveBeenCalledWith("12", "2");
    expect(
      reportingRepositoryMock.listStudentAssessmentSummariesByStudentIds
    ).toHaveBeenCalledWith(["5", "6"], "2", "3");
    expect(primaryProviderMock.generateClassOverviewInsight).toHaveBeenCalledOnce();
    expect(fallbackProviderMock.generateClassOverviewInsight).not.toHaveBeenCalled();
    expect(analyticsRepositoryMock.createSnapshot).toHaveBeenCalledOnce();
    expect(analyticsRepositoryMock.createSnapshot.mock.calls[0][0]).toMatchObject({
      analysisType: "class_overview",
      subjectType: "class",
      subjectId: "12",
      providerKey: "openai",
      fallbackUsed: false
    });
    expect(
      (analyticsRepositoryMock.createSnapshot.mock.calls[0][0] as { resultJson: { summary: string } })
        .resultJson.summary
    ).toBe("OpenAI class overview");
    expect(analyticsRepositoryMock.markJobCompleted).toHaveBeenCalledWith(
      "501",
      expect.objectContaining({
        selectedProvider: "openai",
        fallbackUsed: false,
        snapshotId: "9902"
      }),
      expect.anything()
    );
  });
  it("creates a transport route anomaly snapshot using the primary provider when available", async () => {
    vi.mocked(analyticsRepositoryMock.claimJobForExecution).mockResolvedValue(routeAnomalyJobRow);
    vi.mocked(primaryProviderMock.generateTransportRouteAnomalyInsight).mockResolvedValue({
      status: "watch",
      confidenceScore: 0.9,
      summary: "OpenAI route anomaly summary",
      keySignals: ["Delayed trip rate exceeds the acceptable baseline."],
      anomalyFlags: ["delay_rate"],
      recommendedActions: ["Review recurring delay causes on the route."]
    });
    vi.mocked(analyticsRepositoryMock.createSnapshot).mockImplementation(async (input) => ({
      id: "9903",
      analysisType: input.analysisType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      academicYearId: input.academicYearId,
      semesterId: input.semesterId,
      sourceJobId: input.sourceJobId,
      providerKey: input.providerKey,
      fallbackUsed: input.fallbackUsed,
      featurePayloadJson: input.featurePayloadJson,
      resultJson: input.resultJson,
      computedAt: input.computedAt,
      createdAt: input.computedAt,
      updatedAt: input.computedAt
    }));
    vi.mocked(analyticsRepositoryMock.markJobCompleted).mockResolvedValue(undefined);

    const service = buildService();
    const processed = await service.executeJob("601");

    expect(processed).toBe(true);
    expect(transportRepositoryMock.findRouteById).toHaveBeenCalledWith("9");
    expect(academicStructureRepositoryMock.findSemesterById).toHaveBeenCalledWith("3");
    expect(transportRepositoryMock.listRouteStopsByRouteId).toHaveBeenCalledWith("9");
    expect(analyticsRepositoryMock.findTransportRouteOperationalSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        routeId: "9",
        dateFrom: "2025-09-01",
        dateTo: "2026-01-15"
      })
    );
    expect(primaryProviderMock.generateTransportRouteAnomalyInsight).toHaveBeenCalledOnce();
    expect(fallbackProviderMock.generateTransportRouteAnomalyInsight).not.toHaveBeenCalled();
    expect(analyticsRepositoryMock.createSnapshot).toHaveBeenCalledOnce();
    expect(analyticsRepositoryMock.createSnapshot.mock.calls[0][0]).toMatchObject({
      analysisType: "transport_route_anomaly_summary",
      subjectType: "route",
      subjectId: "9",
      providerKey: "openai",
      fallbackUsed: false
    });
    expect(
      (analyticsRepositoryMock.createSnapshot.mock.calls[0][0] as { resultJson: { summary: string } })
        .resultJson.summary
    ).toBe("OpenAI route anomaly summary");
    expect(analyticsRepositoryMock.markJobCompleted).toHaveBeenCalledWith(
      "601",
      expect.objectContaining({
        selectedProvider: "openai",
        fallbackUsed: false,
        snapshotId: "9903"
      }),
      expect.anything()
    );
  });

  it("applies feedback refinement context when executing a student risk snapshot", async () => {
    const studentRiskJobRow = {
      id: "201",
      analysisType: "student_risk_summary" as const,
      subjectType: "student" as const,
      subjectId: "5",
      academicYearId: "2",
      semesterId: "3",
      requestedByUserId: "1001",
      status: "pending" as const,
      primaryProvider: "openai" as const,
      fallbackProvider: "groq" as const,
      selectedProvider: null,
      fallbackUsed: false,
      inputJson: {
        trigger: "admin_manual",
        academicYearName: "2025-2026",
        semesterName: "Semester 1",
        subjectDisplayName: "Student Five"
      },
      snapshotId: null,
      startedAt: null,
      completedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: new Date("2026-04-22T11:00:00.000Z"),
      updatedAt: new Date("2026-04-22T11:00:00.000Z")
    };

    vi.mocked(analyticsRepositoryMock.claimJobForExecution).mockResolvedValue(studentRiskJobRow);
    vi.mocked(analyticsRepositoryMock.findStudentHomeworkSummary).mockResolvedValue({
      totalHomework: 12,
      submittedCount: 6,
      lateCount: 2,
      notSubmittedCount: 4,
      submissionPercentage: 50
    });
    vi.mocked(reportingRepositoryMock.findStudentAttendanceSummary).mockResolvedValue({
      studentId: "5",
      academicNo: "STU-0005",
      studentName: "Student Five",
      classId: "12",
      className: "Grade 5 - A",
      section: "A",
      academicYearId: "2",
      academicYearName: "2025-2026",
      semesterId: "3",
      semesterName: "Semester 1",
      totalSessions: 20,
      presentCount: 12,
      absentCount: 6,
      lateCount: 2,
      excusedCount: 0,
      attendancePercentage: 60
    });
    vi.mocked(reportingRepositoryMock.listStudentAssessmentSummaries).mockResolvedValue([
      {
        subjectId: "1",
        subjectName: "Math",
        totalAssessments: 3,
        averageScore: 42,
        maximumScore: 100,
        overallPercentage: 42,
        lastAssessmentDate: new Date("2026-04-20T00:00:00.000Z")
      }
    ]);
    vi.mocked(reportingRepositoryMock.findStudentBehaviorSummary).mockResolvedValue({
      studentId: "5",
      totalBehaviorRecords: 4,
      positiveCount: 1,
      negativeCount: 3,
      negativeSeverityTotal: 8
    });
    vi.mocked(analyticsRepositoryMock.aggregateFeedbackForSubjectContext).mockResolvedValue({
      analysisType: "student_risk_summary",
      subjectType: "student",
      subjectId: "5",
      academicYearId: "2",
      semesterId: "3",
      totalFeedbackCount: 3,
      averageRating: 1.67,
      positiveFeedbackCount: 0,
      negativeFeedbackCount: 2,
      neutralFeedbackCount: 1,
      latestFeedbackAt: new Date("2026-04-21T10:00:00.000Z"),
      recentFeedbackTexts: ["Needs clearer guidance", "Previous advice was too optimistic"]
    });
    vi.mocked(primaryProviderMock.generateStudentRiskInsight).mockResolvedValue({
      riskLevel: "high",
      confidenceScore: 0.91,
      summary: "OpenAI student summary",
      keySignals: ["ignored"],
      adminRecommendations: ["OpenAI admin action"],
      parentGuidance: ["OpenAI parent guidance"]
    });
    vi.mocked(analyticsRepositoryMock.createSnapshot).mockImplementation(async (input) => ({
      id: "9904",
      analysisType: input.analysisType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      academicYearId: input.academicYearId,
      semesterId: input.semesterId,
      sourceJobId: input.sourceJobId,
      providerKey: input.providerKey,
      fallbackUsed: input.fallbackUsed,
      featurePayloadJson: input.featurePayloadJson,
      resultJson: input.resultJson,
      computedAt: input.computedAt,
      createdAt: input.computedAt,
      updatedAt: input.computedAt
    }));
    vi.mocked(analyticsRepositoryMock.markJobCompleted).mockResolvedValue(undefined);

    const service = buildService();
    const processed = await service.executeJob("201");

    expect(processed).toBe(true);
    expect(primaryProviderMock.generateStudentRiskInsight).toHaveBeenCalledWith(
      expect.any(Object),
      {
        feedback: expect.objectContaining({
          totalFeedbackCount: 3,
          averageRating: 1.67
        })
      }
    );
    expect((analyticsRepositoryMock.createSnapshot.mock.calls[0][0] as { resultJson: { summary: string } }).resultJson.summary).toBe("OpenAI student summary");
    expect((analyticsRepositoryMock.createSnapshot.mock.calls[0][0] as { resultJson: { adminRecommendations: string[] } }).resultJson.adminRecommendations).toEqual(
      expect.arrayContaining(["OpenAI admin action"])
    );
    expect((analyticsRepositoryMock.createSnapshot.mock.calls[0][0] as { resultJson: { adminRecommendations: string[] } }).resultJson.adminRecommendations.length).toBeGreaterThan(1);
    expect((analyticsRepositoryMock.createSnapshot.mock.calls[0][0] as { resultJson: { parentGuidance: string[] } }).resultJson.parentGuidance).toEqual(
      expect.arrayContaining(["OpenAI parent guidance"])
    );
    expect((analyticsRepositoryMock.createSnapshot.mock.calls[0][0] as { resultJson: { parentGuidance: string[] } }).resultJson.parentGuidance.length).toBeGreaterThan(1);
  });

  it("skips autonomous dispatch when the configured actor is invalid", async () => {
    vi.mocked(systemSettingsReadServiceMock.getAnalyticsSettings).mockResolvedValue({
      aiAnalyticsEnabled: true,
      primaryProvider: "openai",
      fallbackProvider: "groq",
      scheduledRecomputeEnabled: true,
      scheduledRecomputeIntervalMinutes: 720,
      scheduledRecomputeMaxSubjectsPerTarget: 5,
      scheduledTargets: ["student_risk_summary"],
      autonomousDispatchEnabled: true,
      autonomousDispatchActorUserId: "9999",
      retentionCleanupEnabled: false,
      obsoleteSnapshotRetentionDays: 30,
      jobRetentionDays: 30,
      schedulerRunRetentionDays: 30
    });
    vi.mocked(usersRepositoryMock.findUserById).mockResolvedValue(null);

    const service = buildService();
    const result = await service.dispatchAutonomousScheduledRecomputeJobs();

    expect(result).toMatchObject({
      skipped: true,
      reason: "autonomous_actor_invalid",
      runId: null,
      response: null
    });
    expect(analyticsRepositoryMock.createSchedulerRun).not.toHaveBeenCalled();
  });

  it("skips autonomous dispatch while the cooldown window is still active", async () => {
    vi.mocked(systemSettingsReadServiceMock.getAnalyticsSettings).mockResolvedValue({
      aiAnalyticsEnabled: true,
      primaryProvider: "openai",
      fallbackProvider: "groq",
      scheduledRecomputeEnabled: true,
      scheduledRecomputeIntervalMinutes: 720,
      scheduledRecomputeMaxSubjectsPerTarget: 5,
      scheduledTargets: ["student_risk_summary"],
      autonomousDispatchEnabled: true,
      autonomousDispatchActorUserId: "1001",
      retentionCleanupEnabled: false,
      obsoleteSnapshotRetentionDays: 30,
      jobRetentionDays: 30,
      schedulerRunRetentionDays: 30
    });
    vi.mocked(analyticsRepositoryMock.findLatestSchedulerRun).mockResolvedValue({
      id: "9910",
      triggerMode: "autonomous_dispatch",
      status: "completed",
      requestedByUserId: "1001",
      requestedByFullName: "Admin User",
      academicYearId: "2",
      semesterId: "3",
      staleBefore: new Date(Date.now() - 60_000),
      scheduledTargetsJson: ["student_risk_summary"],
      summaryJson: {},
      startedAt: new Date(Date.now() - 60_000),
      completedAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date()
    });

    const service = buildService();
    const result = await service.dispatchAutonomousScheduledRecomputeJobs();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("cooldown_active");
    expect(result.nextEligibleAt).toEqual(expect.any(String));
    expect(analyticsRepositoryMock.createSchedulerRun).not.toHaveBeenCalled();
  });

  it("creates and completes an autonomous scheduler run when stale dispatch is due", async () => {
    vi.mocked(systemSettingsReadServiceMock.getAnalyticsSettings).mockResolvedValue({
      aiAnalyticsEnabled: true,
      primaryProvider: "openai",
      fallbackProvider: "groq",
      scheduledRecomputeEnabled: true,
      scheduledRecomputeIntervalMinutes: 720,
      scheduledRecomputeMaxSubjectsPerTarget: 2,
      scheduledTargets: ["student_risk_summary"],
      autonomousDispatchEnabled: true,
      autonomousDispatchActorUserId: "1001",
      retentionCleanupEnabled: false,
      obsoleteSnapshotRetentionDays: 30,
      jobRetentionDays: 30,
      schedulerRunRetentionDays: 30
    });
    vi.mocked(analyticsRepositoryMock.listStaleStudentRiskCandidates).mockResolvedValue([
      {
        studentId: "5",
        fullName: "Student Five",
        latestComputedAt: null
      }
    ]);
    vi.mocked(analyticsRepositoryMock.findActiveJobByNaturalKey).mockResolvedValue(null);
    vi.mocked(analyticsRepositoryMock.createJob).mockResolvedValue({
      ...teacherComplianceJobRow,
      id: "9501",
      analysisType: "student_risk_summary",
      subjectType: "student",
      subjectId: "5",
      inputJson: {
        trigger: "scheduled_recompute",
        academicYearName: "2025-2026",
        semesterName: "Semester 1",
        subjectDisplayName: "Student Five"
      }
    });

    const service = buildService();
    const result = await service.dispatchAutonomousScheduledRecomputeJobs();

    expect(result.skipped).toBe(false);
    expect(result.runId).toBe("99001");
    expect(result.response?.summary).toEqual({
      totalEligibleSubjects: 1,
      dispatchedCount: 1,
      reusedCount: 0
    });
    expect(analyticsRepositoryMock.createSchedulerRun).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerMode: "autonomous_dispatch",
        requestedByUserId: "1001"
      }),
      expect.anything()
    );
    expect(analyticsRepositoryMock.markSchedulerRunCompleted).toHaveBeenCalledWith(
      "99001",
      expect.objectContaining({
        triggerMode: "autonomous_dispatch",
        summary: {
          totalEligibleSubjects: 1,
          dispatchedCount: 1,
          reusedCount: 0
        }
      })
    );
  });

  it("rejects retention cleanup when the feature flag is disabled", async () => {
    vi.mocked(systemSettingsReadServiceMock.getAnalyticsSettings).mockResolvedValue({
      aiAnalyticsEnabled: true,
      primaryProvider: "openai",
      fallbackProvider: "groq",
      scheduledRecomputeEnabled: false,
      scheduledRecomputeIntervalMinutes: 1440,
      scheduledRecomputeMaxSubjectsPerTarget: 25,
      scheduledTargets: [
        "student_risk_summary",
        "teacher_compliance_summary",
        "admin_operational_digest",
        "class_overview",
        "transport_route_anomaly_summary"
      ],
      autonomousDispatchEnabled: false,
      autonomousDispatchActorUserId: null,
      retentionCleanupEnabled: false,
      obsoleteSnapshotRetentionDays: 30,
      jobRetentionDays: 30,
      schedulerRunRetentionDays: 30
    });

    const service = buildService();

    await expect(service.runRetentionCleanup(adminUser)).rejects.toBeInstanceOf(ConflictError);
    expect(analyticsRepositoryMock.deleteObsoleteSnapshots).not.toHaveBeenCalled();
    expect(analyticsRepositoryMock.deleteStaleTerminalJobs).not.toHaveBeenCalled();
    expect(analyticsRepositoryMock.deleteStaleSchedulerRuns).not.toHaveBeenCalled();
  });

  it("deletes obsolete analytics artifacts according to configured retention windows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T00:00:00.000Z"));

    vi.mocked(systemSettingsReadServiceMock.getAnalyticsSettings).mockResolvedValue({
      aiAnalyticsEnabled: true,
      primaryProvider: "openai",
      fallbackProvider: "groq",
      scheduledRecomputeEnabled: false,
      scheduledRecomputeIntervalMinutes: 1440,
      scheduledRecomputeMaxSubjectsPerTarget: 25,
      scheduledTargets: [
        "student_risk_summary",
        "teacher_compliance_summary",
        "admin_operational_digest",
        "class_overview",
        "transport_route_anomaly_summary"
      ],
      autonomousDispatchEnabled: false,
      autonomousDispatchActorUserId: null,
      retentionCleanupEnabled: true,
      obsoleteSnapshotRetentionDays: 14,
      jobRetentionDays: 21,
      schedulerRunRetentionDays: 28
    });
    vi.mocked(analyticsRepositoryMock.deleteObsoleteSnapshots).mockResolvedValue({
      deletedSnapshotCount: 2,
      cascadedFeedbackCount: 3
    });
    vi.mocked(analyticsRepositoryMock.deleteStaleTerminalJobs).mockResolvedValue(4);
    vi.mocked(analyticsRepositoryMock.deleteStaleSchedulerRuns).mockResolvedValue(1);

    try {
      const service = buildService();
      const response = await service.runRetentionCleanup(adminUser);

      expect(analyticsRepositoryMock.deleteObsoleteSnapshots).toHaveBeenCalledWith(
        {
          obsoleteSnapshotCutoff: new Date("2026-04-09T00:00:00.000Z")
        },
        expect.anything()
      );
      expect(analyticsRepositoryMock.deleteStaleTerminalJobs).toHaveBeenCalledWith(
        {
          jobCutoff: new Date("2026-04-02T00:00:00.000Z")
        },
        expect.anything()
      );
      expect(analyticsRepositoryMock.deleteStaleSchedulerRuns).toHaveBeenCalledWith(
        {
          schedulerRunCutoff: new Date("2026-03-26T00:00:00.000Z")
        },
        expect.anything()
      );
      expect(response).toMatchObject({
        executedAt: "2026-04-23T00:00:00.000Z",
        retention: {
          obsoleteSnapshotRetentionDays: 14,
          jobRetentionDays: 21,
          schedulerRunRetentionDays: 28,
          obsoleteSnapshotCutoff: "2026-04-09T00:00:00.000Z",
          jobCutoff: "2026-04-02T00:00:00.000Z",
          schedulerRunCutoff: "2026-03-26T00:00:00.000Z"
        },
        summary: {
          deletedSnapshots: 2,
          cascadedFeedbackCount: 3,
          deletedJobs: 4,
          deletedSchedulerRuns: 1
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows a linked parent to submit feedback on a student risk snapshot", async () => {
    vi.mocked(analyticsRepositoryMock.findSnapshotById).mockResolvedValue({
      id: "7001",
      analysisType: "student_risk_summary" as const,
      subjectType: "student" as const,
      subjectId: "5",
      academicYearId: "2",
      semesterId: "3",
      sourceJobId: null,
      providerKey: "openai",
      fallbackUsed: false,
      reviewStatus: "approved",
      reviewedByUserId: "1001",
      reviewedAt: new Date("2026-04-22T12:01:00.000Z"),
      publishedAt: new Date("2026-04-22T12:01:00.000Z"),
      reviewNotes: null,
      featurePayloadJson: {},
      resultJson: {},
      computedAt: new Date("2026-04-22T12:00:00.000Z"),
      createdAt: new Date("2026-04-22T12:00:00.000Z"),
      updatedAt: new Date("2026-04-22T12:00:00.000Z")
    });
    vi.mocked(analyticsRepositoryMock.createFeedback).mockResolvedValue({
      id: "9101",
      snapshotId: "7001",
      userId: "1006",
      userFullName: "Parent User",
      userRole: "parent",
      rating: 4,
      feedbackText: "Useful summary for home follow-up",
      createdAt: new Date("2026-04-22T12:05:00.000Z")
    });

    const service = buildService();
    const response = await service.createSnapshotFeedback(parentUser, "7001", {
      rating: 4,
      feedbackText: "Useful summary for home follow-up"
    });

    expect(profileResolutionServiceMock.requireParentProfile).toHaveBeenCalledWith(
      "1006",
      expect.anything()
    );
    expect(ownershipServiceMock.assertParentOwnsStudent).toHaveBeenCalledWith(
      "15",
      "5",
      expect.anything()
    );
    expect(analyticsRepositoryMock.createFeedback).toHaveBeenCalledWith(
      {
        snapshotId: "7001",
        userId: "1006",
        rating: 4,
        feedbackText: "Useful summary for home follow-up"
      },
      expect.anything()
    );
    expect(response).toMatchObject({
      feedbackId: "9101",
      snapshotId: "7001",
      user: {
        userId: "1006",
        fullName: "Parent User",
        role: "parent"
      },
      rating: 4,
      feedbackText: "Useful summary for home follow-up"
    });
  });

  it("rejects teacher feedback on teacher compliance snapshots", async () => {
    vi.mocked(analyticsRepositoryMock.findSnapshotById).mockResolvedValue({
      id: "7101",
      analysisType: "teacher_compliance_summary" as const,
      subjectType: "teacher" as const,
      subjectId: "7",
      academicYearId: "2",
      semesterId: "3",
      sourceJobId: null,
      providerKey: "openai",
      fallbackUsed: false,
      reviewStatus: "draft",
      reviewedByUserId: null,
      reviewedAt: null,
      publishedAt: null,
      reviewNotes: null,
      featurePayloadJson: {},
      resultJson: {},
      computedAt: new Date("2026-04-22T12:00:00.000Z"),
      createdAt: new Date("2026-04-22T12:00:00.000Z"),
      updatedAt: new Date("2026-04-22T12:00:00.000Z")
    });

    const service = buildService();

    await expect(
      service.createSnapshotFeedback(
        {
          userId: "2007",
          role: "teacher",
          email: "teacher7@example.com",
          isActive: true
        },
        "7101",
        { rating: 2 }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(analyticsRepositoryMock.createFeedback).not.toHaveBeenCalled();
  });
});







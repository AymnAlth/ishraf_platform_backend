import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import { NotFoundError } from "../../src/common/errors/not-found-error";
import type { OwnershipService } from "../../src/common/services/ownership.service";
import type { ParentProfile, TeacherProfile } from "../../src/common/types/profile.types";
import { ReportingService } from "../../src/modules/reporting/service/reporting.service";
import type { ReportingRepository } from "../../src/modules/reporting/repository/reporting.repository";
import type { ActivePeriodRow, ReportingStudentRow } from "../../src/modules/reporting/types/reporting.types";
import type { ProfileResolutionService } from "../../src/common/services/profile-resolution.service";

const activePeriod: ActivePeriodRow = {
  academicYearId: "1",
  academicYearName: "2025-2026",
  semesterId: "2",
  semesterName: "Semester 2"
};

const studentRow = (
  overrides: Partial<ReportingStudentRow> = {}
): ReportingStudentRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  dateOfBirth: new Date("2016-09-01T00:00:00.000Z"),
  gender: "male",
  status: "active",
  enrollmentDate: new Date("2025-09-01T00:00:00.000Z"),
  classId: "1",
  className: "A",
  section: "A",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  academicYearId: "1",
  academicYearName: "2025-2026",
  ...overrides
});

const parentProfile = (
  overrides: Partial<ParentProfile> = {}
): ParentProfile => ({
  parentId: "1",
  userId: "1006",
  fullName: "Parent User",
  email: "parent@example.com",
  phone: "700000006",
  address: "Dhamar",
  relationType: "father",
  ...overrides
});

const teacherProfile = (
  overrides: Partial<TeacherProfile> = {}
): TeacherProfile => ({
  teacherId: "1",
  userId: "1002",
  fullName: "Teacher User",
  email: "teacher@example.com",
  phone: "700000002",
  specialization: "Science",
  qualification: "Bachelor",
  hireDate: "2025-09-01",
  ...overrides
});

describe("ReportingService", () => {
  const repositoryMock = {
    findActivePeriod: vi.fn(),
    findStudentById: vi.fn(),
    listStudentParents: vi.fn(),
    findStudentAttendanceSummary: vi.fn(),
    listStudentAssessmentSummaries: vi.fn(),
    findStudentBehaviorSummary: vi.fn(),
    listChildrenForParent: vi.fn(),
    listLatestNotificationsByUserId: vi.fn(),
    findNotificationSummaryByUserId: vi.fn(),
    listTeacherAssignments: vi.fn(),
    listRecentTeacherAttendanceSessions: vi.fn(),
    listRecentTeacherAssessments: vi.fn(),
    listRecentTeacherBehaviorRecords: vi.fn(),
    findAdminDashboardSummary: vi.fn(),
    listRecentStudents: vi.fn(),
    listRecentAnnouncements: vi.fn(),
    listActiveTrips: vi.fn(),
    listLatestTripEventsByTripIds: vi.fn()
  };

  const profileResolutionServiceMock = {
    findParentProfileByUserId: vi.fn(),
    findTeacherProfileByUserId: vi.fn(),
    findSupervisorProfileByUserId: vi.fn(),
    findDriverProfileByUserId: vi.fn()
  };

  const ownershipServiceMock = {
    assertTeacherAssignedToClassYear: vi.fn(),
    assertSupervisorAssignedToClassYear: vi.fn(),
    assertParentOwnsStudent: vi.fn()
  };

  let reportingService: ReportingService;

  beforeEach(() => {
    Object.values(repositoryMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(profileResolutionServiceMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(ownershipServiceMock).forEach((mockFn) => mockFn.mockReset());

    vi.mocked(repositoryMock.findActivePeriod).mockResolvedValue(activePeriod);
    reportingService = new ReportingService(
      repositoryMock as unknown as ReportingRepository,
      profileResolutionServiceMock as unknown as ProfileResolutionService,
      ownershipServiceMock as unknown as OwnershipService
    );
  });

  it("returns zero-safe summaries for student profile when no aggregates exist", async () => {
    vi.mocked(repositoryMock.findStudentById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.listStudentParents).mockResolvedValue([]);
    vi.mocked(repositoryMock.findStudentAttendanceSummary).mockResolvedValue(null);
    vi.mocked(repositoryMock.listStudentAssessmentSummaries).mockResolvedValue([]);
    vi.mocked(repositoryMock.findStudentBehaviorSummary).mockResolvedValue(null);

    const response = await reportingService.getStudentProfile(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      "1"
    );

    expect(response.attendanceSummary.totalSessions).toBe(0);
    expect(response.assessmentSummary.totalAssessments).toBe(0);
    expect(response.behaviorSummary.totalBehaviorRecords).toBe(0);
  });

  it("enforces teacher scoping on student profile access", async () => {
    vi.mocked(repositoryMock.findStudentById).mockResolvedValue(studentRow());
    vi.mocked(profileResolutionServiceMock.findTeacherProfileByUserId).mockResolvedValue(
      teacherProfile()
    );
    vi.mocked(ownershipServiceMock.assertTeacherAssignedToClassYear).mockRejectedValue(
      new ForbiddenError("Teacher is not assigned to the selected class")
    );

    await expect(
      reportingService.getStudentProfile(
        {
          userId: "1002",
          role: "teacher",
          email: "teacher@example.com",
          isActive: true
        },
        "1"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("passes the recent-item cap of 5 into teacher dashboard queries", async () => {
    vi.mocked(profileResolutionServiceMock.findTeacherProfileByUserId).mockResolvedValue(
      teacherProfile()
    );
    vi.mocked(repositoryMock.listTeacherAssignments).mockResolvedValue([]);
    vi.mocked(repositoryMock.listRecentTeacherAttendanceSessions).mockResolvedValue([]);
    vi.mocked(repositoryMock.listRecentTeacherAssessments).mockResolvedValue([]);
    vi.mocked(repositoryMock.listRecentTeacherBehaviorRecords).mockResolvedValue([]);

    await reportingService.getTeacherDashboard({
      userId: "1002",
      role: "teacher",
      email: "teacher@example.com",
      isActive: true
    });

    expect(repositoryMock.listRecentTeacherAttendanceSessions).toHaveBeenCalledWith(
      "1",
      "1",
      "2",
      5
    );
    expect(repositoryMock.listRecentTeacherAssessments).toHaveBeenCalledWith(
      "1",
      "1",
      "2",
      5
    );
    expect(repositoryMock.listRecentTeacherBehaviorRecords).toHaveBeenCalledWith(
      "1",
      "1",
      "2",
      5
    );
  });

  it("returns parent dashboard data only for the resolved parent profile", async () => {
    vi.mocked(profileResolutionServiceMock.findParentProfileByUserId).mockResolvedValue(
      parentProfile()
    );
    vi.mocked(repositoryMock.listChildrenForParent).mockResolvedValue([studentRow()]);
    vi.mocked(repositoryMock.findStudentAttendanceSummary).mockResolvedValue(null);
    vi.mocked(repositoryMock.listStudentAssessmentSummaries).mockResolvedValue([]);
    vi.mocked(repositoryMock.findStudentBehaviorSummary).mockResolvedValue(null);
    vi.mocked(repositoryMock.listLatestNotificationsByUserId).mockResolvedValue([]);
    vi.mocked(repositoryMock.findNotificationSummaryByUserId).mockResolvedValue({
      totalNotifications: "0",
      unreadNotifications: "0"
    });

    const response = await reportingService.getParentDashboard({
      userId: "1006",
      role: "parent",
      email: "parent@example.com",
      isActive: true
    });

    expect(repositoryMock.listChildrenForParent).toHaveBeenCalledWith("1");
    expect(response.children).toHaveLength(1);
    expect(response.parent.parentId).toBe("1");
  });

  it("requires an active academic period before serving reporting endpoints", async () => {
    vi.mocked(repositoryMock.findActivePeriod).mockResolvedValue(null);

    await expect(
      reportingService.getAdminDashboard({
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("requires a driver profile for driver transport summaries", async () => {
    vi.mocked(profileResolutionServiceMock.findDriverProfileByUserId).mockResolvedValue(null);

    await expect(
      reportingService.getTransportSummary({
        userId: "1004",
        role: "driver",
        email: "driver@example.com",
        isActive: true
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});


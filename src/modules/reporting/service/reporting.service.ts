import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { OwnershipService } from "../../../common/services/ownership.service";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import { toDateOnly } from "../../../common/utils/date.util";
import type {
  ReportingAdminDashboardResponseDto,
  ReportingParentDashboardResponseDto,
  ReportingParentTransportLiveStatusResponseDto,
  ReportingStudentAssessmentReportResponseDto,
  ReportingStudentAttendanceReportResponseDto,
  ReportingStudentBehaviorReportResponseDto,
  ReportingStudentProfileResponseDto,
  ReportingSupervisorDashboardResponseDto,
  ReportingTeacherDashboardResponseDto,
  ReportingTransportSummaryResponseDto
} from "../dto/reporting.dto";
import {
  toAdminDashboardResponseDto,
  toAssessmentSummaryDto,
  toAttendanceSummaryDto,
  toBehaviorSummaryDto,
  toParentChildDto,
  toParentDashboardResponseDto,
  toRecentBehaviorRecordDto,
  toReportingStudentDto,
  toStudentAssessmentReportResponseDto,
  toStudentAttendanceReportResponseDto,
  toStudentBehaviorReportResponseDto,
  toStudentProfileResponseDto,
  toTeacherDashboardResponseDto,
  toTransportSummaryResponseDto,
  toTransportTripDto,
  toTripEventDto
} from "../mapper/reporting.mapper";
import type { ReportingRepository } from "../repository/reporting.repository";
import type {
  ActivePeriodRow,
  ReportingStudentRow
} from "../types/reporting.types";
import type {
  ParentProfile,
  SupervisorProfile,
  TeacherProfile
} from "../../../common/types/profile.types";

const RECENT_LIMIT = 5;
const TRIP_EVENT_LIMIT = 5;

const assertFound = <T>(value: T | null, label: string): T => {
  if (!value) {
    throw new NotFoundError(`${label} not found`);
  }

  return value;
};

const toIsoString = (value: Date): string => value.toISOString();

export class ReportingService {
  constructor(
    private readonly reportingRepository: ReportingRepository,
    private readonly profileResolutionService = new ProfileResolutionService(),
    private readonly ownershipService = new OwnershipService()
  ) {}

  async getStudentProfile(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingStudentProfileResponseDto> {
    const { activePeriod, student } = await this.getAccessibleStudentForStaff(authUser, studentId);
    return this.buildStudentProfileResponse(activePeriod, student);
  }

  async getStudentAttendanceReport(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingStudentAttendanceReportResponseDto> {
    const { activePeriod, student } = await this.getAccessibleStudentForStaff(authUser, studentId);
    return this.buildStudentAttendanceReportResponse(activePeriod, student);
  }

  async getStudentAssessmentReport(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingStudentAssessmentReportResponseDto> {
    const { activePeriod, student } = await this.getAccessibleStudentForStaff(authUser, studentId);
    return this.buildStudentAssessmentReportResponse(activePeriod, student);
  }

  async getStudentBehaviorReport(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingStudentBehaviorReportResponseDto> {
    const { activePeriod, student } = await this.getAccessibleStudentForStaff(authUser, studentId);
    return this.buildStudentBehaviorReportResponse(activePeriod, student);
  }

  async getParentStudentProfile(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingStudentProfileResponseDto> {
    const { activePeriod, student } = await this.getAccessibleStudentForParent(authUser, studentId);
    return this.buildStudentProfileResponse(activePeriod, student);
  }

  async getParentStudentAttendanceReport(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingStudentAttendanceReportResponseDto> {
    const { activePeriod, student } = await this.getAccessibleStudentForParent(authUser, studentId);
    return this.buildStudentAttendanceReportResponse(activePeriod, student);
  }

  async getParentStudentAssessmentReport(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingStudentAssessmentReportResponseDto> {
    const { activePeriod, student } = await this.getAccessibleStudentForParent(authUser, studentId);
    return this.buildStudentAssessmentReportResponse(activePeriod, student);
  }

  async getParentStudentBehaviorReport(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingStudentBehaviorReportResponseDto> {
    const { activePeriod, student } = await this.getAccessibleStudentForParent(authUser, studentId);
    return this.buildStudentBehaviorReportResponse(activePeriod, student);
  }

  async getAdminPreviewParentDashboard(
    authUser: AuthenticatedUser,
    parentUserId: string
  ): Promise<ReportingParentDashboardResponseDto> {
    this.assertRole(authUser, "admin");
    const activePeriod = await this.requireActivePeriod();
    const parent = await this.requireParentProfileByUserId(parentUserId, "Parent");

    return this.buildParentDashboardResponse(activePeriod, parent, parentUserId);
  }

  async getAdminPreviewParentStudentProfile(
    authUser: AuthenticatedUser,
    parentUserId: string,
    studentId: string
  ): Promise<ReportingStudentProfileResponseDto> {
    this.assertRole(authUser, "admin");
    const activePeriod = await this.requireActivePeriod();
    const student = await this.getLinkedStudentForAdminPreviewParent(parentUserId, studentId);

    return this.buildStudentProfileResponse(activePeriod, student);
  }

  async getAdminPreviewParentStudentAttendanceReport(
    authUser: AuthenticatedUser,
    parentUserId: string,
    studentId: string
  ): Promise<ReportingStudentAttendanceReportResponseDto> {
    this.assertRole(authUser, "admin");
    const activePeriod = await this.requireActivePeriod();
    const student = await this.getLinkedStudentForAdminPreviewParent(parentUserId, studentId);

    return this.buildStudentAttendanceReportResponse(activePeriod, student);
  }

  async getAdminPreviewParentStudentAssessmentReport(
    authUser: AuthenticatedUser,
    parentUserId: string,
    studentId: string
  ): Promise<ReportingStudentAssessmentReportResponseDto> {
    this.assertRole(authUser, "admin");
    const activePeriod = await this.requireActivePeriod();
    const student = await this.getLinkedStudentForAdminPreviewParent(parentUserId, studentId);

    return this.buildStudentAssessmentReportResponse(activePeriod, student);
  }

  async getAdminPreviewParentStudentBehaviorReport(
    authUser: AuthenticatedUser,
    parentUserId: string,
    studentId: string
  ): Promise<ReportingStudentBehaviorReportResponseDto> {
    this.assertRole(authUser, "admin");
    const activePeriod = await this.requireActivePeriod();
    const student = await this.getLinkedStudentForAdminPreviewParent(parentUserId, studentId);

    return this.buildStudentBehaviorReportResponse(activePeriod, student);
  }

  async getAdminPreviewParentTransportLiveStatus(
    authUser: AuthenticatedUser,
    parentUserId: string,
    studentId: string
  ): Promise<ReportingParentTransportLiveStatusResponseDto> {
    this.assertRole(authUser, "admin");
    const student = await this.getLinkedStudentForAdminPreviewParent(parentUserId, studentId);

    return this.buildParentTransportLiveStatusResponse(student);
  }

  async getAdminPreviewTeacherDashboard(
    authUser: AuthenticatedUser,
    teacherUserId: string
  ): Promise<ReportingTeacherDashboardResponseDto> {
    this.assertRole(authUser, "admin");
    const activePeriod = await this.requireActivePeriod();
    const teacher = await this.requireTeacherProfileByUserId(teacherUserId, "Teacher");

    return this.buildTeacherDashboardResponse(activePeriod, teacher);
  }

  async getAdminPreviewSupervisorDashboard(
    authUser: AuthenticatedUser,
    supervisorUserId: string
  ): Promise<ReportingSupervisorDashboardResponseDto> {
    this.assertRole(authUser, "admin");
    const activePeriod = await this.requireActivePeriod();
    const supervisor = await this.requireSupervisorProfileByUserId(
      supervisorUserId,
      "Supervisor"
    );

    return this.buildSupervisorDashboardResponse(activePeriod, supervisor);
  }

  async getParentDashboard(
    authUser: AuthenticatedUser
  ): Promise<ReportingParentDashboardResponseDto> {
    const activePeriod = await this.requireActivePeriod();
    const parent = await this.requireParentProfileByUserId(authUser.userId, "Parent profile");

    return this.buildParentDashboardResponse(activePeriod, parent, authUser.userId);
  }

  async getTeacherDashboard(
    authUser: AuthenticatedUser
  ): Promise<ReportingTeacherDashboardResponseDto> {
    const activePeriod = await this.requireActivePeriod();
    const teacher = await this.requireTeacherProfileByUserId(authUser.userId, "Teacher profile");

    return this.buildTeacherDashboardResponse(activePeriod, teacher);
  }

  async getSupervisorDashboard(
    authUser: AuthenticatedUser
  ): Promise<ReportingSupervisorDashboardResponseDto> {
    const activePeriod = await this.requireActivePeriod();
    const supervisor = await this.requireSupervisorProfileByUserId(
      authUser.userId,
      "Supervisor profile"
    );

    return this.buildSupervisorDashboardResponse(activePeriod, supervisor);
  }

  async getAdminDashboard(
    authUser: AuthenticatedUser
  ): Promise<ReportingAdminDashboardResponseDto> {
    this.assertRole(authUser, "admin");
    await this.requireActivePeriod();

    const [summary, recentStudents, recentAnnouncements, activeTrips] = await Promise.all([
      this.reportingRepository.findAdminDashboardSummary(),
      this.reportingRepository.listRecentStudents(RECENT_LIMIT),
      this.reportingRepository.listRecentAnnouncements(RECENT_LIMIT),
      this.reportingRepository.listActiveTrips({}, RECENT_LIMIT)
    ]);

    const tripDtos = await this.buildTransportTripDtos(activeTrips);

    return toAdminDashboardResponseDto(
      assertFound(summary, "Admin dashboard summary"),
      recentStudents,
      recentAnnouncements,
      tripDtos
    );
  }

  async getTransportSummary(
    authUser: AuthenticatedUser
  ): Promise<ReportingTransportSummaryResponseDto> {
    if (!["admin", "driver"].includes(authUser.role)) {
      throw new ForbiddenError("You do not have permission to access transport reporting");
    }

    if (authUser.role === "driver") {
      const driver = assertFound(
        await this.profileResolutionService.findDriverProfileByUserId(authUser.userId),
        "Driver profile"
      );
      const activeTrips = await this.reportingRepository.listActiveTrips({
        driverId: driver.driverId
      });
      const tripDtos = await this.buildTransportTripDtos(activeTrips);

      return toTransportSummaryResponseDto(tripDtos);
    }

    await this.requireActivePeriod();

    const activeTrips = await this.reportingRepository.listActiveTrips();
    const tripDtos = await this.buildTransportTripDtos(activeTrips);

    return toTransportSummaryResponseDto(tripDtos);
  }

  async getParentTransportLiveStatus(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingParentTransportLiveStatusResponseDto> {
    const student = await this.getAccessibleStudentForParentOnly(authUser, studentId);
    return this.buildParentTransportLiveStatusResponse(student);
  }

  private async buildStudentProfileResponse(
    activePeriod: ActivePeriodRow,
    student: ReportingStudentRow
  ): Promise<ReportingStudentProfileResponseDto> {
    const [parents, attendanceSummary, assessmentSummary, behaviorSummary] = await Promise.all([
      this.reportingRepository.listStudentParents(student.studentId),
      this.reportingRepository.findStudentAttendanceSummary(
        student.studentId,
        activePeriod.academicYearId,
        activePeriod.semesterId
      ),
      this.reportingRepository.listStudentAssessmentSummaries(
        student.studentId,
        activePeriod.academicYearId,
        activePeriod.semesterId
      ),
      this.reportingRepository.findStudentBehaviorSummary(
        student.studentId,
        activePeriod.academicYearId,
        activePeriod.semesterId
      )
    ]);

    return toStudentProfileResponseDto(
      student,
      parents,
      attendanceSummary,
      behaviorSummary,
      assessmentSummary
    );
  }

  private async buildStudentAttendanceReportResponse(
    activePeriod: ActivePeriodRow,
    student: ReportingStudentRow
  ): Promise<ReportingStudentAttendanceReportResponseDto> {
    const summary = await this.reportingRepository.findStudentAttendanceSummary(
      student.studentId,
      activePeriod.academicYearId,
      activePeriod.semesterId
    );

    return toStudentAttendanceReportResponseDto(student, summary);
  }

  private async buildStudentAssessmentReportResponse(
    activePeriod: ActivePeriodRow,
    student: ReportingStudentRow
  ): Promise<ReportingStudentAssessmentReportResponseDto> {
    const summaryRows = await this.reportingRepository.listStudentAssessmentSummaries(
      student.studentId,
      activePeriod.academicYearId,
      activePeriod.semesterId
    );

    return toStudentAssessmentReportResponseDto(student, summaryRows);
  }

  private async buildStudentBehaviorReportResponse(
    activePeriod: ActivePeriodRow,
    student: ReportingStudentRow
  ): Promise<ReportingStudentBehaviorReportResponseDto> {
    const summary = await this.reportingRepository.findStudentBehaviorSummary(
      student.studentId,
      activePeriod.academicYearId,
      activePeriod.semesterId
    );

    return toStudentBehaviorReportResponseDto(student, summary);
  }

  private async buildParentDashboardResponse(
    activePeriod: ActivePeriodRow,
    parent: ParentProfile,
    parentUserId: string
  ): Promise<ReportingParentDashboardResponseDto> {
    const children = await this.reportingRepository.listChildrenForParent(parent.parentId);

    const childDtos = await Promise.all(
      children.map(async (child) => {
        const [attendanceSummary, assessmentSummary, behaviorSummary] = await Promise.all([
          this.reportingRepository.findStudentAttendanceSummary(
            child.studentId,
            activePeriod.academicYearId,
            activePeriod.semesterId
          ),
          this.reportingRepository.listStudentAssessmentSummaries(
            child.studentId,
            activePeriod.academicYearId,
            activePeriod.semesterId
          ),
          this.reportingRepository.findStudentBehaviorSummary(
            child.studentId,
            activePeriod.academicYearId,
            activePeriod.semesterId
          )
        ]);

        return toParentChildDto(child, attendanceSummary, behaviorSummary, assessmentSummary);
      })
    );

    const [notifications, notificationSummary] = await Promise.all([
      this.reportingRepository.listLatestNotificationsByUserId(parentUserId, RECENT_LIMIT),
      this.reportingRepository.findNotificationSummaryByUserId(parentUserId)
    ]);

    return toParentDashboardResponseDto(
      parent,
      childDtos,
      notifications,
      notificationSummary ? Number(notificationSummary.unreadNotifications) : 0
    );
  }

  private async buildTeacherDashboardResponse(
    activePeriod: ActivePeriodRow,
    teacher: TeacherProfile
  ): Promise<ReportingTeacherDashboardResponseDto> {
    const [assignments, recentAttendanceSessions, recentAssessments, recentBehaviorRecords] =
      await Promise.all([
        this.reportingRepository.listTeacherAssignments(
          teacher.teacherId,
          activePeriod.academicYearId
        ),
        this.reportingRepository.listRecentTeacherAttendanceSessions(
          teacher.teacherId,
          activePeriod.academicYearId,
          activePeriod.semesterId,
          RECENT_LIMIT
        ),
        this.reportingRepository.listRecentTeacherAssessments(
          teacher.teacherId,
          activePeriod.academicYearId,
          activePeriod.semesterId,
          RECENT_LIMIT
        ),
        this.reportingRepository.listRecentTeacherBehaviorRecords(
          teacher.teacherId,
          activePeriod.academicYearId,
          activePeriod.semesterId,
          RECENT_LIMIT
        )
      ]);

    return toTeacherDashboardResponseDto(
      teacher,
      assignments,
      recentAttendanceSessions,
      recentAssessments,
      recentBehaviorRecords
    );
  }

  private async buildSupervisorDashboardResponse(
    activePeriod: ActivePeriodRow,
    supervisor: SupervisorProfile
  ): Promise<ReportingSupervisorDashboardResponseDto> {
    const [assignments, students, recentBehaviorRecords] = await Promise.all([
      this.reportingRepository.listSupervisorAssignments(
        supervisor.supervisorId,
        activePeriod.academicYearId
      ),
      this.reportingRepository.listStudentsForSupervisor(
        supervisor.supervisorId,
        activePeriod.academicYearId
      ),
      this.reportingRepository.listRecentSupervisorBehaviorRecords(
        supervisor.supervisorId,
        activePeriod.academicYearId,
        activePeriod.semesterId,
        RECENT_LIMIT
      )
    ]);

    const studentSummaries = await Promise.all(
      students.map(async (student) => {
        const [attendanceSummary, assessmentSummary, behaviorSummary] = await Promise.all([
          this.reportingRepository.findStudentAttendanceSummary(
            student.studentId,
            activePeriod.academicYearId,
            activePeriod.semesterId
          ),
          this.reportingRepository.listStudentAssessmentSummaries(
            student.studentId,
            activePeriod.academicYearId,
            activePeriod.semesterId
          ),
          this.reportingRepository.findStudentBehaviorSummary(
            student.studentId,
            activePeriod.academicYearId,
            activePeriod.semesterId
          )
        ]);

        return {
          student: toReportingStudentDto(student),
          attendanceSummary: toAttendanceSummaryDto(attendanceSummary),
          behaviorSummary: toBehaviorSummaryDto(behaviorSummary),
          assessmentSummary: toAssessmentSummaryDto(assessmentSummary)
        };
      })
    );

    return {
      supervisor: {
        supervisorId: supervisor.supervisorId,
        userId: supervisor.userId,
        fullName: supervisor.fullName,
        email: supervisor.email,
        phone: supervisor.phone,
        department: supervisor.department
      },
      assignments: assignments.map((assignment) => ({
        supervisorClassId: assignment.supervisorClassId,
        class: {
          id: assignment.classId,
          className: assignment.className,
          section: assignment.section,
          gradeLevel: {
            id: assignment.gradeLevelId,
            name: assignment.gradeLevelName
          },
          academicYear: {
            id: assignment.academicYearId,
            name: assignment.academicYearName
          }
        },
        academicYear: {
          id: assignment.academicYearId,
          name: assignment.academicYearName
        },
        createdAt: toIsoString(assignment.createdAt)
      })),
      studentSummaries,
      recentBehaviorRecords: recentBehaviorRecords.map((row) =>
        toRecentBehaviorRecordDto(row)
      )
    };
  }

  private async buildParentTransportLiveStatusResponse(
    student: ReportingStudentRow
  ): Promise<ReportingParentTransportLiveStatusResponseDto> {
    const assignment = await this.reportingRepository.findActiveStudentTransportAssignmentByStudentId(
      student.studentId
    );

    if (!assignment) {
      return {
        student: toReportingStudentDto(student),
        assignment: null,
        activeTrip: null
      };
    }

    const activeTrip = await this.reportingRepository.findActiveTripByRouteId(assignment.routeId);

    if (!activeTrip) {
      return {
        student: toReportingStudentDto(student),
        assignment: {
          assignmentId: assignment.assignmentId,
          route: {
            routeId: assignment.routeId,
            routeName: assignment.routeName
          },
          stop: {
            stopId: assignment.stopId,
            stopName: assignment.stopName
          },
          startDate: toDateOnly(assignment.startDate),
          endDate: assignment.endDate ? toDateOnly(assignment.endDate) : null,
          isActive: assignment.isActive
        },
        activeTrip: null
      };
    }

    const latestEvents = await this.reportingRepository.listLatestTripEventsByTripIdForStudent(
      activeTrip.tripId,
      student.studentId,
      TRIP_EVENT_LIMIT
    );

    return {
      student: toReportingStudentDto(student),
      assignment: {
        assignmentId: assignment.assignmentId,
        route: {
          routeId: assignment.routeId,
          routeName: assignment.routeName
        },
        stop: {
          stopId: assignment.stopId,
          stopName: assignment.stopName
        },
        startDate: toDateOnly(assignment.startDate),
        endDate: assignment.endDate ? toDateOnly(assignment.endDate) : null,
        isActive: assignment.isActive
      },
      activeTrip: {
        tripId: activeTrip.tripId,
        tripDate: toDateOnly(activeTrip.tripDate),
        tripType: activeTrip.tripType,
        tripStatus: activeTrip.tripStatus,
        bus: {
          busId: activeTrip.busId,
          plateNumber: activeTrip.plateNumber
        },
        driver: {
          driverId: activeTrip.driverId,
          fullName: activeTrip.driverName
        },
        latestLocation:
          activeTrip.latitude !== null && activeTrip.longitude !== null && activeTrip.lastLocationAt
            ? {
                latitude: Number(activeTrip.latitude),
                longitude: Number(activeTrip.longitude),
                recordedAt: toIsoString(activeTrip.lastLocationAt)
              }
            : null,
        latestEvents: latestEvents.map((event) => toTripEventDto(event))
      }
    };
  }

  private async requireParentProfileByUserId(
    parentUserId: string,
    label: string
  ): Promise<ParentProfile> {
    return assertFound(
      await this.profileResolutionService.findParentProfileByUserId(parentUserId),
      label
    );
  }

  private async requireTeacherProfileByUserId(
    teacherUserId: string,
    label: string
  ): Promise<TeacherProfile> {
    return assertFound(
      await this.profileResolutionService.findTeacherProfileByUserId(teacherUserId),
      label
    );
  }

  private async requireSupervisorProfileByUserId(
    supervisorUserId: string,
    label: string
  ): Promise<SupervisorProfile> {
    return assertFound(
      await this.profileResolutionService.findSupervisorProfileByUserId(supervisorUserId),
      label
    );
  }

  private async getLinkedStudentForAdminPreviewParent(
    parentUserId: string,
    studentId: string
  ): Promise<ReportingStudentRow> {
    const parent = await this.requireParentProfileByUserId(parentUserId, "Parent");
    const children = await this.reportingRepository.listChildrenForParent(parent.parentId);
    const student = children.find((child) => child.studentId === studentId);

    if (!student) {
      throw new NotFoundError("Student not linked to parent");
    }

    return student;
  }

  private async requireActivePeriod(): Promise<ActivePeriodRow> {
    return assertFound(
      await this.reportingRepository.findActivePeriod(),
      "Active academic period"
    );
  }

  private assertRole(authUser: AuthenticatedUser, role: AuthenticatedUser["role"]): void {
    if (authUser.role !== role) {
      throw new ForbiddenError("You do not have permission to access reporting");
    }
  }

  private async getAccessibleStudentForStaff(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<{ activePeriod: ActivePeriodRow; student: ReportingStudentRow }> {
    const activePeriod = await this.requireActivePeriod();
    const student = assertFound(
      await this.reportingRepository.findStudentById(studentId),
      "Student"
    );

    await this.assertStaffStudentAccess(authUser, student, activePeriod);

    return { activePeriod, student };
  }

  private async getAccessibleStudentForParent(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<{ activePeriod: ActivePeriodRow; student: ReportingStudentRow }> {
    const activePeriod = await this.requireActivePeriod();
    const student = await this.getAccessibleStudentForParentOnly(authUser, studentId);

    return { activePeriod, student };
  }

  private async getAccessibleStudentForParentOnly(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<ReportingStudentRow> {
    this.assertRole(authUser, "parent");
    const parent = assertFound(
      await this.profileResolutionService.findParentProfileByUserId(authUser.userId),
      "Parent profile"
    );
    const student = assertFound(
      await this.reportingRepository.findStudentById(studentId),
      "Student"
    );

    await this.ownershipService.assertParentOwnsStudent(parent.parentId, studentId);

    return student;
  }

  private async assertStaffStudentAccess(
    authUser: AuthenticatedUser,
    student: ReportingStudentRow,
    activePeriod: ActivePeriodRow
  ): Promise<void> {
    if (authUser.role === "admin") {
      return;
    }

    if (authUser.role === "teacher") {
      const teacher = assertFound(
        await this.profileResolutionService.findTeacherProfileByUserId(authUser.userId),
        "Teacher profile"
      );

      await this.ownershipService.assertTeacherAssignedToClassYear(
        teacher.teacherId,
        student.classId,
        activePeriod.academicYearId
      );
      return;
    }

    if (authUser.role === "supervisor") {
      const supervisor = assertFound(
        await this.profileResolutionService.findSupervisorProfileByUserId(authUser.userId),
        "Supervisor profile"
      );

      await this.ownershipService.assertSupervisorAssignedToClassYear(
        supervisor.supervisorId,
        student.classId,
        activePeriod.academicYearId
      );
      return;
    }

    throw new ForbiddenError("You do not have permission to access student reporting");
  }

  private async buildTransportTripDtos(
    activeTrips: Awaited<ReturnType<ReportingRepository["listActiveTrips"]>>
  ) {
    const tripIds = activeTrips.map((trip) => trip.tripId);
    const events = await this.reportingRepository.listLatestTripEventsByTripIds(
      tripIds,
      TRIP_EVENT_LIMIT
    );
    const eventsByTripId = new Map<string, typeof events>();

    for (const event of events) {
      const tripEvents = eventsByTripId.get(event.tripId) ?? [];
      tripEvents.push(event);
      eventsByTripId.set(event.tripId, tripEvents);
    }

    return activeTrips.map((trip) =>
      toTransportTripDto(trip, eventsByTripId.get(trip.tripId) ?? [])
    );
  }
}

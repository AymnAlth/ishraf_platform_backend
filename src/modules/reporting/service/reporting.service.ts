import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ActiveAcademicContextService } from "../../../common/services/active-academic-context.service";
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
  ReportingStudentRow,
  StudentProfileAssessmentSubjectSnapshotRow,
  StudentProfileSummarySnapshotByStudentRow,
  StudentProfileSummarySnapshotRow,
  StudentAssessmentSummaryRow,
  StudentAttendanceSummaryRow,
  StudentBehaviorSummaryRow
} from "../types/reporting.types";
import type {
  ParentProfile,
  SupervisorProfile,
  TeacherProfile
} from "../../../common/types/profile.types";
import type { TransportEtaReadServicePort } from "../../transport/service/transport-eta.service";

const RECENT_LIMIT = 5;
const TRIP_EVENT_LIMIT = 5;

const assertFound = <T>(value: T | null, label: string): T => {
  if (!value) {
    throw new NotFoundError(`${label} not found`);
  }

  return value;
};

const toIsoString = (value: Date): string => value.toISOString();

type StudentSummaryMaps = {
  attendanceByStudentId: Map<string, StudentAttendanceSummaryRow>;
  assessmentByStudentId: Map<string, StudentAssessmentSummaryRow[]>;
  behaviorByStudentId: Map<string, StudentBehaviorSummaryRow>;
};

export class ReportingService {
  constructor(
    private readonly reportingRepository: ReportingRepository,
    private readonly profileResolutionService = new ProfileResolutionService(),
    private readonly activeAcademicContextService: ActiveAcademicContextService = new ActiveAcademicContextService(),
    private readonly transportEtaService: TransportEtaReadServicePort | null = null
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
    const [parents, summarySnapshot] = await Promise.all([
      this.reportingRepository.listStudentParents(student.studentId),
      this.reportingRepository.findStudentProfileSummarySnapshot(
        student.studentId,
        activePeriod.academicYearId,
        activePeriod.semesterId
      )
    ]);

    return toStudentProfileResponseDto(
      student,
      parents,
      this.buildStudentProfileAttendanceSummary(student, activePeriod, summarySnapshot),
      this.buildStudentProfileBehaviorSummary(student, activePeriod, summarySnapshot),
      this.buildStudentProfileAssessmentSummaries(student, activePeriod, summarySnapshot)
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

  private buildStudentProfileAttendanceSummary(
    student: ReportingStudentRow,
    activePeriod: ActivePeriodRow,
    snapshot: StudentProfileSummarySnapshotRow | null
  ): StudentAttendanceSummaryRow {
    return {
      studentId: student.studentId,
      academicNo: student.academicNo,
      studentName: student.fullName,
      classId: student.classId,
      className: student.className,
      section: student.section,
      academicYearId: activePeriod.academicYearId,
      academicYearName: activePeriod.academicYearName,
      semesterId: activePeriod.semesterId,
      semesterName: activePeriod.semesterName,
      totalSessions: snapshot?.totalSessions ?? 0,
      presentCount: snapshot?.presentCount ?? 0,
      absentCount: snapshot?.absentCount ?? 0,
      lateCount: snapshot?.lateCount ?? 0,
      excusedCount: snapshot?.excusedCount ?? 0,
      attendancePercentage: snapshot?.attendancePercentage ?? 0
    };
  }

  private buildStudentProfileBehaviorSummary(
    student: ReportingStudentRow,
    activePeriod: ActivePeriodRow,
    snapshot: StudentProfileSummarySnapshotRow | null
  ): StudentBehaviorSummaryRow {
    return {
      studentId: student.studentId,
      academicNo: student.academicNo,
      studentName: student.fullName,
      academicYearId: activePeriod.academicYearId,
      academicYearName: activePeriod.academicYearName,
      semesterId: activePeriod.semesterId,
      semesterName: activePeriod.semesterName,
      totalBehaviorRecords: snapshot?.totalBehaviorRecords ?? 0,
      positiveCount: snapshot?.positiveCount ?? 0,
      negativeCount: snapshot?.negativeCount ?? 0,
      negativeSeverityTotal: snapshot?.negativeSeverityTotal ?? 0
    };
  }

  private buildStudentProfileAssessmentSummaries(
    student: ReportingStudentRow,
    activePeriod: ActivePeriodRow,
    snapshot: StudentProfileSummarySnapshotRow | null
  ): StudentAssessmentSummaryRow[] {
    return this.parseStudentProfileAssessmentSubjects(snapshot?.assessmentSubjects).map(
      (subject) => ({
        studentId: student.studentId,
        academicNo: student.academicNo,
        studentName: student.fullName,
        classId: student.classId,
        className: student.className,
        section: student.section,
        academicYearId: activePeriod.academicYearId,
        academicYearName: activePeriod.academicYearName,
        semesterId: activePeriod.semesterId,
        semesterName: activePeriod.semesterName,
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        totalAssessments: subject.totalAssessments,
        totalScore: subject.totalScore,
        totalMaxScore: subject.totalMaxScore,
        overallPercentage: subject.overallPercentage
      })
    );
  }

  private parseStudentProfileAssessmentSubjects(
    value: StudentProfileSummarySnapshotRow["assessmentSubjects"] | undefined
  ): StudentProfileAssessmentSubjectSnapshotRow[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((subject) => {
      if (!subject || typeof subject !== "object") {
        return [];
      }

      const candidate = subject as Partial<StudentProfileAssessmentSubjectSnapshotRow>;

      if (!candidate.subjectId || !candidate.subjectName) {
        return [];
      }

      return [
        {
          subjectId: String(candidate.subjectId),
          subjectName: String(candidate.subjectName),
          totalAssessments: candidate.totalAssessments ?? 0,
          totalScore: candidate.totalScore ?? 0,
          totalMaxScore: candidate.totalMaxScore ?? 0,
          overallPercentage: candidate.overallPercentage ?? 0
        }
      ];
    });
  }

  private async buildParentDashboardResponse(
    activePeriod: ActivePeriodRow,
    parent: ParentProfile,
    parentUserId: string
  ): Promise<ReportingParentDashboardResponseDto> {
    const children = await this.reportingRepository.listChildrenForParent(parent.parentId);
    const summaryMaps = await this.buildStudentSummaryMaps(activePeriod, children);

    const childDtos = children.map((child) =>
      toParentChildDto(
        child,
        summaryMaps.attendanceByStudentId.get(child.studentId) ?? null,
        summaryMaps.behaviorByStudentId.get(child.studentId) ?? null,
        summaryMaps.assessmentByStudentId.get(child.studentId) ?? []
      )
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
          activePeriod.academicYearName,
          activePeriod.semesterName,
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
    const summaryMaps = await this.buildStudentSummaryMaps(activePeriod, students);

    const studentSummaries = students.map((student) => ({
      student: toReportingStudentDto(student),
      attendanceSummary: toAttendanceSummaryDto(
        summaryMaps.attendanceByStudentId.get(student.studentId) ?? null
      ),
      behaviorSummary: toBehaviorSummaryDto(
        summaryMaps.behaviorByStudentId.get(student.studentId) ?? null
      ),
      assessmentSummary: toAssessmentSummaryDto(
        summaryMaps.assessmentByStudentId.get(student.studentId) ?? []
      )
    }));

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
    const etaReadModel = this.transportEtaService
      ? await this.transportEtaService.getTripEtaReadModel(activeTrip.tripId)
      : null;
    const stopEta = etaReadModel?.remainingStops.find((stop) => stop.stopId === assignment.stopId) ?? null;
    const latestStudentEvent = latestEvents[0] ?? null;
    const eta =
      latestStudentEvent !== null
        ? {
            status: "completed" as const,
            calculationMode: etaReadModel?.etaSummary?.calculationMode ?? null,
            targetStop: {
              stopId: assignment.stopId,
              stopName: assignment.stopName
            },
            etaAt: null,
            remainingDurationSeconds: 0,
            remainingDistanceMeters: 0,
            computedAt: etaReadModel?.computedAt ? etaReadModel.computedAt.toISOString() : null,
            isStale: etaReadModel?.etaSummary?.isStale ?? false
          }
        : etaReadModel
          ? {
              status:
                stopEta && !stopEta.isCompleted
                  ? etaReadModel.etaSummary?.status ?? "unavailable"
                  : "unavailable",
              calculationMode: etaReadModel.etaSummary?.calculationMode ?? null,
              targetStop: {
                stopId: assignment.stopId,
                stopName: assignment.stopName
              },
              etaAt: stopEta && !stopEta.isCompleted && stopEta.etaAt ? stopEta.etaAt.toISOString() : null,
              remainingDurationSeconds:
                stopEta && !stopEta.isCompleted ? stopEta.remainingDurationSeconds : null,
              remainingDistanceMeters:
                stopEta && !stopEta.isCompleted ? stopEta.remainingDistanceMeters : null,
              computedAt: etaReadModel.computedAt ? etaReadModel.computedAt.toISOString() : null,
              isStale: etaReadModel.etaSummary?.isStale ?? true
            }
          : null;

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
        eta,
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
    const activeContext = await this.activeAcademicContextService.requireActiveContext();

    return {
      academicYearId: activeContext.academicYearId,
      academicYearName: activeContext.academicYearName,
      semesterId: activeContext.semesterId,
      semesterName: activeContext.semesterName
    };
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
    if (authUser.role === "admin") {
      const student = assertFound(
        await this.reportingRepository.findStudentById(studentId),
        "Student"
      );

      return { activePeriod, student };
    }

    if (authUser.role === "teacher") {
      const teacher = assertFound(
        await this.profileResolutionService.findTeacherProfileByUserId(authUser.userId),
        "Teacher profile"
      );
      const student = await this.reportingRepository.findStudentByIdForTeacher(
        teacher.teacherId,
        studentId,
        activePeriod.academicYearId
      );

      if (student) {
        return { activePeriod, student };
      }

      await this.resolveMissingAccessibleStudent(
        studentId,
        "You do not have permission to access this teacher-assigned resource"
      );
    }

    if (authUser.role === "supervisor") {
      const supervisor = assertFound(
        await this.profileResolutionService.findSupervisorProfileByUserId(authUser.userId),
        "Supervisor profile"
      );
      const student = await this.reportingRepository.findStudentByIdForSupervisor(
        supervisor.supervisorId,
        studentId,
        activePeriod.academicYearId
      );

      if (student) {
        return { activePeriod, student };
      }

      await this.resolveMissingAccessibleStudent(
        studentId,
        "You do not have permission to access this supervisor-assigned resource"
      );
    }

    throw new ForbiddenError("You do not have permission to access student reporting");
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
    const student = await this.reportingRepository.findStudentByIdForParent(
      parent.parentId,
      studentId
    );

    if (student) {
      return student;
    }

    return this.resolveMissingAccessibleStudent(
      studentId,
      "You do not have permission to access this student"
    );
  }

  private async resolveMissingAccessibleStudent(
    studentId: string,
    forbiddenMessage: string
  ): Promise<never> {
    const student = await this.reportingRepository.findStudentById(studentId);

    if (!student) {
      throw new NotFoundError("Student not found");
    }

    throw new ForbiddenError(forbiddenMessage);
  }

  private async buildTransportTripDtos(
    activeTrips: Awaited<ReturnType<ReportingRepository["listActiveTrips"]>>
  ) {
    const tripIds = activeTrips.map((trip) => trip.tripId);
    const [events, etaReadModels] = await Promise.all([
      this.reportingRepository.listLatestTripEventsByTripIds(tripIds, TRIP_EVENT_LIMIT),
      this.transportEtaService
        ? Promise.all(
            tripIds.map(async (tripId) => [tripId, await this.transportEtaService!.getTripEtaReadModel(tripId)] as const)
          )
        : Promise.resolve([] as const)
    ]);
    const eventsByTripId = new Map<string, typeof events>();
    const etaByTripId = new Map(etaReadModels);

    for (const event of events) {
      const tripEvents = eventsByTripId.get(event.tripId) ?? [];
      tripEvents.push(event);
      eventsByTripId.set(event.tripId, tripEvents);
    }

    return activeTrips.map((trip) =>
      toTransportTripDto(
        trip,
        eventsByTripId.get(trip.tripId) ?? [],
        etaByTripId.get(trip.tripId) ?? null
      )
    );
  }

  private async buildStudentSummaryMaps(
    activePeriod: ActivePeriodRow,
    students: ReportingStudentRow[]
  ): Promise<StudentSummaryMaps> {
    if (students.length === 0) {
      return {
        attendanceByStudentId: new Map(),
        assessmentByStudentId: new Map(),
        behaviorByStudentId: new Map()
      };
    }

    const studentIds = students.map((student) => student.studentId);
    const snapshots = await this.reportingRepository.listStudentProfileSummarySnapshotsByStudentIds(
      studentIds,
      activePeriod.academicYearId,
      activePeriod.semesterId
    );
    const snapshotsByStudentId = new Map<string, StudentProfileSummarySnapshotByStudentRow>(
      snapshots.map((row) => [row.studentId, row] as const)
    );

    const attendanceByStudentId = new Map<string, StudentAttendanceSummaryRow>();
    const behaviorByStudentId = new Map<string, StudentBehaviorSummaryRow>();
    const assessmentByStudentId = new Map<string, StudentAssessmentSummaryRow[]>();

    for (const student of students) {
      const snapshot = snapshotsByStudentId.get(student.studentId) ?? null;

      attendanceByStudentId.set(
        student.studentId,
        this.buildStudentProfileAttendanceSummary(student, activePeriod, snapshot)
      );
      behaviorByStudentId.set(
        student.studentId,
        this.buildStudentProfileBehaviorSummary(student, activePeriod, snapshot)
      );

      const assessmentRows = this.buildStudentProfileAssessmentSummaries(
        student,
        activePeriod,
        snapshot
      );

      if (assessmentRows.length > 0) {
        assessmentByStudentId.set(student.studentId, assessmentRows);
      }
    }

    return {
      attendanceByStudentId,
      assessmentByStudentId,
      behaviorByStudentId
    };
  }
}

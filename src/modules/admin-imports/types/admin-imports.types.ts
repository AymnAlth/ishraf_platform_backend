import type {
  SchoolOnboardingImportMode,
  SchoolOnboardingImportStatus,
  SchoolOnboardingSheetId
} from "../school-onboarding.constants";

export interface SchoolOnboardingImportRunRow {
  id: string;
  mode: SchoolOnboardingImportMode;
  status: SchoolOnboardingImportStatus;
  templateVersion: string;
  fileName: string;
  fileHash: string;
  fileSize: number | null;
  submittedByUserId: string;
  submittedByFullName: string;
  payloadJson: unknown;
  resultJson: unknown;
  summaryJson: unknown;
  issuesJson: unknown;
  entityCountsJson: unknown;
  resolvedReferenceCountsJson: unknown;
  dryRunSourceId: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolOnboardingReferenceUserRow {
  profileId: string;
  userId: string;
  role: "teacher" | "supervisor" | "parent" | "driver";
  fullName: string;
  email: string | null;
  phone: string | null;
  licenseNumber: string | null;
}

export interface SchoolOnboardingReferenceAcademicYearRow {
  id: string;
  name: string;
}

export interface SchoolOnboardingReferenceSemesterRow {
  id: string;
  academicYearId: string;
  academicYearName: string;
  name: string;
}

export interface SchoolOnboardingReferenceGradeLevelRow {
  id: string;
  name: string;
  levelOrder: number;
}

export interface SchoolOnboardingReferenceClassRow {
  id: string;
  academicYearId: string;
  academicYearName: string;
  gradeLevelId: string;
  gradeLevelName: string;
  className: string;
  section: string;
}

export interface SchoolOnboardingReferenceSubjectRow {
  id: string;
  gradeLevelId: string;
  gradeLevelName: string;
  code: string | null;
  name: string;
}

export interface SchoolOnboardingReferenceStudentRow {
  id: string;
  academicNo: string;
  fullName: string;
  classId: string;
}

export interface SchoolOnboardingReferenceStudentParentLinkRow {
  studentId: string;
  academicNo: string;
  parentId: string;
  parentUserId: string;
  isPrimary: boolean;
}

export interface SchoolOnboardingReferenceStudentEnrollmentRow {
  id: string;
  studentId: string;
  academicNo: string;
  academicYearId: string;
  academicYearName: string;
  classId: string;
}

export interface SchoolOnboardingReferenceSubjectOfferingRow {
  id: string;
  subjectId: string;
  semesterId: string;
}

export interface SchoolOnboardingReferenceTeacherAssignmentRow {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
}

export interface SchoolOnboardingReferenceSupervisorAssignmentRow {
  id: string;
  supervisorId: string;
  classId: string;
  academicYearId: string;
}

export interface SchoolOnboardingReferenceBusRow {
  id: string;
  plateNumber: string;
}

export interface SchoolOnboardingReferenceRouteRow {
  id: string;
  routeName: string;
}

export interface SchoolOnboardingReferenceRouteStopRow {
  stopId: string;
  routeId: string;
  routeName: string;
  stopOrder: number;
}

export interface SchoolOnboardingReferenceRouteAssignmentRow {
  routeAssignmentId: string;
  busId: string;
  routeId: string;
  startDate: Date | string;
  endDate: Date | string | null;
  isActive: boolean;
}

export interface SchoolOnboardingReferenceStudentTransportAssignmentRow {
  assignmentId: string;
  studentId: string;
  academicNo: string;
  routeId: string;
  stopId: string;
  startDate: Date | string;
  endDate: Date | string | null;
  isActive: boolean;
}

export interface SchoolOnboardingReferenceStudentHomeLocationRow {
  studentId: string;
  academicNo: string;
}

export interface SchoolOnboardingReferenceSnapshot {
  academicYears: SchoolOnboardingReferenceAcademicYearRow[];
  semesters: SchoolOnboardingReferenceSemesterRow[];
  gradeLevels: SchoolOnboardingReferenceGradeLevelRow[];
  classes: SchoolOnboardingReferenceClassRow[];
  subjects: SchoolOnboardingReferenceSubjectRow[];
  users: SchoolOnboardingReferenceUserRow[];
  students: SchoolOnboardingReferenceStudentRow[];
  studentParentLinks: SchoolOnboardingReferenceStudentParentLinkRow[];
  studentEnrollments: SchoolOnboardingReferenceStudentEnrollmentRow[];
  subjectOfferings: SchoolOnboardingReferenceSubjectOfferingRow[];
  teacherAssignments: SchoolOnboardingReferenceTeacherAssignmentRow[];
  supervisorAssignments: SchoolOnboardingReferenceSupervisorAssignmentRow[];
  buses: SchoolOnboardingReferenceBusRow[];
  routes: SchoolOnboardingReferenceRouteRow[];
  routeStops: SchoolOnboardingReferenceRouteStopRow[];
  routeAssignments: SchoolOnboardingReferenceRouteAssignmentRow[];
  studentTransportAssignments: SchoolOnboardingReferenceStudentTransportAssignmentRow[];
  studentHomeLocations: SchoolOnboardingReferenceStudentHomeLocationRow[];
}

export interface SchoolOnboardingSheetRuntimeSummary {
  sheetId: SchoolOnboardingSheetId;
  rowCount: number;
  errorCount: number;
  warningCount: number;
  present: boolean;
}

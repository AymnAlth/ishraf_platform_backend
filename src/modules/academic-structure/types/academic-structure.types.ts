export interface AcademicYearRow {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SemesterRow {
  id: string;
  academicYearId: string;
  academicYearName: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeLevelRow {
  id: string;
  name: string;
  levelOrder: number;
  createdAt: Date;
}

export interface ClassRow {
  id: string;
  className: string;
  section: string;
  capacity: number | null;
  isActive: boolean;
  academicYearId: string;
  academicYearName: string;
  gradeLevelId: string;
  gradeLevelName: string;
  gradeLevelOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  gradeLevelId: string;
  gradeLevelName: string;
  gradeLevelOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubjectOfferingRow {
  id: string;
  isActive: boolean;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  subjectIsActive: boolean;
  subjectGradeLevelId: string;
  subjectGradeLevelName: string;
  subjectGradeLevelOrder: number;
  semesterId: string;
  semesterName: string;
  semesterStartDate: Date;
  semesterEndDate: Date;
  semesterIsActive: boolean;
  academicYearId: string;
  academicYearName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherSummaryRow {
  teacherId: string;
  teacherUserId: string;
  teacherFullName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
}

export interface SupervisorSummaryRow {
  supervisorId: string;
  supervisorUserId: string;
  supervisorFullName: string;
  supervisorEmail: string | null;
  supervisorPhone: string | null;
}

export interface TeacherAssignmentRow {
  id: string;
  academicYearId: string;
  academicYearName: string;
  classId: string;
  className: string;
  classSection: string;
  classIsActive: boolean;
  classAcademicYearId: string;
  classGradeLevelId: string;
  classGradeLevelName: string;
  classGradeLevelOrder: number;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  subjectIsActive: boolean;
  subjectGradeLevelId: string;
  teacherId: string;
  teacherUserId: string;
  teacherFullName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
  createdAt: Date;
}

export interface SupervisorAssignmentRow {
  id: string;
  academicYearId: string;
  academicYearName: string;
  classId: string;
  className: string;
  classSection: string;
  classIsActive: boolean;
  classAcademicYearId: string;
  classGradeLevelId: string;
  classGradeLevelName: string;
  classGradeLevelOrder: number;
  supervisorId: string;
  supervisorUserId: string;
  supervisorFullName: string;
  supervisorEmail: string | null;
  supervisorPhone: string | null;
  createdAt: Date;
}

export interface AcademicYearWriteInput {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface AcademicYearUpdateInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface SemesterWriteInput {
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface SemesterUpdateInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface GradeLevelWriteInput {
  name: string;
  levelOrder: number;
}

export interface ClassWriteInput {
  gradeLevelId: string;
  academicYearId: string;
  className: string;
  section: string;
  capacity: number | null;
  isActive: boolean;
}

export interface SubjectWriteInput {
  name: string;
  gradeLevelId: string;
  code: string | null;
  isActive: boolean;
}

export interface SubjectOfferingWriteInput {
  subjectId: string;
  semesterId: string;
  isActive: boolean;
}

export interface SubjectOfferingUpdateInput {
  isActive?: boolean;
}

export interface SubjectOfferingFilters {
  academicYearId?: string;
  semesterId?: string;
  gradeLevelId?: string;
  subjectId?: string;
  isActive?: boolean;
}

export interface TeacherAssignmentWriteInput {
  teacherId: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
}

export interface SupervisorAssignmentWriteInput {
  supervisorId: string;
  classId: string;
  academicYearId: string;
}

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import { ValidationError } from "../../src/common/errors/validation-error";
import { db } from "../../src/database/db";
import { AttendanceService } from "../../src/modules/attendance/service/attendance.service";
import type { AttendanceRepository } from "../../src/modules/attendance/repository/attendance.repository";
import type { AutomationPort } from "../../src/modules/automation/types/automation.types";
import type {
  AttendanceRecordRow,
  AttendanceSessionRow,
  AttendanceSessionStudentRow,
  ClassReferenceRow,
  SemesterReferenceRow,
  SubjectReferenceRow,
  TeacherProfileRow
} from "../../src/modules/attendance/types/attendance.types";

const teacherProfile = (overrides: Partial<TeacherProfileRow> = {}): TeacherProfileRow => ({
  teacherId: "1",
  teacherUserId: "1002",
  teacherFullName: "Sara Teacher",
  teacherEmail: "teacher@example.com",
  teacherPhone: "700000003",
  ...overrides
});

const classRow = (overrides: Partial<ClassReferenceRow> = {}): ClassReferenceRow => ({
  id: "1",
  className: "A",
  section: "A",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  academicYearId: "1",
  academicYearName: "2025-2026",
  ...overrides
});

const subjectRow = (overrides: Partial<SubjectReferenceRow> = {}): SubjectReferenceRow => ({
  id: "1",
  name: "Science",
  code: "SCI-G1",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  ...overrides
});

const semesterRow = (overrides: Partial<SemesterReferenceRow> = {}): SemesterReferenceRow => ({
  id: "2",
  name: "Semester 2",
  academicYearId: "1",
  ...overrides
});

const sessionRow = (overrides: Partial<AttendanceSessionRow> = {}): AttendanceSessionRow => ({
  id: "10",
  classId: "1",
  className: "A",
  section: "A",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  subjectId: "1",
  subjectName: "Science",
  subjectCode: "SCI-G1",
  teacherId: "1",
  teacherUserId: "1002",
  teacherFullName: "Sara Teacher",
  teacherEmail: "teacher@example.com",
  teacherPhone: "700000003",
  academicYearId: "1",
  academicYearName: "2025-2026",
  semesterId: "2",
  semesterName: "Semester 2",
  sessionDate: "2026-02-16",
  periodNo: 1,
  title: "Session",
  notes: null,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  presentCount: 0,
  absentCount: 0,
  lateCount: 0,
  excusedCount: 0,
  recordedCount: 0,
  expectedCount: 2,
  ...overrides
});

const rosterStudent = (
  overrides: Partial<AttendanceSessionStudentRow> = {}
): AttendanceSessionStudentRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  studentStatus: "active",
  attendanceId: null,
  attendanceStatus: null,
  notes: null,
  recordedAt: null,
  ...overrides
});

const attendanceRecord = (
  overrides: Partial<AttendanceRecordRow> = {}
): AttendanceRecordRow => ({
  attendanceId: "100",
  attendanceSessionId: "10",
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  status: "present",
  notes: null,
  recordedAt: new Date("2026-03-13T10:00:00.000Z"),
  classId: "1",
  teacherId: "1",
  academicYearId: "1",
  ...overrides
});

describe("AttendanceService", () => {
  const repositoryMock = {
    findTeacherProfileByUserId: vi.fn(),
    findTeacherById: vi.fn(),
    findSupervisorProfileByUserId: vi.fn(),
    findClassById: vi.fn(),
    findSubjectById: vi.fn(),
    findAcademicYearById: vi.fn(),
    findSemesterById: vi.fn(),
    hasActiveSubjectOffering: vi.fn(),
    hasTeacherAssignment: vi.fn(),
    hasSupervisorAssignment: vi.fn(),
    createAttendanceSession: vi.fn(),
    listAttendanceSessions: vi.fn(),
    findAttendanceSessionById: vi.fn(),
    listAttendanceSessionStudents: vi.fn(),
    upsertAttendanceRecords: vi.fn(),
    findAttendanceRecordById: vi.fn(),
    updateAttendanceRecord: vi.fn()
  };
  const profileResolutionServiceMock = {
    requireTeacherProfileIdentifier: vi.fn(),
    requireSupervisorProfileIdentifier: vi.fn()
  };

  let attendanceService: AttendanceService;
  const automationMock = {
    onStudentAbsent: vi.fn(),
    onNegativeBehavior: vi.fn(),
    onTripStarted: vi.fn(),
    onStudentDroppedOff: vi.fn()
  };

  beforeEach(() => {
    attendanceService = new AttendanceService(
      repositoryMock as unknown as AttendanceRepository,
      profileResolutionServiceMock as never,
      undefined,
      automationMock as unknown as AutomationPort
    );

    vi.restoreAllMocks();
    vi.spyOn(db, "withTransaction").mockImplementation(async (callback) => {
      const fakeClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      return callback(fakeClient as never);
    });

    Object.values(repositoryMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(profileResolutionServiceMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(automationMock).forEach((mockFn) => mockFn.mockReset());
  });

  it("creates a session for an assigned teacher selected by teacher user id and returns joined data", async () => {
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow());
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue(semesterRow());
    vi.mocked(repositoryMock.hasActiveSubjectOffering).mockResolvedValue(true);
    vi.mocked(profileResolutionServiceMock.requireTeacherProfileIdentifier).mockResolvedValue({
      teacherId: "1",
      userId: "1002",
      fullName: "Sara Teacher",
      email: "teacher@example.com",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.hasTeacherAssignment).mockResolvedValue(true);
    vi.mocked(repositoryMock.createAttendanceSession).mockResolvedValue("10");
    vi.mocked(repositoryMock.findAttendanceSessionById).mockResolvedValue(sessionRow());

    const response = await attendanceService.createSession(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        classId: "1",
        subjectId: "1",
        teacherId: "1002",
        academicYearId: "1",
        semesterId: "2",
        sessionDate: "2026-02-16",
        periodNo: 1
      }
    );

    expect(response.id).toBe("10");
    expect(repositoryMock.createAttendanceSession).toHaveBeenCalledOnce();
  });

  it("normalizes teacher user ids in attendance list filters", async () => {
    vi.mocked(profileResolutionServiceMock.requireTeacherProfileIdentifier).mockResolvedValue({
      teacherId: "1",
      userId: "1002",
      fullName: "Sara Teacher",
      email: "teacher@example.com",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.listAttendanceSessions).mockResolvedValue({
      rows: [sessionRow()],
      totalItems: 1
    });

    const response = await attendanceService.listSessions(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        page: 1,
        limit: 20,
        sortBy: "sessionDate",
        sortOrder: "desc",
        teacherId: "1002"
      }
    );

    expect(response.items).toHaveLength(1);
    expect(repositoryMock.listAttendanceSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherId: "1"
      }),
      {}
    );
  });

  it("rejects supervisors from creating sessions", async () => {
    vi.mocked(repositoryMock.findSupervisorProfileByUserId).mockResolvedValue({
      supervisorId: "1",
      supervisorUserId: "1005",
      supervisorFullName: "Mona Supervisor",
      supervisorEmail: "supervisor@example.com",
      supervisorPhone: "700000005"
    });

    await expect(
      attendanceService.createSession(
        {
          userId: "1005",
          role: "supervisor",
          email: "supervisor@example.com",
          isActive: true
        },
        {
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-16",
          periodNo: 1
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects class and semester mismatches before inserting a session", async () => {
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(
      classRow({
        academicYearId: "2"
      })
    );
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue(
      semesterRow({
        academicYearId: "2"
      })
    );

    await expect(
      attendanceService.createSession(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-16",
          periodNo: 1
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects creating a session when the subject is not offered in the selected semester", async () => {
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow());
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue(semesterRow());
    vi.mocked(repositoryMock.hasActiveSubjectOffering).mockResolvedValue(false);

    await expect(
      attendanceService.createSession(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-16",
          periodNo: 1
        }
      )
    ).rejects.toMatchObject({
      message: "Subject is not offered in the selected semester"
    });
  });

  it("rejects attendance payloads that do not match the full active roster", async () => {
    vi.mocked(repositoryMock.findTeacherProfileByUserId).mockResolvedValue(teacherProfile());
    vi.mocked(repositoryMock.findAttendanceSessionById).mockResolvedValue(sessionRow());
    vi.mocked(repositoryMock.listAttendanceSessionStudents).mockResolvedValue([
      rosterStudent({
        studentId: "1"
      }),
      rosterStudent({
        studentId: "2",
        academicNo: "STU-1002",
        fullName: "Student Two"
      })
    ]);

    await expect(
      attendanceService.saveSessionAttendance(
        {
          userId: "1002",
          role: "teacher",
          email: "teacher@example.com",
          isActive: true
        },
        "10",
        {
          records: [
            {
              studentId: "1",
              status: "present"
            }
          ]
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("lets supervisors update attendance records for assigned classes", async () => {
    vi.mocked(repositoryMock.findSupervisorProfileByUserId).mockResolvedValue({
      supervisorId: "1",
      supervisorUserId: "1005",
      supervisorFullName: "Mona Supervisor",
      supervisorEmail: "supervisor@example.com",
      supervisorPhone: "700000005"
    });
    vi.mocked(repositoryMock.findAttendanceRecordById)
      .mockResolvedValueOnce(attendanceRecord({
        status: "late"
      }))
      .mockResolvedValueOnce(attendanceRecord({
        status: "excused",
        notes: "Documented excuse"
      }));
    vi.mocked(repositoryMock.hasSupervisorAssignment).mockResolvedValue(true);
    vi.mocked(repositoryMock.updateAttendanceRecord).mockResolvedValue(undefined);

    const response = await attendanceService.updateAttendanceRecord(
      {
        userId: "1005",
        role: "supervisor",
        email: "supervisor@example.com",
        isActive: true
      },
      "100",
      {
        status: "excused",
        notes: "Documented excuse"
      }
    );

    expect(response.status).toBe("excused");
    expect(repositoryMock.updateAttendanceRecord).toHaveBeenCalledOnce();
  });

  it("triggers absent-student automation after saving full-session attendance", async () => {
    vi.mocked(repositoryMock.findTeacherProfileByUserId).mockResolvedValue(teacherProfile());
    vi.mocked(repositoryMock.findAttendanceSessionById).mockResolvedValue(sessionRow());
    vi.mocked(repositoryMock.listAttendanceSessionStudents)
      .mockResolvedValueOnce([
        rosterStudent({
          studentId: "1"
        })
      ])
      .mockResolvedValueOnce([
        rosterStudent({
          studentId: "1",
          attendanceId: "100",
          attendanceStatus: "absent"
        })
      ]);
    vi.mocked(repositoryMock.upsertAttendanceRecords).mockResolvedValue(undefined);

    await attendanceService.saveSessionAttendance(
      {
        userId: "1002",
        role: "teacher",
        email: "teacher@example.com",
        isActive: true
      },
      "10",
      {
        records: [
          {
            studentId: "1",
            status: "absent"
          }
        ]
      }
    );

    expect(automationMock.onStudentAbsent).toHaveBeenCalledWith({
      attendanceId: "100",
      studentId: "1",
      studentName: "Student One",
      subjectName: "Science",
      sessionDate: "2026-02-16"
    });
  });

  it("triggers absent-student automation after updating a record to absent", async () => {
    vi.mocked(repositoryMock.findAttendanceRecordById)
      .mockResolvedValueOnce(
        attendanceRecord({
          status: "late",
          sessionDate: "2026-02-16",
          subjectId: "1",
          subjectName: "Science"
        })
      )
      .mockResolvedValueOnce(
        attendanceRecord({
          status: "absent",
          sessionDate: "2026-02-16",
          subjectId: "1",
          subjectName: "Science"
        })
      );
    vi.mocked(repositoryMock.updateAttendanceRecord).mockResolvedValue(undefined);

    await attendanceService.updateAttendanceRecord(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      "100",
      {
        status: "absent"
      }
    );

    expect(automationMock.onStudentAbsent).toHaveBeenCalledWith({
      attendanceId: "100",
      studentId: "1",
      studentName: "Student One",
      subjectName: "Science",
      sessionDate: "2026-02-16"
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/common/errors/validation-error";
import { db } from "../../src/database/db";
import { AcademicStructureService } from "../../src/modules/academic-structure/service/academic-structure.service";
import type { AcademicStructureRepository } from "../../src/modules/academic-structure/repository/academic-structure.repository";
import type {
  AcademicYearRow,
  ClassRow,
  SubjectOfferingRow,
  SubjectRow
} from "../../src/modules/academic-structure/types/academic-structure.types";

const academicYearRow: AcademicYearRow = {
  id: "1",
  name: "2025-2026",
  startDate: new Date("2025-09-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T00:00:00.000Z"),
  isActive: true,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z")
};

const classRow: ClassRow = {
  id: "11",
  className: "A",
  section: "A",
  capacity: 35,
  isActive: true,
  academicYearId: "1",
  academicYearName: "2025-2026",
  gradeLevelId: "2",
  gradeLevelName: "Grade 2",
  gradeLevelOrder: 2,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z")
};

const subjectRow: SubjectRow = {
  id: "7",
  name: "Science",
  code: "SCI-G2",
  isActive: true,
  gradeLevelId: "2",
  gradeLevelName: "Grade 2",
  gradeLevelOrder: 2,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z")
};

const subjectOfferingRow: SubjectOfferingRow = {
  id: "20",
  isActive: true,
  subjectId: "7",
  subjectName: "Science",
  subjectCode: "SCI-G2",
  subjectIsActive: true,
  subjectGradeLevelId: "2",
  subjectGradeLevelName: "Grade 2",
  subjectGradeLevelOrder: 2,
  semesterId: "1",
  semesterName: "Semester 1",
  semesterStartDate: new Date("2025-09-01T00:00:00.000Z"),
  semesterEndDate: new Date("2026-01-31T00:00:00.000Z"),
  semesterIsActive: true,
  academicYearId: "1",
  academicYearName: "2025-2026",
  createdAt: new Date("2026-03-27T10:00:00.000Z"),
  updatedAt: new Date("2026-03-27T10:00:00.000Z")
};

describe("AcademicStructureService", () => {
  const repositoryMock = {
    listAcademicYears: vi.fn(),
    findAcademicYearById: vi.fn(),
    createAcademicYear: vi.fn(),
    updateAcademicYear: vi.fn(),
    deactivateAllAcademicYears: vi.fn(),
    deactivateAllSemesters: vi.fn(),
    listSemestersByAcademicYear: vi.fn(),
    findSemesterById: vi.fn(),
    createSemester: vi.fn(),
    updateSemester: vi.fn(),
    listGradeLevels: vi.fn(),
    findGradeLevelById: vi.fn(),
    createGradeLevel: vi.fn(),
    listClasses: vi.fn(),
    findClassById: vi.fn(),
    createClass: vi.fn(),
    updateClass: vi.fn(),
    listSubjects: vi.fn(),
    findSubjectById: vi.fn(),
    createSubject: vi.fn(),
    updateSubject: vi.fn(),
    listSubjectOfferings: vi.fn(),
    findSubjectOfferingById: vi.fn(),
    findSubjectOfferingBySubjectAndSemester: vi.fn(),
    createSubjectOffering: vi.fn(),
    updateSubjectOffering: vi.fn(),
    findTeacherById: vi.fn(),
    findSupervisorById: vi.fn(),
    createTeacherAssignment: vi.fn(),
    listTeacherAssignments: vi.fn(),
    findTeacherAssignmentById: vi.fn(),
    updateTeacherAssignment: vi.fn(),
    createSupervisorAssignment: vi.fn(),
    listSupervisorAssignments: vi.fn(),
    findSupervisorAssignmentById: vi.fn(),
    updateSupervisorAssignment: vi.fn()
  };
  const profileResolutionServiceMock = {
    requireTeacherProfileIdentifier: vi.fn(),
    requireSupervisorProfileIdentifier: vi.fn()
  };

  let academicStructureService: AcademicStructureService;

  beforeEach(() => {
    academicStructureService = new AcademicStructureService(
      repositoryMock as unknown as AcademicStructureRepository,
      profileResolutionServiceMock as never
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
  });

  it("deactivates existing academic years before creating a new active one", async () => {
    vi.mocked(repositoryMock.deactivateAllAcademicYears).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.deactivateAllSemesters).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.createAcademicYear).mockResolvedValue("2");
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      ...academicYearRow,
      id: "2",
      name: "2026-2027"
    });

    const response = await academicStructureService.createAcademicYear({
      name: "2026-2027",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
      isActive: true
    });

    expect(response.id).toBe("2");
    expect(repositoryMock.deactivateAllAcademicYears).toHaveBeenCalledOnce();
    expect(repositoryMock.deactivateAllSemesters).toHaveBeenCalledOnce();
  });

  it("rejects semesters outside the academic year range", async () => {
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue(academicYearRow);

    await expect(
      academicStructureService.createSemester("1", {
        name: "Semester 1",
        startDate: "2025-08-01",
        endDate: "2025-12-01"
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects teacher assignments when the subject and class grade levels differ", async () => {
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue(academicYearRow);
    vi.mocked(profileResolutionServiceMock.requireTeacherProfileIdentifier).mockResolvedValue({
      teacherId: "3",
      userId: "30",
      fullName: "Sara Teacher",
      email: "teacher1@eshraf.local",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow);
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue({
      ...subjectRow,
      gradeLevelId: "5",
      gradeLevelName: "Grade 5",
      gradeLevelOrder: 5
    });

    await expect(
      academicStructureService.createTeacherAssignment({
        teacherId: "1002",
        classId: "11",
        subjectId: "7",
        academicYearId: "1"
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("normalizes teacher user ids before creating teacher assignments", async () => {
    vi.mocked(profileResolutionServiceMock.requireTeacherProfileIdentifier).mockResolvedValue({
      teacherId: "3",
      userId: "1002",
      fullName: "Sara Teacher",
      email: "teacher1@eshraf.local",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue(academicYearRow);
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow);
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow);
    vi.mocked(repositoryMock.createTeacherAssignment).mockResolvedValue("30");
    vi.mocked(repositoryMock.findTeacherAssignmentById).mockResolvedValue({
      id: "30",
      teacherId: "3",
      teacherUserId: "1002",
      teacherFullName: "Sara Teacher",
      teacherEmail: "teacher1@eshraf.local",
      teacherPhone: "700000003",
      classId: "11",
      className: "A",
      section: "A",
      subjectId: "7",
      subjectName: "Science",
      subjectCode: "SCI-G2",
      academicYearId: "1",
      academicYearName: "2025-2026",
      gradeLevelId: "2",
      gradeLevelName: "Grade 2",
      createdAt: new Date("2026-03-27T10:00:00.000Z")
    });

    await academicStructureService.createTeacherAssignment({
      teacherId: "1002",
      classId: "11",
      subjectId: "7",
      academicYearId: "1"
    });

    expect(repositoryMock.createTeacherAssignment).toHaveBeenCalledWith({
      teacherId: "3",
      classId: "11",
      subjectId: "7",
      academicYearId: "1"
    });
  });

  it("normalizes supervisor user ids before creating supervisor assignments", async () => {
    vi.mocked(profileResolutionServiceMock.requireSupervisorProfileIdentifier).mockResolvedValue({
      supervisorId: "4",
      userId: "1005",
      fullName: "Mona Supervisor",
      email: "supervisor@example.com",
      phone: "700000005",
      department: null
    });
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue(academicYearRow);
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow);
    vi.mocked(repositoryMock.createSupervisorAssignment).mockResolvedValue("31");
    vi.mocked(repositoryMock.findSupervisorAssignmentById).mockResolvedValue({
      id: "31",
      supervisorId: "4",
      supervisorUserId: "1005",
      supervisorFullName: "Mona Supervisor",
      supervisorEmail: "supervisor@example.com",
      supervisorPhone: "700000005",
      classId: "11",
      className: "A",
      section: "A",
      academicYearId: "1",
      academicYearName: "2025-2026",
      gradeLevelId: "2",
      gradeLevelName: "Grade 2",
      createdAt: new Date("2026-03-27T10:00:00.000Z")
    });

    await academicStructureService.createSupervisorAssignment({
      supervisorId: "1005",
      classId: "11",
      academicYearId: "1"
    });

    expect(repositoryMock.createSupervisorAssignment).toHaveBeenCalledWith({
      supervisorId: "4",
      classId: "11",
      academicYearId: "1"
    });
  });

  it("creates and lists subject offerings without changing the subject contract", async () => {
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow);
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue({
      id: "1",
      academicYearId: "1",
      academicYearName: "2025-2026",
      name: "Semester 1",
      startDate: new Date("2025-09-01T00:00:00.000Z"),
      endDate: new Date("2026-01-31T00:00:00.000Z"),
      isActive: true,
      createdAt: new Date("2026-03-13T10:00:00.000Z"),
      updatedAt: new Date("2026-03-13T10:00:00.000Z")
    });
    vi.mocked(repositoryMock.createSubjectOffering).mockResolvedValue("20");
    vi.mocked(repositoryMock.findSubjectOfferingById).mockResolvedValue(subjectOfferingRow);
    vi.mocked(repositoryMock.listSubjectOfferings).mockResolvedValue([subjectOfferingRow]);

    const createResponse = await academicStructureService.createSubjectOffering({
      subjectId: "7",
      semesterId: "1",
      isActive: true
    });
    const listResponse = await academicStructureService.listSubjectOfferings({
      semesterId: "1"
    });

    expect(createResponse.id).toBe("20");
    expect(createResponse.subject.id).toBe("7");
    expect(createResponse.semester.id).toBe("1");
    expect(listResponse).toHaveLength(1);
    expect(repositoryMock.createSubject).not.toHaveBeenCalled();
  });

  it("updates subject offering activation state", async () => {
    vi.mocked(repositoryMock.findSubjectOfferingById)
      .mockResolvedValueOnce(subjectOfferingRow)
      .mockResolvedValueOnce({
        ...subjectOfferingRow,
        isActive: false,
        updatedAt: new Date("2026-03-27T12:00:00.000Z")
      });
    vi.mocked(repositoryMock.updateSubjectOffering).mockResolvedValue(undefined);

    const response = await academicStructureService.updateSubjectOffering("20", {
      isActive: false
    });

    expect(response.isActive).toBe(false);
    expect(repositoryMock.updateSubjectOffering).toHaveBeenCalledWith(
      "20",
      {
        isActive: false
      }
    );
  });

  it("updates classes without changing their academic linkage", async () => {
    vi.mocked(repositoryMock.findClassById)
      .mockResolvedValueOnce(classRow)
      .mockResolvedValueOnce({
        ...classRow,
        section: "C",
        capacity: 40,
        updatedAt: new Date("2026-03-29T12:00:00.000Z")
      });
    vi.mocked(repositoryMock.updateClass).mockResolvedValue(undefined);

    const response = await academicStructureService.updateClass("11", {
      section: "C",
      capacity: 40
    });

    expect(response.section).toBe("C");
    expect(response.capacity).toBe(40);
    expect(repositoryMock.updateClass).toHaveBeenCalledWith("11", {
      className: undefined,
      section: "C",
      capacity: 40,
      isActive: undefined
    });
  });

  it("updates subjects while preserving the grade-level-scoped model", async () => {
    vi.mocked(repositoryMock.findSubjectById)
      .mockResolvedValueOnce(subjectRow)
      .mockResolvedValueOnce({
        ...subjectRow,
        name: "Advanced Science",
        code: null,
        updatedAt: new Date("2026-03-29T12:00:00.000Z")
      });
    vi.mocked(repositoryMock.updateSubject).mockResolvedValue(undefined);

    const response = await academicStructureService.updateSubject("7", {
      name: "Advanced Science",
      code: null
    });

    expect(response.name).toBe("Advanced Science");
    expect(response.code).toBeNull();
    expect(repositoryMock.updateSubject).toHaveBeenCalledWith("7", {
      name: "Advanced Science",
      code: null,
      isActive: undefined
    });
  });

  it("normalizes teacher user ids in teacher assignment filters", async () => {
    vi.mocked(profileResolutionServiceMock.requireTeacherProfileIdentifier).mockResolvedValue({
      teacherId: "3",
      userId: "1002",
      fullName: "Sara Teacher",
      email: "teacher1@eshraf.local",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.listTeacherAssignments).mockResolvedValue([]);

    await academicStructureService.listTeacherAssignments({
      teacherId: "1002",
      academicYearId: "1"
    });

    expect(repositoryMock.listTeacherAssignments).toHaveBeenCalledWith({
      academicYearId: "1",
      classId: undefined,
      subjectId: undefined,
      teacherId: "3"
    });
  });

  it("updates teacher assignments using normalized teacher user ids", async () => {
    vi.mocked(repositoryMock.findTeacherAssignmentById)
      .mockResolvedValueOnce({
        id: "30",
        teacherId: "3",
        teacherUserId: "1002",
        teacherFullName: "Sara Teacher",
        teacherEmail: "teacher1@eshraf.local",
        teacherPhone: "700000003",
        academicYearId: "1",
        academicYearName: "2025-2026",
        classId: "11",
        className: "A",
        classSection: "A",
        classIsActive: true,
        classAcademicYearId: "1",
        classGradeLevelId: "2",
        classGradeLevelName: "Grade 2",
        classGradeLevelOrder: 2,
        subjectId: "7",
        subjectName: "Science",
        subjectCode: "SCI-G2",
        subjectIsActive: true,
        subjectGradeLevelId: "2",
        createdAt: new Date("2026-03-27T10:00:00.000Z")
      })
      .mockResolvedValueOnce({
        id: "30",
        teacherId: "8",
        teacherUserId: "1010",
        teacherFullName: "Fahad Teacher",
        teacherEmail: "teacher2@eshraf.local",
        teacherPhone: "700000008",
        academicYearId: "1",
        academicYearName: "2025-2026",
        classId: "11",
        className: "A",
        classSection: "A",
        classIsActive: true,
        classAcademicYearId: "1",
        classGradeLevelId: "2",
        classGradeLevelName: "Grade 2",
        classGradeLevelOrder: 2,
        subjectId: "7",
        subjectName: "Science",
        subjectCode: "SCI-G2",
        subjectIsActive: true,
        subjectGradeLevelId: "2",
        createdAt: new Date("2026-03-27T10:00:00.000Z")
      });
    vi.mocked(profileResolutionServiceMock.requireTeacherProfileIdentifier).mockResolvedValue({
      teacherId: "8",
      userId: "1010",
      fullName: "Fahad Teacher",
      email: "teacher2@eshraf.local",
      phone: "700000008",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue(academicYearRow);
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow);
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow);
    vi.mocked(repositoryMock.updateTeacherAssignment).mockResolvedValue(undefined);

    const response = await academicStructureService.updateTeacherAssignment("30", {
      teacherId: "1010"
    });

    expect(response.teacher.id).toBe("8");
    expect(repositoryMock.updateTeacherAssignment).toHaveBeenCalledWith("30", {
      teacherId: "8",
      classId: undefined,
      subjectId: undefined,
      academicYearId: undefined
    });
  });

  it("normalizes supervisor user ids in supervisor assignment filters", async () => {
    vi.mocked(profileResolutionServiceMock.requireSupervisorProfileIdentifier).mockResolvedValue({
      supervisorId: "4",
      userId: "1005",
      fullName: "Mona Supervisor",
      email: "supervisor@example.com",
      phone: "700000005",
      department: null
    });
    vi.mocked(repositoryMock.listSupervisorAssignments).mockResolvedValue([]);

    await academicStructureService.listSupervisorAssignments({
      supervisorId: "1005",
      academicYearId: "1"
    });

    expect(repositoryMock.listSupervisorAssignments).toHaveBeenCalledWith({
      academicYearId: "1",
      classId: undefined,
      supervisorId: "4"
    });
  });

  it("updates supervisor assignments using normalized supervisor user ids", async () => {
    vi.mocked(repositoryMock.findSupervisorAssignmentById)
      .mockResolvedValueOnce({
        id: "31",
        supervisorId: "4",
        supervisorUserId: "1005",
        supervisorFullName: "Mona Supervisor",
        supervisorEmail: "supervisor@example.com",
        supervisorPhone: "700000005",
        academicYearId: "1",
        academicYearName: "2025-2026",
        classId: "11",
        className: "A",
        classSection: "A",
        classIsActive: true,
        classAcademicYearId: "1",
        classGradeLevelId: "2",
        classGradeLevelName: "Grade 2",
        classGradeLevelOrder: 2,
        createdAt: new Date("2026-03-27T10:00:00.000Z")
      })
      .mockResolvedValueOnce({
        id: "31",
        supervisorId: "9",
        supervisorUserId: "1011",
        supervisorFullName: "Adel Supervisor",
        supervisorEmail: "supervisor2@example.com",
        supervisorPhone: "700000009",
        academicYearId: "1",
        academicYearName: "2025-2026",
        classId: "11",
        className: "A",
        classSection: "A",
        classIsActive: true,
        classAcademicYearId: "1",
        classGradeLevelId: "2",
        classGradeLevelName: "Grade 2",
        classGradeLevelOrder: 2,
        createdAt: new Date("2026-03-27T10:00:00.000Z")
      });
    vi.mocked(profileResolutionServiceMock.requireSupervisorProfileIdentifier).mockResolvedValue({
      supervisorId: "9",
      userId: "1011",
      fullName: "Adel Supervisor",
      email: "supervisor2@example.com",
      phone: "700000009",
      department: null
    });
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue(academicYearRow);
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow);
    vi.mocked(repositoryMock.updateSupervisorAssignment).mockResolvedValue(undefined);

    const response = await academicStructureService.updateSupervisorAssignment("31", {
      supervisorId: "1011"
    });

    expect(response.supervisor.id).toBe("9");
    expect(repositoryMock.updateSupervisorAssignment).toHaveBeenCalledWith("31", {
      supervisorId: "9",
      classId: undefined,
      academicYearId: undefined
    });
  });
});

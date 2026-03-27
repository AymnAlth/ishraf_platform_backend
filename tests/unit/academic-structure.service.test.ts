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
    listSubjects: vi.fn(),
    findSubjectById: vi.fn(),
    createSubject: vi.fn(),
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
    createSupervisorAssignment: vi.fn(),
    listSupervisorAssignments: vi.fn(),
    findSupervisorAssignmentById: vi.fn()
  };

  let academicStructureService: AcademicStructureService;

  beforeEach(() => {
    academicStructureService = new AcademicStructureService(
      repositoryMock as unknown as AcademicStructureRepository
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
  });

  it("deactivates existing academic years before creating a new active one", async () => {
    vi.mocked(repositoryMock.deactivateAllAcademicYears).mockResolvedValue(undefined);
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
    vi.mocked(repositoryMock.findTeacherById).mockResolvedValue({
      teacherId: "3",
      teacherUserId: "30",
      teacherFullName: "Sara Teacher",
      teacherEmail: "teacher1@eshraf.local",
      teacherPhone: "700000003"
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
        teacherId: "3",
        classId: "11",
        subjectId: "7",
        academicYearId: "1"
      })
    ).rejects.toBeInstanceOf(ValidationError);
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
});

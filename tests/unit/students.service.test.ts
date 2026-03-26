import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError } from "../../src/common/errors/conflict-error";
import { NotFoundError } from "../../src/common/errors/not-found-error";
import { ValidationError } from "../../src/common/errors/validation-error";
import { db } from "../../src/database/db";
import { StudentsService } from "../../src/modules/students/service/students.service";
import type { StudentsRepository } from "../../src/modules/students/repository/students.repository";
import type {
  AcademicYearReferenceRow,
  ClassReferenceRow,
  ParentReferenceRow,
  StudentParentLinkRow,
  StudentPromotionRow,
  StudentReadRow
} from "../../src/modules/students/types/students.types";

const studentRow = (overrides: Partial<StudentReadRow> = {}): StudentReadRow => ({
  id: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  dateOfBirth: new Date("2016-09-01T00:00:00.000Z"),
  gender: "male",
  status: "active",
  enrollmentDate: new Date("2025-09-01T00:00:00.000Z"),
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z"),
  classId: "1",
  className: "A",
  section: "A",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  academicYearId: "1",
  academicYearName: "2025-2026",
  primaryParentId: null,
  primaryParentName: null,
  primaryParentEmail: null,
  primaryParentPhone: null,
  primaryParentRelationType: null,
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

const academicYearRow = (
  overrides: Partial<AcademicYearReferenceRow> = {}
): AcademicYearReferenceRow => ({
  id: "1",
  name: "2025-2026",
  ...overrides
});

const parentRow = (overrides: Partial<ParentReferenceRow> = {}): ParentReferenceRow => ({
  parentId: "1",
  userId: "1003",
  fullName: "Huda Parent",
  email: "parent@example.com",
  phone: "700000011",
  address: "Dhamar",
  ...overrides
});

const parentLinkRow = (
  overrides: Partial<StudentParentLinkRow> = {}
): StudentParentLinkRow => ({
  linkId: "1",
  studentId: "1",
  parentId: "1",
  userId: "1003",
  fullName: "Huda Parent",
  email: "parent@example.com",
  phone: "700000011",
  relationType: "father",
  isPrimary: true,
  address: "Dhamar",
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  ...overrides
});

const promotionRow = (
  overrides: Partial<StudentPromotionRow> = {}
): StudentPromotionRow => ({
  id: "10",
  academicYearId: "1",
  academicYearName: "2025-2026",
  fromClassId: "1",
  fromClassName: "A",
  fromClassSection: "A",
  fromClassGradeLevelId: "1",
  fromClassGradeLevelName: "Grade 1",
  fromClassAcademicYearId: "1",
  fromClassAcademicYearName: "2025-2026",
  toClassId: "2",
  toClassName: "B",
  toClassSection: "B",
  toClassGradeLevelId: "2",
  toClassGradeLevelName: "Grade 2",
  toClassAcademicYearId: "1",
  toClassAcademicYearName: "2025-2026",
  promotedAt: new Date("2026-03-13T10:00:00.000Z"),
  notes: null,
  ...overrides
});

describe("StudentsService", () => {
  const repositoryMock = {
    listStudents: vi.fn(),
    findStudentById: vi.fn(),
    createStudent: vi.fn(),
    updateStudent: vi.fn(),
    updateStudentClassId: vi.fn(),
    findClassById: vi.fn(),
    findAcademicYearById: vi.fn(),
    findParentById: vi.fn(),
    listStudentParentLinks: vi.fn(),
    findStudentParentLink: vi.fn(),
    createStudentParentLink: vi.fn(),
    clearPrimaryParent: vi.fn(),
    setStudentParentPrimary: vi.fn(),
    createStudentPromotion: vi.fn(),
    findStudentPromotionById: vi.fn()
  };

  let studentsService: StudentsService;

  beforeEach(() => {
    studentsService = new StudentsService(repositoryMock as unknown as StudentsRepository);

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

  it("creates a student after confirming the class exists", async () => {
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow());
    vi.mocked(repositoryMock.createStudent).mockResolvedValue("1");
    vi.mocked(repositoryMock.findStudentById).mockResolvedValue(studentRow());

    const response = await studentsService.createStudent({
      academicNo: "STU-1001",
      fullName: "Student One",
      dateOfBirth: "2016-09-01",
      gender: "male",
      classId: "1"
    });

    expect(response.id).toBe("1");
    expect(repositoryMock.createStudent).toHaveBeenCalledOnce();
  });

  it("auto-switches the primary parent when linking a new primary parent", async () => {
    vi.mocked(repositoryMock.findStudentById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findParentById).mockResolvedValue(
      parentRow({
        parentId: "1",
        userId: "1003"
      })
    );
    vi.mocked(repositoryMock.findStudentParentLink)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(parentLinkRow());
    vi.mocked(repositoryMock.clearPrimaryParent).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.createStudentParentLink).mockResolvedValue("1");

    const response = await studentsService.linkParent("1", {
      parentId: "1003",
      relationType: "father",
      isPrimary: true
    });

    expect(response.isPrimary).toBe(true);
    expect(repositoryMock.clearPrimaryParent).toHaveBeenCalledOnce();
    expect(repositoryMock.createStudentParentLink).toHaveBeenCalledOnce();
    expect(repositoryMock.findStudentParentLink).toHaveBeenNthCalledWith(
      1,
      "1",
      "1",
      expect.anything()
    );
    expect(repositoryMock.createStudentParentLink).toHaveBeenCalledWith(
      {
        studentId: "1",
        parentId: "1",
        relationType: "father",
        isPrimary: true
      },
      expect.anything()
    );
  });

  it("rejects duplicate parent links before inserting", async () => {
    vi.mocked(repositoryMock.findStudentById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findParentById).mockResolvedValue(parentRow());
    vi.mocked(repositoryMock.findStudentParentLink).mockResolvedValue(parentLinkRow());

    await expect(
      studentsService.linkParent("1", {
        parentId: "1",
        relationType: "father"
      })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(repositoryMock.createStudentParentLink).not.toHaveBeenCalled();
  });

  it("rejects promotions when the target class belongs to another academic year", async () => {
    vi.mocked(repositoryMock.findStudentById).mockResolvedValue(studentRow({ classId: "1" }));
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue(academicYearRow());
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(
      classRow({
        id: "3",
        academicYearId: "2",
        academicYearName: "2026-2027"
      })
    );

    await expect(
      studentsService.promoteStudent("1", {
        toClassId: "3",
        academicYearId: "1"
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("promotes a student in one transaction and returns the updated detail", async () => {
    vi.mocked(repositoryMock.findStudentById)
      .mockResolvedValueOnce(studentRow())
      .mockResolvedValueOnce(studentRow({ classId: "2", className: "B", gradeLevelId: "2", gradeLevelName: "Grade 2" }));
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue(academicYearRow());
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(
      classRow({
        id: "2",
        className: "B",
        gradeLevelId: "2",
        gradeLevelName: "Grade 2"
      })
    );
    vi.mocked(repositoryMock.createStudentPromotion).mockResolvedValue("10");
    vi.mocked(repositoryMock.updateStudentClassId).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.findStudentPromotionById).mockResolvedValue(promotionRow());

    const response = await studentsService.promoteStudent("1", {
      toClassId: "2",
      academicYearId: "1",
      notes: "Promoted"
    });

    expect(response.student.currentClass.id).toBe("2");
    expect(response.promotion.id).toBe("10");
    expect(repositoryMock.updateStudentClassId).toHaveBeenCalledTimes(1);
    expect(repositoryMock.updateStudentClassId).toHaveBeenCalledWith(
      "1",
      "2",
      expect.anything()
    );
  });

  it("throws not found when setting a primary parent on a missing link", async () => {
    vi.mocked(repositoryMock.findStudentById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findParentById).mockResolvedValue(parentRow({ parentId: "99" }));
    vi.mocked(repositoryMock.findStudentParentLink).mockResolvedValue(null);

    await expect(studentsService.setPrimaryParent("1", "99")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("accepts a parent user id when setting the primary parent", async () => {
    vi.mocked(repositoryMock.findStudentById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findParentById).mockResolvedValue(
      parentRow({
        parentId: "2",
        userId: "2002"
      })
    );
    vi.mocked(repositoryMock.findStudentParentLink)
      .mockResolvedValueOnce(parentLinkRow({ parentId: "2", userId: "2002", isPrimary: false }))
      .mockResolvedValueOnce(parentLinkRow({ parentId: "2", userId: "2002", isPrimary: true }));
    vi.mocked(repositoryMock.clearPrimaryParent).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.setStudentParentPrimary).mockResolvedValue(undefined);

    const response = await studentsService.setPrimaryParent("1", "2002");

    expect(response.parentId).toBe("2");
    expect(repositoryMock.setStudentParentPrimary).toHaveBeenCalledWith(
      "1",
      "2",
      expect.anything()
    );
  });
});

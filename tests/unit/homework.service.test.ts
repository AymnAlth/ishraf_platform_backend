import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/common/errors/validation-error";
import { db } from "../../src/database/db";
import { HomeworkService } from "../../src/modules/homework/service/homework.service";
import type { HomeworkRepository } from "../../src/modules/homework/repository/homework.repository";
import type {
  ClassReferenceRow,
  HomeworkRow,
  SemesterReferenceRow,
  SubjectReferenceRow,
  TeacherReferenceRow
} from "../../src/modules/homework/types/homework.types";

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

const teacherRow = (overrides: Partial<TeacherReferenceRow> = {}): TeacherReferenceRow => ({
  teacherId: "1",
  teacherUserId: "1002",
  teacherFullName: "Sara Teacher",
  teacherEmail: "teacher@example.com",
  teacherPhone: "700000003",
  ...overrides
});

const homeworkRow = (overrides: Partial<HomeworkRow> = {}): HomeworkRow => ({
  id: "10",
  title: "Science Homework",
  description: "Read chapter 2",
  assignedDate: "2026-03-10",
  dueDate: "2026-03-12",
  classId: "1",
  className: "A",
  section: "A",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  subjectId: "1",
  subjectName: "Science",
  teacherId: "1",
  teacherUserId: "1002",
  teacherFullName: "Sara Teacher",
  teacherEmail: "teacher@example.com",
  teacherPhone: "700000003",
  academicYearId: "1",
  academicYearName: "2025-2026",
  semesterId: "2",
  semesterName: "Semester 2",
  createdAt: new Date("2026-03-27T10:00:00.000Z"),
  updatedAt: new Date("2026-03-27T10:00:00.000Z"),
  submittedCount: 0,
  notSubmittedCount: 0,
  lateCount: 0,
  recordedCount: 0,
  expectedCount: 2,
  ...overrides
});

describe("HomeworkService", () => {
  const repositoryMock = {
    findTeacherById: vi.fn(),
    findClassById: vi.fn(),
    findSubjectById: vi.fn(),
    findAcademicYearById: vi.fn(),
    findSemesterById: vi.fn(),
    hasActiveSubjectOffering: vi.fn(),
    createHomework: vi.fn(),
    listHomework: vi.fn(),
    findHomeworkById: vi.fn(),
    listHomeworkRoster: vi.fn(),
    upsertHomeworkSubmissions: vi.fn(),
    findStudentById: vi.fn(),
    listStudentHomework: vi.fn()
  };

  const profileResolutionServiceMock = {
    requireTeacherProfile: vi.fn(),
    requireParentProfile: vi.fn(),
    requireTeacherProfileIdentifier: vi.fn()
  };

  const ownershipServiceMock = {
    assertTeacherAssignedToClassYear: vi.fn(),
    assertParentOwnsStudent: vi.fn()
  };

  const activeAcademicContextServiceMock = {
    resolveOperationalContext: vi.fn()
  };

  let homeworkService: HomeworkService;

  beforeEach(() => {
    homeworkService = new HomeworkService(
      repositoryMock as unknown as HomeworkRepository,
      profileResolutionServiceMock as never,
      ownershipServiceMock as never,
      activeAcademicContextServiceMock as never
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
    Object.values(ownershipServiceMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(activeAcademicContextServiceMock).forEach((mockFn) => mockFn.mockReset());
    vi.mocked(activeAcademicContextServiceMock.resolveOperationalContext).mockResolvedValue({
      academicYearId: "1",
      semesterId: "2"
    });
  });

  it("creates homework when the subject is offered in the selected semester for an admin-selected teacher user id", async () => {
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
    vi.mocked(ownershipServiceMock.assertTeacherAssignedToClassYear).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.createHomework).mockResolvedValue("10");
    vi.mocked(repositoryMock.findHomeworkById).mockResolvedValue(homeworkRow());

    const response = await homeworkService.createHomework(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        teacherId: "1002",
        classId: "1",
        subjectId: "1",
        academicYearId: "1",
        semesterId: "2",
        title: "Science Homework",
        description: "Read chapter 2",
        assignedDate: "2026-03-10",
        dueDate: "2026-03-12"
      }
    );

    expect(response.id).toBe("10");
    expect(repositoryMock.createHomework).toHaveBeenCalledOnce();
    expect(repositoryMock.createHomework).toHaveBeenCalledWith(
      expect.objectContaining({
        academicYearId: "1",
        semesterId: "2"
      }),
      expect.anything()
    );
  });

  it("normalizes teacher user ids in homework list filters", async () => {
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
    vi.mocked(repositoryMock.listHomework).mockResolvedValue({
      rows: [homeworkRow()],
      totalItems: 1
    });

    const response = await homeworkService.listHomework(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        page: 1,
        limit: 20,
        sortBy: "dueDate",
        sortOrder: "desc",
        teacherId: "1002"
      }
    );

    expect(response.items).toHaveLength(1);
    expect(repositoryMock.listHomework).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherId: "1",
        academicYearId: "1",
        semesterId: "2"
      }),
      {}
    );
  });

  it("rejects homework creation when the subject is not offered in the selected semester", async () => {
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow());
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue(semesterRow());
    vi.mocked(repositoryMock.hasActiveSubjectOffering).mockResolvedValue(false);

    await expect(
      homeworkService.createHomework(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          teacherId: "1",
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Homework Without Offering",
          assignedDate: "2026-03-10",
          dueDate: "2026-03-12"
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("uses the active context when admin omits academicYearId and semesterId", async () => {
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
    vi.mocked(ownershipServiceMock.assertTeacherAssignedToClassYear).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.createHomework).mockResolvedValue("10");
    vi.mocked(repositoryMock.findHomeworkById).mockResolvedValue(homeworkRow());

    await homeworkService.createHomework(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        teacherId: "1002",
        classId: "1",
        subjectId: "1",
        title: "Science Homework",
        assignedDate: "2026-03-10",
        dueDate: "2026-03-12"
      }
    );

    expect(activeAcademicContextServiceMock.resolveOperationalContext).toHaveBeenCalledWith({
      academicYearId: undefined,
      semesterId: undefined
    });
  });
});

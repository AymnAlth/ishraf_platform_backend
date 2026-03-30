import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { AcademicStructureController } from "../controller/academic-structure.controller";
import { academicStructurePolicies } from "../policies/academic-structure.policy";
import {
  activeAcademicContextSchema,
  academicYearParamsSchema,
  createAcademicYearSchema,
  createClassSchema,
  createGradeLevelSchema,
  createSemesterSchema,
  createSubjectSchema,
  createSubjectOfferingSchema,
  createSupervisorAssignmentSchema,
  createTeacherAssignmentSchema,
  entityIdParamsSchema,
  listClassesQuerySchema,
  listSubjectsQuerySchema,
  listSubjectOfferingsQuerySchema,
  listSupervisorAssignmentsQuerySchema,
  listTeacherAssignmentsQuerySchema,
  updateAcademicYearSchema,
  updateClassSchema,
  updateSubjectOfferingSchema,
  updateSubjectSchema,
  updateSupervisorAssignmentSchema,
  updateTeacherAssignmentSchema,
  updateSemesterSchema
} from "../validator/academic-structure.validator";

export const createAcademicStructureRouter = (
  controller: AcademicStructureController
): Router => {
  const router = Router();

  router.get(
    "/context/active",
    ...academicStructurePolicies.adminOnly,
    asyncHandler((req, res) => controller.getActiveAcademicContext(req, res))
  );

  router.patch(
    "/context/active",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ body: activeAcademicContextSchema }),
    asyncHandler((req, res) => controller.updateActiveAcademicContext(req, res))
  );

  router.post(
    "/academic-years",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ body: createAcademicYearSchema }),
    asyncHandler((req, res) => controller.createAcademicYear(req, res))
  );

  router.get(
    "/academic-years",
    ...academicStructurePolicies.adminOnly,
    asyncHandler((req, res) => controller.listAcademicYears(req, res))
  );

  router.get(
    "/academic-years/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ params: entityIdParamsSchema }),
    asyncHandler((req, res) => controller.getAcademicYearById(req, res))
  );

  router.patch(
    "/academic-years/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({
      params: entityIdParamsSchema,
      body: updateAcademicYearSchema
    }),
    asyncHandler((req, res) => controller.updateAcademicYear(req, res))
  );

  router.patch(
    "/academic-years/:id/activate",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ params: entityIdParamsSchema }),
    asyncHandler((req, res) => controller.activateAcademicYear(req, res))
  );

  router.post(
    "/academic-years/:academicYearId/semesters",
    ...academicStructurePolicies.adminOnly,
    validateRequest({
      params: academicYearParamsSchema,
      body: createSemesterSchema
    }),
    asyncHandler((req, res) => controller.createSemester(req, res))
  );

  router.get(
    "/academic-years/:academicYearId/semesters",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ params: academicYearParamsSchema }),
    asyncHandler((req, res) => controller.listSemestersByAcademicYear(req, res))
  );

  router.patch(
    "/semesters/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({
      params: entityIdParamsSchema,
      body: updateSemesterSchema
    }),
    asyncHandler((req, res) => controller.updateSemester(req, res))
  );

  router.post(
    "/grade-levels",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ body: createGradeLevelSchema }),
    asyncHandler((req, res) => controller.createGradeLevel(req, res))
  );

  router.get(
    "/grade-levels",
    ...academicStructurePolicies.adminOnly,
    asyncHandler((req, res) => controller.listGradeLevels(req, res))
  );

  router.post(
    "/classes",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ body: createClassSchema }),
    asyncHandler((req, res) => controller.createClass(req, res))
  );

  router.get(
    "/classes",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ query: listClassesQuerySchema }),
    asyncHandler((req, res) => controller.listClasses(req, res))
  );

  router.get(
    "/classes/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ params: entityIdParamsSchema }),
    asyncHandler((req, res) => controller.getClassById(req, res))
  );

  router.patch(
    "/classes/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({
      params: entityIdParamsSchema,
      body: updateClassSchema
    }),
    asyncHandler((req, res) => controller.updateClass(req, res))
  );

  router.post(
    "/subjects",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ body: createSubjectSchema }),
    asyncHandler((req, res) => controller.createSubject(req, res))
  );

  router.get(
    "/subjects",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ query: listSubjectsQuerySchema }),
    asyncHandler((req, res) => controller.listSubjects(req, res))
  );

  router.get(
    "/subjects/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ params: entityIdParamsSchema }),
    asyncHandler((req, res) => controller.getSubjectById(req, res))
  );

  router.patch(
    "/subjects/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({
      params: entityIdParamsSchema,
      body: updateSubjectSchema
    }),
    asyncHandler((req, res) => controller.updateSubject(req, res))
  );

  router.post(
    "/subject-offerings",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ body: createSubjectOfferingSchema }),
    asyncHandler((req, res) => controller.createSubjectOffering(req, res))
  );

  router.get(
    "/subject-offerings",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ query: listSubjectOfferingsQuerySchema }),
    asyncHandler((req, res) => controller.listSubjectOfferings(req, res))
  );

  router.get(
    "/subject-offerings/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ params: entityIdParamsSchema }),
    asyncHandler((req, res) => controller.getSubjectOfferingById(req, res))
  );

  router.patch(
    "/subject-offerings/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({
      params: entityIdParamsSchema,
      body: updateSubjectOfferingSchema
    }),
    asyncHandler((req, res) => controller.updateSubjectOffering(req, res))
  );

  router.post(
    "/teacher-assignments",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ body: createTeacherAssignmentSchema }),
    asyncHandler((req, res) => controller.createTeacherAssignment(req, res))
  );

  router.get(
    "/teacher-assignments",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ query: listTeacherAssignmentsQuerySchema }),
    asyncHandler((req, res) => controller.listTeacherAssignments(req, res))
  );

  router.get(
    "/teacher-assignments/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ params: entityIdParamsSchema }),
    asyncHandler((req, res) => controller.getTeacherAssignmentById(req, res))
  );

  router.patch(
    "/teacher-assignments/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({
      params: entityIdParamsSchema,
      body: updateTeacherAssignmentSchema
    }),
    asyncHandler((req, res) => controller.updateTeacherAssignment(req, res))
  );

  router.post(
    "/supervisor-assignments",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ body: createSupervisorAssignmentSchema }),
    asyncHandler((req, res) => controller.createSupervisorAssignment(req, res))
  );

  router.get(
    "/supervisor-assignments",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ query: listSupervisorAssignmentsQuerySchema }),
    asyncHandler((req, res) => controller.listSupervisorAssignments(req, res))
  );

  router.get(
    "/supervisor-assignments/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({ params: entityIdParamsSchema }),
    asyncHandler((req, res) => controller.getSupervisorAssignmentById(req, res))
  );

  router.patch(
    "/supervisor-assignments/:id",
    ...academicStructurePolicies.adminOnly,
    validateRequest({
      params: entityIdParamsSchema,
      body: updateSupervisorAssignmentSchema
    }),
    asyncHandler((req, res) => controller.updateSupervisorAssignment(req, res))
  );

  return router;
};

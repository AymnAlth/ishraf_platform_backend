import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "../../src/config/logger";
import { AutomationService } from "../../src/modules/automation/service/automation.service";
import type { AutomationRepository } from "../../src/modules/automation/repository/automation.repository";
import type { CommunicationRepository } from "../../src/modules/communication/repository/communication.repository";

const linkedParentRecipients = [
  {
    parentUserId: "2001",
    parentId: "1",
    studentId: "1",
    studentFullName: "Student One",
    academicNo: "STU-1001",
    relationType: "father",
    isPrimary: true
  },
  {
    parentUserId: "2002",
    parentId: "2",
    studentId: "1",
    studentFullName: "Student One",
    academicNo: "STU-1001",
    relationType: "mother",
    isPrimary: false
  }
] as const;

describe("AutomationService", () => {
  const automationRepositoryMock = {
    listParentRecipientsForStudent: vi.fn(),
    listRouteParentRecipients: vi.fn()
  };

  const communicationRepositoryMock = {
    createNotification: vi.fn()
  };

  let automationService: AutomationService;

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(automationRepositoryMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(communicationRepositoryMock).forEach((mockFn) => mockFn.mockReset());

    automationService = new AutomationService(
      automationRepositoryMock as unknown as AutomationRepository,
      communicationRepositoryMock as unknown as CommunicationRepository
    );

    vi.spyOn(logger, "debug").mockImplementation(() => logger);
    vi.spyOn(logger, "error").mockImplementation(() => logger);
  });

  describe("onStudentAbsent", () => {
    it("creates absent notifications for every linked parent", async () => {
      vi.mocked(automationRepositoryMock.listParentRecipientsForStudent).mockResolvedValue([
        ...linkedParentRecipients
      ]);
      vi.mocked(communicationRepositoryMock.createNotification).mockResolvedValue("1");

      await automationService.onStudentAbsent({
        attendanceId: "10",
        studentId: "1",
        studentName: "Student One",
        subjectName: "Mathematics",
        sessionDate: "2026-03-14"
      });

      expect(automationRepositoryMock.listParentRecipientsForStudent).toHaveBeenCalledWith("1");
      expect(communicationRepositoryMock.createNotification).toHaveBeenCalledTimes(2);
      expect(communicationRepositoryMock.createNotification).toHaveBeenNthCalledWith(1, {
        userId: "2001",
        title: "تنبيه غياب الطالب",
        message: "تم تسجيل غياب الطالب Student One في حصة Mathematics بتاريخ 2026-03-14.",
        notificationType: "attendance_absent",
        referenceType: "attendance_record",
        referenceId: "10"
      });
      expect(communicationRepositoryMock.createNotification).toHaveBeenNthCalledWith(2, {
        userId: "2002",
        title: "تنبيه غياب الطالب",
        message: "تم تسجيل غياب الطالب Student One في حصة Mathematics بتاريخ 2026-03-14.",
        notificationType: "attendance_absent",
        referenceType: "attendance_record",
        referenceId: "10"
      });
    });

    it("does not create notifications when no recipients are found and logs a debug entry", async () => {
      vi.mocked(automationRepositoryMock.listParentRecipientsForStudent).mockResolvedValue([]);

      await automationService.onStudentAbsent({
        attendanceId: "10",
        studentId: "1",
        studentName: "Student One",
        subjectName: "Mathematics",
        sessionDate: "2026-03-14"
      });

      expect(communicationRepositoryMock.createNotification).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        {
          automationEvent: "student_absent",
          referenceType: "attendance_record",
          referenceId: "10"
        },
        "Automation completed with no recipients"
      );
    });

    it("fails open when recipient resolution fails", async () => {
      vi.mocked(automationRepositoryMock.listParentRecipientsForStudent).mockRejectedValue(
        new Error("lookup failed")
      );

      await expect(
        automationService.onStudentAbsent({
          attendanceId: "10",
          studentId: "1",
          studentName: "Student One",
          subjectName: "Mathematics",
          sessionDate: "2026-03-14"
        })
      ).resolves.toBeUndefined();

      expect(communicationRepositoryMock.createNotification).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          automationEvent: "student_absent",
          referenceType: "attendance_record",
          referenceId: "10"
        }),
        "Automation recipient resolution failed"
      );
    });
  });

  describe("onNegativeBehavior", () => {
    it("creates negative behavior notifications with the expected payload", async () => {
      vi.mocked(automationRepositoryMock.listParentRecipientsForStudent).mockResolvedValue([
        ...linkedParentRecipients
      ]);
      vi.mocked(communicationRepositoryMock.createNotification).mockResolvedValue("1");

      await automationService.onNegativeBehavior({
        behaviorRecordId: "20",
        studentId: "1",
        studentName: "Student One",
        categoryName: "Bullying",
        behaviorDate: "2026-03-14"
      });

      expect(automationRepositoryMock.listParentRecipientsForStudent).toHaveBeenCalledWith("1");
      expect(communicationRepositoryMock.createNotification).toHaveBeenCalledTimes(2);
      expect(communicationRepositoryMock.createNotification).toHaveBeenNthCalledWith(1, {
        userId: "2001",
        title: "تنبيه سلوكي",
        message: "تم تسجيل ملاحظة سلوكية سلبية (Bullying) للطالب Student One بتاريخ 2026-03-14.",
        notificationType: "behavior_negative",
        referenceType: "behavior_record",
        referenceId: "20"
      });
    });

    it("fails open and keeps delivering notifications when one insert fails", async () => {
      vi.mocked(automationRepositoryMock.listParentRecipientsForStudent).mockResolvedValue([
        ...linkedParentRecipients
      ]);
      vi.mocked(communicationRepositoryMock.createNotification)
        .mockRejectedValueOnce(new Error("insert failed"))
        .mockResolvedValueOnce("2");

      await expect(
        automationService.onNegativeBehavior({
          behaviorRecordId: "20",
          studentId: "1",
          studentName: "Student One",
          categoryName: "Bullying",
          behaviorDate: "2026-03-14"
        })
      ).resolves.toBeUndefined();

      expect(communicationRepositoryMock.createNotification).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          automationEvent: "negative_behavior",
          referenceType: "behavior_record",
          referenceId: "20",
          recipientCount: 2,
          recipientUserId: "2001"
        }),
        "Automation notification delivery failed"
      );
    });
  });

  describe("onTripStarted", () => {
    it("creates trip started notifications per parent-student recipient", async () => {
      vi.mocked(automationRepositoryMock.listRouteParentRecipients).mockResolvedValue([
        {
          parentUserId: "2001",
          parentId: "1",
          studentId: "1",
          studentFullName: "Student One",
          academicNo: "STU-1001",
          relationType: "father",
          isPrimary: true,
          routeId: "1",
          routeName: "Route 1",
          stopId: "10",
          stopName: "Main Stop"
        },
        {
          parentUserId: "2001",
          parentId: "1",
          studentId: "2",
          studentFullName: "Student Two",
          academicNo: "STU-1002",
          relationType: "father",
          isPrimary: true,
          routeId: "1",
          routeName: "Route 1",
          stopId: "10",
          stopName: "Main Stop"
        }
      ]);
      vi.mocked(communicationRepositoryMock.createNotification).mockResolvedValue("1");

      await automationService.onTripStarted({
        tripId: "30",
        routeId: "1",
        routeName: "Route 1",
        tripDate: "2026-03-14"
      });

      expect(automationRepositoryMock.listRouteParentRecipients).toHaveBeenCalledWith(
        "1",
        "2026-03-14"
      );
      expect(communicationRepositoryMock.createNotification).toHaveBeenCalledTimes(2);
      expect(communicationRepositoryMock.createNotification).toHaveBeenNthCalledWith(2, {
        userId: "2001",
        title: "بدء رحلة الحافلة",
        message: "بدأت رحلة النقل للطالب Student Two على المسار Route 1 بتاريخ 2026-03-14.",
        notificationType: "transport_trip_started",
        referenceType: "trip",
        referenceId: "30"
      });
    });

    it("normalizes Date objects before querying recipients and creating notifications", async () => {
      vi.mocked(automationRepositoryMock.listRouteParentRecipients).mockResolvedValue([
        {
          parentUserId: "2001",
          parentId: "1",
          studentId: "1",
          studentFullName: "Student One",
          academicNo: "STU-1001",
          relationType: "father",
          isPrimary: true,
          routeId: "1",
          routeName: "Route 1",
          stopId: "10",
          stopName: "Main Stop"
        }
      ]);
      vi.mocked(communicationRepositoryMock.createNotification).mockResolvedValue("1");

      await automationService.onTripStarted({
        tripId: "30",
        routeId: "1",
        routeName: "Route 1",
        tripDate: new Date(2026, 2, 14)
      });

      expect(automationRepositoryMock.listRouteParentRecipients).toHaveBeenCalledWith(
        "1",
        "2026-03-14"
      );
      expect(communicationRepositoryMock.createNotification).toHaveBeenCalledWith({
        userId: "2001",
        title: "بدء رحلة الحافلة",
        message: "بدأت رحلة النقل للطالب Student One على المسار Route 1 بتاريخ 2026-03-14.",
        notificationType: "transport_trip_started",
        referenceType: "trip",
        referenceId: "30"
      });
    });
  });

  describe("onStudentDroppedOff", () => {
    it("creates dropped-off notifications for linked parents", async () => {
      vi.mocked(automationRepositoryMock.listParentRecipientsForStudent).mockResolvedValue([
        linkedParentRecipients[0]
      ]);
      vi.mocked(communicationRepositoryMock.createNotification).mockResolvedValue("1");

      await automationService.onStudentDroppedOff({
        tripStudentEventId: "40",
        studentId: "1",
        studentName: "Student One",
        stopName: "Main Stop"
      });

      expect(communicationRepositoryMock.createNotification).toHaveBeenCalledWith({
        userId: "2001",
        title: "وصول الطالب",
        message: "تم تسجيل نزول الطالب Student One من حافلة النقل عند نقطة Main Stop.",
        notificationType: "transport_student_dropped_off",
        referenceType: "trip_student_event",
        referenceId: "40"
      });
    });
  });
});

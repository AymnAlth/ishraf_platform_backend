import { logger } from "../../../config/logger";
import { toDateOnly } from "../../../common/utils/date.util";
import { CommunicationRepository } from "../../communication/repository/communication.repository";
import { AutomationRepository } from "../repository/automation.repository";
import type {
  AutomationPort,
  NegativeBehaviorAutomationContext,
  ParentNotificationRecipient,
  RouteParentNotificationRecipient,
  StudentAbsentAutomationContext,
  StudentDroppedOffAutomationContext,
  TripStartedAutomationContext
} from "../types/automation.types";

export class AutomationService implements AutomationPort {
  constructor(
    private readonly automationRepository: AutomationRepository = new AutomationRepository(),
    private readonly communicationRepository: CommunicationRepository = new CommunicationRepository()
  ) {}

  async onStudentAbsent(context: StudentAbsentAutomationContext): Promise<void> {
    const recipients = await this.safeLoadRecipients(
      "student_absent",
      "attendance_record",
      context.attendanceId,
      () => this.automationRepository.listParentRecipientsForStudent(context.studentId)
    );

    if (!recipients) {
      return;
    }

    await this.notifyRecipients(
      "student_absent",
      "attendance_record",
      context.attendanceId,
      recipients,
      () => ({
        notificationType: "attendance_absent",
        title: "تنبيه غياب الطالب",
        message: `تم تسجيل غياب الطالب ${context.studentName} في حصة ${context.subjectName} بتاريخ ${toDateOnly(context.sessionDate)}.`
      })
    );
  }

  async onNegativeBehavior(context: NegativeBehaviorAutomationContext): Promise<void> {
    const recipients = await this.safeLoadRecipients(
      "negative_behavior",
      "behavior_record",
      context.behaviorRecordId,
      () => this.automationRepository.listParentRecipientsForStudent(context.studentId)
    );

    if (!recipients) {
      return;
    }

    await this.notifyRecipients(
      "negative_behavior",
      "behavior_record",
      context.behaviorRecordId,
      recipients,
      () => ({
        notificationType: "behavior_negative",
        title: "تنبيه سلوكي",
        message: `تم تسجيل ملاحظة سلوكية سلبية (${context.categoryName}) للطالب ${context.studentName} بتاريخ ${toDateOnly(context.behaviorDate)}.`
      })
    );
  }

  async onTripStarted(context: TripStartedAutomationContext): Promise<void> {
    const tripDate = toDateOnly(context.tripDate);
    const recipients = await this.safeLoadRecipients(
      "trip_started",
      "trip",
      context.tripId,
      () => this.automationRepository.listRouteParentRecipients(context.routeId, tripDate)
    );

    if (!recipients) {
      return;
    }

    await this.notifyRecipients(
      "trip_started",
      "trip",
      context.tripId,
      recipients,
      (recipient) => ({
        notificationType: "transport_trip_started",
        title: "بدء رحلة الحافلة",
        message: `بدأت رحلة النقل للطالب ${recipient.studentFullName} على المسار ${context.routeName} بتاريخ ${tripDate}.`
      })
    );
  }

  async onStudentDroppedOff(
    context: StudentDroppedOffAutomationContext
  ): Promise<void> {
    const recipients = await this.safeLoadRecipients(
      "student_dropped_off",
      "trip_student_event",
      context.tripStudentEventId,
      () => this.automationRepository.listParentRecipientsForStudent(context.studentId)
    );

    if (!recipients) {
      return;
    }

    await this.notifyRecipients(
      "student_dropped_off",
      "trip_student_event",
      context.tripStudentEventId,
      recipients,
      () => ({
        notificationType: "transport_student_dropped_off",
        title: "وصول الطالب",
        message: `تم تسجيل نزول الطالب ${context.studentName} من حافلة النقل عند نقطة ${context.stopName}.`
      })
    );
  }

  private async safeLoadRecipients<T extends ParentNotificationRecipient>(
    automationEvent: string,
    referenceType: string,
    referenceId: string,
    loader: () => Promise<T[]>
  ): Promise<T[] | null> {
    try {
      const recipients = await loader();

      if (recipients.length === 0) {
        logger.debug(
          {
            automationEvent,
            referenceType,
            referenceId
          },
          "Automation completed with no recipients"
        );
      }

      return recipients;
    } catch (error) {
      logger.error(
        {
          automationEvent,
          referenceType,
          referenceId,
          err: error
        },
        "Automation recipient resolution failed"
      );

      return null;
    }
  }

  private async notifyRecipients<
    T extends ParentNotificationRecipient | RouteParentNotificationRecipient
  >(
    automationEvent: string,
    referenceType: string,
    referenceId: string,
    recipients: T[],
    builder: (recipient: T) => {
      notificationType: string;
      title: string;
      message: string;
    }
  ): Promise<void> {
    for (const recipient of recipients) {
      const notification = builder(recipient);

      try {
        await this.communicationRepository.createNotification({
          userId: recipient.parentUserId,
          title: notification.title,
          message: notification.message,
          notificationType: notification.notificationType,
          referenceType,
          referenceId
        });
      } catch (error) {
        logger.error(
          {
            automationEvent,
            referenceType,
            referenceId,
            recipientCount: recipients.length,
            recipientUserId: recipient.parentUserId,
            err: error
          },
          "Automation notification delivery failed"
        );
      }
    }
  }
}

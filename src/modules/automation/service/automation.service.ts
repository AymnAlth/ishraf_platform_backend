import { createHash } from "node:crypto";

import { requestExecutionContextService } from "../../../common/services/request-execution-context.service";
import { toDateOnly } from "../../../common/utils/date.util";
import { logger } from "../../../config/logger";
import { IntegrationOutboxRepository } from "../../../common/repositories/integration-outbox.repository";
import { CommunicationRepository } from "../../communication/repository/communication.repository";
import type { SystemSettingsReadService } from "../../system-settings/service/system-settings-read.service";
import { AutomationRepository } from "../repository/automation.repository";
import type {
  AutomationPort,
  NegativeBehaviorAutomationContext,
  ParentNotificationRecipient,
  RouteParentNotificationRecipient,
  StudentAbsentAutomationContext,
  TripEndedAutomationContext,
  TripStartedAutomationContext,
  TripStudentEventAutomationContext
} from "../types/automation.types";

interface TransportPushPayload {
  targetUserIds: string[];
  subscriptionKey: "transportRealtime";
  title: string;
  body: string;
  data: {
    eventType: string;
    tripId: string;
    routeId: string;
    studentId?: string;
    notificationType?: string;
  };
  referenceType: string;
  referenceId: string;
}

const buildTargetHash = (userIds: string[]): string =>
  createHash("sha256").update([...new Set(userIds)].sort().join(",")).digest("hex").slice(0, 20);

const buildStudentEventPresentation = (
  context: TripStudentEventAutomationContext
): { title: string; body: string; notificationType: string; dataEventType: string } => {
  if (context.eventType === "boarded") {
    return {
      title: "صعود الطالب إلى الحافلة",
      body: `تم تسجيل صعود الطالب ${context.studentName} إلى حافلة النقل${context.stopName ? ` عند نقطة ${context.stopName}` : ""}.`,
      notificationType: "transport_student_boarded",
      dataEventType: "boarded"
    };
  }

  if (context.eventType === "absent") {
    return {
      title: "غياب الطالب عن رحلة النقل",
      body: `تم تسجيل غياب الطالب ${context.studentName} عن رحلة النقل.`,
      notificationType: "transport_student_absent",
      dataEventType: "absent"
    };
  }

  return {
    title: "وصول الطالب",
    body: `تم تسجيل نزول الطالب ${context.studentName} من حافلة النقل${context.stopName ? ` عند نقطة ${context.stopName}` : ""}.`,
    notificationType: "transport_student_dropped_off",
    dataEventType: "dropped_off"
  };
};

export class AutomationService implements AutomationPort {
  constructor(
    private readonly automationRepository: AutomationRepository = new AutomationRepository(),
    private readonly communicationRepository: CommunicationRepository = new CommunicationRepository(),
    private readonly systemSettingsReadService: SystemSettingsReadService | null = null,
    private readonly integrationOutboxRepository: IntegrationOutboxRepository = new IntegrationOutboxRepository()
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

    await this.enqueueTransportPush(
      "trip_started",
      {
        aggregateType: "trip",
        aggregateId: context.tripId,
        title: "بدء رحلة الحافلة",
        body: `بدأت رحلة النقل على المسار ${context.routeName} بتاريخ ${tripDate}.`,
        data: {
          eventType: "trip_started",
          tripId: context.tripId,
          routeId: context.routeId,
          notificationType: "transport_trip_started"
        },
        referenceType: "trip",
        referenceId: context.tripId
      },
      recipients.map((recipient) => recipient.parentUserId)
    );
  }

  async onTripEnded(context: TripEndedAutomationContext): Promise<void> {
    const tripDate = toDateOnly(context.tripDate);
    const recipients = await this.safeLoadRecipients(
      "trip_ended",
      "trip",
      context.tripId,
      () => this.automationRepository.listRouteParentRecipients(context.routeId, tripDate)
    );

    if (!recipients) {
      return;
    }

    await this.enqueueTransportPush(
      "trip_ended",
      {
        aggregateType: "trip",
        aggregateId: context.tripId,
        title: "انتهاء رحلة الحافلة",
        body: `انتهت رحلة النقل على المسار ${context.routeName} بتاريخ ${tripDate}.`,
        data: {
          eventType: "trip_ended",
          tripId: context.tripId,
          routeId: context.routeId,
          notificationType: "transport_trip_ended"
        },
        referenceType: "trip",
        referenceId: context.tripId
      },
      recipients.map((recipient) => recipient.parentUserId)
    );
  }

  async onTripStudentEventRecorded(context: TripStudentEventAutomationContext): Promise<void> {
    const recipients = await this.safeLoadRecipients(
      "trip_student_event",
      "trip_student_event",
      context.tripStudentEventId,
      () => this.automationRepository.listParentRecipientsForStudent(context.studentId)
    );

    if (!recipients) {
      return;
    }

    const presentation = buildStudentEventPresentation(context);

    if (context.eventType === "dropped_off") {
      await this.notifyRecipients(
        "student_dropped_off",
        "trip_student_event",
        context.tripStudentEventId,
        recipients,
        () => ({
          notificationType: presentation.notificationType,
          title: presentation.title,
          message: presentation.body
        })
      );
    }

    await this.enqueueTransportPush(
      "trip_student_event",
      {
        aggregateType: "trip_student_event",
        aggregateId: context.tripStudentEventId,
        title: presentation.title,
        body: presentation.body,
        data: {
          eventType: presentation.dataEventType,
          tripId: context.tripId,
          routeId: context.routeId,
          studentId: context.studentId,
          notificationType: presentation.notificationType
        },
        referenceType: "trip_student_event",
        referenceId: context.tripStudentEventId
      },
      recipients.map((recipient) => recipient.parentUserId)
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

  private async enqueueTransportPush(
    automationEvent: string,
    payload: Omit<TransportPushPayload, "targetUserIds" | "subscriptionKey"> & {
      aggregateType: string;
      aggregateId: string;
    },
    parentUserIds: string[]
  ): Promise<void> {
    try {
      const pushSettings = await this.systemSettingsReadService?.getPushNotificationsSettings();

      if (!pushSettings?.fcmEnabled || !pushSettings.transportRealtimeEnabled) {
        return;
      }

      const adminUserIds = await this.automationRepository.listActiveAdminUserIds();
      const targetUserIds = [...new Set([...parentUserIds, ...adminUserIds])];

      if (targetUserIds.length === 0) {
        return;
      }

      await this.integrationOutboxRepository.enqueueEvent({
        providerKey: "pushNotifications",
        eventType: `fcm.transport.${automationEvent}`,
        aggregateType: payload.aggregateType,
        aggregateId: payload.aggregateId,
        payloadJson: {
          targetUserIds,
          subscriptionKey: "transportRealtime",
          title: payload.title,
          body: payload.body,
          data: payload.data,
          referenceType: payload.referenceType,
          referenceId: payload.referenceId
        } satisfies TransportPushPayload,
        headersJson: {},
        idempotencyKey: `fcm:fcm.transport.${automationEvent}:${payload.referenceType}:${payload.referenceId}:${buildTargetHash(targetUserIds)}`,
        requestId: requestExecutionContextService.getCurrentContext()?.requestId ?? null
      });
    } catch (error) {
      logger.error(
        {
          automationEvent,
          aggregateType: payload.aggregateType,
          aggregateId: payload.aggregateId,
          err: error
        },
        "Automation transport push enqueue failed"
      );
    }
  }
}

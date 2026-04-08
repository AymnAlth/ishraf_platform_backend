import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { requestExecutionContextService } from "../../../common/services/request-execution-context.service";
import { IntegrationOutboxRepository } from "../../../common/repositories/integration-outbox.repository";
import { db } from "../../../database/db";
import type { SystemSettingsReadService } from "../../system-settings/service/system-settings-read.service";
import { TransportEtaRepository } from "../repository/transport-eta.repository";
import type { TransportEtaStopRecipientRow } from "../types/transport-eta.types";

const PROXIMITY_APPROACHING_EVENT_TYPE = "fcm.transport.bus_approaching";
const PROXIMITY_APPROACHING_TITLE_AR = "اقتراب الحافلة";
const PROXIMITY_APPROACHING_NOTIFICATION_TYPE = "transport_bus_approaching";
const PROXIMITY_ARRIVAL_EVENT_TYPE = "fcm.transport.bus_arrived";
const PROXIMITY_ARRIVAL_TITLE_AR = "وصول الحافلة";
const PROXIMITY_ARRIVAL_NOTIFICATION_TYPE = "transport_bus_arrived";

type ProximityEventKind = "bus_approaching" | "bus_arrived";

interface TransportProximityPushPayload {
  targetUserIds: string[];
  subscriptionKey: "transportRealtime";
  title: string;
  body: string;
  data: {
    eventType: ProximityEventKind;
    tripId: string;
    routeId: string;
    studentIds: string[];
    notificationType: string;
  };
  referenceType: "trip_stop";
  referenceId: string;
}

interface GroupedProximityRecipient {
  stopId: string;
  parentUserId: string;
  studentIds: string[];
  studentFullNames: string[];
}

const buildProximityIdempotencyKey = (
  eventType: string,
  tripId: string,
  stopId: string,
  parentUserId: string
): string =>
  `fcm:${eventType}:trip:${tripId}:stop:${stopId}:parent:${parentUserId}`;

const buildApproachingBodyArabic = (studentFullNames: string[]): string => {
  const names = studentFullNames.join("، ");

  if (studentFullNames.length === 1) {
    return `حافلة الطالب ${names} تقترب من المحطة، ستصل خلال دقائق.`;
  }

  return `حافلة الطلاب ${names} تقترب من المحطة، ستصل خلال دقائق.`;
};

const buildArrivalBodyArabic = (studentFullNames: string[]): string => {
  const names = studentFullNames.join(" و ");

  if (studentFullNames.length === 1) {
    return `الحافلة بالخارج في انتظار الطالب ${names}.`;
  }

  return `الحافلة بالخارج في انتظار الطلاب ${names}.`;
};

const groupRecipientsPerStopAndParent = (
  recipients: TransportEtaStopRecipientRow[]
): GroupedProximityRecipient[] => {
  const selected = new Map<
    string,
    {
      stopId: string;
      parentUserId: string;
      students: Map<string, string>;
    }
  >();

  for (const recipient of recipients) {
    const key = `${recipient.stopId}:${recipient.parentUserId}`;

    const grouped = selected.get(key) ?? {
      stopId: recipient.stopId,
      parentUserId: recipient.parentUserId,
      students: new Map<string, string>()
    };

    grouped.students.set(recipient.studentId, recipient.studentFullName);
    selected.set(key, grouped);
  }

  return [...selected.values()].map((grouped) => {
    const sortedStudents = [...grouped.students.entries()]
      .map(([studentId, studentFullName]) => ({ studentId, studentFullName }))
      .sort(
        (left, right) =>
          left.studentFullName.localeCompare(right.studentFullName) ||
          left.studentId.localeCompare(right.studentId)
      );

    return {
      stopId: grouped.stopId,
      parentUserId: grouped.parentUserId,
      studentIds: sortedStudents.map((student) => student.studentId),
      studentFullNames: sortedStudents.map((student) => student.studentFullName)
    };
  });
};

export interface TransportProximityServicePort {
  evaluateTripProximityAlerts(tripId: string, routeId: string): Promise<number>;
}

export class TransportProximityService implements TransportProximityServicePort {
  constructor(
    private readonly transportEtaRepository: TransportEtaRepository = new TransportEtaRepository(),
    private readonly integrationOutboxRepository: IntegrationOutboxRepository = new IntegrationOutboxRepository(),
    private readonly systemSettingsReadService: SystemSettingsReadService | null = null
  ) {}

  async evaluateTripProximityAlerts(tripId: string, routeId: string): Promise<number> {
    const pushSettings = await this.systemSettingsReadService?.getPushNotificationsSettings();

    if (pushSettings && (!pushSettings.fcmEnabled || !pushSettings.transportRealtimeEnabled)) {
      return 0;
    }

    return db.withTransaction(async (client) => {
      const claimedApproachingStops =
        await this.transportEtaRepository.claimApproachingStopNotifications(
          tripId,
          300,
          500,
          client
        );
      const approachingRecipients = await this.transportEtaRepository.listStopRecipientsByTripStops(
        tripId,
        claimedApproachingStops.map((stop) => stop.stopId),
        client
      );
      const groupedApproachingRecipients = groupRecipientsPerStopAndParent(approachingRecipients);
      const claimedArrivedStops = await this.transportEtaRepository.claimArrivedStopNotifications(
        tripId,
        50,
        client
      );
      const arrivedRecipients = await this.transportEtaRepository.listStopRecipientsByTripStops(
        tripId,
        claimedArrivedStops.map((stop) => stop.stopId),
        client
      );
      const groupedArrivedRecipients = groupRecipientsPerStopAndParent(arrivedRecipients);

      await this.enqueueGroupedProximityAlerts({
        tripId,
        routeId,
        groupedRecipients: groupedApproachingRecipients,
        eventType: PROXIMITY_APPROACHING_EVENT_TYPE,
        eventKind: "bus_approaching",
        notificationTitle: PROXIMITY_APPROACHING_TITLE_AR,
        notificationType: PROXIMITY_APPROACHING_NOTIFICATION_TYPE,
        bodyBuilder: buildApproachingBodyArabic,
        client
      });
      await this.enqueueGroupedProximityAlerts({
        tripId,
        routeId,
        groupedRecipients: groupedArrivedRecipients,
        eventType: PROXIMITY_ARRIVAL_EVENT_TYPE,
        eventKind: "bus_arrived",
        notificationTitle: PROXIMITY_ARRIVAL_TITLE_AR,
        notificationType: PROXIMITY_ARRIVAL_NOTIFICATION_TYPE,
        bodyBuilder: buildArrivalBodyArabic,
        client
      });

      return groupedApproachingRecipients.length + groupedArrivedRecipients.length;
    });
  }

  private async enqueueGroupedProximityAlerts(input: {
    tripId: string;
    routeId: string;
    groupedRecipients: GroupedProximityRecipient[];
    eventType: string;
    eventKind: ProximityEventKind;
    notificationTitle: string;
    notificationType: string;
    bodyBuilder: (studentFullNames: string[]) => string;
    client: Queryable;
  }): Promise<void> {
    for (const recipient of input.groupedRecipients) {
      const referenceId = `${input.tripId}:${recipient.stopId}`;

      const payload: TransportProximityPushPayload = {
        targetUserIds: [recipient.parentUserId],
        subscriptionKey: "transportRealtime",
        title: input.notificationTitle,
        body: input.bodyBuilder(recipient.studentFullNames),
        data: {
          eventType: input.eventKind,
          tripId: input.tripId,
          routeId: input.routeId,
          studentIds: recipient.studentIds,
          notificationType: input.notificationType
        },
        referenceType: "trip_stop",
        referenceId
      };

      await this.integrationOutboxRepository.enqueueEvent(
        {
          providerKey: "pushNotifications",
          eventType: input.eventType,
          aggregateType: "trip_stop",
          aggregateId: referenceId,
          payloadJson: payload,
          headersJson: {},
          idempotencyKey: buildProximityIdempotencyKey(
            input.eventType,
            input.tripId,
            recipient.stopId,
            recipient.parentUserId
          ),
          requestId: requestExecutionContextService.getCurrentContext()?.requestId ?? null
        },
        input.client
      );
    }
  }
}

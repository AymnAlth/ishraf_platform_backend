import { IntegrationOutboxRepository } from "../../common/repositories/integration-outbox.repository";
import { firebasePushService } from "../../integrations/firebase/firebase-push.service";
import { CommunicationRepository } from "../communication/repository/communication.repository";
import { systemSettingsReadService } from "../system-settings";
import { AutomationRepository } from "./repository/automation.repository";
import { AutomationService } from "./service/automation.service";
import { FirebaseOutboxProcessorService } from "./service/firebase-outbox-processor.service";

const automationRepository = new AutomationRepository();
const communicationRepository = new CommunicationRepository();
const integrationOutboxRepository = new IntegrationOutboxRepository();

export const automationService = new AutomationService(
  automationRepository,
  communicationRepository,
  systemSettingsReadService,
  integrationOutboxRepository
);

export const firebaseOutboxProcessorService = new FirebaseOutboxProcessorService(
  integrationOutboxRepository,
  communicationRepository,
  systemSettingsReadService,
  firebasePushService
);

import { CommunicationRepository } from "../communication/repository/communication.repository";
import { AutomationRepository } from "./repository/automation.repository";
import { AutomationService } from "./service/automation.service";

const automationRepository = new AutomationRepository();
const communicationRepository = new CommunicationRepository();

export const automationService = new AutomationService(
  automationRepository,
  communicationRepository
);

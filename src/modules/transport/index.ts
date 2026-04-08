import type { AppModule } from "../../common/interfaces/app-module.interface";
import { IntegrationOutboxRepository } from "../../common/repositories/integration-outbox.repository";
import { firebaseRealtimeAuthService } from "../../integrations/firebase/firebase-realtime-auth.service";
import { mapsEtaProviderResolver } from "../../integrations/maps/maps-eta-provider.resolver";
import { systemSettingsReadService } from "../system-settings";
import { automationService } from "../automation";
import { TransportController } from "./controller/transport.controller";
import { TransportEtaRepository } from "./repository/transport-eta.repository";
import { TransportEtaOutboxRepository } from "./repository/transport-eta-outbox.repository";
import { TransportRepository } from "./repository/transport.repository";
import { createTransportRouter } from "./routes/transport.routes";
import { TransportEtaOutboxProcessorService } from "./service/transport-eta-outbox-processor.service";
import { TransportProximityService } from "./service/transport-proximity.service";
import { TransportEtaService } from "./service/transport-eta.service";
import { TransportService } from "./service/transport.service";

const transportRepository = new TransportRepository();
const transportEtaRepository = new TransportEtaRepository();
const transportEtaOutboxRepository = new TransportEtaOutboxRepository();
const integrationOutboxRepository = new IntegrationOutboxRepository();
const transportProximityService = new TransportProximityService(
  transportEtaRepository,
  integrationOutboxRepository,
  systemSettingsReadService
);
export const transportEtaService = new TransportEtaService(
  transportRepository,
  transportEtaRepository,
  systemSettingsReadService,
  mapsEtaProviderResolver,
  transportProximityService
);
export const transportEtaOutboxProcessorService = new TransportEtaOutboxProcessorService(
  transportEtaOutboxRepository,
  transportEtaService
);
const transportService = new TransportService(
  transportRepository,
  undefined,
  undefined,
  automationService,
  systemSettingsReadService,
  firebaseRealtimeAuthService,
  transportEtaService,
  transportEtaOutboxRepository,
  transportEtaRepository
);
const transportController = new TransportController(transportService);

export const transportModule: AppModule = {
  name: "transport",
  basePath: "/transport",
  router: createTransportRouter(transportController)
};

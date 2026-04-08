import type {
  EtaProvider,
  TransportMapsSettings
} from "../../modules/system-settings/types/system-settings.types";
import { googleMapsAdapter, GoogleMapsAdapter } from "./google-maps.adapter";
import { mapboxAdapter, MapboxAdapter } from "./mapbox.adapter";
import type { MapsEtaProviderPort } from "./types/maps-eta-provider.types";

export interface ResolvedMapsEtaProvider {
  selection: EtaProvider;
  providerKey: string;
  provider: MapsEtaProviderPort | null;
  isProviderEnabled: boolean;
  isProviderConfigured: boolean;
}

export interface MapsEtaProviderResolverPort {
  resolve(settings: TransportMapsSettings): ResolvedMapsEtaProvider;
}

export class MapsEtaProviderResolver implements MapsEtaProviderResolverPort {
  constructor(
    private readonly mapbox: MapsEtaProviderPort = mapboxAdapter,
    private readonly google: MapsEtaProviderPort = googleMapsAdapter
  ) {}

  resolve(settings: TransportMapsSettings): ResolvedMapsEtaProvider {
    if (settings.etaProvider === "google") {
      const isProviderEnabled = settings.googleMapsEtaEnabled;
      const isProviderConfigured = this.google.isConfigured();

      return {
        selection: settings.etaProvider,
        providerKey: this.google.providerKey,
        provider: isProviderEnabled && isProviderConfigured ? this.google : null,
        isProviderEnabled,
        isProviderConfigured
      };
    }

    const isProviderConfigured = this.mapbox.isConfigured();

    return {
      selection: settings.etaProvider,
      providerKey: this.mapbox.providerKey,
      provider: isProviderConfigured ? this.mapbox : null,
      isProviderEnabled: true,
      isProviderConfigured
    };
  }
}

export const mapsEtaProviderResolver = new MapsEtaProviderResolver();
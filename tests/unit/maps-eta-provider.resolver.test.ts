import { describe, expect, it } from "vitest";

import { MapsEtaProviderResolver } from "../../src/integrations/maps/maps-eta-provider.resolver";
import type { MapsEtaProviderPort } from "../../src/integrations/maps/types/maps-eta-provider.types";
import type { TransportMapsSettings } from "../../src/modules/system-settings/types/system-settings.types";

const createProvider = (
  providerKey: string,
  configured: boolean
): MapsEtaProviderPort => ({
  providerKey,
  isConfigured: () => configured,
  computeRouteGeometryForStops: async () => {
    throw new Error("not used");
  },
  computeTrafficAwareTripEta: async () => {
    throw new Error("not used");
  }
});

const createSettings = (
  overrides: Partial<TransportMapsSettings> = {}
): TransportMapsSettings => ({
  etaProvider: "mapbox",
  etaDerivedEstimateEnabled: true,
  googleMapsEtaEnabled: false,
  etaProviderRefreshIntervalSeconds: 300,
  etaProviderDeviationThresholdMeters: 300,
  ...overrides
});

describe("MapsEtaProviderResolver", () => {
  it("returns mapbox when selected and configured", () => {
    const resolver = new MapsEtaProviderResolver(
      createProvider("mapboxDirections", true),
      createProvider("googleRoutes", true)
    );

    const result = resolver.resolve(createSettings({ etaProvider: "mapbox" }));

    expect(result.providerKey).toBe("mapboxDirections");
    expect(result.provider?.providerKey).toBe("mapboxDirections");
    expect(result.isProviderEnabled).toBe(true);
    expect(result.isProviderConfigured).toBe(true);
  });

  it("requires googleMapsEtaEnabled before resolving google", () => {
    const resolver = new MapsEtaProviderResolver(
      createProvider("mapboxDirections", true),
      createProvider("googleRoutes", true)
    );

    const result = resolver.resolve(
      createSettings({
        etaProvider: "google",
        googleMapsEtaEnabled: false
      })
    );

    expect(result.providerKey).toBe("googleRoutes");
    expect(result.provider).toBeNull();
    expect(result.isProviderEnabled).toBe(false);
    expect(result.isProviderConfigured).toBe(true);
  });

  it("does not silently fail over to google when mapbox is unavailable", () => {
    const resolver = new MapsEtaProviderResolver(
      createProvider("mapboxDirections", false),
      createProvider("googleRoutes", true)
    );

    const result = resolver.resolve(createSettings({ etaProvider: "mapbox" }));

    expect(result.providerKey).toBe("mapboxDirections");
    expect(result.provider).toBeNull();
    expect(result.isProviderEnabled).toBe(true);
    expect(result.isProviderConfigured).toBe(false);
  });
});
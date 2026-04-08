import { describe, expect, it } from "vitest";

import {
  decodeGooglePolyline,
  projectPointOntoPolyline
} from "../../src/modules/transport/service/transport-eta.geometry";

describe("transport-eta.geometry", () => {
  it("decodes Google encoded polylines into latitude/longitude points", () => {
    const points = decodeGooglePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");

    expect(points).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 }
    ]);
  });

  it("projects a point onto a polyline and returns a midpoint-like distance", () => {
    const result = projectPointOntoPolyline(
      {
        latitude: 14.001,
        longitude: 44.005
      },
      [
        { latitude: 14, longitude: 44 },
        { latitude: 14, longitude: 44.01 }
      ]
    );

    expect(result.geometryTotalDistanceMeters).toBeGreaterThan(1_000);
    expect(result.geometryProjectedDistanceMeters).toBeGreaterThan(400);
    expect(result.geometryProjectedDistanceMeters).toBeLessThan(700);
    expect(result.deviationMeters).toBeGreaterThan(0);
  });
});

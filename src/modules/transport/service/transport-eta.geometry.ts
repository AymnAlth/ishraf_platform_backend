interface LatLngPoint {
  latitude: number;
  longitude: number;
}

interface XYPoint {
  x: number;
  y: number;
}

export interface PolylineProjectionResult {
  geometryProjectedDistanceMeters: number;
  geometryTotalDistanceMeters: number;
  deviationMeters: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (value: number): number => (value * Math.PI) / 180;

export const decodeGooglePolyline = (encoded: string): LatLngPoint[] => {
  if (!encoded) {
    return [];
  }

  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const points: LatLngPoint[] = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5
    });
  }

  return points;
};

export const haversineDistanceMeters = (from: LatLngPoint, to: LatLngPoint): number => {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitudeA = toRadians(from.latitude);
  const latitudeB = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
};

const toXYPoints = (points: LatLngPoint[], referenceLatitude: number): XYPoint[] => {
  const latitudeScale = toRadians(1) * EARTH_RADIUS_METERS;
  const longitudeScale = Math.cos(toRadians(referenceLatitude)) * latitudeScale;

  return points.map((point) => ({
    x: point.longitude * longitudeScale,
    y: point.latitude * latitudeScale
  }));
};

const squaredDistance = (left: XYPoint, right: XYPoint): number =>
  (left.x - right.x) ** 2 + (left.y - right.y) ** 2;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

export const projectPointOntoPolyline = (
  point: LatLngPoint,
  polylinePoints: LatLngPoint[]
): PolylineProjectionResult => {
  if (polylinePoints.length === 0) {
    return {
      geometryProjectedDistanceMeters: 0,
      geometryTotalDistanceMeters: 0,
      deviationMeters: Number.POSITIVE_INFINITY
    };
  }

  if (polylinePoints.length === 1) {
    return {
      geometryProjectedDistanceMeters: 0,
      geometryTotalDistanceMeters: 0,
      deviationMeters: haversineDistanceMeters(point, polylinePoints[0])
    };
  }

  const referenceLatitude =
    polylinePoints.reduce((sum, item) => sum + item.latitude, 0) / polylinePoints.length;
  const xyPolyline = toXYPoints(polylinePoints, referenceLatitude);
  const xyPoint = toXYPoints([point], referenceLatitude)[0];
  let bestProjectionDistance = 0;
  let bestDeviationSquared = Number.POSITIVE_INFINITY;
  let cumulativeDistance = 0;

  for (let index = 0; index < xyPolyline.length - 1; index += 1) {
    const start = xyPolyline[index];
    const end = xyPolyline[index + 1];
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;
    const segmentLength = Math.sqrt(segmentLengthSquared);
    const t =
      segmentLengthSquared === 0
        ? 0
        : clamp(
            ((xyPoint.x - start.x) * deltaX + (xyPoint.y - start.y) * deltaY) /
              segmentLengthSquared,
            0,
            1
          );
    const projection = {
      x: start.x + deltaX * t,
      y: start.y + deltaY * t
    };
    const deviationSquared = squaredDistance(xyPoint, projection);

    if (deviationSquared < bestDeviationSquared) {
      bestDeviationSquared = deviationSquared;
      bestProjectionDistance = cumulativeDistance + segmentLength * t;
    }

    cumulativeDistance += segmentLength;
  }

  return {
    geometryProjectedDistanceMeters: bestProjectionDistance,
    geometryTotalDistanceMeters: cumulativeDistance,
    deviationMeters: Math.sqrt(bestDeviationSquared)
  };
};

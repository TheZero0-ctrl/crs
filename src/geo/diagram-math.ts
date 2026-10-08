import { to5186, from5186, type GeographicPoint } from './coordinates';

export function ellipsoidSection(latitude: number, a = 90, b = 72) {
  const phi = latitude * Math.PI / 180;
  const denominator = Math.hypot(a * Math.cos(phi), b * Math.sin(phi));
  return {
    point: [a * a * Math.cos(phi) / denominator, b * b * Math.sin(phi) / denominator] as [number, number],
    normal: [Math.cos(phi), Math.sin(phi)] as [number, number],
  };
}

export function longitudeInterval(point: GeographicPoint) {
  const start = Math.min(point.longitude, 179);
  return { start: [start, point.latitude] as [number, number], end: [start + 1, point.latitude] as [number, number] };
}

export function gridGuides(point: GeographicPoint) {
  const projected = to5186(point);
  return {
    origin: [200000, 600000] as [number, number],
    corner: [projected.easting, 600000] as [number, number],
    point: [projected.easting, projected.northing] as [number, number],
    deltaE: projected.easting - 200000,
    deltaN: projected.northing - 600000,
  };
}

export function relabelledLocation(point: GeographicPoint): GeographicPoint {
  return from5186({ easting: point.longitude, northing: point.latitude });
}

import type { Geometry, Feature, FeatureCollection, Position } from 'geojson';
import type { ExampleKind } from '../geojson-lessons';
import { validateGeographic, type GeographicPoint } from './coordinates';

export const geometryTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'] as const;
export type GeometryType = typeof geometryTypes[number];
export type ExampleOptions = {
  point: GeographicPoint; height: number; geometry: GeometryType; hole: boolean; name: string; split: boolean;
  line?: Position[]; polygonScale?: number; holeScale?: number; includeRoute?: boolean;
  crossing?: { west: number; east: number; latitude: number };
};
export type Example = Geometry | Feature | FeatureCollection;

export function formatGeoJson(example: Example): string {
  // Compact numeric arrays so each position reads as one pair. The required
  // literal newlines prevent this from matching text inside JSON strings.
  return JSON.stringify(example, null, 2).replace(/\[\n[\s\d.eE+,-]+\n\s*\]/g, array => `[${(JSON.parse(array) as number[]).join(', ')}]`);
}
const line: Position[] = [[126.7, 37.3], [127.05, 37.7], [127.4, 37.4]];
const exterior: Position[] = [[126.7, 37.3], [127.4, 37.3], [127.4, 37.8], [126.7, 37.8], [126.7, 37.3]];
const interior: Position[] = [[126.9, 37.45], [126.9, 37.65], [127.2, 37.65], [127.2, 37.45], [126.9, 37.45]];
const other: Position[] = [[127.6, 37.3], [127.9, 37.3], [127.9, 37.6], [127.6, 37.6], [127.6, 37.3]];

export const initialLine = () => line.map(position => [...position]);

export function lineBounds(positions: Position[]): [number, number, number, number] {
  return [Math.min(...positions.map(p => p[0])), Math.min(...positions.map(p => p[1])), Math.max(...positions.map(p => p[0])), Math.max(...positions.map(p => p[1]))];
}

export function exampleGeometry(options: ExampleOptions): Geometry {
  const { longitude, latitude } = options.point;
  const point: Geometry = { type: 'Point', coordinates: [longitude, latitude] };
  const route = options.line ?? line;
  const resize = (ring: Position[], factor: number) => ring.map(([lon, lat]) => [Number((127.05 + (lon - 127.05) * factor).toFixed(6)), Number((37.55 + (lat - 37.55) * factor).toFixed(6))]);
  const outer = resize(exterior, options.polygonScale ?? 1);
  const inner = resize(interior, (options.polygonScale ?? 1) * (options.holeScale ?? 1));
  const rings = options.hole ? [outer, inner] : [outer];
  switch (options.geometry) {
    case 'Point': return point;
    case 'LineString': return { type: 'LineString', coordinates: route };
    case 'Polygon': return { type: 'Polygon', coordinates: rings };
    case 'MultiPoint': return { type: 'MultiPoint', coordinates: route };
    case 'MultiLineString': return { type: 'MultiLineString', coordinates: [route, [[126.7, 37.9], [127.4, 38.1]]] };
    case 'MultiPolygon': return { type: 'MultiPolygon', coordinates: [rings, [other]] };
    case 'GeometryCollection': return { type: 'GeometryCollection', geometries: [point, { type: 'LineString', coordinates: route }] };
  }
}

export function createExample(kind: ExampleKind, options: ExampleOptions): Example {
  const coordinates = [options.point.longitude, options.point.latitude];
  const point: Geometry = { type: 'Point', coordinates };
  const feature: Feature = { type: 'Feature', id: 'place-1', geometry: point, properties: { name: options.name } };
  switch (kind) {
    case 'geometry': return exampleGeometry(options);
    case 'rings': return exampleGeometry({ ...options, geometry: 'Polygon' });
    case 'height': return { type: 'Point', coordinates: [...coordinates, options.height] };
    case 'feature': return feature;
    case 'collection': return { type: 'FeatureCollection', features: [feature, ...(options.includeRoute === false ? [] : [{ type: 'Feature' as const, id: 'route-1', geometry: { type: 'LineString' as const, coordinates: options.line ?? line }, properties: { name: 'Example route' } }])] };
    case 'bbox': return { type: 'LineString', bbox: lineBounds(options.line ?? line), coordinates: options.line ?? line };
    case 'antimeridian': {
      const { west, east, latitude } = options.crossing ?? { west: 170, east: -170, latitude: 45 };
      return options.split
        ? { type: 'MultiLineString', bbox: [west, latitude, east, latitude], coordinates: [[[west, latitude], [180, latitude]], [[-180, latitude], [east, latitude]]] }
        : { type: 'LineString', bbox: [east, latitude, west, latitude], coordinates: [[west, latitude], [east, latitude]] };
    }
    default: return point;
  }
}

export function positionsOf(example: Example): Position[] {
  if (example.type === 'Feature') return example.geometry ? positionsOf(example.geometry) : [];
  if (example.type === 'FeatureCollection') return example.features.flatMap(positionsOf);
  if (example.type === 'GeometryCollection') return example.geometries.flatMap(positionsOf);
  const walk = (value: unknown): Position[] => Array.isArray(value) ? typeof value[0] === 'number' ? [value as Position] : value.flatMap(walk) : [];
  return walk(example.coordinates);
}

export const exercises = [
  { name: 'Coordinate order', instruction: 'This Point should locate Seoul at 126.978° east and 37.5665° north. Repair the coordinate order.', broken: { type: 'Point', coordinates: [37.5665, 126.978] }, solution: { type: 'Point', coordinates: [126.978, 37.5665] } },
  { name: 'Close the ring', instruction: 'Close this triangular polygon by repeating its first position at the end.', broken: { type: 'Polygon', coordinates: [[[126, 37], [127, 37], [127, 38]]] }, solution: { type: 'Polygon', coordinates: [[[126, 37], [127, 37], [127, 38], [126, 37]]] } },
  { name: 'Array nesting', instruction: 'A LineString stores an array of positions. Remove the extra level of brackets.', broken: { type: 'LineString', coordinates: [[[126, 37], [127, 38]]] }, solution: { type: 'LineString', coordinates: [[126, 37], [127, 38]] } },
  { name: 'Metres versus degrees', instruction: 'The EPSG:5186 natural origin is E 200000 m, N 600000 m. Its WGS 84 position is 127° east, 38° north in this educational transformation. Replace the metre values with those geographic values.', broken: { type: 'Point', coordinates: [200000, 600000] }, solution: { type: 'Point', coordinates: [127, 38] } },
];

// These are targeted exercise checks, not a general-purpose GeoJSON validator.
export function checkExercise(text: string, index: number): string | null {
  let value: { type?: unknown; coordinates?: unknown };
  try { value = JSON.parse(text); } catch { return 'Use valid JSON with double quotes and no trailing commas.'; }
  if (!value || typeof value !== 'object') return 'The example must be a JSON object.';
  const exercise = exercises[index];
  if (!exercise || value.type !== exercise.solution.type) return 'Keep the geometry type named in the exercise.';
  if (JSON.stringify(value.coordinates) !== JSON.stringify(exercise.solution.coordinates)) return exercise.instruction;
  return null;
}

export function pointFromUrl(url: URL, fallback: GeographicPoint): GeographicPoint {
  if (!url.searchParams.has('lon') || !url.searchParams.has('lat')) return fallback;
  const lon = url.searchParams.get('lon')!, lat = url.searchParams.get('lat')!;
  if (!lon.trim() || !lat.trim()) return fallback;
  const point = { longitude: Number(lon), latitude: Number(lat) };
  try { validateGeographic(point); return point; } catch { return fallback; }
}

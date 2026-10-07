import proj4 from 'proj4';

export type GeographicPoint = { longitude: number; latitude: number };
export type ProjectedPoint = { easting: number; northing: number };

// Proj4js uses conventional east/north arrays. Authority order is handled explicitly below.
export const definition5186 = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0 +units=m +no_defs';
proj4.defs('EPSG:5186', definition5186);

export const presets: Record<string, GeographicPoint> = {
  Seoul: { longitude: 126.978, latitude: 37.5665 },
  Suwon: { longitude: 127.0286, latitude: 37.2636 },
  Daejeon: { longitude: 127.3845, latitude: 36.3504 },
  Jeju: { longitude: 126.5312, latitude: 33.4996 },
  Busan: { longitude: 129.0756, latitude: 35.1796 },
  'Natural origin': { longitude: 127, latitude: 38 },
};

export const worldPresets: Record<string, GeographicPoint> = {
  Greenwich: { longitude: 0, latitude: 51.4779 },
  'New Delhi': { longitude: 77.209, latitude: 28.6139 },
  'New York': { longitude: -74.006, latitude: 40.7128 },
  Quito: { longitude: -78.4678, latitude: -0.1807 },
  'Cape Town': { longitude: 18.4241, latitude: -33.9249 },
  Sydney: { longitude: 151.2093, latitude: -33.8688 },
  Tokyo: { longitude: 139.6917, latitude: 35.6895 },
  Seoul: presets.Seoul,
};

export function validateGeographic(point: GeographicPoint): void {
  if (!Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) throw new Error('Enter a finite number in both coordinate fields.');
  if (point.longitude < -180 || point.longitude > 180) throw new Error('Longitude must be between -180° and 180°.');
  if (point.latitude < -90 || point.latitude > 90) throw new Error('Latitude must be between -90° and 90°.');
}

export function within5186Area(point: GeographicPoint): boolean {
  return point.longitude >= 126 && point.longitude <= 128 && point.latitude >= 33.14 && point.latitude <= 38.33;
}

export function to5186(point: GeographicPoint): ProjectedPoint {
  validateGeographic(point);
  // The educational lab stays near Korea; do not present distant TM results as useful coordinates.
  if (point.longitude < 120 || point.longitude > 135 || point.latitude < 25 || point.latitude > 45) {
    throw new Error('The EPSG:5186 lab is limited to the region around Korea, 120–135°E and 25–45°N.');
  }
  const [easting, northing] = proj4('EPSG:4326', 'EPSG:5186', [point.longitude, point.latitude]);
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) throw new Error('This position cannot be projected.');
  return { easting, northing };
}

export function from5186(point: ProjectedPoint): GeographicPoint {
  if (!Number.isFinite(point.easting) || !Number.isFinite(point.northing)) throw new Error('Enter a finite number in both coordinate fields.');
  const [longitude, latitude] = proj4('EPSG:5186', 'EPSG:4326', [point.easting, point.northing]);
  const geographic = { longitude, latitude };
  validateGeographic(geographic);
  to5186(geographic);
  return geographic;
}

export function axisTuple(point: GeographicPoint | ProjectedPoint, official: boolean): [number, number] {
  if ('longitude' in point) return official ? [point.latitude, point.longitude] : [point.longitude, point.latitude];
  return official ? [point.northing, point.easting] : [point.easting, point.northing];
}

export function degreeLongitudeKm(latitude: number): number {
  const phi = latitude * Math.PI / 180;
  const a = 6378137;
  const e2 = 0.0066943799901413165;
  // Length of one degree measured along the parallel on the WGS 84 ellipsoid.
  return Math.PI / 180 * a * Math.cos(phi) / Math.sqrt(1 - e2 * Math.sin(phi) ** 2) / 1000;
}

export function parseCoordinate(value: string): number {
  if (!value.trim()) throw new Error('Both coordinate fields are required.');
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('Enter a finite number in both coordinate fields.');
  return parsed;
}

export const number = (value: number, digits = 2) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function readSaved<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}
export function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Lessons also work without storage. */ }
}

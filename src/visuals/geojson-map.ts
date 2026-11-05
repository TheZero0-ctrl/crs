import { geoEquirectangular, geoMercator, geoGraticule10, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { Geometry, Position } from 'geojson';
import { world } from '../geo/world';
import { positionsOf, type Example } from '../geo/geojson-examples';
import type { GeographicPoint } from '../geo/coordinates';

export type GeoJsonMapView = { projection: GeoProjection; mercator: boolean };
type MapEditing = Partial<GeoJsonMapView> & { vertices?: Position[]; selectedVertex?: number; hint?: string };

// Draw coordinate-space segments directly. D3's spherical polygon winding and
// great-circle interpolation do not match RFC 7946's planar coordinate rules.
function geometryMarkup(geometry: Geometry, projection: GeoProjection): string {
  const point = (p: Position) => { const xy = projection([p[0], p[1]])!; return `<circle cx="${xy[0]}" cy="${xy[1]}" r="5" class="geojson-point"/>`; };
  const segment = (positions: Position[]) => positions.flatMap((position, i) => {
    if (!i) return [projection([position[0], position[1]])!];
    const previous = positions[i - 1];
    return Array.from({ length: 24 }, (_, n) => {
      const t = (n + 1) / 24;
      return projection([previous[0] + (position[0] - previous[0]) * t, previous[1] + (position[1] - previous[1]) * t])!;
    });
  }).map((xy, i) => `${i ? 'L' : 'M'}${xy[0]},${xy[1]}`).join(' ');
  const line = (positions: Position[]) => `<path d="${segment(positions)}" class="geojson-line"/>`;
  const polygon = (rings: Position[][]) => `<path d="${rings.map(ring => `${segment(ring)} Z`).join(' ')}" class="geojson-polygon" fill-rule="evenodd"/>`;
  switch (geometry.type) {
    case 'Point': return point(geometry.coordinates);
    case 'MultiPoint': return geometry.coordinates.map(point).join('');
    case 'LineString': return line(geometry.coordinates);
    case 'MultiLineString': return geometry.coordinates.map(line).join('');
    case 'Polygon': return polygon(geometry.coordinates);
    case 'MultiPolygon': return geometry.coordinates.map(polygon).join('');
    case 'GeometryCollection': return geometry.geometries.map(g => geometryMarkup(g, projection)).join('');
  }
}

export function geoJsonMap(example: Example, mercator = false, global = false, editing?: MapEditing): string {
  const positions = positionsOf(example);
  global = global || positions.length === 1;
  // Mercator has no finite position at a pole. Fall back for polar examples.
  const polar = !editing?.projection && mercator && positions.some(position => Math.abs(position[1]) >= 85);
  if (polar) mercator = false;
  const projection = editing?.projection ?? (mercator ? geoMercator() : geoEquirectangular());
  if (editing?.projection) {
    mercator = editing.mercator ?? false;
  } else if (global) {
    projection.scale(700 / (2 * Math.PI)).translate([380, 220]);
  } else {
    const lon = positions.map(p => p[0]), lat = positions.map(p => p[1]);
    const west = Math.min(...lon), east = Math.max(...lon), south = Math.min(...lat), north = Math.max(...lat);
    const padding = Math.max(.2, east - west, north - south) * .3;
    const limit = mercator ? 85 : 90;
    projection.fitExtent([[50, 45], [710, 355]], { type: 'MultiPoint', coordinates: [[Math.max(-180, west - padding), Math.max(-limit, south - padding)], [Math.min(180, east + padding), Math.min(limit, north + padding)]] });
  }
  projection.clipExtent([[0, 0], [760, 400]]);
  const path = geoPath(projection);
  const draw = (item: Example): string => item.type === 'Feature' ? item.geometry ? geometryMarkup(item.geometry, projection) : '' : item.type === 'FeatureCollection' ? item.features.map(draw).join('') : geometryMarkup(item, projection);
  const bbox = example.bbox;
  const boxPart = (west: number, east: number) => bbox ? geometryMarkup({ type: 'Polygon', coordinates: [[[west, bbox[1]], [east, bbox[1]], [east, bbox[3]], [west, bbox[3]], [west, bbox[1]]]] }, projection) : '';
  const box = bbox ? bbox[0] > bbox[2] ? boxPart(bbox[0], 180) + boxPart(-180, bbox[2]) : boxPart(bbox[0], bbox[2]) : '';
  const handles = editing?.vertices?.map((position, i) => {
    const xy = projection([position[0], position[1]])!;
    return `<g transform="translate(${xy[0]},${xy[1]})" data-vertex-index="${i}" data-map-x="${xy[0]}" data-map-y="${xy[1]}" class="vertex-handle ${i === editing.selectedVertex ? 'selected' : ''}"><circle r="14" class="vertex-hit"/><circle r="6" class="vertex-dot"/><text x="12" y="-10">${i + 1}</text></g>`;
  }).join('') ?? '';
  const hint = editing?.hint ?? 'Click or drag on the map to move the point.';
  return `<svg viewBox="0 0 760 400" role="img" aria-label="${example.type} example on a ${mercator ? 'Mercator' : 'longitude and latitude'} map.${editing ? ` ${hint} Use the controls for keyboard input.` : ''}" class="geojson-map${editing ? ' is-editable' : ''}" data-projection="${mercator ? 'mercator' : 'geographic'}" data-scale="${projection.scale()}" data-translate="${projection.translate().join(',')}"><defs><clipPath id="geojson-clip"><rect width="760" height="400"/></clipPath></defs><g clip-path="url(#geojson-clip)"><rect width="760" height="400" class="geojson-ocean"/><path d="${path(world) ?? ''}" class="land"/><path d="${path(geoGraticule10()) ?? ''}" class="graticule"/><g class="geojson-bbox">${box}</g>${draw(example)}${handles}</g><text x="20" y="25" class="plot-label">${mercator ? 'MERCATOR DISPLAY' : 'LONGITUDE / LATITUDE DISPLAY'}</text><text x="20" y="383" class="diagram-small">${polar ? 'Polar position: longitude / latitude fallback. Mercator excludes the poles.' : `Illustration · Natural Earth · ${global ? 'World extent' : 'Auto-fit example'}`}</text></svg>${editing ? `<p class="map-edit-hint">${hint}</p>` : ''}`;
}

export function readGeoJsonMapView(svg: SVGSVGElement): GeoJsonMapView {
  const mercator = svg.dataset.projection === 'mercator';
  const projection = mercator ? geoMercator() : geoEquirectangular();
  const [x, y] = svg.dataset.translate!.split(',').map(Number);
  projection.scale(Number(svg.dataset.scale)).translate([x, y]);
  return { projection, mercator };
}

// Capture the stable host, not its SVG child: each position update redraws the
// SVG. Keep the projection fixed throughout a gesture so auto-fit cannot move
// the map underneath the pointer in collection examples.
export function bindGeoJsonPointEditing(host: HTMLElement, onPoint: (point: GeographicPoint, view: GeoJsonMapView, vertexIndex?: number) => void): void {
  let drag: GeoJsonMapView & { pointerId: number; vertexIndex?: number } | null = null;
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const svg = host.querySelector<SVGSVGElement>('svg')!;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (position.x < 0 || position.x > 760 || position.y < 0 || position.y > 400) return;
    const coordinate = drag.projection.invert?.([position.x, position.y]);
    if (!coordinate || !coordinate.every(Number.isFinite) || Math.abs(coordinate[1]) > 90) return;
    const roundTrip = drag.projection(coordinate);
    if (!roundTrip || Math.hypot(roundTrip[0] - position.x, roundTrip[1] - position.y) > 1) return;
    onPoint({ longitude: Number(coordinate[0].toFixed(6)), latitude: Number(coordinate[1].toFixed(6)) }, drag, drag.vertexIndex);
  }
  host.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    const svg = host.querySelector<SVGSVGElement>('svg.is-editable');
    if (!svg) return;
    let handle = event.target instanceof Element ? event.target.closest<SVGElement>('[data-vertex-index]') : null;
    const matrix = svg.getScreenCTM();
    if (handle && matrix) {
      // Enlarged touch targets can overlap. Pick the nearest handle centre
      // rather than whichever transparent hit circle happens to paint last.
      const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const distance = (node: SVGElement) => Math.hypot(Number(node.dataset.mapX) - cursor.x, Number(node.dataset.mapY) - cursor.y);
      handle = [...svg.querySelectorAll<SVGElement>('[data-vertex-index]')].reduce((nearest, node) => distance(node) < distance(nearest) ? node : nearest, handle);
    }
    drag = { pointerId: event.pointerId, ...readGeoJsonMapView(svg), vertexIndex: handle ? Number(handle.dataset.vertexIndex) : undefined };
    host.setPointerCapture(event.pointerId);
    event.preventDefault();
    move(event);
  });
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    move(event);
    drag = null;
    host.releasePointerCapture(event.pointerId);
  });
  const cancel = (event: PointerEvent) => { if (drag?.pointerId === event.pointerId) drag = null; };
  host.addEventListener('pointercancel', cancel);
  host.addEventListener('lostpointercapture', cancel);
}

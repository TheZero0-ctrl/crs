import { geoOrthographic, geoMercator, geoEqualEarth, geoEquirectangular, geoPath, geoGraticule10, geoCircle, geoDistance } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { LineString } from 'geojson';
import { world } from '../geo/world';
import type { GeographicPoint } from '../geo/coordinates';
import { measurementDiagrams } from './angle-measurements';
import { longitudeInterval } from '../geo/diagram-math';
import { degreeLongitudeKm } from '../geo/coordinates';
import type { VisualFocus } from '../lesson-visuals';

export type WorldOptions = {
  flat: boolean; projection: string; circles: boolean; ellipsoid: boolean; grid: boolean;
  emphasis: 'both' | 'latitude' | 'longitude';
  focus: VisualFocus;
};
export type WorldView = { update: (point: GeographicPoint, options: WorldOptions) => void; center: () => void; dispose: () => void };

export function mountWorld(host: HTMLElement, initial: GeographicPoint, initialOptions: WorldOptions, onPoint: (point: GeographicPoint) => void, measurementHost?: HTMLElement): WorldView {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 900 460');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Interactive Earth illustration. Use the labelled coordinate sliders below as a keyboard alternative.');
  svg.classList.add('earth-svg');
  host.append(svg);
  let point = initial;
  let options = initialOptions;
  let rotation: [number, number] = [-initial.longitude, -initial.latitude];
  let projection: GeoProjection;
  let drag: { x: number; y: number; rotation: [number, number]; moved: boolean } | null = null;

  const pathElement = (d: string | null, className: string, extra = '') => `<path d="${d ?? ''}" class="${className}" ${extra}/>`;
  function draw() {
    svg.setAttribute('data-focus', options.focus);
    svg.setAttribute('viewBox', options.flat ? '0 0 900 460' : '200 0 500 460');
    if (measurementHost) {
      const showAngles = !options.flat && ['location', 'latitude', 'longitude'].includes(options.focus);
      measurementHost.hidden = !showAngles;
      measurementHost.classList.toggle('single-measurement', options.emphasis !== 'both');
      if (showAngles) measurementHost.innerHTML = measurementDiagrams(point, options.emphasis);
    }
    if (options.flat) {
      projection = (options.projection === 'mercator' ? geoMercator().clipExtent([[35, 35], [865, 425]]) : options.projection === 'equirectangular' ? geoEquirectangular() : geoEqualEarth());
      projection.fitExtent([[42, 36], [858, 420]], { type: 'Sphere' });
      if (options.projection === 'mercator') projection.scale(132).translate([450, 230]);
    } else projection = geoOrthographic().rotate(rotation).scale(185).translate([450, 229]).clipAngle(90);
    const path = geoPath(projection);
    const latitude: LineString = { type: 'LineString', coordinates: Array.from({ length: 181 }, (_, i) => [-180 + i * 2, point.latitude]) };
    const longitude: LineString = { type: 'LineString', coordinates: Array.from({ length: 91 }, (_, i) => [point.longitude, -90 + i * 2]) };
    const equator: LineString = { type: 'LineString', coordinates: Array.from({ length: 181 }, (_, i) => [-180 + i * 2, 0]) };
    const prime: LineString = { type: 'LineString', coordinates: Array.from({ length: 91 }, (_, i) => [0, -90 + i * 2]) };
    const xy = projection([point.longitude, point.latitude]);
    const visible = options.flat || geoDistance([point.longitude, point.latitude], [-rotation[0], -rotation[1]]) < Math.PI / 2;
    const circles = options.circles ? [-120, -60, 0, 60, 120].flatMap(lon => [-60, -30, 0, 30, 60].map(lat => pathElement(path(geoCircle().center([lon, lat]).radius(5)()), 'distortion-circle'))).join('') : '';
    const marker = xy && visible ? `<g transform="translate(${xy[0]},${xy[1]})"><circle r="12" class="marker-halo"/><circle r="5" class="point-marker"/><path d="M0 -18v-8M0 18v8M-18 0h-8M18 0h8" class="marker-cross"/></g>` : '';
    const ellipsoid = options.ellipsoid && !options.flat;
    const highlightLatitude = options.focus === 'latitude';
    const highlightLongitude = options.focus === 'longitude';
    const coordinateLines = ['location', 'latitude', 'longitude', 'projection', 'summary', 'geographic', 'spacing'].includes(options.focus);
    const referenceLabel = (coordinate: [number, number], text: string, className: string, offsetY = -12) => {
      if (!options.flat && geoDistance(coordinate, [-rotation[0], -rotation[1]]) >= Math.PI / 2) return '';
      const p = projection(coordinate);
      if (!p) return '';
      const x = Math.max(options.flat ? 50 : 235, Math.min(options.flat ? 730 : 565, p[0] + 12));
      const y = Math.max(55, Math.min(412, p[1] + offsetY));
      return `<text x="${x}" y="${y}" class="focus-label ${className}">${text}</text>`;
    };
    const interval = longitudeInterval(point);
    const intervalLine: LineString = { type: 'LineString', coordinates: Array.from({ length: 11 }, (_, i) => [interval.start[0] + i / 10, point.latitude]) };
    const spacingOverlay = options.focus === 'spacing' ? `${pathElement(path(intervalLine), 'longitude-interval')}${[interval.start, interval.end].map(position => { const p = projection(position); return p ? `<circle cx="${p[0]}" cy="${p[1]}" r="4" class="interval-endpoint"/>` : ''; }).join('')}${referenceLabel(interval.start, `1° longitude · ${degreeLongitudeKm(point.latitude).toFixed(1)} km`, 'longitude-focus')}` : '';
    svg.innerHTML = `<defs>
      <radialGradient id="ocean" cx="34%" cy="25%" r="80%"><stop offset="0" stop-color="#ebf3ed"/><stop offset=".7" stop-color="#dce9e2"/><stop offset="1" stop-color="#b4ccc0"/></radialGradient>
      <radialGradient id="globeShade" cx="30%" cy="20%" r="85%"><stop offset=".6" stop-color="#123c35" stop-opacity="0"/><stop offset="1" stop-color="#123c35" stop-opacity=".16"/></radialGradient>
    </defs>
    <text x="${options.flat ? 30 : 220}" y="30" class="plot-label">${options.flat ? 'PLANAR VIEW' : 'SPHERICAL VIEW'}</text>
    <text x="${options.flat ? 870 : 680}" y="30" text-anchor="end" class="plot-label">${options.flat ? options.projection.toUpperCase() : ellipsoid ? 'FLATTENING EXAGGERATED' : ''}</text>
    <g ${ellipsoid ? 'transform="translate(0 229) scale(1 .86) translate(0 -229)"' : ''}>
      ${!options.flat ? '<ellipse cx="450" cy="431" rx="128" ry="6" fill="#233936" opacity=".045"/>' : ''}
      ${pathElement(path({ type: 'Sphere' }), 'ocean', options.flat ? '' : 'fill="url(#ocean)"')}
      ${pathElement(path(world), 'land')}
      ${options.grid ? pathElement(path(geoGraticule10()), 'graticule') : ''}
      ${pathElement(path(equator), `reference-line equator-line ${highlightLatitude ? 'reference-highlight latitude-focus' : ''}`)}
      ${pathElement(path(prime), `reference-line prime-line ${highlightLongitude ? 'reference-highlight longitude-focus' : ''}`)}
      ${coordinateLines && options.emphasis !== 'longitude' ? pathElement(path(latitude), 'latitude-line') : ''}
      ${coordinateLines && options.emphasis !== 'latitude' ? pathElement(path(longitude), 'longitude-line') : ''}
      ${circles}
      ${!options.flat ? pathElement(path({ type: 'Sphere' }), 'shade', 'fill="url(#globeShade)"') : ''}
      ${marker}
    </g>
    ${ellipsoid && options.focus === 'datum' ? `<circle cx="450" cy="229" r="185" class="sphere-outline"/>` : ''}
    ${highlightLatitude ? referenceLabel([-rotation[0], 0], 'Equator · 0°', 'latitude-focus', 22) + referenceLabel([point.longitude, point.latitude], `Latitude · ${point.latitude.toFixed(2)}°`, 'latitude-focus') : ''}
    ${highlightLongitude ? referenceLabel([0, Math.max(-60, Math.min(60, -rotation[1]))], 'Greenwich · 0°', 'longitude-focus', 22) + referenceLabel([point.longitude, point.latitude], `Longitude · ${point.longitude.toFixed(2)}°`, 'longitude-focus') : ''}
    ${['location', 'geographic', 'summary'].includes(options.focus) && visible ? referenceLabel([point.longitude, point.latitude], `${point.latitude.toFixed(2)}°, ${point.longitude.toFixed(2)}°`, 'point-focus') : ''}
    ${spacingOverlay}
    <text x="${options.flat ? 30 : 220}" y="448" class="diagram-small">${options.flat ? 'Click to locate a point' : 'Drag to rotate · Click to locate a point'}</text>
    <text x="${options.flat ? 870 : 680}" y="448" text-anchor="end" class="diagram-small">${!visible ? 'Far side · use Center' : ''}</text>`;
  }

  function position(event: PointerEvent): [number, number] {
    const matrix = svg.getScreenCTM();
    if (!matrix) return [0, 0];
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return [p.x, p.y];
  }
  function down(event: PointerEvent) {
    if (event.button !== 0) return;
    const [x, y] = position(event);
    drag = { x, y, rotation: [...rotation], moved: false };
    svg.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent) {
    if (!drag) return;
    const [x, y] = position(event);
    const dx = x - drag.x, dy = y - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (!options.flat && drag.moved) {
      rotation = [drag.rotation[0] + dx * .35, Math.max(-85, Math.min(85, drag.rotation[1] - dy * .35))];
      draw();
    }
  }
  function up(event: PointerEvent) {
    if (!drag) return;
    const clicked = !drag.moved;
    drag = null;
    if (!clicked) return;
    let [x, y] = position(event);
    if (!options.flat && options.ellipsoid) y = 229 + (y - 229) / .86;
    if (!options.flat && Math.hypot(x - 450, y - 229) > 185) return;
    const inverted = projection.invert?.([x, y]);
    if (!inverted || !inverted.every(Number.isFinite) || Math.abs(inverted[1]) > 90) return;
    const candidate = { longitude: inverted[0], latitude: inverted[1] };
    onPoint(candidate);
  }
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', () => { drag = null; });
  draw();
  return {
    update(nextPoint, nextOptions) { point = nextPoint; options = nextOptions; draw(); },
    center() { rotation = [-point.longitude, -point.latitude]; draw(); },
    dispose() { svg.remove(); if (measurementHost) measurementHost.innerHTML = ''; },
  };
}

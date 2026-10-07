import { geoOrthographic, geoMercator, geoEqualEarth, geoEquirectangular, geoPath, geoGraticule10, geoCircle, geoDistance } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { LineString } from 'geojson';
import { world } from '../geo/world';
import type { GeographicPoint } from '../geo/coordinates';

export type WorldOptions = {
  flat: boolean; projection: string; circles: boolean; ellipsoid: boolean; grid: boolean;
  emphasis: 'both' | 'latitude' | 'longitude';
};
export type WorldView = { update: (point: GeographicPoint, options: WorldOptions) => void; center: () => void; dispose: () => void };

export function mountWorld(host: HTMLElement, initial: GeographicPoint, initialOptions: WorldOptions, onPoint: (point: GeographicPoint) => void): WorldView {
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
    svg.innerHTML = `<defs>
      <radialGradient id="ocean" cx="34%" cy="25%" r="80%"><stop offset="0" stop-color="#ebf3ed"/><stop offset=".7" stop-color="#dce9e2"/><stop offset="1" stop-color="#b4ccc0"/></radialGradient>
      <radialGradient id="globeShade" cx="30%" cy="20%" r="85%"><stop offset=".6" stop-color="#123c35" stop-opacity="0"/><stop offset="1" stop-color="#123c35" stop-opacity=".16"/></radialGradient>
    </defs>
    <text x="30" y="34" class="plot-label">${options.flat ? 'PLANAR VIEW' : 'SPHERICAL VIEW'}</text>
    <text x="870" y="34" text-anchor="end" class="plot-label">${options.flat ? options.projection.toUpperCase() : ellipsoid ? 'FLATTENING EXAGGERATED' : 'N ↑'}</text>
    <g ${ellipsoid ? 'transform="translate(0 229) scale(1 .86) translate(0 -229)"' : ''}>
      ${!options.flat ? '<ellipse cx="450" cy="431" rx="128" ry="6" fill="#233936" opacity=".045"/>' : ''}
      ${pathElement(path({ type: 'Sphere' }), 'ocean', options.flat ? '' : 'fill="url(#ocean)"')}
      ${pathElement(path(world), 'land')}
      ${options.grid ? pathElement(path(geoGraticule10()), 'graticule') : ''}
      ${pathElement(path(equator), 'reference-line')}
      ${pathElement(path(prime), 'reference-line')}
      ${options.emphasis !== 'longitude' ? pathElement(path(latitude), 'latitude-line') : ''}
      ${options.emphasis !== 'latitude' ? pathElement(path(longitude), 'longitude-line') : ''}
      ${circles}
      ${!options.flat ? pathElement(path({ type: 'Sphere' }), 'shade', 'fill="url(#globeShade)"') : ''}
      ${marker}
    </g>
    ${!options.flat ? `<path d="M226 169h-32v112h32" class="annotation-line"/><text x="181" y="224" text-anchor="end" class="diagram-caption">${point.latitude.toFixed(2)}°</text><text x="181" y="244" text-anchor="end" class="diagram-small">LATITUDE</text><path d="M667 302h40v-85h-40" class="annotation-line"/><text x="720" y="254" class="diagram-caption">${point.longitude.toFixed(2)}°</text><text x="720" y="274" class="diagram-small">LONGITUDE</text>` : ''}
    <text x="30" y="442" class="diagram-small">${options.flat ? 'Click to locate a point' : 'Drag to rotate · Click to locate a point'}</text>
    <text x="870" y="442" text-anchor="end" class="diagram-small">${!visible ? 'Point is on the far side. Use Center.' : 'Spherical illustration'}</text>`;
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
    dispose() { svg.remove(); },
  };
}

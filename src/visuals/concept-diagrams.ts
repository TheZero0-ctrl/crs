import { geoEqualEarth, geoEquirectangular, geoMercator, geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import { world } from '../geo/world';
import { axisTuple, degreeLongitudeKm, number, to5186, toKGD2002, type GeographicPoint } from '../geo/coordinates';
import { ellipsoidSection, relabelledLocation } from '../geo/diagram-math';
import type { VisualFocus } from '../lesson-visuals';

export type ConceptState = { point: GeographicPoint; focus: VisualFocus; projection: string; official: boolean; offsets: boolean; relabelOriginal: GeographicPoint | null };

function cell(label: string, value: string, extra = '') {
  return `<div class="concept-cell ${extra}"><span>${label}</span><strong>${value}</strong></div>`;
}

function coordinateFields(point: GeographicPoint, projected: boolean, official: boolean) {
  const values = projected ? to5186(point) : point;
  const labels = projected ? official ? ['Northing', 'Easting'] : ['Easting', 'Northing'] : official ? ['Latitude', 'Longitude'] : ['Longitude', 'Latitude'];
  return `<div class="ordered-fields" aria-label="${projected ? 'EPSG:5186' : 'EPSG:4326'} coordinate order">${axisTuple(values, official).map((value, i) => cell(`${i + 1} · ${labels[i]}`, `${number(value, projected ? 2 : 4)}${projected ? ' m' : '°'}`, labels[i] === 'Latitude' || labels[i] === 'Northing' ? 'north-field' : 'east-field')).join('')}</div>`;
}

function definition(projected: boolean) {
  return `<div class="definition-flow" aria-label="CRS components">${cell('Earth reference', projected ? 'KGD2002' : 'WGS 84')}${cell('Coordinate names', projected ? 'Northing / easting' : 'Latitude / longitude')}${cell('Units', projected ? 'Metres' : 'Degrees')}${projected ? cell('Map projection', 'Transverse Mercator') : ''}</div>`;
}

function ellipsoid(point: GeographicPoint) {
  const section = ellipsoidSection(point.latitude);
  const cx = 130, cy = 126;
  const [x, y] = [cx + section.point[0], cy - section.point[1]];
  const [nx, ny] = [x + section.normal[0] * 35, y - section.normal[1] * 35];
  return `<figure class="concept-figure"><figcaption>A line straight out from the surface</figcaption><svg viewBox="0 0 400 260" role="img" aria-label="A flattened Earth model. The green line sticks straight out of the surface; the dashed line goes to the centre. They usually point in different directions."><circle cx="${cx}" cy="${cy}" r="90" class="sphere-outline"/><ellipse cx="${cx}" cy="${cy}" rx="90" ry="72" class="measurement-earth"/><path d="M25 ${cy}H240" class="measurement-reference"/><path d="M${cx} ${cy}L${x} ${y}" class="measurement-reference"/><path d="M${x} ${y}L${nx} ${ny}" class="normal-line"/><circle cx="${x}" cy="${y}" r="4" class="measurement-center"/><text x="130" y="25" text-anchor="middle" class="measurement-label">Round outline</text><text x="130" y="236" text-anchor="middle" class="measurement-label">Flattening enlarged</text><path d="M${nx} ${ny}H285" class="concept-leader"/><text x="290" y="${ny + 4}" class="measurement-label">Straight out</text><text x="262" y="150" class="measurement-label">Equator level</text><text x="262" y="176" class="measurement-label">Dashed: to centre</text></svg><p>This model makes Earth’s flattening larger so you can see it. The green line meets the surface at a right angle; it is called the surface normal.</p></figure>`;
}

function matchedViews(state: ConceptState) {
  const globe = geoOrthographic().rotate([-state.point.longitude, -state.point.latitude]).scale(70).translate([95, 92]);
  const flat = (state.projection === 'mercator' ? geoMercator() : state.projection === 'equirectangular' ? geoEquirectangular() : geoEqualEarth()).fitExtent([[235, 35], [415, 150]], { type: 'Sphere' });
  const paint = (projection: typeof globe) => {
    const path = geoPath(projection), xy = projection([state.point.longitude, state.point.latitude]);
    return `<path d="${path({ type: 'Sphere' })}" class="ocean"/><path d="${path(world)}" class="land"/><path d="${path(geoGraticule10())}" class="graticule"/>${xy ? `<circle cx="${xy[0]}" cy="${xy[1]}" r="4" class="point-marker"/>` : ''}`;
  };
  return `<figure class="concept-figure"><figcaption>The same place in two views</figcaption><svg viewBox="0 0 440 195" role="img" aria-label="The selected point is highlighted on a globe and on a flat map.">${paint(globe)}${paint(flat)}<path d="M181 92H217m-7-6 7 6-7 6" class="normal-line"/><text x="95" y="180" text-anchor="middle" class="measurement-label">Globe</text><text x="325" y="180" text-anchor="middle" class="measurement-label">Flat map</text></svg><p>A projection changes how we draw the map. The place itself stays where it is.</p></figure>`;
}

function distanceBars(point: GeographicPoint) {
  const latitudes = [0, point.latitude, 60];
  return `<figure class="concept-figure"><figcaption>Ground length of 1° longitude</figcaption><svg viewBox="0 0 440 165" role="img" aria-label="Longitude interval ground lengths at the equator, selected latitude, and 60 degrees.">${latitudes.map((lat, i) => {
    const km = degreeLongitudeKm(lat), y = 28 + i * 48;
    return `<text x="12" y="${y + 5}" class="measurement-label">${i === 1 ? 'Selected' : `${lat}°`}</text><rect x="82" y="${y - 8}" width="${250 * km / degreeLongitudeKm(0)}" height="17" rx="3" class="distance-bar ${i === 1 ? 'selected' : ''}"/><text x="345" y="${y + 5}" class="measurement-label">${number(km, 1)} km</text>`;
  }).join('')}</svg><p>These lengths follow a line of latitude on Earth. They are not measured from the picture on your screen.</p></figure>`;
}

function projectionInterpretation(projection: string) {
  return projection === 'mercator' ? 'Mercator keeps the angles where nearby lines meet. Look at the circles far north and south: they appear larger, although their real areas are the same.' : projection === 'equirectangular' ? 'This map spaces longitude lines evenly on the screen. Their real spacing on Earth still gets smaller toward the poles.' : 'Equal Earth keeps the circles’ areas equal. Their shapes may stretch, so some look more like ovals.';
}

export function conceptDiagram(state: ConceptState): string {
  const { point, focus, official } = state;
  switch (focus) {
    case 'location': return `<div class="coordinate-link">${cell('Selected latitude', `${point.latitude.toFixed(4)}°`, 'north-field')}<span aria-hidden="true">+</span>${cell('Selected longitude', `${point.longitude.toFixed(4)}°`, 'east-field')}<span aria-hidden="true">→</span>${cell('Meaning', 'One location in WGS 84')}</div>`;
    case 'latitude': case 'longitude': return '';
    case 'datum': return ellipsoid(point);
    case 'projection': return matchedViews(state);
    case 'summary': return `<figure class="concept-figure"><figcaption>A geographic CRS makes the numbers meaningful</figcaption>${definition(false)}<div class="flow-arrow" aria-hidden="true">↓</div>${coordinateFields(point, false, true)}<p>A projected CRS adds a projection conversion and its parameters.</p></figure>`;
    case 'epsg': return `<figure class="concept-figure"><figcaption>The settings selected by EPSG:4326</figcaption>${definition(false)}<p>The code tells us how to read the coordinates. Changing the code label alone does not calculate new numbers.</p></figure>`;
    case 'geographic': return `<figure class="concept-figure"><figcaption>${official ? 'Latitude first · official EPSG order' : 'Longitude first · this app’s usual order'}</figcaption>${coordinateFields(point, false, official)}<p>The same values describe the same place. Only which number comes first has changed.</p></figure>`;
    case 'distortion': return `<div class="projection-note"><strong>${state.projection === 'equal-earth' ? 'Equal Earth' : state.projection === 'mercator' ? 'Mercator' : 'Equirectangular'}</strong><p>${projectionInterpretation(state.projection)}</p></div>`;
    case 'spacing': return distanceBars(point);
    case 'choice': return `<figure class="concept-figure"><figcaption>What do you want the map to keep correct?</figcaption><div class="task-options"><button data-projection-task="area" ${state.projection === 'equal-earth' ? 'aria-pressed="true"' : 'aria-pressed="false"'}>Compare areas</button><button data-projection-task="angles" ${state.projection === 'mercator' ? 'aria-pressed="true"' : 'aria-pressed="false"'}>Local angles</button></div><p>${projectionInterpretation(state.projection)}</p><p>Neither choice keeps every distance correct. Keeping an angle correct is different from keeping a size or distance correct.</p></figure>`;
    case 'belt': return `<div class="definition-flow">${cell('West edge', '126°E')}${cell('Middle longitude line', '127°E')}${cell('East edge', '128°E')}${cell('Where it is used', 'Land in this part of South Korea')}</div>`;
    case 'origin': {
      const p = to5186(point);
      return `<figure class="concept-figure"><figcaption>Adding the starting values</figcaption><div class="offset-equations">${cell('Easting', `${number(p.easting - 200000)} ${state.offsets ? '+ 200,000' : ''} = ${number(p.easting - (state.offsets ? 0 : 200000))} m`, 'east-field')}${cell('Northing', `${number(p.northing - 600000)} ${state.offsets ? '+ 600,000' : ''} = ${number(p.northing - (state.offsets ? 0 : 600000))} m`, 'north-field')}</div><p>${state.offsets ? 'Add 200,000 to the easting difference and 600,000 to the northing difference. These are the fixed numbers called false offsets.' : 'Offsets removed here only. The map and coordinate fields still use the original EPSG:5186 values.'}</p></figure>`;
    }
    case 'definition': return `<figure class="concept-figure"><figcaption>EPSG:5186 · settings and number order</figcaption>${definition(true)}${coordinateFields(point, true, official)}<p>The middle longitude line is 127°E. The starting point is at 38°N on that line. The scale factor there is 1.</p></figure>`;
    case 'transform': {
      const p = to5186(point);
      const geographic = toKGD2002(point);
      return `<figure class="concept-figure"><figcaption>Geographic to projected coordinates</figcaption><div class="conversion-flow">${cell('1 · WGS 84 / 4326', `${point.longitude.toFixed(6)}°E, ${point.latitude.toFixed(6)}°N`)}<span aria-hidden="true">→</span>${cell('2 · KGD2002 / 4737', `${geographic.longitude.toFixed(6)}°E, ${geographic.latitude.toFixed(6)}°N`)}<span aria-hidden="true">→</span>${cell('3 · EPSG:5186', `E ${number(p.easting)} m / N ${number(p.northing)} m`)}</div><p>The middle step uses a datum approximation with about 1 m stated accuracy; angular values can look unchanged at this precision. Transverse Mercator then converts them to the grid.</p></figure>`;
    }
    case 'axes': return `<figure class="concept-figure"><figcaption>${official ? 'EPSG authority order' : 'Conventional API order'} · same location</figcaption><span class="concept-small-label">EPSG:4326</span>${coordinateFields(point, false, official)}<span class="concept-small-label">EPSG:5186</span>${coordinateFields(point, true, official)}<p>Map directions do not swap. The software must interpret the fields in the stated order.</p></figure>`;
    case 'assign': {
      const correct = state.relabelOriginal ?? point;
      const wrong = relabelledLocation(correct);
      return `<figure class="concept-figure"><figcaption>One source pair, two interpretations</figcaption><div class="definition-flow">${cell('Correctly transformed', `${correct.latitude.toFixed(4)}°N / ${correct.longitude.toFixed(4)}°E`, 'north-field')}${cell('Relabelled as metres', `${wrong.latitude.toFixed(4)}°N / ${wrong.longitude.toFixed(4)}°E`, 'east-field')}</div><p>The dashed connector joins different places. Relabelling has not performed a coordinate conversion.</p></figure>`;
    }
  }
}

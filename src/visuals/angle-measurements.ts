import type { GeographicPoint } from '../geo/coordinates';

export function angleGeometry(degrees: number, kind: 'latitude' | 'longitude') {
  const center: [number, number] = [160, 110];
  const start = kind === 'latitude' ? 0 : -90;
  // SVG y increases downward. East longitude increases counterclockwise when viewed from the North Pole.
  const delta = -degrees;
  const at = (angle: number, radius: number): [number, number] => {
    const radians = angle * Math.PI / 180;
    return [center[0] + Math.cos(radians) * radius, center[1] + Math.sin(radians) * radius];
  };
  const reference = at(start, 66);
  const endpoint = at(start + delta, 66);
  const arcStart = at(start, 26);
  const arcEnd = at(start + delta, 26);
  const arc = Math.abs(delta) < 1e-10 ? '' : `M${arcStart.join(',')} A26,26 0 ${Math.abs(delta) > 180 ? 1 : 0},${delta > 0 ? 1 : 0} ${arcEnd.join(',')}`;
  return { center, reference, endpoint, arc, sweep: delta > 0 ? 1 : 0 };
}

export function measurementDiagrams(point: GeographicPoint, emphasis: 'both' | 'latitude' | 'longitude'): string {
  return (['latitude', 'longitude'] as const).filter(kind => emphasis === 'both' || emphasis === kind).map(kind => {
    const degrees = point[kind];
    const geometry = angleGeometry(degrees, kind);
    const isLatitude = kind === 'latitude';
    const direction = degrees === 0 ? '' : isLatitude ? degrees > 0 ? 'N' : 'S' : degrees > 0 ? 'E' : 'W';
    const name = isLatitude ? 'Latitude' : 'Longitude';
    const value = `${Math.abs(degrees).toFixed(2)}°${direction}`;
    return `<figure class="angle-measurement ${kind}">
      <figcaption><strong>${name}</strong><output>${value}</output></figcaption>
      <svg viewBox="0 0 320 210" role="img" aria-label="${name} ${value}. ${isLatitude ? 'Meridian cross-section of a sphere, measured from the equatorial plane.' : 'View from the North Pole, measured from Greenwich. East increases counterclockwise.'}">
        <circle cx="160" cy="110" r="66" class="measurement-earth"/>
        ${isLatitude ? '<path d="M65 110H251" class="measurement-reference"/><text x="256" y="114" class="measurement-label">Equator</text><text x="160" y="33" text-anchor="middle" class="measurement-label">N</text><text x="160" y="195" text-anchor="middle" class="measurement-label">S</text>' : '<text x="160" y="24" text-anchor="middle" class="measurement-label">Greenwich · 0°</text>'}
        <path d="M${geometry.center.join(',')} L${geometry.reference.join(',')}" class="measurement-reference"/>
        <path d="M${geometry.center.join(',')} L${geometry.endpoint.join(',')}" class="measurement-ray"/>
        <path d="${geometry.arc}" class="measurement-arc" data-angle="${degrees}"/>
        <circle cx="160" cy="110" r="2.5" class="measurement-center"/>
        <circle cx="${geometry.endpoint[0]}" cy="${geometry.endpoint[1]}" r="4.5" class="measurement-point"/>
        <text x="160" y="207" text-anchor="middle" class="measurement-label">${isLatitude ? 'Meridian section' : 'North Pole view'}</text>
      </svg>
      <p>${isLatitude ? 'Angle from the equatorial plane. This diagram uses a sphere, not an ellipsoid.' : 'Angle from Greenwich. East is counterclockwise in this North Pole view.'}</p>
    </figure>`;
  }).join('');
}

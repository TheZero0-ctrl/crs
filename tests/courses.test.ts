// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderLibrary } from '../src/course-library';
import { startGeoJsonCourse } from '../src/geojson-course';

const click = (selector: string) => (document.querySelector(selector) as HTMLButtonElement).click();
const change = (selector: string, value: string) => {
  (document.querySelector(selector) as HTMLInputElement).value = value;
  document.querySelector(selector)!.dispatchEvent(new Event('change', { bubbles: true }));
};
const json = () => JSON.parse(document.querySelector('#geojson-output')!.textContent!);

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  history.replaceState(null, '', '/?course=geojson');
});

describe('course library and independent progress', () => {
  it('opens the library by default and lists both courses', async () => {
    history.replaceState(null, '', '/');
    await import('../src/main');
    expect(document.querySelectorAll('.course-card')).toHaveLength(2);
    expect(document.querySelector('a[href="?course=crs"]')?.textContent).toContain('Start course');
    expect(document.querySelector('a[href="?course=geojson"]')?.textContent).toContain('Start course');
    expect(localStorage.getItem('atlas-progress')).toBeNull();
  });
  it('resumes each course separately and ignores corrupt or duplicated completion entries', () => {
    localStorage.setItem('atlas-progress', JSON.stringify({ completed: ['epsg', 'epsg', 'unknown'] }));
    localStorage.setItem('atlas-geojson-progress', '{invalid');
    renderLibrary();
    expect(document.querySelectorAll('.library-progress')[0].textContent).toContain('1 / 5');
    expect(document.querySelectorAll('.library-progress')[1].textContent).toContain('0 / 6');
    expect(document.querySelector('a[href="?course=crs"]')?.textContent).toContain('Continue');
  });
});

describe('GeoJSON course interactions', () => {
  it('updates the map and JSON from coordinates and rejects invalid values', () => {
    startGeoJsonCourse();
    change('#longitude', '77.209'); change('#latitude', '28.6139');
    document.querySelector('#point-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(json().coordinates).toEqual([77.209, 28.6139]);
    expect(document.querySelector('.geojson-point')).not.toBeNull();
    change('#latitude', '127');
    document.querySelector('#point-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(document.querySelector('#input-error')?.textContent).toContain('Latitude must');
    expect(json().coordinates).toEqual([77.209, 28.6139]);
  });
  it('keeps a drag active across SVG redraws and synchronizes coordinates and the URL', () => {
    startGeoJsonCourse();
    const host = document.querySelector<HTMLElement>('#geojson-map')!;
    host.setPointerCapture = vi.fn();
    host.releasePointerCapture = vi.fn();
    const oldDOMPoint = globalThis.DOMPoint;
    // jsdom has no SVG screen-coordinate transform. Use identity screen pixels
    // here; Chromium separately verifies actual scaled SVG pointer gestures.
    globalThis.DOMPoint = class {
      constructor(public x: number, public y: number) {}
      matrixTransform() { return this; }
    } as unknown as typeof DOMPoint;
    const pointer = (type: string, longitude: number, latitude: number, pointerId = 1) => {
      const svg = host.querySelector<SVGSVGElement>('svg')!;
      svg.getScreenCTM = () => ({ inverse: () => ({}) }) as DOMMatrix;
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 380 + longitude * 700 / 360, clientY: 220 - latitude * 700 / 360, button: 0 });
      Object.defineProperty(event, 'pointerId', { value: pointerId });
      svg.dispatchEvent(event);
    };
    try {
      pointer('pointerdown', 0, 0);
      pointer('pointermove', 60, 30, 2);
      expect(json().coordinates).toEqual([0, 0]);
      pointer('pointermove', 60, 30);
      pointer('pointerup', 90, 45);
      expect(json().coordinates).toEqual([90, 45]);
      expect((document.querySelector('#longitude') as HTMLInputElement).value).toBe('90');
      expect((document.querySelector('#latitude') as HTMLInputElement).value).toBe('45');
      expect(new URL(location.href).searchParams.get('lon')).toBe('90');
      expect(host.setPointerCapture).toHaveBeenCalledWith(1);
      expect(host.releasePointerCapture).toHaveBeenCalledWith(1);
      pointer('pointermove', 0, 0);
      expect(json().coordinates).toEqual([90, 45]);
    } finally { globalThis.DOMPoint = oldDOMPoint; }
  });
  it('switches geometry types and removes polygon holes', () => {
    startGeoJsonCourse(); click('[data-chapter="1"]');
    change('#geometry', 'GeometryCollection');
    expect(json().geometries).toHaveLength(2);
    expect(json().coordinates).toBeUndefined();
    click('[data-step="1"]');
    expect(json().coordinates).toHaveLength(2);
    click('#hole');
    expect(json().coordinates).toHaveLength(1);
  });
  it('edits line positions and enforces the minimum number of positions', () => {
    startGeoJsonCourse(); click('[data-chapter="1"]'); change('#geometry', 'LineString');
    expect(document.querySelectorAll('.vertex-handle')).toHaveLength(3);
    change('#vertex', '1'); change('#vertex-longitude', '127.25'); change('#vertex-latitude', '37.85');
    document.querySelector('#vertex-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(json().coordinates[1]).toEqual([127.25, 37.85]);
    click('#add-vertex');
    expect(json().coordinates).toHaveLength(4);
    click('#remove-vertex'); click('#remove-vertex');
    expect(json().coordinates).toHaveLength(2);
    expect((document.querySelector('#remove-vertex') as HTMLButtonElement).disabled).toBe(true);
    click('#reset-geometry');
    expect(json().coordinates).toHaveLength(3);
  });
  it('resizes polygons without auto-fit cancelling the visual size change', () => {
    startGeoJsonCourse(); click('[data-chapter="1"]'); click('[data-step="1"]');
    const before = json();
    const scale = document.querySelector<SVGSVGElement>('.geojson-map')!.dataset.scale;
    (document.querySelector('#polygon-scale') as HTMLInputElement).value = '1.5';
    document.querySelector('#polygon-scale')!.dispatchEvent(new Event('input'));
    expect(json().coordinates).not.toEqual(before.coordinates);
    expect(document.querySelector<SVGSVGElement>('.geojson-map')!.dataset.scale).toBe(scale);
    expect(document.querySelectorAll('.vertex-handle')).toHaveLength(2);
    click('#hole');
    expect((document.querySelector('#hole-scale') as HTMLInputElement).disabled).toBe(true);
    expect(json().coordinates).toHaveLength(1);
    expect(document.querySelectorAll('.vertex-handle')).toHaveLength(1);
  });
  it('updates bbox values when a coordinate moves beyond the previous extent', () => {
    startGeoJsonCourse(); click('[data-chapter="4"]');
    change('#vertex', '1'); change('#vertex-longitude', '128'); change('#vertex-latitude', '38.5');
    document.querySelector('#vertex-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(json().bbox).toEqual([126.7, 37.3, 128, 38.5]);
    expect(document.querySelector('#bbox-readout')?.textContent).toContain('128, 38.5');
    expect(document.querySelector('.geojson-bbox path')).not.toBeNull();
  });
  it('adjusts antimeridian endpoints and shows the short and long spans', () => {
    startGeoJsonCourse(); click('[data-chapter="4"]'); click('[data-step="1"]');
    for (const [id, value] of [['#crossing-west', '177'], ['#crossing-east', '-178']]) {
      (document.querySelector(id) as HTMLInputElement).value = value;
      document.querySelector(id)!.dispatchEvent(new Event('input'));
    }
    expect(document.querySelector('#longitude-span')?.textContent).toContain('5°');
    expect(json().bbox).toEqual([177, 45, -178, 45]);
    click('#split');
    expect(json().type).toBe('LineString');
    expect(document.querySelector('#longitude-span')?.textContent).toContain('355°');
  });
  it('adds and removes the route Feature independently of the place properties', () => {
    startGeoJsonCourse(); click('[data-chapter="2"]'); click('[data-step="1"]');
    const point = json().features[0];
    click('#include-route');
    expect(json().features).toEqual([point]);
    expect(document.querySelector('#feature-count')?.textContent).toContain('1 Feature');
    click('#include-route');
    expect(json().features).toHaveLength(2);
    expect(json().features[0]).toEqual(point);
  });
  it('preserves stored coordinates when changing display projection', () => {
    history.replaceState(null, '', '/?course=geojson&lesson=geojson-crs');
    startGeoJsonCourse();
    const before = json();
    change('#display-projection', 'mercator');
    expect(json()).toEqual(before);
    expect(document.querySelector('.geojson-map')?.textContent).toContain('MERCATOR DISPLAY');
    expect(document.querySelector('#official-tuple')?.textContent).toBe('[37.5665, 126.978]');
    expect([...document.querySelectorAll('a')].map(a => a.getAttribute('href'))).toContain('?course=crs&lesson=lab&step=0');
  });
  it('transforms grid coordinates before exporting and leaves CRS progress untouched', () => {
    localStorage.setItem('atlas-progress', JSON.stringify({ lesson: 3, completed: ['epsg'] }));
    startGeoJsonCourse(); click('[data-chapter="3"]'); click('[data-step="1"]');
    change('#easting', '200000'); change('#northing', '600000');
    document.querySelector('#export-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(json().coordinates[0]).toBeCloseTo(127, 6);
    expect(json().coordinates[1]).toBeCloseTo(38, 6);
    expect(JSON.parse(localStorage.getItem('atlas-progress')!).completed).toEqual(['epsg']);
  });
  it('checks repairs and requires the correct chapter answer before continuing', () => {
    startGeoJsonCourse(); click('[data-chapter="5"]'); click('#check-exercise');
    expect(document.querySelector('#exercise-feedback')?.textContent).toContain('Repair');
    click('#solution'); click('#check-exercise');
    expect(document.querySelector('#exercise-feedback')?.textContent).toContain('Correct');
    click('#next');
    expect((document.querySelector('#next') as HTMLButtonElement).disabled).toBe(true);
    click('[data-answer="0"]');
    expect(JSON.parse(localStorage.getItem('atlas-geojson-progress')!).completed).toEqual([]);
    click('[data-answer="1"]');
    expect((document.querySelector('#next') as HTMLButtonElement).disabled).toBe(false);
    expect(JSON.parse(localStorage.getItem('atlas-geojson-progress')!).completed).toEqual(['geojson-practice']);
  });
  it('resumes a shared chapter and check, then restarts only GeoJSON', () => {
    localStorage.setItem('atlas-progress', '{"completed":["epsg"]}');
    history.replaceState(null, '', '/?course=geojson&lesson=geojson-extents&step=1&check=1');
    startGeoJsonCourse();
    expect(document.querySelector('h1')?.textContent).toBe('Knowledge check');
    click('#back');
    expect(document.querySelector('h1')?.textContent).toBe('The world meets at ±180°.');
    click('[data-chapter="0"]'); click('[data-chapter="4"]');
    expect(document.querySelector('h1')?.textContent).toBe('The world meets at ±180°.');
    click('#restart');
    expect(document.querySelector('h1')?.textContent).toBe('A place written as JSON.');
    expect(localStorage.getItem('atlas-progress')).toBe('{"completed":["epsg"]}');
  });
  it('retains completion on reload but asks for a new answer', () => {
    localStorage.setItem('atlas-geojson-progress', JSON.stringify({ completed: ['geojson-basics'] }));
    history.replaceState(null, '', '/?course=geojson&lesson=geojson-basics&check=1');
    startGeoJsonCourse();
    expect(document.querySelector('#quiz-feedback')?.textContent).toContain('Choose an answer');
    expect((document.querySelector('#next') as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('[data-chapter="0"] .chapter-number')?.textContent).toBe('✓');
  });
  it('exposes reference links and safely displays user-provided properties', () => {
    startGeoJsonCourse(); click('[data-chapter="2"]');
    const name = '<img src=x onerror=alert(1)>';
    (document.querySelector('#feature-name') as HTMLInputElement).value = name;
    document.querySelector('#feature-name')!.dispatchEvent(new Event('input'));
    expect(json().properties.name).toBe(name);
    expect(document.querySelector('img')).toBeNull();
    click('#sources');
    expect(document.querySelector('#sources-dialog')?.hasAttribute('open')).toBe(true);
    expect(document.querySelectorAll('.resource-list a')).toHaveLength(4);
  });
});

// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/visuals/korea-map', () => ({ mountKoreaMap: () => ({ update: vi.fn(), center: vi.fn(), dispose: vi.fn() }) }));
const click = (selector: string) => (document.querySelector(selector) as HTMLButtonElement).click();
const input = (selector: string, value: string) => { (document.querySelector(selector) as HTMLInputElement).value = value; };

beforeAll(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  history.replaceState(null, '', '/?lesson=foundations&step=0.5');
  await import('../src/main');
});

describe('guided learning flow', () => {
  it('starts at CRS foundations and safely handles a malformed step URL', () => {
    expect(document.querySelector('h1')?.textContent).toBe('A place is more than two numbers.');
    expect(document.querySelector('.earth-svg')).not.toBeNull();
    expect(document.querySelectorAll('[data-lesson]')).toHaveLength(5);
  });
  it('updates the selected point from the sliders', () => {
    input('#latitude-range', '60');
    document.querySelector('#latitude-range')!.dispatchEvent(new Event('input', { bubbles: true }));
    expect((document.querySelector('#latitude') as HTMLInputElement).value).toBe('60.000000');
    expect(document.querySelector('.angle-measurement.latitude output')?.textContent).toBe('60.00°N');
  });
  it('selects worldwide locations in globe lessons and uses regional presets for EPSG:5186', () => {
    input('#preset', 'Sydney');
    document.querySelector('#preset')!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(Number((document.querySelector('#latitude') as HTMLInputElement).value)).toBeCloseTo(-33.8688, 4);
    expect(Number((document.querySelector('#longitude') as HTMLInputElement).value)).toBeCloseTo(151.2093, 4);
    expect(document.querySelector('.point-marker')).not.toBeNull();
    click('[data-lesson="3"]');
    expect(document.querySelector('#preset option[value="Sydney"]')).toBeNull();
    expect((document.querySelector('#preset') as HTMLSelectElement).value).toBe('Seoul');
    click('[data-lesson="0"]');
    expect(document.querySelector('#preset option[value="Sydney"]')).not.toBeNull();
    input('#latitude-range', '60');
    document.querySelector('#latitude-range')!.dispatchEvent(new Event('input', { bubbles: true }));
  });
  it('offers projection comparisons without changing the point', () => {
    click('[data-lesson="1"]');
    expect(document.querySelector('.earth-svg')?.textContent).toContain('PLANAR VIEW');
    input('#projection', 'mercator');
    document.querySelector('#projection')!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.querySelector('.earth-svg')?.textContent).toContain('MERCATOR');
    expect((document.querySelector('#latitude') as HTMLInputElement).value).toBe('60.000000');
  });
  it('marks a chapter complete only after a correct answer', () => {
    click('[data-step="2"]');
    click('#next');
    expect((document.querySelector('#knowledge-check') as HTMLElement).hidden).toBe(false);
    click('[data-answer="0"]');
    expect(document.querySelector('.quiz-feedback')?.textContent).toContain('Not quite');
    click('[data-answer="2"]');
    expect(document.querySelector('.quiz-feedback')?.textContent).toContain('Correct');
    expect(document.querySelector('[data-lesson="1"] .chapter-number')?.textContent).toBe('✓');
    click('#next');
    expect(document.querySelector('h1')?.textContent).toBe('A short code. A full definition.');
  });
  it('provides both directions of the coordinate playground and named authority tuples', () => {
    click('[data-lesson="4"]');
    input('#easting', '200000'); input('#northing', '600000');
    document.querySelector('#projected-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(Number((document.querySelector('#latitude') as HTMLInputElement).value)).toBeCloseTo(38, 6);
    expect(Number((document.querySelector('#longitude') as HTMLInputElement).value)).toBeCloseTo(127, 6);
    click('#axis-order');
    expect(document.querySelector('#projected-tuple-label')?.textContent).toContain('northing, easting');
    expect(document.querySelector('#projected-tuple')?.textContent).toBe('[600,000.00, 200,000.00]');
  });
  it('shows an input error for a geographically valid but unsuitable distant point', () => {
    input('#latitude', '0'); input('#longitude', '0');
    document.querySelector('#geographic-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.querySelector('#input-error')?.textContent).toContain('limited');
    expect(Number((document.querySelector('#easting') as HTMLInputElement).value)).toBeCloseTo(200000, 2);
  });
  it('demonstrates relabelling and restores the original point', () => {
    click('[data-step="2"]');
    click('#relabel');
    expect(Number((document.querySelector('#latitude') as HTMLInputElement).value)).not.toBeCloseTo(38, 2);
    expect(document.querySelector('#relabel')?.textContent).toContain('Restore');
    click('#relabel');
    expect(Number((document.querySelector('#latitude') as HTMLInputElement).value)).toBeCloseTo(38, 6);
  });
  it('includes the research, videos, and locally bundled project documents', () => {
    click('#sources');
    expect(document.querySelector('#sources-dialog')?.hasAttribute('open')).toBe(true);
    expect(document.querySelectorAll('.resource-list a')).toHaveLength(10);
    click('[data-resource-tab="videos"]');
    expect(document.querySelectorAll('.resource-list a')).toHaveLength(4);
    click('[data-resource-tab="docs"]');
    expect(document.querySelector('#document-text')?.textContent).toContain('EPSG:4326 and EPSG:5186 learning resources');
    click('.close-dialog');
    expect(document.querySelector('#sources-dialog')?.hasAttribute('open')).toBe(false);
  });
  it('selects named topics and resumes the last topic after switching chapters', () => {
    click('[data-lesson="0"]');
    click('[data-step="1"]');
    expect(document.querySelector('h1')?.textContent).toBe('Latitude tells us how far north.');
    expect(document.querySelector('[data-step="1"]')?.getAttribute('aria-current')).toBe('step');
    click('[data-lesson="2"]');
    click('[data-lesson="0"]');
    expect(document.querySelector('h1')?.textContent).toBe('Latitude tells us how far north.');
    expect(document.querySelector('.step-position')?.textContent).toBe('Step 2 of 6');
    const progress = JSON.parse(localStorage.getItem('atlas-progress')!);
    expect(progress.positions.foundations).toEqual({ step: 1, quiz: false });
  });
  it('uses the mobile topic picker to jump directly to a topic', () => {
    input('#topic-picker', '2');
    document.querySelector('#topic-picker')!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.querySelector('h1')?.textContent).toBe('Longitude tells us how far east.');
    expect((document.querySelector('#topic-picker') as HTMLSelectElement).value).toBe('2');
    expect(new URL(location.href).searchParams.get('step')).toBe('2');
  });
  it('navigates directly to a dedicated check and back to the lesson', () => {
    click('[data-quiz]');
    expect(document.querySelector('#knowledge-check h1')?.textContent).toBe('Knowledge check');
    expect((document.querySelector('.lesson-content') as HTMLElement).hidden).toBe(true);
    expect(document.querySelector('.earth-svg')).toBeNull();
    expect((document.querySelector('#next') as HTMLButtonElement).disabled).toBe(true);
    expect(new URL(location.href).searchParams.get('check')).toBe('1');
    click('#back');
    expect((document.querySelector('.lesson-content') as HTMLElement).hidden).toBe(false);
    expect(document.querySelector('h1')?.textContent).toBe('That is a coordinate reference system.');
    expect(new URL(location.href).searchParams.has('check')).toBe(false);
    click('#next');
    click('[data-answer="0"]');
    expect((document.querySelector('#next') as HTMLButtonElement).disabled).toBe(false);
    click('[data-lesson="3"]');
    click('[data-lesson="0"]');
    expect((document.querySelector('#knowledge-check') as HTMLElement).hidden).toBe(false);
    expect(document.querySelector('.quiz-feedback')?.textContent).toContain('Correct');
  });
  it('resets remembered topics and handles the first-step Previous boundary', () => {
    click('#restart');
    expect(document.querySelector('h1')?.textContent).toBe('A place is more than two numbers.');
    expect((document.querySelector('#back') as HTMLButtonElement).disabled).toBe(true);
    click('#next');
    expect(document.querySelector('h1')?.textContent).toBe('Latitude tells us how far north.');
    click('#back');
    expect(document.querySelector('h1')?.textContent).toBe('A place is more than two numbers.');
    const progress = JSON.parse(localStorage.getItem('atlas-progress')!);
    expect(Object.keys(progress.positions)).toEqual(['foundations']);
    expect(progress.completed).toEqual([]);
  });
  it('changes the reference geometry and angle diagram for latitude and longitude lessons', () => {
    click('[data-step="1"]');
    expect(document.querySelector('.equator-line')?.classList.contains('reference-highlight')).toBe(true);
    expect(document.querySelector('.longitude-line')).toBeNull();
    expect(document.querySelector('.angle-measurement.longitude')).toBeNull();
    click('[data-step="2"]');
    expect(document.querySelector('.prime-line')?.classList.contains('reference-highlight')).toBe(true);
    expect(document.querySelector('.latitude-line')).toBeNull();
    expect(document.querySelector('.angle-measurement.latitude')).toBeNull();
  });
  it('shows the ellipsoid normal and retains visible lesson details', () => {
    click('[data-step="3"]');
    expect(document.querySelector('.earth-svg .sphere-outline')).not.toBeNull();
    expect(document.querySelector('#concept-diagram .normal-line')).not.toBeNull();
    expect((document.querySelector('#measurements') as HTMLElement).hidden).toBe(true);
    expect(document.querySelector('.technical')?.tagName).toBe('SECTION');
    expect(document.querySelector('.technical p')?.textContent).toContain('normal');
  });
  it('initializes distortion, then replaces it with an actual longitude interval and distance bars', () => {
    click('[data-lesson="1"]');
    click('[data-step="0"]');
    expect((document.querySelector('#circles') as HTMLInputElement).checked).toBe(true);
    expect(document.querySelectorAll('.distortion-circle').length).toBeGreaterThan(0);
    click('[data-step="1"]');
    expect((document.querySelector('#projection') as HTMLSelectElement).value).toBe('equirectangular');
    expect(document.querySelector('.longitude-interval')?.getAttribute('d')).not.toBe('');
    expect(document.querySelectorAll('.distortion-circle')).toHaveLength(0);
    input('#latitude-range', '60');
    document.querySelector('#latitude-range')!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('#degree-distance')?.textContent).toBe('55.8 km');
    expect(document.querySelector('#concept-diagram')?.textContent).toContain('55.8 km');
  });
  it('links the measurement task to a suitable example projection', () => {
    click('[data-step="2"]');
    click('[data-projection-task="angles"]');
    expect((document.querySelector('#projection') as HTMLSelectElement).value).toBe('mercator');
    expect(document.querySelector('.earth-svg')?.textContent).toContain('MERCATOR');
    click('[data-projection-task="area"]');
    expect((document.querySelector('#projection') as HTMLSelectElement).value).toBe('equal-earth');
  });
  it('keeps field identity and geographic position while changing coordinate order', () => {
    click('[data-lesson="2"]');
    click('[data-step="1"]');
    const latitude = (document.querySelector('#latitude') as HTMLInputElement).value;
    const before = document.querySelector('.ordered-fields')?.textContent;
    click('#axis-order');
    expect(document.querySelector('.ordered-fields')?.textContent).not.toBe(before);
    expect((document.querySelector('#latitude') as HTMLInputElement).value).toBe(latitude);
  });
  it('starts the origin lesson at its reference and removes offsets only in the explanation', () => {
    click('[data-lesson="3"]');
    click('[data-step="1"]');
    expect(Number((document.querySelector('#easting') as HTMLInputElement).value)).toBeCloseTo(200000, 3);
    expect(Number((document.querySelector('#northing') as HTMLInputElement).value)).toBeCloseTo(600000, 3);
    click('#offsets');
    expect(document.querySelector('#concept-diagram')?.textContent).toContain('Offsets removed');
    expect(Number((document.querySelector('#easting') as HTMLInputElement).value)).toBeCloseTo(200000, 3);
  });
  it('shows all conversion stages and restores the real point when leaving the relabelling experiment', () => {
    click('[data-lesson="4"]');
    click('[data-step="0"]');
    expect(document.querySelector('.conversion-flow')?.textContent).toContain('KGD2002 / 4737');
    const latitude = (document.querySelector('#latitude') as HTMLInputElement).value;
    click('[data-step="2"]');
    expect(document.querySelector('#concept-diagram')?.textContent).toContain('Relabelled as metres');
    click('#relabel');
    click('[data-step="0"]');
    expect((document.querySelector('#latitude') as HTMLInputElement).value).toBe(latitude);
  });
});

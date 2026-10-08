import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/dm-mono/latin-400.css';
import './styles.css';
import { lessons, sources, videos } from './lessons';
import { topicLabels, safeIndex, normalizePositions, resolvePosition, type LessonPositions } from './navigation';
import { presets, worldPresets, to5186, from5186, within5186Area, axisTuple, degreeLongitudeKm, parseCoordinate, validateGeographic, number, readSaved, save, type GeographicPoint } from './geo/coordinates';
import { mountWorld, type WorldView, type WorldOptions } from './visuals/world-view';
import type { KoreaMap } from './visuals/korea-map';
import research from '../docs/epsg-4326-and-5186-resources.md?raw';
import article from '../docs/coordinate-reference-systems.md?raw';
import plan from '../docs/build-plan.md?raw';
import attribution from '../docs/README.md?raw';

const app = document.querySelector<HTMLDivElement>('#app')!;
const url = new URL(location.href);
const saved = readSaved<{ lesson?: number; step?: number; completed?: string[]; positions?: LessonPositions }>('atlas-progress', {});
const positions = normalizePositions(saved.positions);
const requested = lessons.findIndex(lesson => lesson.id === url.searchParams.get('lesson'));
let lessonIndex = requested >= 0 ? requested : safeIndex(saved.lesson, lessons.length);
const initialPosition = resolvePosition(lessonIndex, positions, url, requested < 0 || requested === saved.lesson ? saved.step : 0);
let stepIndex = initialPosition.step;
let point: GeographicPoint = { ...worldPresets.Greenwich };
if (url.searchParams.has('lon') && url.searchParams.has('lat')) {
  try { const candidate = { longitude: parseCoordinate(url.searchParams.get('lon')!), latitude: parseCoordinate(url.searchParams.get('lat')!) }; validateGeographic(candidate); point = candidate; } catch { /* Ignore malformed shared points. */ }
}
const completed = new Set((Array.isArray(saved.completed) ? saved.completed : []).filter(id => lessons.some(l => l.id === id)));
let axisOfficial = false;
let showOffsets = true;
let showQuiz = initialPosition.quiz;
let quizChoice: number | null = null;
const quizAnswers: Record<string, number> = {};
let worldView: WorldView | undefined;
let koreaMap: KoreaMap | undefined;
let mountGeneration = 0;
let options: WorldOptions = { flat: false, projection: 'equal-earth', circles: false, ellipsoid: false, grid: true, emphasis: 'both' };
let relabelOriginal: GeographicPoint | null = null;
const docs = { research: { name: 'EPSG research & resources', text: research }, article: { name: 'QGIS article extraction', text: article }, plan: { name: 'Build plan & design', text: plan }, attribution: { name: 'Sources & attribution', text: attribution } };

const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const logo = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="16"/><ellipse cx="20" cy="20" rx="7" ry="16"/><ellipse cx="20" cy="20" rx="16" ry="6"/><path d="M4 20h32M20 4v32"/><circle cx="29" cy="13" r="3" class="logo-dot"/></svg>';
const select = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
const lesson = () => lessons[lessonIndex];
const step = () => lesson().steps[stepIndex];
const availablePresets = () => lesson().mode === 'map' ? presets : worldPresets;
const defaultPoint = () => lesson().mode === 'map' ? presets.Seoul : worldPresets.Greenwich;

function persist() {
  positions[lesson().id] = { step: stepIndex, quiz: showQuiz };
  save('atlas-progress', { lesson: lessonIndex, step: stepIndex, positions, completed: [...completed] });
}
function syncUrl() {
  const next = new URL(location.href);
  next.searchParams.set('lesson', lesson().id);
  next.searchParams.set('step', String(stepIndex));
  if (showQuiz) next.searchParams.set('check', '1');
  else next.searchParams.delete('check');
  next.searchParams.set('lon', point.longitude.toFixed(6));
  next.searchParams.set('lat', point.latitude.toFixed(6));
  try { history.replaceState(null, '', next); } catch { /* Embedded previews may restrict history. */ }
}
function configure() {
  options.flat = lesson().mode === 'projection' || (lesson().id === 'foundations' && stepIndex === 4);
  options.ellipsoid = lesson().id === 'foundations' && stepIndex === 3;
  options.emphasis = lesson().id === 'foundations' && stepIndex === 1 ? 'latitude' : lesson().id === 'foundations' && stepIndex === 2 ? 'longitude' : 'both';
  if (lesson().mode === 'map') {
    try { to5186(point); } catch { point = { ...presets.Seoul }; }
  }
}

function topicOutline() {
  return `<ol class="topic-outline" aria-label="${lesson().name} topics">${lesson().steps.map((s, i) => `<li><button class="topic-button ${!showQuiz && i === stepIndex ? 'active' : ''}" data-step="${i}" title="${s.title}" ${!showQuiz && i === stepIndex ? 'aria-current="step"' : ''}><span class="topic-number">${i + 1}</span>${topicLabels[lesson().id][i]}</button></li>`).join('')}<li><button class="topic-button quiz-topic ${showQuiz ? 'active' : ''}" data-quiz ${showQuiz ? 'aria-current="step"' : ''}><span class="topic-number">${completed.has(lesson().id) ? '✓' : '?'}</span>Knowledge check</button></li></ol>`;
}

function render() {
  const generation = ++mountGeneration;
  worldView?.dispose(); worldView = undefined;
  koreaMap?.dispose(); koreaMap = undefined;
  configure(); persist(); syncUrl();
  const current = lesson();
  const isMap = current.mode === 'map';
  const percent = Math.round(completed.size / lessons.length * 100);
  app.innerHTML = `<header class="app-header">
    <a class="brand" href="/" aria-label="Coordinate atlas home">${logo}<span>coordinate<span class="brand-light">atlas</span></span></a>
    <button class="source-button" id="sources">Sources</button>
  </header>
  <div class="app-layout">
    <aside class="sidebar" aria-label="Course navigation">
      <nav class="chapter-nav" aria-label="Lessons">${lessons.map((l, i) => `<div class="chapter-group"><button class="chapter ${i === lessonIndex ? 'active' : ''}" data-lesson="${i}" ${i === lessonIndex ? 'aria-current="true" aria-expanded="true"' : ''}><span class="chapter-number">${completed.has(l.id) ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="chapter-copy"><strong>${l.name}</strong></span>${i === lessonIndex ? '<span class="current-dot"></span>' : ''}</button>${i === lessonIndex ? topicOutline() : ''}</div>`).join('')}</nav>
      <div class="course-progress"><div><span>Progress</span><span>${completed.size} / 5</span></div><div class="progress-track"><span style="width:${percent}%"></span></div></div>
      <button class="text-button reset-course" id="restart">Restart</button>
    </aside>
    <main id="lesson" tabindex="-1">
      <div class="lesson-meta"><span class="eyebrow">${String(lessonIndex + 1).padStart(2, '0')} / ${current.short.toUpperCase()}</span></div>
      <label class="mobile-topics"><span>Topic</span><select id="topic-picker" aria-label="Choose a sub-lesson">${current.steps.map((s, i) => `<option value="${i}" ${!showQuiz && i === stepIndex ? 'selected' : ''}>${topicLabels[current.id][i]} · ${i + 1} of ${current.steps.length}</option>`).join('')}<option value="quiz" ${showQuiz ? 'selected' : ''}>Knowledge check</option></select></label>
      <div class="lesson-content" ${showQuiz ? 'hidden' : ''}>
      <div class="lesson-intro"><div><h1>${step().title}</h1><p>${step().body}</p></div><span class="step-position">Step ${stepIndex + 1} of ${current.steps.length}</span></div>
      <div class="workspace">
        <section class="visual-panel" aria-label="Interactive visualization">
          <div class="visual-toolbar"><span class="visual-title">${isMap ? 'EPSG:5186' : 'EARTH'}</span><div class="toolbar-controls">${!isMap ? '<button class="compact-button" id="view-toggle" aria-pressed="false">Flat map</button>' : ''}<button class="compact-button" id="face">Center</button><button class="compact-button" id="reset-point">Reset</button></div></div>
          <div class="visual-stage ${isMap ? 'map-stage' : ''}" id="visual">${isMap ? '<div class="map-loading">Preparing the projected grid…</div>' : ''}</div>
          ${!isMap ? '<div id="measurements" class="angle-diagrams" aria-label="Coordinate angle measurements"></div>' : ''}
          <div class="visual-caption"><span><i class="legend-dot teal"></i>${isMap ? 'Central-belt extent' : 'Latitude / parallel'}</span><span><i class="legend-dot orange"></i>${isMap ? '127°E / central meridian' : 'Longitude / meridian'}</span><span class="map-credit">Natural Earth · ${isMap ? 'EPSG:5186' : 'Spherical illustration'}</span></div>
          <div class="try-this"><span class="try-symbol">↳</span><p>${step().prompt}</p></div>
          <div class="visual-settings">
            <label class="check-label"><input type="checkbox" id="grid" ${options.grid ? 'checked' : ''}/> Show grid</label>
            ${!isMap ? `<label class="projection-control" id="projection-wrap">Projection <select id="projection" aria-label="Map projection"><option value="equal-earth">Equal Earth</option><option value="mercator">Mercator</option><option value="equirectangular">Equirectangular</option></select></label>` : '<span class="map-hint">Click to locate · Drag marker to move</span>'}
            ${current.id === 'projections' ? `<label class="check-label"><input type="checkbox" id="circles" ${options.circles ? 'checked' : ''}/> Distortion circles</label>` : ''}
            ${current.id === 'foundations' && stepIndex === 3 ? '<label class="check-label"><input type="checkbox" id="ellipsoid" checked/> Exaggerated ellipsoid</label>' : ''}
          </div>
        </section>
        <aside class="inspector" aria-label="Coordinate inspector">
          <div class="inspector-heading"><span class="eyebrow">COORDINATES</span></div>
          <label class="preset-label" for="preset">Location</label><select id="preset"><option value="">Custom</option>${Object.keys(availablePresets()).map(name => `<option value="${name}">${name}</option>`).join('')}</select>
          <form id="geographic-form" class="coordinate-block"><div class="coordinate-heading"><strong>Geographic</strong><span class="crs-badge">EPSG:4326</span></div><p class="coordinate-subtitle">WGS 84 · degrees</p>
            <label class="coordinate-field"><span>Latitude <small>° N / S</small></span><input id="latitude" type="number" step="any" min="-90" max="90" inputmode="decimal" required aria-label="Latitude in degrees"/></label>
            <input class="coordinate-range latitude-range" id="latitude-range" type="range" min="${isMap ? '25' : '-89.9'}" max="${isMap ? '45' : '89.9'}" step="0.01" aria-label="Adjust latitude"/>
            <label class="coordinate-field"><span>Longitude <small>° E / W</small></span><input id="longitude" type="number" step="any" min="-180" max="180" inputmode="decimal" required aria-label="Longitude in degrees"/></label>
            <input class="coordinate-range longitude-range" id="longitude-range" type="range" min="${isMap ? '120' : '-180'}" max="${isMap ? '135' : '180'}" step="0.01" aria-label="Adjust longitude"/>
            <button class="apply-button" type="submit">Locate ${arrow}</button>
          </form>
          ${isMap ? `<form id="projected-form" class="coordinate-block projected-block"><div class="coordinate-heading"><strong>Projected</strong><span class="crs-badge">EPSG:5186</span></div><p class="coordinate-subtitle">KGD2002 / Central Belt 2010</p><label class="coordinate-field"><span>Easting <small>m</small></span><input id="easting" type="number" step="any" inputmode="decimal" required aria-label="Easting in metres"/></label><label class="coordinate-field"><span>Northing <small>m</small></span><input id="northing" type="number" step="any" inputmode="decimal" required aria-label="Northing in metres"/></label><button class="apply-button" type="submit">Locate ${arrow}</button><p id="area-note" class="area-note"></p></form>` : ''}
          <p id="input-error" class="input-error" role="alert" hidden></p>
          ${current.id === 'projections' && stepIndex === 1 ? '<div class="distance-box"><span>1° of longitude at this latitude</span><strong id="degree-distance"></strong><small>Along the WGS 84 parallel</small></div>' : ''}
          ${current.id === 'epsg' || isMap ? `<div class="axis-box"><label class="check-label"><input id="axis-order" type="checkbox" ${axisOfficial ? 'checked' : ''}/> Official EPSG axis order</label><span class="tuple-label" id="tuple-label"></span><code id="geo-tuple"></code>${isMap ? '<span class="tuple-label" id="projected-tuple-label"></span><code id="projected-tuple"></code>' : ''}</div>` : ''}
          ${current.id === 'korea' && stepIndex === 1 ? `<label class="check-label offsets-label"><input id="offsets" type="checkbox" ${showOffsets ? 'checked' : ''}/> Include false offsets</label><p class="offsets-note" id="offsets-note"></p>` : ''}
        </aside>
      </div>
      <div class="takeaway"><span class="eyebrow">KEY IDEA</span><p>${step().takeaway}</p></div>
      ${current.id === 'lab' && stepIndex === 2 ? '<section class="experiment"><div><h2>A deliberate mistake</h2><p>What if we interpret longitude and latitude numbers as easting and northing in metres?</p><p id="relabel-result"></p></div><button class="secondary-button" id="relabel">Try relabelling</button></section>' : ''}
      <section class="technical" aria-label="Lesson details"><h2>Details</h2><p>${step().detail}</p>${current.id === 'epsg' || current.id === 'korea' ? definitionMarkup(isMap) : ''}</section>
      </div>
      <section class="knowledge-check" id="knowledge-check" ${showQuiz ? '' : 'hidden'} aria-label="Chapter knowledge check"><h1>Knowledge check</h1><h2>${current.quiz.question}</h2><div class="answer-options">${current.quiz.options.map((answer, i) => `<button class="answer-button ${quizChoice === i ? (i === current.quiz.answer ? 'correct' : 'incorrect') : ''}" data-answer="${i}"><span>${String.fromCharCode(65 + i)}</span>${answer}</button>`).join('')}</div><p id="quiz-feedback" class="quiz-feedback" role="status">${quizChoice === null ? 'Choose an answer. You can try again.' : (quizChoice === current.quiz.answer ? 'Correct. ' : 'Not quite. ') + current.quiz.explanation}</p></section>
      <footer class="lesson-footer" aria-label="Lesson navigation"><button class="back-button" id="back" ${!showQuiz && lessonIndex === 0 && stepIndex === 0 ? 'disabled' : ''}>← Previous</button><span class="footer-position">${showQuiz ? 'Knowledge check' : `Step ${stepIndex + 1} of ${current.steps.length}`}</span><button class="next-button" id="next" ${showQuiz && quizChoice !== current.quiz.answer ? 'disabled aria-describedby="quiz-feedback"' : ''}>${nextLabel()} ${arrow}</button></footer>
    </main>
  </div>
  <dialog id="sources-dialog" class="sources-dialog"><div class="dialog-heading"><h2>Sources</h2><button class="close-dialog" aria-label="Close sources">✕</button></div><div class="dialog-tabs"><button class="active" data-resource-tab="articles">Articles</button><button data-resource-tab="videos">Videos</button><button data-resource-tab="docs">Documents</button></div><div id="resource-content"></div><p class="source-disclaimer">Researched 7 October 2026. Video links were checked through metadata or publisher pages; videos were not reviewed in full. EPSG.io is a viewer of EPSG data. EPSG.org is the authoritative registry.</p><p class="source-disclaimer">Geographic outlines: Natural Earth, public domain, via world-atlas at 1:110m scale. Fonts: DM Sans and DM Mono, SIL Open Font License. The educational KGD2002/WGS 84 datum operation has approximately 1 m stated accuracy.</p></dialog>
  <div class="status-message" id="status-message" role="status" hidden></div>`;

  bind();
  const chapterNav = select<HTMLElement>('.chapter-nav');
  const activeGroup = select<HTMLElement>('.chapter.active').parentElement!;
  if (chapterNav.scrollWidth > chapterNav.clientWidth) {
    chapterNav.scrollLeft = activeGroup.getBoundingClientRect().left - chapterNav.getBoundingClientRect().left + chapterNav.scrollLeft - (chapterNav.clientWidth - activeGroup.clientWidth) / 2;
  }
  if (showQuiz) return;
  updateReadouts();
  if (!isMap) worldView = mountWorld(select('#visual'), point, options, setPoint, select('#measurements'));
  else {
    import('./visuals/korea-map').then(({ mountKoreaMap }) => {
      if (generation !== mountGeneration) return;
      select('#visual').innerHTML = '';
      koreaMap = mountKoreaMap(select('#visual'), point, setPoint);
      koreaMap.update(point, options.grid, showOffsets);
    }).catch(() => {
      if (generation === mountGeneration) select('#visual').innerHTML = '<p class="map-loading">The map could not load. The coordinate forms still work. Reload to retry.</p>';
    });
  }
}

function definitionMarkup(projected: boolean): string {
  return `<dl class="definition-grid"><div><dt>Reference framework</dt><dd>${projected ? 'Korean Geodetic Datum 2002' : 'WGS 84 ensemble'}</dd></div><div><dt>Ellipsoid</dt><dd>${projected ? 'GRS 1980' : 'WGS 84'}</dd></div><div><dt>Coordinate axes</dt><dd>${projected ? 'Northing, easting' : 'Latitude, longitude'}</dd></div><div><dt>Units</dt><dd>${projected ? 'Metres' : 'Degrees'}</dd></div>${projected ? '<div><dt>Projection method</dt><dd>Transverse Mercator</dd></div><div><dt>Natural origin</dt><dd>38°N, 127°E</dd></div><div><dt>False offsets</dt><dd>E 200,000 m / N 600,000 m</dd></div><div><dt>Central scale factor</dt><dd>1</dd></div>' : '<div><dt>Map projection</dt><dd>None in the CRS definition</dd></div><div><dt>Area of use</dt><dd>World</dd></div>'}</dl>`;
}

function nextLabel() {
  if (!showQuiz) return stepIndex < lesson().steps.length - 1 ? 'Next' : 'Knowledge check';
  return lessonIndex < lessons.length - 1 ? 'Next lesson' : 'Done';
}

function notify(message: string) {
  const target = select('#status-message');
  target.textContent = message; target.hidden = false;
  window.setTimeout(() => { if (target.isConnected) target.hidden = true; }, 3500);
}
function error(message = '') {
  const target = select('#input-error'); target.textContent = message; target.hidden = !message;
}
function updateVisual() {
  worldView?.update(point, options);
  koreaMap?.update(point, options.grid, showOffsets);
  const toggle = app.querySelector<HTMLButtonElement>('#view-toggle');
  if (toggle) { toggle.textContent = options.flat ? 'Globe view' : 'Flat map'; toggle.setAttribute('aria-pressed', String(options.flat)); }
  const projectionControl = app.querySelector<HTMLElement>('#projection-wrap');
  if (projectionControl) projectionControl.hidden = !options.flat;
  const projectionSelect = app.querySelector<HTMLSelectElement>('#projection');
  if (projectionSelect) projectionSelect.value = options.projection;
}
function setPoint(next: GeographicPoint) {
  try {
    validateGeographic(next);
    if (lesson().mode === 'map') to5186(next);
    point = next; error(); updateReadouts(); updateVisual(); syncUrl();
  } catch (e) { error((e as Error).message); koreaMap?.update(point, options.grid, showOffsets); }
}
function updateReadouts() {
  select<HTMLInputElement>('#latitude').value = point.latitude.toFixed(6);
  select<HTMLInputElement>('#longitude').value = point.longitude.toFixed(6);
  select<HTMLInputElement>('#latitude-range').value = String(point.latitude);
  select<HTMLInputElement>('#longitude-range').value = String(point.longitude);
  const locations = availablePresets();
  select<HTMLSelectElement>('#preset').value = Object.keys(locations).find(name => Math.abs(locations[name].longitude - point.longitude) < .00001 && Math.abs(locations[name].latitude - point.latitude) < .00001) ?? '';
  const geoTuple = app.querySelector('#geo-tuple');
  if (geoTuple) {
    select('#tuple-label').textContent = axisOfficial ? '4326 · latitude, longitude' : '4326 · API longitude, latitude';
    geoTuple.textContent = `[${axisTuple(point, axisOfficial).map(v => v.toFixed(6)).join(', ')}]`;
  }
  const distance = app.querySelector('#degree-distance');
  if (distance) distance.textContent = `${number(degreeLongitudeKm(point.latitude), 1)} km`;
  if (lesson().mode === 'map') {
    const p = to5186(point);
    select<HTMLInputElement>('#easting').value = p.easting.toFixed(3);
    select<HTMLInputElement>('#northing').value = p.northing.toFixed(3);
    const inArea = within5186Area(point);
    const note = select('#area-note');
    note.classList.toggle('outside', !inArea);
    note.textContent = inArea ? 'Within the central-belt bounding box. Intended for onshore use.' : 'Outside EPSG:5186’s area-of-use bounding box. Coordinates are shown for comparison.';
    select('#projected-tuple-label').textContent = axisOfficial ? '5186 · northing, easting / m' : '5186 · API easting, northing / m';
    select('#projected-tuple').textContent = `[${axisTuple(p, axisOfficial).map(v => number(v, 2)).join(', ')}]`;
    const offsetNote = app.querySelector('#offsets-note');
    if (offsetNote) offsetNote.textContent = showOffsets ? `With offsets: E ${number(p.easting)} m / N ${number(p.northing)} m` : `Without offsets: E ${number(p.easting - 200000)} m / N ${number(p.northing - 600000)} m. Explanatory values only; the registered CRS above is unchanged.`;
    const relabel = app.querySelector('#relabel-result');
    if (relabel) {
      const wrong = from5186({ easting: point.longitude, northing: point.latitude });
      relabel.textContent = relabelOriginal ? 'You are viewing the incorrectly relabelled point. Restore to compare with the real transformation.' : `Relabelling would put this point at ${wrong.latitude.toFixed(4)}°N, ${wrong.longitude.toFixed(4)}°E instead of ${point.latitude.toFixed(4)}°N, ${point.longitude.toFixed(4)}°E.`;
      select('#relabel').textContent = relabelOriginal ? 'Restore correct location' : 'Try relabelling';
    }
  }
  updateVisual();
}

function navigate(nextLesson: number, nextStep?: number | 'quiz') {
  persist();
  lessonIndex = safeIndex(nextLesson, lessons.length);
  const remembered = resolvePosition(lessonIndex, positions);
  stepIndex = typeof nextStep === 'number' ? safeIndex(nextStep, lesson().steps.length) : nextStep === 'quiz' ? lesson().steps.length - 1 : remembered.step;
  showQuiz = nextStep === 'quiz' || nextStep === undefined && remembered.quiz;
  quizChoice = quizAnswers[lesson().id] ?? null;
  relabelOriginal = null;
  render(); select<HTMLElement>('#lesson').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function bind() {
  app.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach(button => button.addEventListener('click', () => navigate(Number(button.dataset.lesson))));
  app.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => button.addEventListener('click', () => navigate(lessonIndex, Number(button.dataset.step))));
  app.querySelectorAll<HTMLButtonElement>('[data-quiz]').forEach(button => button.addEventListener('click', () => navigate(lessonIndex, 'quiz')));
  select('#topic-picker').addEventListener('change', event => { const value = (event.target as HTMLSelectElement).value; navigate(lessonIndex, value === 'quiz' ? 'quiz' : Number(value)); });
  select('#back').addEventListener('click', () => {
    if (showQuiz) navigate(lessonIndex, lesson().steps.length - 1);
    else if (stepIndex > 0) navigate(lessonIndex, stepIndex - 1);
    else if (lessonIndex > 0) navigate(lessonIndex - 1, lessons[lessonIndex - 1].steps.length - 1);
  });
  select('#next').addEventListener('click', () => {
    if (!showQuiz && stepIndex < lesson().steps.length - 1) navigate(lessonIndex, stepIndex + 1);
    else if (!showQuiz) navigate(lessonIndex, 'quiz');
    else if (quizChoice === lesson().quiz.answer) {
      if (lessonIndex < lessons.length - 1) navigate(lessonIndex + 1, 0);
      else notify('You completed the field guide. Keep exploring any chapter or the coordinate lab.');
    } else notify('Choose an answer in the chapter check. You can try again.');
  });
  app.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(button => button.addEventListener('click', () => {
    quizChoice = Number(button.dataset.answer);
    quizAnswers[lesson().id] = quizChoice;
    if (quizChoice === lesson().quiz.answer) completed.add(lesson().id);
    render(); select<HTMLButtonElement>(`[data-answer="${quizChoice}"]`).focus({ preventScroll: true });
  }));
  select('#preset').addEventListener('change', event => { const name = (event.target as HTMLSelectElement).value; const location = availablePresets()[name]; if (location) { setPoint({ ...location }); worldView?.center(); koreaMap?.center(); } });
  select('#geographic-form').addEventListener('submit', event => {
    event.preventDefault();
    try { setPoint({ latitude: parseCoordinate(select<HTMLInputElement>('#latitude').value), longitude: parseCoordinate(select<HTMLInputElement>('#longitude').value) }); worldView?.center(); koreaMap?.center(); } catch (e) { error((e as Error).message); }
  });
  app.querySelector('#projected-form')?.addEventListener('submit', event => {
    event.preventDefault();
    try { setPoint(from5186({ easting: parseCoordinate(select<HTMLInputElement>('#easting').value), northing: parseCoordinate(select<HTMLInputElement>('#northing').value) })); koreaMap?.center(); } catch (e) { error((e as Error).message); }
  });
  for (const axis of ['latitude', 'longitude'] as const) select(`#${axis}-range`).addEventListener('input', event => setPoint({ ...point, [axis]: Number((event.target as HTMLInputElement).value) }));
  select('#grid').addEventListener('change', event => { options.grid = (event.target as HTMLInputElement).checked; updateVisual(); });
  app.querySelector('#circles')?.addEventListener('change', event => { options.circles = (event.target as HTMLInputElement).checked; updateVisual(); });
  app.querySelector('#ellipsoid')?.addEventListener('change', event => { options.ellipsoid = (event.target as HTMLInputElement).checked; updateVisual(); });
  app.querySelector('#view-toggle')?.addEventListener('click', () => { options.flat = !options.flat; updateVisual(); });
  app.querySelector('#projection')?.addEventListener('change', event => { options.projection = (event.target as HTMLSelectElement).value; updateVisual(); });
  app.querySelector('#axis-order')?.addEventListener('change', event => { axisOfficial = (event.target as HTMLInputElement).checked; updateReadouts(); });
  app.querySelector('#offsets')?.addEventListener('change', event => { showOffsets = (event.target as HTMLInputElement).checked; updateReadouts(); });
  select('#face').addEventListener('click', () => { worldView?.center(); koreaMap?.center(); });
  select('#reset-point').addEventListener('click', () => { relabelOriginal = null; setPoint({ ...defaultPoint() }); worldView?.center(); koreaMap?.center(); });
  app.querySelector('#relabel')?.addEventListener('click', () => {
    if (relabelOriginal) { const original = relabelOriginal; relabelOriginal = null; setPoint(original); }
    else { const original = { ...point }; const wrong = from5186({ easting: point.longitude, northing: point.latitude }); relabelOriginal = original; setPoint(wrong); }
    koreaMap?.center();
  });
  select('#restart').addEventListener('click', () => {
    for (const id of Object.keys(positions)) delete positions[id];
    for (const id of Object.keys(quizAnswers)) delete quizAnswers[id];
    completed.clear(); point = { ...worldPresets.Greenwich }; lessonIndex = 0; stepIndex = 0; showQuiz = false; quizChoice = null; relabelOriginal = null;
    render(); select<HTMLElement>('#lesson').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
  });
  const dialog = select<HTMLDialogElement>('#sources-dialog');
  select('#sources').addEventListener('click', () => { showResources('articles'); dialog.showModal(); });
  select('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  app.querySelectorAll<HTMLButtonElement>('[data-resource-tab]').forEach(button => button.addEventListener('click', () => showResources(button.dataset.resourceTab!)));
}

function showResources(tab: string) {
  app.querySelectorAll<HTMLButtonElement>('[data-resource-tab]').forEach(button => button.classList.toggle('active', button.dataset.resourceTab === tab));
  const content = select('#resource-content');
  if (tab === 'docs') {
    content.innerHTML = `<div class="document-controls"><label for="document-select">Project document</label><select id="document-select">${Object.entries(docs).map(([key, doc]) => `<option value="${key}">${doc.name}</option>`).join('')}</select><button class="secondary-button" id="download-doc">Download .md</button></div><pre id="document-text"></pre>`;
    const documentText = select('#document-text'); documentText.textContent = research;
    select('#document-select').addEventListener('change', event => { documentText.textContent = docs[(event.target as HTMLSelectElement).value as keyof typeof docs].text; });
    select('#download-doc').addEventListener('click', () => {
      const key = select<HTMLSelectElement>('#document-select').value as keyof typeof docs;
      const blobUrl = URL.createObjectURL(new Blob([docs[key].text], { type: 'text/markdown;charset=utf-8' }));
      const link = document.createElement('a'); link.href = blobUrl; link.download = `${key}.md`; link.click(); window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    });
  } else content.innerHTML = `<div class="resource-list">${(tab === 'videos' ? videos : sources).map(([title, description, href], i) => `<a href="${href}" target="_blank" rel="noreferrer"><span class="resource-number">${String(i + 1).padStart(2, '0')}</span><div><strong>${title}</strong><p>${description}</p></div><span>↗</span></a>`).join('')}</div>`;
}

render();
